import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import getOrCreateDB from "./models/server/dbSetup";
import getOrCreateStorage from "./models/server/storageSetup";

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const isAuthRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Get the Zustand persisted auth state
  const authStore = request.cookies.get('auth');
  let isAuthenticated = false;
  
  try {
    if (authStore?.value) {
      const { state } = JSON.parse(authStore.value);
      // Check for both session and user in the Zustand store
      isAuthenticated = !!(state?.session && state?.user);
    }
  } catch (error) {
    console.error('Error parsing auth store:', error);
  }
  
  // If trying to access auth routes while logged in, redirect to home
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Only initialize DB and storage for non-auth routes
  if (!isAuthRoute) {
    // Initialize DB and storage
    await Promise.all([
      getOrCreateDB(),
      getOrCreateStorage()
    ]);

    // If trying to access protected routes while logged out, redirect to login
    if (!isAuthenticated && !request.nextUrl.pathname.startsWith('/_next')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  /* match all request paths except for the one that
   start with:
    - api
    - _next/static
    - _next/image
    - favicon.ico
  */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
