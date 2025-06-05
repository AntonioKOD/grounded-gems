import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Input validation schema
const tokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceInfo: z.object({
    platform: z.string(),
    version: z.string().optional(),
    model: z.string().optional(),
    osVersion: z.string().optional(),
  }).optional(),
})

interface TokenRegistrationResponse {
  success: boolean
  message: string
  error?: string
  code?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<TokenRegistrationResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Check if user is authenticated
    const user = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'User not authenticated',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = tokenSchema.safeParse(body)
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

    const { token, platform, deviceInfo } = validationResult.data

    // Check if token already exists for this user
    const existingTokens = await payload.find({
      collection: 'device-tokens',
      where: {
        and: [
          { user: { equals: user.id } },
          { token: { equals: token } }
        ]
      },
      limit: 1
    })

    if (existingTokens.docs.length > 0) {
      // Update existing token with latest device info
      await payload.update({
        collection: 'device-tokens',
        id: existingTokens.docs[0].id,
        data: {
          platform,
          deviceInfo,
          lastSeen: new Date(),
          isActive: true,
        }
      })

      console.log(`Updated existing token for user ${user.id}`)
    } else {
      // Create new token record
      await payload.create({
        collection: 'device-tokens',
        data: {
          user: user.id,
          token,
          platform,
          deviceInfo,
          isActive: true,
          createdAt: new Date(),
          lastSeen: new Date(),
        }
      })

      console.log(`Created new token for user ${user.id}`)
    }

    // Deactivate old tokens for this user (keep only the latest)
    const userTokens = await payload.find({
      collection: 'device-tokens',
      where: {
        and: [
          { user: { equals: user.id } },
          { token: { not_equals: token } }
        ]
      }
    })

    // Deactivate old tokens but keep them for analytics
    for (const oldToken of userTokens.docs) {
      await payload.update({
        collection: 'device-tokens',
        id: oldToken.id,
        data: {
          isActive: false,
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Device token registered successfully'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Token registration error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Token registration service unavailable',
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