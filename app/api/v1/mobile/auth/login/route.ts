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
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { email, password, rememberMe, deviceInfo } = validationResult.data

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
          message: 'Authentication failed',
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
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
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Authentication service unavailable',
        code: 'SERVER_ERROR'
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