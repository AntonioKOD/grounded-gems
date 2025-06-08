// middleware.ts - Capacitor Mobile App Optimized
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  
  console.log(`🔍 [Middleware] Processing: ${pathname}`)
  
  // Detect Capacitor mobile apps specifically
  const isCapacitorApp = userAgent.includes('Capacitor') || userAgent.includes('Sacavia')
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
    console.log(`✅ [Middleware] Skipping static resource: ${pathname}`)
    return NextResponse.next()
  }

  // For Capacitor apps, let the home page load naturally
  if (isCapacitorApp) {
    console.log(`📱 [Middleware] Capacitor app - allowing: ${pathname}`)
    // Let all routes load directly for Capacitor apps
    // The client-side will handle authentication and navigation
    return NextResponse.next()
  }

  // For mobile browsers (not Capacitor), let home page load
  if (isMobile) {
    console.log(`📱 [Middleware] Mobile browser - allowing: ${pathname}`)
    // Let mobile browsers load routes naturally, including home page
    return NextResponse.next()
  }

  console.log(`💻 [Middleware] Desktop browser - allowing: ${pathname}`)
  // For desktop web browsers, let home page load naturally
  // Only redirect specific auth-protected routes if needed
  // Remove the automatic redirect from root path to allow home page to load
  
  // Let all routes load naturally - the home page should be accessible to everyone
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