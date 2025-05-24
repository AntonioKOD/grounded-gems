// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Payload’s default cookiePrefix is “payload” → cookie name is “payload-token”
  const token = req.cookies.get('payload-token')

  // If there’s no payload-token, redirect straight to /login
  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Otherwise let the request through
  return NextResponse.next()
}

// Only protect routes that require authentication (user actions):
export const config = {
  matcher: [
    '/add-location/:path*',
    '/events/create/:path*',
    '/events/requests/:path*',
    '/feed/:path*',
    '/profile/:path*',
    '/matchmaking/:path*',
    '/notifications/:path*',
    '/post/:path*',
    '/verify/:path*',
  ],
}