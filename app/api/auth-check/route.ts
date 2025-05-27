import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check for the payload token cookie
    const token = request.cookies.get('payload-token')
    
    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { 
          status: 401,
          headers: {
            'x-auth-status': 'unauthenticated'
          }
        }
      )
    }

    // If we have a token, consider the user authenticated
    // (We don't need to validate the token here, just check if it exists)
    return NextResponse.json(
      { authenticated: true },
      {
        headers: {
          'x-auth-status': 'authenticated'
        }
      }
    )

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { 
        status: 500,
        headers: {
          'x-auth-status': 'error'
        }
      }
    )
  }
} 