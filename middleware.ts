/**
 * Minimal middleware - Clerk auth handled at route level instead
 *
 * This file must exist for Clerk to work, but we're not using it for auth checks.
 * Auth protection happens in each protected page/route using auth() directly.
 */

import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk middleware with NO protection - all routes public by default
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
