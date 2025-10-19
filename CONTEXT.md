# CONTEXT.md - tensor.homes

This file provides comprehensive context for understanding the tensor.homes application, a tldraw-based collaborative drawing platform built with Next.js 15.

## Repository overview

tensor.homes is a Next.js 15 application that provides an infinite canvas drawing experience powered by the tldraw v4 SDK. The application implements a complete project lifecycle management system with three distinct stages: **Backstage** (project dashboard), **Main Stage** (full-featured editor), and **Show Stage** (public viewer with comments).

**Repository purpose:** Provide a production-ready collaborative drawing platform with user authentication, project persistence, thumbnail generation, and public sharing capabilities.

**Version:** 0.1.0
**Node.js:** >=20.0.0 recommended
**React:** 19.1.0
**Next.js:** 15.5.6
**tldraw:** ^4.1.1

## Essential commands

### Development commands

- `npm run dev` - Start development server on http://localhost:3000 with Turbopack hot reload
- `npm run build` - Build production-optimized application with Turbopack
- `npm run start` - Run production server (requires build first)

### Code quality commands

- `npm run lint` - Check code quality with Biome linter
- `npm run format` - Auto-format code with Biome (2-space indentation)

### Database commands

- `npx prisma generate` - Generate Prisma client to `app/generated/prisma` (run after schema changes)
- `npx prisma migrate dev --name <name>` - Create and apply database migration
- `npx prisma studio` - Open visual database editor at http://localhost:5555
- `npx prisma db push` - Push schema changes without migrations (development only)

## High-level architecture

### Three-stage system

**1. Backstage (Dashboard) - `/dashboard`**
- Project gallery with thumbnail grid view
- Search and filter projects by title
- Quick actions: edit, delete, publish/unpublish
- "New Project" button to create blank canvas
- Shows project metadata: title, update timestamp, publish status

**2. Main Stage (Editor) - `/editor` and `/editor/[id]`**
- Full tldraw v4 infinite canvas editor
- Auto-save every 5 seconds to database
- Manual save with thumbnail regeneration
- Title editing with real-time updates
- Publish/unpublish toggle
- Link to public view when published

**3. Show Stage (Viewer) - `/view/[id]`**
- Read-only tldraw canvas (no editing tools)
- Comment system for viewer feedback
- Public access (no authentication required)
- Share link for external users

### Technology stack

**Framework and runtime:**
- **Next.js 15** - App Router with RSC (React Server Components)
- **Turbopack** - Fast development and production builds
- **React 19.1.0** - Latest React with improved server/client components
- **TypeScript 5** - Strict type checking enabled

**Drawing and visualization:**
- **tldraw v4** - Infinite canvas SDK with complete shape library
- Snapshot-based persistence (TLStoreSnapshot)
- Client-side thumbnail generation via `editor.toImage()`

**Authentication:**
- **Clerk** - Complete user management with JWT auth
- Middleware-based route protection
- User profile sync to database

**Database:**
- **Prisma** - Type-safe ORM with migration system
- **Prisma Postgres** - Hosted PostgreSQL at db.prisma.io
- Custom client output: `app/generated/prisma` (gitignored)
- Singleton pattern via `lib/prisma.ts`

**Storage:**
- **Vercel Blob** - Serverless object storage for thumbnails
- Base64 → Blob upload pipeline
- Automatic cleanup on project deletion

**Validation and styling:**
- **Zod v4** - Runtime type validation (future use)
- **Tailwind CSS v4** - Utility-first styling
- **Biome** - Fast Rust-based linter and formatter

### Database architecture

**Prisma schema location:** `prisma/schema.prisma`

**User model:**
```prisma
model User {
  id        String   @id              // Clerk user ID
  email     String   @unique          // From Clerk
  name      String?                   // Display name
  createdAt DateTime @default(now())
  projects  Project[]
  comments  Comment[]
}
```

**Project model:**
```prisma
model Project {
  id           String   @id @default(cuid())
  title        String
  snapshot     Json                    // TLStoreSnapshot
  thumbnailUrl String?                 // Vercel Blob URL
  published    Boolean  @default(false)
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  comments     Comment[]

  @@index([userId])
  @@index([published])
}
```

**Comment model:**
```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([projectId])
}
```

**Custom Prisma client location:**
- Generated to: `app/generated/prisma` (not default `node_modules/.prisma`)
- Accessed via singleton: `import { prisma } from '@/lib/prisma'`
- Must run `npx prisma generate` after schema changes
- Directory is gitignored and recreated on deployment

### Routes and API structure

**Application routes (route groups):**

`(app)` - Protected routes requiring authentication:
- `/dashboard` - Project gallery (Backstage)
- `/editor` - New project creator
- `/editor/[id]` - Edit existing project (Main Stage)
- `/view/[id]` - Public viewer (Show Stage, no auth required)

`(auth)` - Authentication pages:
- `/signin` - Clerk sign-in page
- `/signup` - Clerk sign-up page

**Public routes:**
- `/` - Landing/marketing page
- All routes under `/view/*`

**API routes (RESTful design):**

Projects:
- `POST /api/projects` - Create project with optional thumbnail
  - Body: `{ title, snapshot, thumbnailDataUrl? }`
  - Returns: `ProjectMetadata` with ID
  - Auto-syncs Clerk user to database

- `GET /api/projects` - List user's projects
  - Query params: `?search=<term>` (optional)
  - Returns: `ProjectMetadata[]` ordered by `updatedAt DESC`

- `GET /api/projects/[id]` - Get single project
  - Returns: `ProjectWithSnapshot` including full tldraw data

- `PATCH /api/projects/[id]` - Update project
  - Body: `{ title?, snapshot?, thumbnailDataUrl? }`
  - Partial updates supported
  - Thumbnail upload if provided

- `DELETE /api/projects/[id]` - Delete project
  - Cascading delete: removes comments and blob assets
  - Returns 204 on success

- `POST /api/projects/[id]/publish` - Toggle publish status
  - Returns: `{ published: boolean }`

Comments:
- `POST /api/comments` - Add comment to published project
  - Body: `{ projectId, content }`
  - Returns: `CommentWithUser`

- `GET /api/comments/[projectId]` - Get all comments
  - Returns: `CommentWithUser[]` with user details
  - Ordered by `createdAt ASC`

**Authentication enforcement:**
- Middleware (`middleware.ts`) protects `/dashboard` and `/editor` routes
- API routes use `auth()` from `@clerk/nextjs/server`
- Unauthorized requests return 401 status
- User sync happens on first project creation

### Key technical patterns

**tldraw snapshot management:**
- Projects stored as `TLStoreSnapshot` (full serializable state)
- Load snapshot into editor: `<Tldraw snapshot={project.snapshot} />`
- Save snapshot: `getSnapshot(editor.store)` returns current state
- Snapshots include all pages, shapes, bindings, and document state
- No need for `persistenceKey` - database is source of truth

**Auto-save implementation:**
```typescript
// Listen to document changes
editor.store.listen(handleEditorChange, { scope: "document" })

// Debounced save (5 seconds)
useEffect(() => {
  if (hasUnsavedChanges) {
    const timer = setTimeout(() => handleSave(), 5000)
    return () => clearTimeout(timer)
  }
}, [hasUnsavedChanges])
```

**Thumbnail generation pipeline:**
1. Client-side: Get all shape IDs via `editor.getCurrentPageShapeIds()`
2. Generate image: `editor.toImage([...shapeIds], { format: 'png', background: true })`
3. Convert blob to base64 data URL using `FileReader`
4. Upload to Vercel Blob via `lib/blob.ts` helper
5. Store returned URL in `Project.thumbnailUrl`
6. Thumbnail generation is non-blocking (failures don't halt save)

**Authentication flow:**
1. User authenticates via Clerk (signin/signup pages)
2. Clerk middleware protects routes, redirects to `/signin` if unauthorized
3. API routes extract `userId` from `auth()` helper
4. On first project creation, user is synced to database via `upsert`
5. Subsequent requests use existing user record

**Comment system architecture:**
- Comments only visible on published projects
- Frontend: Optimistic updates for instant feedback
- Backend: Store in Postgres with foreign key constraints
- Cascading delete: removing project also removes comments
- User details included in responses via Prisma `include`

**Clerk user synchronization:**
```typescript
// Sync Clerk user to database on first project creation
const clerkUser = await currentUser()
await prisma.user.upsert({
  where: { id: userId },
  update: { email, name },
  create: { id: userId, email, name }
})
```

## Development workflow best practices

### Starting a new feature

1. **Review ARCHITECTURE.md** - Understand intended design and user flow
2. **Plan database changes** - Update `prisma/schema.prisma` if needed
3. **Generate Prisma client** - Run `npx prisma generate` after schema changes
4. **Create API routes** - Follow RESTful patterns in `app/api/`
5. **Build UI components** - Use existing patterns from dashboard/editor
6. **Test locally** - Run `npm run dev` and verify all functionality
7. **Format code** - Run `npm run format` before committing

### Working with tldraw

**Loading an existing project:**
```typescript
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

const editorRef = useRef<Editor | null>(null)

<Tldraw
  snapshot={project.snapshot}
  onMount={(editor) => {
    editorRef.current = editor
    // Set up auto-save listener
    editor.store.listen(handleChange, { scope: "document" })
  }}
/>
```

**Saving project changes:**
```typescript
import { getSnapshot } from 'tldraw'

async function saveProject() {
  const snapshot = getSnapshot(editorRef.current.store)
  await fetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot })
  })
}
```

**Generating thumbnails:**
```typescript
// Get current page shapes
const shapeIds = editor.getCurrentPageShapeIds()

// Generate PNG with background
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

// Send to API
await fetch(`/api/projects/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ thumbnailDataUrl: dataUrl })
})
```

### Working with Clerk authentication

**Middleware configuration (`middleware.ts`):**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/editor(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect() // Redirect to /signin if not authenticated
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

**API route authentication:**
```typescript
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Get authenticated user ID
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Optionally get full user details
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Proceed with authenticated logic
}
```

### Database workflow

**After schema changes:**
```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Create migration (production)
npx prisma migrate dev --name add_feature_x

# OR push directly (development only)
npx prisma db push
```

**Accessing the database:**
```typescript
import { prisma } from '@/lib/prisma'

// Create
const project = await prisma.project.create({
  data: { title, snapshot, userId }
})

// Read with relations
const project = await prisma.project.findUnique({
  where: { id },
  include: {
    user: true,
    comments: {
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    }
  }
})

// Update
await prisma.project.update({
  where: { id },
  data: { title, snapshot }
})

// Delete (cascading)
await prisma.project.delete({
  where: { id }
})
```

## Asset and content management

### Vercel Blob integration

**Upload helper (`lib/blob.ts`):**
```typescript
import { put } from '@vercel/blob'

export async function uploadThumbnail(
  dataUrl: string,
  projectId: string
): Promise<string> {
  // Convert data URL to Buffer
  const base64Data = dataUrl.split(',')[1]
  const buffer = Buffer.from(base64Data, 'base64')

  // Upload to Vercel Blob
  const { url } = await put(
    `thumbnails/${projectId}.png`,
    buffer,
    { access: 'public' }
  )

  return url
}
```

**Cleanup on deletion:**
- When project is deleted, associated blob URLs should be cleaned up
- Use `del()` from `@vercel/blob` to remove thumbnails
- Implemented in `DELETE /api/projects/[id]` route

### Type definitions

**Core types (`lib/types.ts`):**
```typescript
import type { TLStoreSnapshot } from 'tldraw'

// Lightweight metadata for lists
export interface ProjectMetadata {
  id: string
  title: string
  thumbnailUrl: string | null
  published: boolean
  createdAt: Date
  updatedAt: Date
}

// Full project with tldraw snapshot
export interface ProjectWithSnapshot extends ProjectMetadata {
  snapshot: TLStoreSnapshot
}

// Comment with user details
export interface CommentWithUser {
  id: string
  content: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
}
```

## Performance considerations

### Rendering optimization

**tldraw performance:**
- Only render visible shapes (viewport culling built-in)
- Shape geometry cached automatically
- Use `scope: "document"` listener to avoid presence updates
- Snapshot serialization is optimized by tldraw

**React optimization:**
- Use `useRef` for editor instance (avoid re-renders)
- Debounce auto-save to prevent excessive API calls
- Lazy load tldraw CSS (`import 'tldraw/tldraw.css'`)
- Server components for static content (landing, auth pages)

### Database optimization

**Indexes:**
- `userId` on projects (fast user project lookup)
- `published` on projects (fast public project filtering)
- `projectId` on comments (fast comment retrieval)

**Selective loading:**
- List view: only load `ProjectMetadata` (no snapshots)
- Editor: load full `ProjectWithSnapshot` on demand
- Comments: load separately via `/api/comments/[projectId]`

### Memory management

**Client-side:**
- Clear auto-save timers on unmount (`useEffect` cleanup)
- Remove store listeners when editor unmounts
- Limit thumbnail size (consider image compression)

**Server-side:**
- Prisma singleton prevents connection pool exhaustion
- Stream large responses if needed (future enhancement)
- Blob storage handles asset deduplication

## Extension points

### Custom tldraw shapes

While not implemented, the architecture supports custom shapes:

```typescript
import { ShapeUtil } from 'tldraw'

class CustomShapeUtil extends ShapeUtil {
  // Define custom shape behavior
  getGeometry() { /* ... */ }
  component() { /* ... */ }
  indicator() { /* ... */ }
}

// Register in Tldraw component
<Tldraw
  shapeUtils={[CustomShapeUtil]}
/>
```

### Additional export formats

Future enhancement: add export buttons to editor

```typescript
// Export to SVG
const svg = await editor.toSvg([...shapeIds])

// Export to PNG (already implemented for thumbnails)
const { blob } = await editor.toImage([...shapeIds], {
  format: 'png',
  scale: 2, // 2x resolution
})
```

### Real-time collaboration

Not implemented, but tldraw supports multiplayer via `@tldraw/sync`:

```typescript
import { useSyncDemo } from '@tldraw/sync'

// WebSocket-based sync
const store = useSyncDemo({ roomId: projectId })

<Tldraw store={store} />
```

## Environment configuration

**Required variables (`.env.local`):**

```bash
# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Prisma Postgres
DATABASE_URL=prisma+postgres://...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**Optional variables:**
- `NODE_ENV` - Automatically set by Next.js
- `NEXT_PUBLIC_APP_URL` - Base URL for metadata/OG images (future)

## Current implementation status

**Fully implemented features:**
- ✅ Next.js 15 app with App Router and Turbopack
- ✅ Full tldraw v4 integration (editor + viewer)
- ✅ Clerk authentication with protected routes
- ✅ Prisma database with User, Project, Comment models
- ✅ Complete RESTful API for CRUD operations
- ✅ Dashboard with thumbnail grid, search, quick actions
- ✅ Editor with auto-save (5s), manual save, title editing
- ✅ Thumbnail generation and Vercel Blob upload
- ✅ Public viewer with read-only canvas
- ✅ Comment system for published projects
- ✅ Responsive UI with Tailwind CSS v4
- ✅ User sync from Clerk to database
- ✅ Cascading deletes and referential integrity

**Planned enhancements (see ARCHITECTURE.md):**
- 🚧 Real-time collaboration with multiple users
- 🚧 Export to PDF, SVG, PNG (high-res)
- 🚧 Project templates and starter canvases
- 🚧 Advanced sharing controls (view/edit permissions)
- 🚧 Version history with restore points
- 🚧 Project folders and organization
- 🚧 Custom domain for shared projects

## Code quality standards

### Biome configuration

**Formatting (`biome.json`):**
- 2-space indentation
- Auto-organize imports on save
- Unknown CSS at-rules disabled (Tailwind v4 compatibility)

**Linting:**
- Recommended rules enabled
- Next.js domain rules enabled
- React domain rules enabled
- Suspicious unknown at-rules disabled

### TypeScript configuration

**Compiler options (`tsconfig.json`):**
- Target: ES2017
- Strict mode enabled
- Path alias: `@/*` → project root
- Module resolution: bundler (Next.js optimized)

### Documentation standards

**Top-of-file comments:**
All files should include descriptive comments:

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

**Sentence case for headings:**
- ✅ "Database configuration"
- ❌ "Database Configuration"

## Writing style guidelines

**Always use sentence case** for titles, headings, and labels (NOT Title Case).

**Correct:**
- "Database configuration"
- "Real-time updates"
- "Custom shapes and tools"

**Incorrect:**
- "Database Configuration"
- "Real-Time Updates"
- "Custom Shapes And Tools"

**Exceptions:**
- Proper nouns: "PostgreSQL", "Clerk", "Tldraw"
- Acronyms: "API", "JWT", "SVG"
- Class names: "ProjectMetadata", "Tldraw"

This applies to:
- Markdown headers
- Bold labels in documentation
- Code comments
- UI text and labels

This context file provides the essential architectural understanding needed to navigate, understand, and contribute to the tensor.homes codebase effectively.
