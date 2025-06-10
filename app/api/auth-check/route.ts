import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Fast token check without try-catch overhead
  const token = request.cookies.get('payload-token')?.value
  
  if (!token) {
    return new NextResponse(
      JSON.stringify({ authenticated: false, isAdmin: false }),
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-status': 'unauthenticated',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    )
  }

  // Check if user is admin by decoding token
  let isAdmin = false
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return new NextResponse(
          JSON.stringify({ authenticated: false, isAdmin: false, error: 'Token expired' }),
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'x-auth-status': 'expired',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
          }
        )
      }
      
      // Check admin email
      const allowedAdminEmail = 'antonio_kodheli@icloud.com'
      isAdmin = payload.email === allowedAdminEmail
    }
  } catch (error) {
    console.error('Error decoding token:', error)
  }

  // Fast response for authenticated users
  return new NextResponse(
    JSON.stringify({ authenticated: true, isAdmin }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'x-auth-status': 'authenticated',
        'x-admin-status': isAdmin ? 'admin' : 'user',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  )
} 