# tensor.homes Architecture

## Stack
- Next.js 15 (App Router)
- tldraw SDK  
- Clerk (Auth)
- Prisma + Prisma Postgres (hosted at db.prisma.io)
- Vercel Blob (Asset Storage)

## Database
- Schema: `prisma/schema.prisma`
- Client: `app/generated/prisma` (custom output location)
- Access: `lib/prisma.ts` singleton

## Routes Structure
### Public
- `/` - Landing page (marketing)
- `/signin` - Auth (Clerk)

### Protected (requires auth)
- `/dashboard` - Backstage (project gallery with thumbnails)
- `/editor` - Create new project (tldraw canvas)
- `/editor/[id]` - Edit existing project
- `/view/[id]` - Show stage (read-only + comments)

## API Routes
- `POST /api/projects` - Create project + generate thumbnail
- `GET /api/projects` - List user's projects
- `GET /api/projects/[id]` - Get single project
- `PATCH /api/projects/[id]` - Update project (title, snapshot, published)
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/projects/[id]/publish` - Toggle publish status
- `POST /api/comments` - Add comment to published project
- `GET /api/comments/[projectId]` - Get comments for project

## Key Features
1. **Backstage (Dashboard)**
   - Grid view of projects with thumbnails
   - Search/filter projects
   - Quick actions: edit, delete, publish
   - "New Project" button

2. **Main Stage (Editor)**
   - Full tldraw editor
   - Auto-save every 5 seconds
   - Manual save button
   - Export/share options
   - Publish toggle

3. **Show Stage (View)**
   - Read-only tldraw canvas
   - Comment system (sidebar)
   - Share link
   - No editing allowed

## Technical Details
- **Persistence:** Using `persistenceKey` for local-first editing, then save snapshots to DB
- **Thumbnails:** Generate using `editor.toImage()`, upload to Vercel Blob
- **Auth:** Clerk middleware protects `/dashboard`, `/editor` routes
- **Comments:** Real-time optimistic updates, stored in Postgres

## Environment Variables
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
BLOB_READ_WRITE_TOKEN
```