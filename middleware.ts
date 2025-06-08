// middleware.ts - Authentication and Redirect Management
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('payload-token')?.value
  
  if (!token) {
    return false
  }

  try {
    // Quick token validation - you could make this more sophisticated
    // For now, just check if token exists and is not obviously invalid
    return token.length > 10 // Basic check
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  const url = request.nextUrl.clone()
  
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

  // Define routes that require authentication
  const protectedRoutes = ['/feed', '/profile', '/notifications', '/bucket-list', '/planner']
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify', '/', '/map', '/explorer']
  
  // Check if current route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  
  // For location routes (/locations/[id]), check authentication
  const isLocationRoute = pathname.startsWith('/locations/') && pathname !== '/locations'
  
  // For Capacitor apps, let them handle their own auth
  if (isCapacitorApp) {
    console.log(`📱 [Middleware] Capacitor app - allowing: ${pathname}`)
    return NextResponse.next()
  }

  // Check authentication for routes that need it
  if (isProtectedRoute || isLocationRoute) {
    const authenticated = await isAuthenticated(request)
    
    if (!authenticated) {
      console.log(`🔒 [Middleware] Unauthenticated access to: ${pathname}, redirecting to login`)
      
      // Redirect to login with return URL
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      
      return NextResponse.redirect(url)
    }
  }

  // Allow access to public routes and authenticated protected routes
  console.log(`✅ [Middleware] Allowing access to: ${pathname}`)
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