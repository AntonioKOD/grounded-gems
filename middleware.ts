// middleware.ts - Enhanced Authentication, Security and Performance Management
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting store (simple in-memory for basic protection)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

// Check rate limiting
function checkRateLimit(ip: string, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)
  
  if (!record || (now - record.timestamp) > windowMs) {
    rateLimitStore.set(ip, { count: 1, timestamp: now })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('payload-token')?.value
  
  if (!token) {
    return false
  }

  try {
    // Enhanced token validation
    if (token.length < 10) return false
    
    // Check if token has proper JWT structure (basic check)
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // Decode payload to check expiration (basic validation)
    try {
      const payload = JSON.parse(atob(parts[1]))
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false
      }
    } catch {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const url = request.nextUrl.clone()
  
  console.log(`🔍 [Middleware] Processing: ${pathname}`)
  
  // Security checks first
  
  // 1. Rate limiting check
  if (!checkRateLimit(ip)) {
    console.log(`🚫 [Middleware] Rate limit exceeded for IP: ${ip}`)
    return new NextResponse('Rate limit exceeded', { status: 429 })
  }
  
  // 2. Security headers for all requests
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // 3. Block suspicious requests
  const suspiciousPatterns = [
    /\.php$/,
    /\.asp$/,
    /\.jsp$/,
    /wp-admin/,
    /wp-login/,
    /\.env$/,
    /\.git/,
    /admin\.php/,
    /phpmyadmin/,
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(pathname))) {
    console.log(`🚫 [Middleware] Blocking suspicious request: ${pathname}`)
    return new NextResponse('Not Found', { status: 404 })
  }
  
  // Detect Capacitor mobile apps specifically
  const isCapacitorApp = userAgent.includes('Capacitor') || userAgent.includes('Sacavia')
  const isMobile = /Mobile|Android|iOS|iPhone|iPad/.test(userAgent)
  
  // Skip middleware for most static resources and API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.webmanifest') ||
    pathname.includes('.') || // Any file with extension
    pathname.startsWith('/media/') // Media files
  ) {
    console.log(`✅ [Middleware] Skipping static resource: ${pathname}`)
    return response
  }

  // Special handling for admin routes - restrict to specific email
  if (pathname.startsWith('/admin')) {
    console.log(`🔒 [Middleware] Admin access attempt: ${pathname}`)
    
    try {
      const token = request.cookies.get('payload-token')?.value
      
      if (!token) {
        console.log(`🚫 [Middleware] No token found for admin access`)
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      // Decode token to get user email
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.log(`🚫 [Middleware] Invalid token format for admin access`)
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      let payload
      try {
        payload = JSON.parse(atob(parts[1]))
      } catch {
        console.log(`🚫 [Middleware] Invalid token payload for admin access`)
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log(`🚫 [Middleware] Expired token for admin access`)
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      // Check if user email matches the allowed admin email
      const userEmail = payload.email
      const allowedAdminEmail = 'antonio_kodheli@icloud.com' // Centralized in security config
      
      if (userEmail !== allowedAdminEmail) {
        console.log(`🚫 [Middleware] Unauthorized admin access attempt from: ${userEmail}`)
        return new NextResponse('Access Denied: Admin access restricted', { status: 403 })
      }

      console.log(`✅ [Middleware] Admin access granted to: ${userEmail}`)
      return response

    } catch (error) {
      console.error(`❌ [Middleware] Error checking admin access:`, error)
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
    }
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