// middleware.ts - Enhanced Authentication, Security and Performance Management
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting store (simple in-memory for basic protection)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

// Redirect loop detection
const redirectHistory = new Map<string, { count: number; lastRedirect: number }>()
const MAX_REDIRECTS_PER_IP = 5
const REDIRECT_WINDOW_MS = 30000 // 30 seconds

// Check rate limiting - Much more generous limits for better user experience
function checkRateLimit(ip: string, maxRequests: number = 10000, windowMs: number = 15 * 60 * 1000): boolean {
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

// Check for redirect loops
function checkRedirectLoop(ip: string, pathname: string): boolean {
  const now = Date.now()
  const key = `${ip}:${pathname}`
  const record = redirectHistory.get(key)
  
  if (!record || (now - record.lastRedirect) > REDIRECT_WINDOW_MS) {
    redirectHistory.set(key, { count: 1, lastRedirect: now })
    return false
  }
  
  if (record.count >= MAX_REDIRECTS_PER_IP) {
    console.log(`🚫 [Middleware] Redirect loop detected for IP: ${ip}, path: ${pathname}`)
    return true
  }
  
  record.count++
  record.lastRedirect = now
  return false
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('payload-token')?.value
  const rememberMe = request.cookies.get('remember-me')?.value === 'true'
  
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
      const payload = JSON.parse(atob(parts[1] || ''))
      
      // Check token expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // If remember me is enabled, token might be expired but session could still be valid
        // Let the client handle refresh logic in this case
        if (rememberMe) {
          console.log('🔄 [Middleware] Token expired but remember me enabled, allowing client to handle refresh')
          return true // Allow client-side refresh logic to handle this
        }
        return false
      }
      
      return true
    } catch {
      return false
    }
    
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const url = request.nextUrl.clone()
  
  console.log(`🔍 [Middleware] Processing: ${pathname}`)
  
  // Check for redirect loops first
  if (checkRedirectLoop(ip, pathname)) {
    console.log(`🚫 [Middleware] Redirect loop detected, allowing access to prevent infinite loop`)
    return NextResponse.next()
  }
  
  // Special debug logging for reset-password and other auth-related routes
  if (pathname.includes('reset-password') || pathname.includes('forgot-password') || pathname.includes('login') || pathname.includes('signup')) {
    console.log(`🚨 [DEBUG] Auth route detected: ${pathname}`)
  }
  
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
    
    // Check if this is an initial page load vs navigation
    const referer = request.headers.get('referer')
    const isInitialLoad = !referer || !referer.includes(request.nextUrl.origin)
    
    try {
      const token = request.cookies.get('payload-token')?.value
      
      if (!token) {
        console.log(`🚫 [Middleware] No token found for admin access`)
        // For initial loads, let the page handle authentication client-side
        if (isInitialLoad) {
          const response = NextResponse.next()
          response.headers.set('x-admin-auth-required', 'true')
          response.headers.set('x-admin-no-token', 'true')
          return response
        }
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      // Decode token to get user email
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.log(`🚫 [Middleware] Invalid token format for admin access`)
        if (isInitialLoad) {
          const response = NextResponse.next()
          response.headers.set('x-admin-auth-required', 'true')
          response.headers.set('x-admin-invalid-token', 'true')
          return response
        }
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      let payload
      try {
        if (!parts[1]) throw new Error('Invalid token payload')
        payload = JSON.parse(atob(parts[1]))
      } catch {
        console.log(`🚫 [Middleware] Invalid token payload for admin access`)
        if (isInitialLoad) {
          const response = NextResponse.next()
          response.headers.set('x-admin-auth-required', 'true')
          response.headers.set('x-admin-invalid-token', 'true')
          return response
        }
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log(`🚫 [Middleware] Expired token for admin access`)
        if (isInitialLoad) {
          const response = NextResponse.next()
          response.headers.set('x-admin-auth-required', 'true')
          response.headers.set('x-admin-token-expired', 'true')
          return response
        }
        return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
      }

      // Check if user email matches the allowed admin emails
      const userEmail = payload.email
      const allowedAdminEmails = ['antonio_kodheli@icloud.com', 'ermir1mata@yahoo.com'] // Centralized in security config
      
      if (!allowedAdminEmails.includes(userEmail)) {
        console.log(`🚫 [Middleware] Unauthorized admin access attempt from: ${userEmail}`)
        // For unauthorized access, always show access denied (regardless of initial load)
        return new NextResponse('Access Denied: Admin access restricted', { status: 403 })
      }

      console.log(`✅ [Middleware] Admin access granted to: ${userEmail}`)
      const response = NextResponse.next()
      response.headers.set('x-admin-auth-verified', 'true')
      return response

    } catch (error) {
      console.error(`❌ [Middleware] Error checking admin access:`, error)
      if (isInitialLoad) {
        const response = NextResponse.next()
        response.headers.set('x-admin-auth-required', 'true')
        response.headers.set('x-admin-auth-error', 'true')
        return response
      }
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url))
    }
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',                    // Home page
    '/login',              // Login page
    '/signup',             // Signup page (including enhanced flow)
    '/forgot-password',    // Forgot password
    '/reset-password',     // Reset password
    '/verify',             // Email verification
    '/map',                // Public map
    '/explorer',           // Public explorer
    '/locations',          // Public locations listing
    '/post',               // Public post viewing
    '/search',             // Public search
    '/events',             // Public events
    '/home-page-actions',  // Public home actions
    '/test-feed',          // Test feed pages
    '/test-feed-algorithms', // Test feed algorithms
    '/test-upload',        // Test upload page
    '/profile'             // PUBLIC: User profiles (viewing) - anyone can view profiles
  ]
  
  // Define routes that require authentication
  const protectedRoutes = [
    '/feed',               // Personal feed
    '/notifications',      // User notifications
    '/bucket-list',        // Personal bucket lists
    '/planner',            // Trip planner
    '/add-location',       // Adding locations
    '/post/create',        // Creating posts
    '/events/create'       // Creating events
  ]

  // Define specific protected profile sub-routes that require authentication
  const protectedProfileRoutes = [
    '/edit',               // Profile editing
    '/location-dashboard', // Location dashboard
    '/creator-dashboard'   // Creator dashboard
  ]
  
  // Enhanced public route checking function
  function isPublicRoute(pathname: string): boolean {
    // Home page exact match
    if (pathname === '/') return true
    
    // Check each public route
    for (const route of publicRoutes) {
      if (route === '/') continue // Already handled above
      
      // Exact match
      if (pathname === route) return true
      
      // Route with sub-paths (e.g., /signup/enhanced)
      if (pathname.startsWith(route + '/')) return true
    }
    
    // Special handling for profile routes - viewing profiles is public
    if (pathname.startsWith('/profile/')) {
      // Check if it's a protected profile sub-route
      for (const protectedSubRoute of protectedProfileRoutes) {
        if (pathname.includes(protectedSubRoute)) {
          return false // This is a protected profile action
        }
      }
      return true // Regular profile viewing is public
    }
    
    // Special handling for reset-password with tokens
    if (pathname.startsWith('/reset-password')) return true
    if (pathname.startsWith('/forgot-password')) return true
    if (pathname.startsWith('/verify')) return true
    
    return false
  }
  
  // Enhanced protected route checking function
  function isProtectedRoute(pathname: string): boolean {
    // Check explicit protected routes
    for (const route of protectedRoutes) {
      // Exact match
      if (pathname === route) return true
      
      // Route with sub-paths
      if (pathname.startsWith(route + '/')) return true
    }
    
    // Check protected profile sub-routes
    if (pathname.startsWith('/profile/')) {
      for (const protectedSubRoute of protectedProfileRoutes) {
        if (pathname.includes(protectedSubRoute)) {
          return true // This is a protected profile action
        }
      }
    }
    
    return false
  }
  
  // Check if current route is explicitly public
  const routeIsPublic = isPublicRoute(pathname)
  const routeIsProtected = isProtectedRoute(pathname)
  
  // Enhanced debug logging for route matching
  console.log(`🔍 [DEBUG] Route analysis for ${pathname}:`)
  console.log(`🔍 [DEBUG] - routeIsPublic: ${routeIsPublic}`)
  console.log(`🔍 [DEBUG] - routeIsProtected: ${routeIsProtected}`)
  
  // If it's a public route, allow access without authentication
  if (routeIsPublic) {
    console.log(`✅ [Middleware] Allowing public access to: ${pathname}`)
    return NextResponse.next()
  }
  
  // For Capacitor apps, let them handle their own auth
  if (isCapacitorApp) {
    console.log(`📱 [Middleware] Capacitor app - allowing: ${pathname}`)
    return NextResponse.next()
  }

  // For mobile browsers, be more lenient to prevent redirect loops
  if (isMobile) {
    console.log(`📱 [Middleware] Mobile browser - allowing: ${pathname}`)
    return NextResponse.next()
  }

  // Check authentication ONLY for explicitly protected routes
  if (routeIsProtected) {
    const authenticated = await isAuthenticated(request)
    
    if (!authenticated) {
      console.log(`🔒 [Middleware] Unauthenticated access to protected route: ${pathname}, redirecting to login`)
      
      // Redirect to login with return URL
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      
      return NextResponse.redirect(url)
    }
    
    console.log(`✅ [Middleware] Authenticated access to protected route: ${pathname}`)
    return NextResponse.next()
  }

  // For all other routes (not explicitly public or protected), allow access by default
  // This includes dynamic routes like /locations/[id], /events/[id], etc.
  console.log(`✅ [Middleware] Allowing access to unspecified route (default allow): ${pathname}`)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match only essential paths, exclude static resources
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|media|.*\\..*).*)',
  ],
}