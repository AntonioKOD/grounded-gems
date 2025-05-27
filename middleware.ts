// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeRedirectURL } from '@/lib/url-utils'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Fast path exclusions - skip middleware for auth pages, API auth endpoints, and static assets
  if (pathname.startsWith('/login') || 
      pathname.startsWith('/signup') || 
      pathname.startsWith('/verify') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/users/login') ||
      pathname.startsWith('/api/users/signup') ||
      pathname.startsWith('/api/users/verify') ||
      pathname === '/api/users/me' ||  // CRITICAL: Allow /api/users/me to pass through
      pathname.startsWith('/api/auth-check') ||
      pathname.includes('.') ||
      pathname === '/') {
    return NextResponse.next()
  }

  // Quick token check
  const token = req.cookies.get('payload-token')?.value

  // Fast redirect for unauthenticated users
  if (!token) {
    const redirectUrl = safeRedirectURL('/login', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Allow request to proceed
  return NextResponse.next()
}

// Optimized matcher - exclude /api/users/me from matching
export const config = {
  matcher: [
    // Frontend routes that require auth
    '/add-location/:path*',
    '/events/create/:path*',
    '/events/requests/:path*',
    '/feed/:path*',
    '/profile/:path*',
    '/matchmaking/:path*',
    '/notifications/:path*',
    '/post/:path*',
    '/my-route/:path*',
    
    // API routes that require auth (EXCLUDING /api/users/me)
    '/api/users/[id]/:path*',
    '/api/locations/interactions/:path*',
    '/api/locations/event-requests/:path*',
    '/api/locations/save/:path*',
    '/api/locations/subscribe/:path*',
    '/api/notifications/:path*',
    '/api/specials/:path*',
    '/api/upload-image/:path*',
    '/api/upload-media/:path*',
    
    // Admin routes
    '/admin/:path*',
  ],
}