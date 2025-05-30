import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    const { email, password, rememberMe } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Attempt to login using Payload's auth
    const result = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
      req: request,
    })

    if (!result.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Set cookie options based on rememberMe
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {}), // 30 days if remember me
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        profileImage: result.user.profileImage,
        location: result.user.location,
        role: result.user.role,
      },
      token: result.token, // Include token for mobile apps
    })

    // Set the authentication cookie
    if (result.token) {
      response.cookies.set('payload-token', result.token, cookieOptions)
    }

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
} 