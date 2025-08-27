import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Function to generate username suggestions
function generateUsernameSuggestions(baseUsername: string): string[] {
  const suggestions: string[] = []
  const base = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  if (base.length < 3) return suggestions
  
  // Add numbers
  for (let i = 1; i <= 5; i++) {
    const suggestion = `${base}${i}`
    suggestions.push(suggestion)
  }
  
  // Add common suffixes
  const suffixes = ['_', 'x', 'official', 'real', 'the']
  for (const suffix of suffixes) {
    const suggestion = `${base}_${suffix}`
    suggestions.push(suggestion)
  }
  
  // Add random numbers
  for (let i = 0; i < 3; i++) {
    const randomNum = Math.floor(Math.random() * 1000)
    const suggestion = `${base}${randomNum}`
    suggestions.push(suggestion)
  }
  
  return suggestions.slice(0, 8) // Limit to 8 suggestions
}

// Enhanced input validation schema to match web signup
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long'),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  // Location data (optional)
  coords: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  location: z.object({
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    address: z.string().optional(),
  }).optional(),
  // Enhanced preferences matching web signup
  preferences: z.object({
    categories: z.array(z.string()).default([]),
    notifications: z.boolean().default(true),
    radius: z.number().min(1).max(100).default(25),
  }).optional(),
  // Additional data matching web signup structure
  additionalData: z.object({
    username: z.string().optional(),
    interests: z.array(z.string()).default([]),
    receiveUpdates: z.boolean().default(true),
    onboardingData: z.object({
      primaryUseCase: z.enum(['explore', 'plan', 'share', 'connect']).optional(),
      travelRadius: z.string().optional(),
      budgetPreference: z.enum(['free', 'budget', 'moderate', 'premium', 'luxury']).optional(),
      onboardingCompleted: z.boolean().default(true),
      signupStep: z.number().default(3),
    }).optional(),
  }).optional(),
  // Device and app info
  deviceInfo: z.object({
    deviceId: z.string().optional(),
    platform: z.enum(['ios', 'android']).optional(),
    appVersion: z.string().optional(),
  }).optional(),
  // Legal acceptance
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
      username: string
      profileImage?: {
        url: string
      } | null
      location?: {
        coordinates?: {
          latitude: number
          longitude: number
        }
        address?: string
      }
      role: string
      preferences?: {
        categories: string[]
        notifications: boolean
        radius: number
      }
      additionalData?: {
        interests: string[]
        receiveUpdates: boolean
        onboardingData?: {
          primaryUseCase?: string
          travelRadius?: string
          budgetPreference?: string
          onboardingCompleted: boolean
          signupStep: number
        }
      }
    }
    token?: string
    expiresIn?: number
    emailVerificationRequired?: boolean
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
      coords,
      location, 
      preferences, 
      additionalData,
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

      // Enhanced username validation
      if (username) {
        // Validate username format
        if (!/^[a-z0-9_-]+$/.test(username)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid username format',
              error: 'Username can only contain lowercase letters, numbers, hyphens, and underscores',
              code: 'INVALID_USERNAME_FORMAT'
            },
            { status: 400 }
          )
        }

        if (username.length < 3) {
          return NextResponse.json(
            {
              success: false,
              message: 'Username too short',
              error: 'Username must be at least 3 characters long',
              code: 'USERNAME_TOO_SHORT'
            },
            { status: 400 }
          )
        }

        if (username.length > 30) {
          return NextResponse.json(
            {
              success: false,
              message: 'Username too long',
              error: 'Username must be less than 30 characters',
              code: 'USERNAME_TOO_LONG'
            },
            { status: 400 }
          )
        }

        // Check for reserved usernames
        const reservedUsernames = [
          'admin', 'administrator', 'mod', 'moderator', 'support', 'help',
          'api', 'www', 'mail', 'email', 'test', 'demo', 'guest', 'user',
          'root', 'system', 'null', 'undefined', 'sacavia', 'staff',
          'official', 'verify', 'verified', 'bot', 'service'
        ]

        if (reservedUsernames.includes(username)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Reserved username',
              error: 'This username is reserved and cannot be used',
              code: 'RESERVED_USERNAME'
            },
            { status: 400 }
          )
        }

        // Check username availability
        const existingUsername = await payload.find({
          collection: 'users',
          where: {
            username: {
              equals: username,
            },
          },
          limit: 1,
        })

        if (existingUsername.docs.length > 0) {
          // Generate username suggestions
          const suggestions = generateUsernameSuggestions(username)
          
          return NextResponse.json(
            {
              success: false,
              message: 'Username already taken',
              error: 'This username is already in use. Try one of these alternatives:',
              code: 'USERNAME_TAKEN',
              suggestions: suggestions
            },
            { status: 409 }
          )
        }
      }
    } catch (error) {
      console.error('Error checking existing user:', error)
    }

    // Prepare location data (prioritize coords over location)
    const locationData = coords ? {
      coordinates: coords,
      address: location?.address,
    } : location

    // Prepare enhanced user data matching web signup structure
    const userData: any = {
      name,
      username,
      email,
      password,
      role: 'user',
      location: locationData,
      // Store interests from either preferences or additionalData
      interests: additionalData?.interests || preferences?.categories || [],
      // Enhanced preferences
      preferences: {
        categories: additionalData?.interests || preferences?.categories || [],
        radius: preferences?.radius || 25,
        notifications: preferences?.notifications ?? true,
      },
      // Store additional data for enhanced onboarding
      additionalData: additionalData ? {
        interests: additionalData.interests,
        receiveUpdates: additionalData.receiveUpdates,
        onboardingData: additionalData.onboardingData ? {
          primaryUseCase: additionalData.onboardingData.primaryUseCase,
          travelRadius: additionalData.onboardingData.travelRadius || preferences?.radius?.toString() || '5',
          budgetPreference: additionalData.onboardingData.budgetPreference,
          onboardingCompleted: additionalData.onboardingData.onboardingCompleted || true,
          signupStep: additionalData.onboardingData.signupStep || 3,
        } : undefined,
      } : undefined,
      // Device and app tracking
      deviceInfo: deviceInfo ? {
        ...deviceInfo,
        registeredAt: new Date(),
        lastSeen: new Date(),
      } : undefined,
      // Legal and registration metadata
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      registrationSource: 'mobile',
      // Enhanced notification settings
      notificationSettings: {
        enabled: preferences?.notifications ?? true,
        pushNotifications: true,
        emailNotifications: additionalData?.receiveUpdates ?? true,
      },
    }

    console.log('Creating mobile user with enhanced data:', {
      email: userData.email,
      name: userData.name,
      username: userData.username,
      hasLocation: !!userData.location,
      hasInterests: userData.interests?.length > 0,
      hasOnboardingData: !!userData.additionalData?.onboardingData,
      interests: userData.interests,
      onboardingData: userData.additionalData?.onboardingData,
    })

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

    console.log('Mobile user created successfully:', result.id)

    // Attempt to login the user after signup (matching web behavior)
    try {
      const loginResult = await payload.login({
        collection: 'users',
        data: {
          email,
          password,
        },
        req: request,
      })

      // If login succeeds, include token for auto-login
      return NextResponse.json(
        {
          success: true,
          message: 'Account created and logged in successfully',
          data: {
            user: {
              id: String(result.id),
              name: result.name,
              email: result.email,
              username: result.username,
              profileImage: result.profileImage,
              location: result.location,
              preferences: result.preferences,
              additionalData: result.additionalData,
              role: result.role,
            },
            token: loginResult.token,
            expiresIn: 30 * 24 * 60 * 60, // 30 days
          }
        },
        {
          status: 201,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          }
        }
      )

    } catch (loginError: any) {
      console.log('Auto-login failed (likely due to email verification requirement):', loginError.message)
      
      // If auto-login fails due to email verification, return success without token
      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully! Please check your email to verify your account, then you can log in.',
          data: {
            user: {
              id: String(result.id),
              name: result.name,
              email: result.email,
              username: result.username,
              profileImage: result.profileImage,
              location: result.location,
              preferences: result.preferences,
              additionalData: result.additionalData,
              role: result.role,
            },
            emailVerificationRequired: true,
          }
        },
        {
          status: 201,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          }
        }
      )
    }

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