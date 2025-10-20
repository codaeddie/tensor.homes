# tensor.homes Deployment Fix Plan

## CRITICAL ISSUE IDENTIFIED
Your Vercel project is deploying a **completely different codebase** (a Vite app called "tldrawapp") instead of your local Next.js project (tensor.homes).

## Evidence:
- Local build: `prisma generate && next build --turbopack` (Next.js)
- Vercel build: `vite build` (Vite/React app named "tldrawapp")
- Vercel shows: `> tldrawapp@0.0.0 build`
- Your local package.json shows: `"name": "tensor.homes"`

## Solution Path:

### Step 1: Fix Vercel Connection
You need to either:
1. **Delete the current Vercel project** and redeploy from scratch, OR
2. **Check your GitHub repo** - the wrong repo might be connected to Vercel

### Step 2: Update Clerk Middleware (v4 → v5)
Your middleware is using deprecated `authMiddleware` from Clerk v4. Update to v5:

**Replace `middleware.ts` with:**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/signin(.*)',
  '/signup(.*)',
  '/view(.*)', // Public view routes for published projects
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

### Step 3: Remove Turbopack from Build
Turbopack is still experimental and can cause Vercel issues. Update `package.json`:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "prisma generate && next build",  // ← Remove --turbopack
  "start": "next start",
  "lint": "biome check",
  "format": "biome format --write"
}
```

### Step 4: Fix Prisma Client Generation
Your Prisma output path might cause issues. Consider using default location:

**Option A: Keep custom path (current setup)**
- Ensure `app/generated/prisma` is in `.gitignore`
- Add to `package.json`:
  ```json
  "vercel-build": "prisma generate && next build"
  ```

**Option B: Use default path (recommended)**
Update `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  // Remove output line to use default
}
```
Then update `lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";
```

### Step 5: Verify Environment Variables
Make sure Vercel has ALL required env vars:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`

## How to Deploy Correctly:

1. **Verify your GitHub repo** has the correct code:
   ```bash
   cd C:\Users\eddie\Desktop\errata\tensor.homes
   git remote -v
   git log --oneline -5
   ```

2. **Delete and recreate Vercel project:**
   - Go to vercel.com → Settings → Delete Project
   - Import the project fresh from GitHub
   - Ensure it's connecting to the RIGHT repository

3. **Or update existing connection:**
   - Vercel Dashboard → Settings → Git
   - Verify the connected repo/branch
   - Might need to disconnect and reconnect

## Testing Locally First:
```bash
# Remove turbopack, test production build locally
npm run build
npm start

# Visit http://localhost:3000 and verify everything works
```

## Why This Happened:
You likely have multiple tldraw experiments in different folders, and Vercel got connected to the wrong one. The "tldrawapp" (Vite) project is deploying successfully, but it's not the Next.js project you're actually working on.

## Next Steps:
1. Fix middleware (easy, 2 minutes)
2. Remove turbopack from build (1 minute)
3. Check your Vercel connection (5-10 minutes)
4. Redeploy with correct repo (5 minutes)

Total time to fix: ~20 minutes

The project works locally because you have the right code. Vercel is just deploying something else entirely.
