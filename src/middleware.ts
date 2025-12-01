import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

// Define routes that require organization membership
const isProtectedRoute = createRouteMatcher([
  "/:orgSlug/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, orgSlug, orgId } = await auth();
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (isPublicRoute(request)) {
    // If user is signed in and on root, redirect to their org dashboard
    if (userId && pathname === "/") {
      if (orgSlug) {
        return NextResponse.redirect(new URL(`/${orgSlug}`, request.url));
      }
      // If no org, redirect to org selection (will be handled by Clerk)
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Protect all other routes - require authentication
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // For tenant routes, verify the user has access to the organization
  if (isProtectedRoute(request)) {
    const pathOrgSlug = pathname.split("/")[1];
    
    // If user's active org doesn't match the URL, they need to switch orgs
    if (orgSlug && pathOrgSlug !== orgSlug) {
      // Redirect to their actual org dashboard
      return NextResponse.redirect(new URL(`/${orgSlug}`, request.url));
    }
    
    // If user has no org selected, redirect to org selection
    if (!orgId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};




