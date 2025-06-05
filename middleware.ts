// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeRedirectURL } from '@/lib/url-utils'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for API routes, static files, and internal Next.js routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.webmanifest')
  ) {
    return NextResponse.next()
  }

  // Get the authentication cookie
  const authCookie = request.cookies.get('payload-token')
  const isAuthenticated = !!authCookie?.value

  console.log(`[Middleware] ${pathname} - Authenticated: ${isAuthenticated}`)

  // If accessing root path - implement app launch behavior
  if (pathname === '/') {
    if (isAuthenticated) {
      console.log('[Middleware] Authenticated user accessing /, redirecting to /feed')
      return NextResponse.redirect(new URL('/feed', request.url))
    } else {
      console.log('[Middleware] Unauthenticated user accessing /, redirecting to /login')
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protected routes - require authentication
  const protectedRoutes = ['/feed', '/profile', '/post', '/events', '/map', '/bucket-list', '/notifications']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute && !isAuthenticated) {
    console.log(`[Middleware] Unauthenticated access to protected route ${pathname}, redirecting to /login`)
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url))
  }

  // Redirect authenticated users away from auth pages
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  if (isAuthRoute && isAuthenticated) {
    console.log(`[Middleware] Authenticated user accessing auth route ${pathname}, redirecting to /feed`)
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // Continue with the request
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - manifest.webmanifest (PWA manifest)
     * - Any file with an extension (e.g., .png, .jpg, .css, .js)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\..*).*)',
  ],
}