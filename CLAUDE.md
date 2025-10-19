# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tensor.homes is a Next.js 15 application that provides a tldraw-based visual editor with project management capabilities. Users can create, edit, and share interactive drawings with a backstage (dashboard), main stage (editor), and show stage (viewer) workflow.

## Development Commands

**Start development server:**
```bash
npm run dev
```
The dev server runs on http://localhost:3000 with Turbopack enabled.

**Build for production:**
```bash
npm run build
```

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

**Database operations:**
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name <migration_name>

# Open Prisma Studio to view/edit data
npx prisma studio

# Push schema changes without migrations (development only)
npx prisma db push
```

## Architecture

### Technology Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Drawing SDK:** tldraw v4
- **Authentication:** Clerk
- **Database:** Prisma + Prisma Postgres (hosted at db.prisma.io)
- **Storage:** Vercel Blob for asset storage (thumbnails, exports)
- **Validation:** Zod v4
- **Styling:** Tailwind CSS v4
- **Linting/Formatting:** Biome

### Database Setup

The Prisma schema is located at `prisma/schema.prisma` with three main models:
- **User:** Managed by Clerk, stores basic user info
- **Project:** Contains tldraw snapshots, thumbnails, and publish status
- **Comment:** Associated with published projects

**Important:** Prisma client is generated to a custom location: `app/generated/prisma` (not the default `node_modules/.prisma`). This directory is gitignored and must be regenerated after schema changes using `npx prisma generate`.

To access the database in code, import from `lib/prisma.ts` which provides a singleton PrismaClient instance.

### Routes Architecture

The application is organized into three main stages:

**Public Routes:**
- `/` - Landing/marketing page
- `/signin` - Clerk authentication

**Protected Routes (require authentication):**
- `/dashboard` - "Backstage" - Project gallery with thumbnails, search, and quick actions
- `/editor` - Create new tldraw project
- `/editor/[id]` - Edit existing project with auto-save
- `/view/[id]` - "Show stage" - Read-only public view with comments

### API Routes

All API routes follow RESTful conventions:
- `POST /api/projects` - Create project + generate thumbnail via Vercel Blob
- `GET /api/projects` - List user's projects
- `GET /api/projects/[id]` - Get single project
- `PATCH /api/projects/[id]` - Update project (title, snapshot, published status)
- `DELETE /api/projects/[id]` - Delete project and associated assets
- `POST /api/projects/[id]/publish` - Toggle publish status
- `POST /api/comments` - Add comment to published project
- `GET /api/comments/[projectId]` - Get comments for project

### Key Technical Patterns

**tldraw Integration:**
- Use `persistenceKey` for local-first editing in the browser
- Save snapshots to database periodically (every 5 seconds auto-save)
- Generate thumbnails using `editor.toImage()` and upload to Vercel Blob
- Store full TLStoreSnapshot as JSON in the `Project.snapshot` field

**Authentication:**
- Clerk middleware protects `/dashboard` and `/editor` routes
- User IDs from Clerk are used as primary keys in the User table
- Use `@clerk/nextjs` server helpers for accessing user data in API routes

**Comment System:**
- Real-time optimistic updates on the frontend
- Comments only available on published projects
- Stored in Postgres with proper foreign key constraints

### Environment Variables

Required environment variables:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # Clerk public key
CLERK_SECRET_KEY                    # Clerk secret key
DATABASE_URL                        # Prisma Postgres connection string
BLOB_READ_WRITE_TOKEN              # Vercel Blob storage token
```

Store these in `.env.local` (gitignored).

## Code Style

This project uses Biome for linting and formatting:
- 2-space indentation
- Auto-organize imports enabled
- Next.js and React recommended rules enabled
- Unknown CSS at-rules disabled (for Tailwind compatibility)

### Top-of-File Documentation

When creating or modifying files, add top-of-file comments describing:
- Classes and their responsibilities
- Methods and their parameters/return types
- Interfaces and their fields
- Key aspects of the implementation

Update these comments when changes are made to keep documentation current.

## Import Path Alias

The project uses `@/*` as an alias for the root directory:
```typescript
import { prisma } from '@/lib/prisma'
```

## Current State

As of the latest commit, the codebase is in early development:
- Basic Next.js scaffolding is in place
- Prisma schema is defined but routes/components are not yet implemented
- The ARCHITECTURE.md file contains the full planned feature set
- Only `app/layout.tsx` and `app/page.tsx` exist in the app directory

When implementing features, refer to ARCHITECTURE.md for the intended design and user flow.
