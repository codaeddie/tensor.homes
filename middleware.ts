/**
 * Minimal Clerk middleware - auth checks happen at route/page level
 * 
 * This middleware ONLY sets up Clerk context. All auth protection
 * happens in pages/layouts using auth() directly.
 */

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  runtime: "nodejs", // Required for Clerk's crypto dependencies
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
