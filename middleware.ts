// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Payload's default cookiePrefix is "payload" → cookie name is "payload-token"
  const token = req.cookies.get('payload-token')

  // If there's no payload-token, redirect straight to /login
  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Add the current path as a redirect parameter
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Otherwise let the request through
  return NextResponse.next()
}

// Only protect routes that require authentication (user actions):
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
    '/verify/:path*',
    '/my-route/:path*',
    
    // API routes that require auth
    '/api/users/me/:path*',
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