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

    // Enhanced cookie options based on rememberMe
    const baseOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    // Set different expiration times based on remember me
    const cookieOptions = rememberMe 
      ? {
          ...baseOptions,
          maxAge: 30 * 24 * 60 * 60, // 30 days for remember me
        }
      : {
          ...baseOptions,
          maxAge: 24 * 60 * 60, // 24 hours for regular login
        }

    // Update user's last login and remember me preference
    try {
      await payload.update({
        collection: 'users',
        id: result.user.id,
        data: {
          lastLogin: new Date(),
          rememberMeEnabled: rememberMe,
          lastRememberMeDate: rememberMe ? new Date() : undefined,
        },
      })
    } catch (updateError) {
      console.warn('Failed to update user last login info:', updateError)
      // Don't fail the login if this update fails
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
        rememberMeEnabled: rememberMe,
      },
      token: result.token, // Include token for mobile apps
      sessionExpires: rememberMe 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })

    // Set the authentication cookie
    if (result.token) {
      response.cookies.set('payload-token', result.token, cookieOptions)
      
      // Set additional remember me cookie for frontend to check
      if (rememberMe) {
        response.cookies.set('remember-me', 'true', {
          ...baseOptions,
          maxAge: 30 * 24 * 60 * 60, // 30 days
        })
      } else {
        // Clear remember me cookie if not selected
        response.cookies.set('remember-me', '', {
          ...baseOptions,
          maxAge: 0, // Expire immediately
        })
      }
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