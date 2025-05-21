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

// Only run on your protected routes:
export const config = {
  matcher: [
    '/add-location/:path*',
    '/events/:path*',
    '/feed/:path*',
    '/profile/:path*',
    '/explore/:path*',
    '/matchmaking/:path*',
    '/notifications/:path*',
    '/post/:path*',
    '/map/:path*',
  ],
}