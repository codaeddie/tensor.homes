/**
 * Clerk authentication middleware
 *
 * Protects routes under /dashboard and /editor from unauthorized access.
 * Public routes include /, /signin, /view/*, and all /API routes.
 *
 * Uses Edge Runtime (default) - Clerk is fully compatible with Edge Runtime.
 * Uses manual auth check pattern with redirectToSignIn() for unauthenticated users.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/editor(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  const isProtected = isProtectedRoute(req);

  console.log(`[MIDDLEWARE] Route: ${path} | Protected: ${isProtected}`);

  if (isProtected) {
    console.log(`[MIDDLEWARE] Checking auth for protected route: ${path}`);

    try {
      const { userId, redirectToSignIn } = await auth();
      console.log(`[MIDDLEWARE] Auth result - userId: ${userId ? 'EXISTS' : 'NULL'}`);

      if (!userId) {
        console.log(`[MIDDLEWARE] Redirecting to sign-in from: ${path}`);
        return redirectToSignIn();
      }

      console.log(`[MIDDLEWARE] Auth SUCCESS for ${path}`);
    } catch (error) {
      console.error(`[MIDDLEWARE] Auth ERROR on ${path}:`, error);
      return NextResponse.json(
        { error: "Authentication failed", path, message: String(error) },
        { status: 500 }
      );
    }
  } else {
    console.log(`[MIDDLEWARE] Public route, skipping auth: ${path}`);
  }

  console.log(`[MIDDLEWARE] Allowing request to: ${path}`);
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and auth pages
    "/((?!_next|signin|signup|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
