import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define which routes should be public (no auth required)
const isPublicRoute = createRouteMatcher([
  '/',                    // Landing page
  '/signin(.*)',         // Sign in pages
  '/signup(.*)',         // Sign up pages
  '/api/webhooks(.*)',   // Webhooks (if you have them)
])

export default clerkMiddleware(async (auth, request) => {
  // If the route is not public, protect it
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
