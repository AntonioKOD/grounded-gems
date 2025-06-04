import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Fast token check without try-catch overhead
  const token = request.cookies.get('payload-token')?.value
  
  if (!token) {
    return new NextResponse(
      JSON.stringify({ authenticated: false }),
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

  // Fast response for authenticated users
  return new NextResponse(
    JSON.stringify({ authenticated: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'x-auth-status': 'authenticated',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  )
} 