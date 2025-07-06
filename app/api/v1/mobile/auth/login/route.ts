import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(false),
  deviceInfo: z.object({
    deviceId: z.string().optional(),
    platform: z.enum(['ios', 'android']).optional(),
    appVersion: z.string().optional(),
  }).optional(),
})

interface MobileLoginResponse {
  success: boolean
  message: string
  data?: {
    user: {
      id: string
      name: string
      email: string
      profileImage?: {
        url: string
      } | null
      location?: {
        coordinates?: {
          latitude: number
          longitude: number
        }
      }
      role: string
      preferences?: {
        categories: string[]
        notifications: boolean
      }
    }
    token: string
    refreshToken?: string
    expiresIn: number
  }
  error?: string
  code?: string
  errorType?: string
  suggestSignup?: boolean
  hint?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileLoginResponse>> {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          error: validationResult.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          errorType: 'validation'
        },
        { status: 400 }
      )
    }

    const { email, password, rememberMe, deviceInfo } = validationResult.data

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
            success: false,
            message: 'Account not found',
            error: 'No account found with this email address. Please check your email or sign up for a new account.',
            code: 'USER_NOT_FOUND',
            errorType: 'user_not_found',
            suggestSignup: true
          },
          { status: 404 }
        )
      }

      const user = userExists.docs[0]

      // Check if account is verified
      if (!user.verified) {
        return NextResponse.json(
          {
            success: false,
            message: 'Email verification required',
            error: 'Please verify your email address before logging in. Check your inbox for a verification link.',
            code: 'UNVERIFIED_EMAIL',
            errorType: 'unverified_email'
          },
          { status: 401 }
        )
      }

      // Check if account is locked or disabled
      if (user.loginAttempts >= 5) {
        return NextResponse.json(
          {
            success: false,
            message: 'Account temporarily locked',
            error: 'Your account has been temporarily locked due to too many failed login attempts. Please try again in 30 minutes or reset your password.',
            code: 'ACCOUNT_LOCKED',
            errorType: 'account_locked'
          },
          { status: 423 }
        )
      }

    } catch (userCheckError) {
      console.error('Error checking user existence:', userCheckError)
      return NextResponse.json(
        {
          success: false,
          message: 'Account verification failed',
          error: 'Unable to verify account. Please try again.',
          code: 'VERIFICATION_ERROR',
          errorType: 'server_error'
        },
        { status: 500 }
      )
    }

    // Attempt to login using Payload's auth
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
      req: request,
    })

    if (!result.user || !result.token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Incorrect password',
          error: 'The password you entered is incorrect. Please check your password and try again.',
          code: 'INCORRECT_PASSWORD',
          errorType: 'incorrect_password',
          hint: 'Remember that passwords are case-sensitive'
        },
        { status: 401 }
      )
    }

    // Update user's last login, device info, and remember me preference
    try {
      const updateData: any = {
        lastLogin: new Date(),
        rememberMeEnabled: rememberMe,
        lastRememberMeDate: rememberMe ? new Date() : undefined,
        loginAttempts: 0, // Reset failed login attempts on successful login
      }
      
      if (deviceInfo) {
        updateData.deviceInfo = {
          ...deviceInfo,
          lastSeen: new Date(),
        }
      }
      
      await payload.update({
        collection: 'users',
        id: result.user.id,
        data: updateData,
      })
    } catch (updateError) {
      console.warn('Failed to update user login info:', updateError)
      // Don't fail the login if this update fails
    }

    // Prepare mobile-optimized response
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days or 1 day in seconds

    const response: MobileLoginResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          name: result.user.name || '',
          email: result.user.email,
          profileImage: result.user.profileImage ? {
            url: typeof result.user.profileImage === 'object' && result.user.profileImage.url
              ? result.user.profileImage.url
              : typeof result.user.profileImage === 'string' 
              ? result.user.profileImage 
              : '' // Fallback for unexpected types
          } : null,
          location: result.user.location,
          role: result.user.role || 'user',
          preferences: {
            categories: result.user.interests || [],
            notifications: result.user.notificationSettings?.enabled || true,
          },
        },
        token: result.token,
        expiresIn,
      },
    }

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile login error:', error)
    
    // Handle specific Payload auth errors
    if (error.message?.includes('Invalid login credentials')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Incorrect password',
          error: 'The password you entered is incorrect. Please check your password and try again.',
          code: 'INCORRECT_PASSWORD',
          errorType: 'incorrect_password',
          hint: 'Remember that passwords are case-sensitive'
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Authentication service unavailable. Please try again.',
        code: 'SERVER_ERROR',
        errorType: 'server_error'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 