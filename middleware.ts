/**
 * Clerk authentication middleware.
 *
 * Protects routes under /dashboard and /editor from unauthorized access.
 * Public routes include /, /signin, /view/*, and all /API routes.
 *
 * Uses Node.js runtime (Next.js 15.5+) to support Clerk's crypto module.
 * Uses manual auth check instead of auth.protect() for Node.js runtime compatibility.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/editor(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();

    if (!userId) {
      return redirectToSignIn();
    }
  }
});

export const config = {
  runtime: "nodejs", // Required for Clerk crypto module support (Next.js 15.5+)
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
