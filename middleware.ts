// middleware.ts - Mobile-Optimized, Minimal Redirects
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  const isMobile = /Mobile|Android|iOS|iPhone|iPad/.test(userAgent)
  
  // Skip middleware for all static resources and API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.webmanifest') ||
    pathname.includes('.') || // Any file with extension
    pathname.startsWith('/admin') || // Payload admin
    pathname.startsWith('/media/') // Media files
  ) {
    return NextResponse.next()
  }

  // For mobile apps (Capacitor), minimize server-side redirects
  // Let the client handle navigation and authentication
  if (isMobile || request.headers.get('sec-fetch-dest') === 'document') {
    // Only redirect root path, let client handle auth state
    if (pathname === '/') {
      // Default to login page, let client redirect if authenticated
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // For all other routes, let them load and handle auth client-side
    return NextResponse.next()
  }

  // For web browsers, minimal auth checking
  const authCookie = request.cookies.get('payload-token')
  const isAuthenticated = !!authCookie?.value

  // Only handle root path redirects
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/feed', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Let all other routes load naturally
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match only essential paths, exclude more static resources
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|media|admin|.*\\..*).*)',
  ],
}