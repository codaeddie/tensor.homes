# tensor.homes - Complete Architecture Breakdown

## The Stack (What You Actually Built)

```
┌─────────────────────────────────────────────────────────┐
│                     USER INTERFACE                       │
│                                                           │
│  Landing Page  →  Sign In  →  Dashboard  →  Editor       │
│       (/)          (/signin)   (/dashboard)   (/editor)  │
│                                                           │
│                    ↓ Protected by Clerk v5               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  CLERK MIDDLEWARE                        │
│                                                           │
│  • Uses: clerkMiddleware (v5) ✅                         │
│  • Protects: /dashboard, /editor, /api/*                │
│  • Public: /, /signin, /signup, /view/*                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    API ROUTES                            │
│                                                           │
│  POST   /api/projects        - Create project            │
│  GET    /api/projects        - List user's projects      │
│  GET    /api/projects/[id]   - Get single project        │
│  PATCH  /api/projects/[id]   - Update project            │
│  DELETE /api/projects/[id]   - Delete project            │
│  POST   /api/projects/[id]/publish - Toggle publish      │
│  POST   /api/comments        - Add comment               │
│  GET    /api/comments/[projectId] - Get comments         │
│                                                           │
│  Runtime: nodejs (for Prisma compatibility)              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────┬────────────────────────────────┐
│    PRISMA CLIENT       │      VERCEL BLOB               │
│                        │                                 │
│  Location:             │  Purpose: Thumbnail storage     │
│  app/generated/prisma/ │                                 │
│                        │  Upload via:                    │
│  Models:               │  @vercel/blob package           │
│  • User                │                                 │
│  • Project             │  Access token:                  │
│  • Comment             │  BLOB_READ_WRITE_TOKEN          │
└────────────────────────┴────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              POSTGRES DATABASE                           │
│              (Vercel Postgres)                           │
│                                                           │
│  Tables:                                                  │
│  • users                                                  │
│  • projects (stores tldraw snapshots as JSONB)           │
│  • comments                                               │
│                                                           │
│  Connection: DATABASE_URL env var                        │
└─────────────────────────────────────────────────────────┘
```

## Data Flow for Key Operations

### Creating a New Project
```
1. User clicks "New Project" on /dashboard
2. Redirects to /editor
3. User draws on tldraw canvas
4. User clicks "Save Project"
5. Frontend:
   - Gets snapshot using getSnapshot(editor.store)
   - Generates thumbnail using editor.toImage()
   - Converts thumbnail to base64 data URL
6. POST /api/projects with:
   - title
   - snapshot (TLStoreSnapshot)
   - thumbnailDataUrl
7. Backend:
   - Creates User record (upsert with Clerk data)
   - Creates Project record in Postgres
   - Uploads thumbnail to Vercel Blob
   - Updates Project with thumbnailUrl
8. Redirects to /editor/[id]
```

### Auto-saving Existing Project
```
1. User on /editor/[id]
2. Every 5 seconds (setInterval):
   - Get current snapshot
   - PATCH /api/projects/[id] with snapshot
3. Backend:
   - Verifies ownership (userId matches)
   - Updates project.snapshot
   - Updates project.updatedAt
4. Shows "Saved" indicator in UI
```

### Viewing Published Project
```
1. User navigates to /view/[id]
2. Page is PUBLIC (no auth required)
3. Loads:
   - Project snapshot from Postgres
   - Related comments
4. Renders:
   - Read-only tldraw canvas
   - Comment sidebar
5. Users can add comments (requires auth via Clerk)
```

## Environment Variables (Required)

### Clerk Authentication
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Database
```bash
DATABASE_URL=postgresql://...
```

### Storage
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## File Structure Deep Dive

```
tensor.homes/
├── app/
│   ├── (app)/                     # Protected routes
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Project gallery
│   │   ├── editor/
│   │   │   ├── page.tsx           # New project
│   │   │   └── [id]/page.tsx      # Edit existing
│   │   ├── view/
│   │   │   └── [id]/page.tsx      # Public read-only
│   │   └── layout.tsx             # Protected layout
│   │
│   ├── (auth)/                    # Auth routes (public)
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── api/                       # API routes
│   │   ├── projects/
│   │   │   ├── route.ts           # List/Create
│   │   │   └── [id]/
│   │   │       ├── route.ts       # Get/Update/Delete
│   │   │       └── publish/route.ts
│   │   └── comments/
│   │       ├── route.ts           # Create comment
│   │       └── [projectId]/route.ts
│   │
│   ├── generated/                 # Prisma client output
│   │   └── prisma/
│   │
│   ├── globals.css
│   ├── layout.tsx                 # Root layout with ClerkProvider
│   └── page.tsx                   # Landing page
│
├── lib/
│   ├── blob.ts                    # Vercel Blob helpers
│   ├── prisma.ts                  # Prisma client singleton
│   └── types.ts                   # TypeScript types
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration files
│
├── middleware.ts                  # Clerk auth middleware
├── next.config.ts                 # Next.js config
├── package.json
├── tsconfig.json
└── .env.local                     # Local env vars
```

## Critical Technical Details

### 1. Prisma Client Custom Output
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../app/generated/prisma"
}
```
- Non-standard location
- Must be in .gitignore
- Generated on every build

### 2. tldraw v4 Snapshot Storage
```typescript
// Store only document, not session state
const { document: snapshot } = getSnapshot(editor.store);

// Stored in Postgres as JSONB:
snapshot: Json
```

### 3. Thumbnail Generation (v4 API)
```typescript
// v4 uses editor.toImage(), NOT exportToBlob (deprecated)
const shapeIds = editor.getCurrentPageShapeIds();
const { blob } = await editor.toImage([...shapeIds], {
  format: "png",
  background: true,
});
```

### 4. Clerk Middleware Evolution
```typescript
// ❌ v4 (Deprecated) - authMiddleware
// ✅ v5 (Current) - clerkMiddleware with createRouteMatcher

// Default behavior flipped:
// v4: Protected by default (opt-out with publicRoutes)
// v5: Public by default (opt-in with auth.protect())
```

### 5. API Route Runtime
```typescript
export const runtime = "nodejs"; // Required for Prisma
```
- Edge runtime doesn't support Prisma
- Must specify nodejs for database operations

## Common Deployment Issues

### Issue #1: Wrong Project Deployed
**Symptom:** Build logs show `vite build` instead of `next build`
**Cause:** Vercel connected to wrong repo/branch
**Fix:** Delete project, reimport from correct repo

### Issue #2: Clerk Auth Errors
**Symptom:** "Can't detect clerkMiddleware" errors
**Cause:** Using deprecated authMiddleware
**Fix:** Update to clerkMiddleware (v5)

### Issue #3: Prisma Generation Fails
**Symptom:** "Can't find @prisma/client"
**Cause:** Build doesn't run `prisma generate`
**Fix:** Ensure build script has `prisma generate &&`

### Issue #4: Environment Variables Missing
**Symptom:** Various auth/database/storage errors
**Cause:** Env vars not set in Vercel
**Fix:** Add all required vars in Vercel dashboard

### Issue #5: Turbopack Build Issues
**Symptom:** Build hangs or fails on Vercel
**Cause:** Turbopack still experimental
**Fix:** Remove `--turbopack` from build script

## Verification Checklist

After deployment, verify:
- [ ] Landing page loads
- [ ] Sign in redirects to Clerk
- [ ] Dashboard shows empty state or projects
- [ ] Creating new project works
- [ ] Auto-save triggers every 5s
- [ ] Thumbnails generate and display
- [ ] Publishing toggles correctly
- [ ] View page is publicly accessible
- [ ] Comments system works
- [ ] All API routes respond correctly

## Performance Characteristics

### What Works Well
- ✅ tldraw canvas renders smoothly
- ✅ Auto-save doesn't block UI
- ✅ Thumbnails load quickly from CDN
- ✅ Prisma queries are efficient

### What Could Be Improved
- ⚠️ Large snapshots (>1MB JSON) slow down saves
- ⚠️ No optimistic UI updates yet
- ⚠️ No real-time multiplayer yet
- ⚠️ Bundle size is large (2MB+ for tldraw)

## Next-Level Improvements

1. **Real-time Collaboration**
   - Add Liveblocks or Partykit
   - Sync tldraw state across users

2. **Better Thumbnail Strategy**
   - Generate thumbnails server-side
   - Use smaller canvas viewport

3. **Bundle Optimization**
   - Code-split tldraw editor
   - Lazy load heavy components

4. **Caching Layer**
   - Add Redis for session storage
   - Cache frequently accessed projects

5. **Search & Discovery**
   - Full-text search on project titles
   - Tag system for organization
   - Public gallery of published works

---

**Bottom Line:** Your architecture is solid. The issue was just Vercel deploying the wrong codebase. Once that's fixed, this thing will fly. 🚀
