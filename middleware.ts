// middleware.ts - Capacitor Mobile App Optimized
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  
  // Detect Capacitor mobile apps specifically
  const isCapacitorApp = userAgent.includes('Capacitor') || userAgent.includes('GroundedGems')
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

  // For Capacitor apps, absolutely NO redirects except for root
  // This prevents the app from opening external browser
  if (isCapacitorApp) {
    // Only handle the root path, let client handle everything else
    if (pathname === '/') {
      // Simple redirect to login, no auth checking
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // For all other routes in Capacitor, let them load directly
    // The client-side will handle authentication and navigation
    return NextResponse.next()
  }

  // For mobile browsers (not Capacitor), be more permissive
  if (isMobile) {
    // Only redirect root path
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Let mobile browsers load routes naturally
    return NextResponse.next()
  }

  // For desktop web browsers, minimal auth checking
  const authCookie = request.cookies.get('payload-token')
  const isAuthenticated = !!authCookie?.value

  // Only handle root path redirects for web
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
     * Match only essential paths, exclude static resources
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|media|admin|.*\\..*).*)',
  ],
}