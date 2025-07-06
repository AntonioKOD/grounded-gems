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

    // First, check if user exists
    try {
      const userExists = await payload.find({
        collection: 'users',
        where: {
          email: {
            equals: email.toLowerCase(),
          },
        },
        limit: 1,
      })

      if (userExists.docs.length === 0) {
        return NextResponse.json(
          { 
            error: 'No account found with this email address. Please check your email or sign up for a new account.',
            errorType: 'user_not_found',
            suggestSignup: true
          },
          { status: 404 }
        )
      }

      const user = userExists.docs[0]

      // Check if account is verified
      if (!user._verified) {
        return NextResponse.json(
          { 
            error: 'Please verify your email address before logging in. Check your inbox for a verification link.',
            errorType: 'unverified_email',
            userEmail: email
          },
          { status: 401 }
        )
      }

      // Check if account is locked or disabled
      if (user.loginAttempts >= 5) {
        return NextResponse.json(
          { 
            error: 'Your account has been temporarily locked due to too many failed login attempts. Please try again in 30 minutes or reset your password.',
            errorType: 'account_locked'
          },
          { status: 423 }
        )
      }

    } catch (userCheckError) {
      console.error('Error checking user existence:', userCheckError)
      return NextResponse.json(
        { error: 'Unable to verify account. Please try again.' },
        { status: 500 }
      )
    }

    // Attempt to login using Payload's auth
    let result
    try {
      result = await payload.login({
        collection: 'users',
        data: {
          email,
          password,
        },
        req: request,
      })
    } catch (loginError: any) {
      console.error('Login attempt failed:', loginError)
      
      // Handle specific login failures
      if (loginError.message?.includes('Invalid login credentials') || 
          loginError.message?.includes('password') || 
          loginError.message?.includes('credentials') ||
          loginError.name === 'ValidationError' ||
          loginError.status === 401) {
        return NextResponse.json(
          { 
            error: 'Email or password incorrect. Please check your credentials and try again.',
            errorType: 'incorrect_credentials',
            hint: 'Remember that passwords are case-sensitive'
          },
          { status: 401 }
        )
      }
      
      // Re-throw other errors to be handled by the main catch block
      throw loginError
    }

    if (!result || !result.user) {
      return NextResponse.json(
        { 
          error: 'Email or password incorrect. Please check your credentials and try again.',
          errorType: 'incorrect_credentials',
          hint: 'Remember that passwords are case-sensitive'
        },
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
          loginAttempts: 0, // Reset failed login attempts on successful login
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
      { 
        error: 'Authentication service unavailable. Please try again in a few moments.',
        errorType: 'server_error'
      },
      { status: 500 }
    )
  }
} 