import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Input validation schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long'),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  location: z.object({
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    address: z.string().optional(),
  }).optional(),
  preferences: z.object({
    categories: z.array(z.string()).default([]),
    notifications: z.boolean().default(true),
    radius: z.number().min(1).max(100).default(25),
  }).optional(),
  deviceInfo: z.object({
    deviceId: z.string().optional(),
    platform: z.enum(['ios', 'android']).optional(),
    appVersion: z.string().optional(),
  }).optional(),
  termsAccepted: z.boolean(),
  privacyAccepted: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

interface MobileRegisterResponse {
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
    expiresIn: number
  }
  error?: string
  code?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileRegisterResponse>> {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          error: validationResult.error.errors[0]?.message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { 
      name, 
      username,
      email, 
      password, 
      location, 
      preferences, 
      deviceInfo,
      termsAccepted,
      privacyAccepted
    } = validationResult.data

    // Check terms acceptance
    if (!termsAccepted || !privacyAccepted) {
      return NextResponse.json(
        {
          success: false,
          message: 'Terms and privacy policy must be accepted',
          error: 'Terms and privacy policy acceptance required',
          code: 'TERMS_NOT_ACCEPTED'
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    try {
      const existingUser = await payload.find({
        collection: 'users',
        where: {
          email: {
            equals: email,
          },
        },
        limit: 1,
      })

      if (existingUser.docs.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'User already exists',
            error: 'An account with this email already exists',
            code: 'USER_EXISTS'
          },
          { status: 409 }
        )
      }
    } catch (error) {
      console.error('Error checking existing user:', error)
    }

    // Create user
    const userData = {
      name,
      username,
      email,
      password,
      role: 'user',
      location: location ? {
        coordinates: location.coordinates,
        address: location.address,
      } : undefined,
      interests: preferences?.categories || [],
      notificationSettings: {
        enabled: preferences?.notifications ?? true,
        pushNotifications: true,
        emailNotifications: true,
      },
      deviceInfo: deviceInfo ? {
        ...deviceInfo,
        registeredAt: new Date(),
        lastSeen: new Date(),
      } : undefined,
      searchRadius: preferences?.radius || 25,
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      registrationSource: 'mobile',
    }

    const result = await payload.create({
      collection: 'users',
      data: userData,
    })

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: 'Registration failed',
          error: 'Unable to create user account',
          code: 'REGISTRATION_FAILED'
        },
        { status: 500 }
      )
    }

    // Login the user after successful registration
    const loginResult = await payload.login({
      collection: 'users',
      data: { email, password },
      req: request,
    })

    if (!loginResult.user || !loginResult.token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Registration successful but auto-login failed',
          error: 'Please login manually',
          code: 'AUTO_LOGIN_FAILED'
        },
        { status: 201 }
      )
    }

    // Prepare mobile-optimized response
    const response: MobileRegisterResponse = {
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: result.id as string,
          name: result.name || '',
          email: result.email as string,
          profileImage: result.profileImage ? {
            url: typeof result.profileImage === 'object' && result.profileImage.url
              ? result.profileImage.url
              : typeof result.profileImage === 'string' 
              ? result.profileImage 
              : '' // Fallback for unexpected types
          } : null,
          location: result.location,
          role: result.role || 'user',
          preferences: {
            categories: result.interests || [],
            notifications: result.notificationSettings?.enabled || true,
          },
        },
        token: loginResult.token,
        expiresIn: 24 * 60 * 60, // 1 day in seconds
      },
    }

    return NextResponse.json(response, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile registration error:', error)
    
    // Handle specific Payload validation errors
    if (error instanceof Error && error.message.includes('E11000')) {
      return NextResponse.json(
        {
          success: false,
          message: 'User already exists',
          error: 'An account with this email already exists',
          code: 'DUPLICATE_EMAIL'
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Registration service unavailable',
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