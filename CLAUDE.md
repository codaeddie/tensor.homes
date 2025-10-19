# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

tensor.homes is a Next.js 15 application providing a tldraw-based visual editor with comprehensive project management capabilities. The application follows a three-stage workflow: **Backstage** (dashboard for project management), **Main Stage** (full-featured editor), and **Show Stage** (public viewer with comments). Users can create, edit, publish, and share interactive drawings with auto-save, thumbnail generation, and real-time collaboration features.

**Current status:** Fully implemented with dashboard, editor, viewer, API routes, database integration, authentication, and asset storage. All core features are functional.

## Essential commands

### Development

**Start development server:**
```bash
npm run dev
```
The dev server runs on http://localhost:3000 with Turbopack enabled for fast refresh.

**Build for production:**
```bash
npm run build
```
Uses Turbopack for optimized production builds.

**Start production server:**
```bash
npm run start
```
Runs the built application in production mode.

### Code quality

**Lint code:**
```bash
npm run lint
```
Uses Biome for linting and code quality checks.

**Format code:**
```bash
npm run format
```
Automatically formats code using Biome with 2-space indentation.

### Database operations

**Generate Prisma client after schema changes:**
```bash
npx prisma generate
```
**IMPORTANT:** This generates the client to `app/generated/prisma` (custom output location, gitignored).

**Create and apply migrations:**
```bash
npx prisma migrate dev --name <migration_name>
```

**Open Prisma Studio to view/edit data:**
```bash
npx prisma studio
```

**Push schema changes without migrations (development only):**
```bash
npx prisma db push
```

## Architecture

### Technology stack

- **Framework:** Next.js 15 (App Router, Turbopack, React 19)
- **Drawing SDK:** tldraw v4
- **Authentication:** Clerk (user management and JWT-based auth)
- **Database:** Prisma + Prisma Postgres (hosted at db.prisma.io)
- **Storage:** Vercel Blob for asset storage (thumbnails, exports)
- **Validation:** Zod v4 for runtime type checking
- **Styling:** Tailwind CSS v4
- **Linting/Formatting:** Biome (fast Rust-based toolchain)

### Database setup

The Prisma schema is located at `prisma/schema.prisma` with three main models:

**User:** Managed by Clerk, stores basic user info
- `id` (String, @id) - Clerk user ID
- `email` (String, @unique) - User email from Clerk
- `name` (String?) - Optional display name
- `createdAt` (DateTime) - Account creation timestamp
- Relations: `projects[]`, `comments[]`

**Project:** Contains tldraw snapshots, thumbnails, and publish status
- `id` (String, @id, cuid) - Unique project identifier
- `title` (String) - Project title/name
- `snapshot` (Json) - Full TLStoreSnapshot from tldraw
- `thumbnailUrl` (String?) - Vercel Blob URL for thumbnail image
- `published` (Boolean) - Public visibility flag
- `userId` (String) - Owner reference to User
- `createdAt`, `updatedAt` (DateTime) - Timestamps
- Relations: `user`, `comments[]`
- Indexes: `userId`, `published`

**Comment:** Associated with published projects
- `id` (String, @id, cuid) - Unique comment identifier
- `content` (String) - Comment text content
- `projectId` (String) - Reference to Project
- `userId` (String) - Author reference to User
- `createdAt` (DateTime) - Comment timestamp
- Relations: `project`, `user`
- Indexes: `projectId`

**Important:** Prisma client is generated to a custom location: `app/generated/prisma` (not the default `node_modules/.prisma`). This directory is gitignored and must be regenerated after schema changes using `npx prisma generate`.

To access the database in code, import from `lib/prisma.ts` which provides a singleton PrismaClient instance:

```typescript
import { prisma } from '@/lib/prisma'
```

### Routes architecture

The application is organized into three main stages with route groups:

**Public routes:**
- `/` - Landing/marketing page
- `/signin`, `/signup` - Clerk authentication pages

**Protected routes (require authentication via Clerk middleware):**
- `/dashboard` - "Backstage" - Project gallery with thumbnails, search, and quick actions
- `/editor` - Create new tldraw project with blank canvas
- `/editor/[id]` - Edit existing project with auto-save every 5 seconds
- `/view/[id]` - "Show stage" - Read-only public view with comment system

**Route groups:**
- `(app)` - Protected application routes with shared layout
- `(auth)` - Authentication pages (signin/signup)

### API routes

All API routes follow RESTful conventions and are protected with Clerk authentication:

**Projects:**
- `POST /api/projects` - Create project + generate thumbnail via Vercel Blob
- `GET /api/projects` - List user's projects (supports optional `?search=` query)
- `GET /api/projects/[id]` - Get single project with full snapshot
- `PATCH /api/projects/[id]` - Update project (title, snapshot, thumbnailUrl)
- `DELETE /api/projects/[id]` - Delete project and associated assets
- `POST /api/projects/[id]/publish` - Toggle publish status

**Comments:**
- `POST /api/comments` - Add comment to published project
- `GET /api/comments/[projectId]` - Get comments for project with user details

**Authentication:**
- Uses `auth()` from `@clerk/nextjs/server` to verify user identity
- User records synced to database on first project creation via `upsert`
- Unauthorized requests return 401 status

### Key technical patterns

**tldraw integration:**
- Use `snapshot` prop to load existing project state into `<Tldraw />` component
- Save snapshots to database using `getSnapshot(editor.store)` API
- Auto-save every 5 seconds by listening to `editor.store.listen()` with `scope: "document"`
- Generate thumbnails using `editor.toImage([...shapeIds], { format: "png", background: true })`
- Convert thumbnail blob to base64 data URL, then upload to Vercel Blob
- Store full TLStoreSnapshot as JSON in the `Project.snapshot` field

**Authentication flow:**
- Clerk middleware (`middleware.ts`) protects `/dashboard` and `/editor` routes using **Node.js Runtime**
- Public routes: `/`, `/signin`, `/signup`, `/view/*`, all API routes
- User IDs from Clerk are used as primary keys in the User table
- Use `@clerk/nextjs/server` helpers (`auth()`, `currentUser()`) for accessing user data in API routes
- Clerk automatically handles session management, JWTs, and user profile updates
- **CRITICAL:** Middleware MUST use `runtime: "nodejs"` in config because Clerk v6.33.7 requires Node.js crypto module
  - Edge Runtime does NOT support Node.js crypto module (only Web Crypto API subset)
  - Attempting to use Edge Runtime causes Vercel deployment error: "The Edge Function 'middleware' is referencing unsupported modules: @clerk: #crypto"
  - Next.js 15.5+ supports Node.js middleware runtime via `export const config = { runtime: "nodejs" }`
- **Pattern:** Use `async/await` with `auth.protect()` in clerkMiddleware handler

**Auto-save implementation:**
- Editor page uses `useRef` to store editor instance and auto-save timer
- Listen to store changes: `editor.store.listen(callback, { scope: "document" })`
- Set `hasUnsavedChanges` flag on any document change
- Auto-save timer (5 seconds) resets on each change
- Clear timer on component unmount to prevent memory leaks
- Manual save button available for immediate saves with thumbnail generation

**Comment system:**
- Real-time optimistic updates on the frontend (immediate UI feedback)
- Comments only available on published projects (enforced in API)
- Stored in Postgres with proper foreign key constraints and cascading deletes
- Include user details in comment responses using Prisma's `include` clause

**Thumbnail generation:**
- Thumbnails generated client-side using `editor.toImage()` API (not deprecated `exportToBlob`)
- Convert blob to base64 data URL using FileReader
- Upload data URL to Vercel Blob storage via `lib/blob.ts` helper
- Store blob URL in database for fast retrieval
- Thumbnail generation is non-blocking (failures don't prevent project creation)

### Environment variables

Required environment variables (store in `.env.local`, gitignored):

```
# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # Clerk public key (client-side)
CLERK_SECRET_KEY                    # Clerk secret key (server-side)

# Database
DATABASE_URL                        # Prisma Postgres connection string

# Asset storage
BLOB_READ_WRITE_TOKEN              # Vercel Blob storage token
```

## Code style

This project uses Biome for linting and formatting with the following configuration:

**Formatting:**
- 2-space indentation
- Auto-organize imports enabled
- Unknown CSS at-rules disabled (for Tailwind v4 compatibility)

**Linting:**
- Biome recommended rules enabled
- Next.js domain rules enabled
- React domain rules enabled

**Running code quality checks:**
```bash
npm run lint      # Check for issues
npm run format    # Auto-fix formatting
```

### Top-of-file documentation

When creating or modifying files, add top-of-file comments describing:
- **Classes** and their responsibilities
- **Methods** and their parameters/return types
- **Interfaces** and their fields
- **Key aspects** of the implementation

Update these comments when changes are made to keep documentation current with the code.

**Example:**
```typescript
/**
 * Dashboard page - "Backstage"
 *
 * Displays user's projects in a grid layout with thumbnails.
 * Features:
 * - Search/filter projects by title
 * - Quick actions: edit, delete, publish/unpublish
 * - "New Project" button to create new projects
 */
```

## Import path alias

The project uses `@/*` as an alias for the root directory:

```typescript
import { prisma } from '@/lib/prisma'
import type { ProjectMetadata } from '@/lib/types'
```

Configured in `tsconfig.json`:
```json
"paths": {
  "@/*": ["./*"]
}
```

## Development workflow

### Starting a new feature

1. **Plan the feature** - Review ARCHITECTURE.md for intended design
2. **Update database schema** - Modify `prisma/schema.prisma` if needed
3. **Generate Prisma client** - Run `npx prisma generate` after schema changes
4. **Create API routes** - Follow RESTful patterns in `app/api/`
5. **Build UI components** - Use Tailwind CSS for styling
6. **Test locally** - Run `npm run dev` and verify functionality
7. **Format code** - Run `npm run format` before committing

### Working with tldraw

**Loading a project:**
```typescript
<Tldraw
  snapshot={project.snapshot}
  onMount={(editor) => {
    editorRef.current = editor;
  }}
/>
```

**Saving changes:**
```typescript
import { getSnapshot } from 'tldraw'

const snapshot = getSnapshot(editor.store)
await fetch(`/api/projects/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ snapshot })
})
```

**Generating thumbnails:**
```typescript
const shapeIds = editor.getCurrentPageShapeIds()
const { blob } = await editor.toImage([...shapeIds], {
  format: 'png',
  background: true,
})

// Convert to data URL for upload
const reader = new FileReader()
const dataUrl = await new Promise<string>((resolve) => {
  reader.onloadend = () => resolve(reader.result as string)
  reader.readAsDataURL(blob)
})
```

### Working with Clerk authentication

**Protecting routes in middleware:**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/editor(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})
```

**Accessing user in API routes:**
```typescript
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get full user details if needed
  const user = await currentUser()
}
```

## Current implementation status

As of the latest commit, the codebase is **fully functional** with all core features implemented:

✅ **Completed features:**
- Next.js 15 app with App Router and Turbopack
- Full tldraw v4 integration (editor, viewer, snapshots)
- Clerk authentication with protected routes
- Prisma database with User, Project, Comment models
- Complete API routes for CRUD operations
- Dashboard with project grid, thumbnails, search
- Editor with auto-save, manual save, thumbnail generation
- Public viewer with read-only canvas and comment system
- Vercel Blob integration for thumbnail storage
- Responsive UI with Tailwind CSS v4

🚧 **Potential enhancements** (see ARCHITECTURE.md for full planned features):
- Real-time collaboration with multiple users
- Export to various formats (PDF, SVG, PNG)
- Project templates and starter canvases
- Advanced sharing controls and permissions
- Version history and restore points

## Writing style guidelines

**Sentence case for titles and headings**

Always use sentence case for titles, headings, and labels (NOT Title Case):

✅ **Correct:**
- "Database configuration"
- "Real-time updates"
- "Custom shapes"

❌ **Incorrect:**
- "Database Configuration"
- "Real-Time Updates"
- "Custom Shapes"

**Exception:** Proper nouns, acronyms, and class/component names remain capitalized:
- "PostgreSQL database"
- "Clerk authentication"
- "Tldraw component"

This applies to:
- Markdown headers (`##`, `###`, etc.)
- Bold labels in lists (`**Label**:`)
- Documentation titles
- Code comments describing features
- CONTEXT.md files

## Important reminders

**Do what has been asked; nothing more, nothing less.**

- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (\*.md) or README files unless explicitly requested by the user
- Only use emojis if the user explicitly requests it

**When implementing features:**
- Refer to ARCHITECTURE.md for the intended design and user flow
- Follow existing code patterns and conventions
- Add top-of-file comments to new files
- Run `npm run format` before committing
- Test locally with `npm run dev`
