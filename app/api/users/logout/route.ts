import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    })
    
    // Clear all authentication-related cookies
    const cookieOptions = {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    }
    
    // Clear main auth token
    response.cookies.set('payload-token', '', cookieOptions)
    
    // Clear remember me cookie
    response.cookies.set('remember-me', '', cookieOptions)
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
} 