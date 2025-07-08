import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { checkAccountLock, handleFailedLogin, resetLoginAttempts } from '@/lib/account-security'

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

      // Check account lock status
      const lockInfo = await checkAccountLock(user.id)
      if (lockInfo.isLocked) {
        const remainingMinutes = Math.ceil((lockInfo.remainingTime || 0) / (60 * 1000))
        return NextResponse.json(
          { 
            error: `Your account is temporarily locked. Please try again in ${remainingMinutes} minutes or reset your password.`,
            errorType: 'account_locked',
            remainingTime: lockInfo.remainingTime,
            nextAttemptTime: new Date(Date.now() + (lockInfo.remainingTime || 0)).toISOString()
          },
          { status: 423 }
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

        // Reset login attempts on successful login
        await resetLoginAttempts(user.id)

      } catch (loginError: any) {
        console.error('Login attempt failed:', loginError)
        
        // Handle failed login attempt
        const failedLoginInfo = await handleFailedLogin(user.id)
        
        // Prepare error message based on remaining attempts
        let errorMessage = 'Email or password incorrect. '
        if (failedLoginInfo.attemptsRemaining > 0) {
          errorMessage += `You have ${failedLoginInfo.attemptsRemaining} attempts remaining before your account is locked.`
        } else if (failedLoginInfo.isLocked) {
          const lockMinutes = Math.ceil((failedLoginInfo.remainingTime || 0) / (60 * 1000))
          errorMessage += `Your account has been locked. Please try again in ${lockMinutes} minutes or reset your password.`
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            errorType: failedLoginInfo.isLocked ? 'account_locked' : 'incorrect_credentials',
            hint: 'Remember that passwords are case-sensitive',
            attemptsRemaining: failedLoginInfo.attemptsRemaining,
            nextLockDuration: failedLoginInfo.nextLockDuration
          },
          { status: failedLoginInfo.isLocked ? 423 : 401 }
        )
      }

      if (!result || !result.user) {
        return NextResponse.json(
          { 
            error: 'Authentication failed. Please try again.',
            errorType: 'incorrect_credentials'
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

    } catch (userCheckError) {
      console.error('Error checking user existence:', userCheckError)
      return NextResponse.json(
        { error: 'Unable to verify account. Please try again.' },
        { status: 500 }
      )
    }

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