import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import jwt from 'jsonwebtoken'

interface MobileUserResponse {
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
        address?: string
      }
      role: string
      preferences: {
        categories: string[]
        notifications: boolean
        radius: number
      }
      stats: {
        postsCount: number
        followersCount: number
        followingCount: number
        savedPostsCount: number
        likedPostsCount: number
      }
      deviceInfo?: {
        platform?: string
        appVersion?: string
        lastSeen?: string
      }
      joinedAt: string
      lastLogin?: string
    }
  }
  error?: string
  code?: string
}

// Helper function to verify JWT token using direct jsonwebtoken library
async function verifyPayloadToken(token: string) {
  try {
    console.log('🔍 JWT verification starting...')
    
    // Get the secret from environment variable
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) {
      console.error('❌ PAYLOAD_SECRET not found in environment variables')
      return null
    }
    
    console.log('🔑 Using PAYLOAD_SECRET for verification')
    console.log('🔑 Secret exists:', !!secret)
    console.log('🔑 Secret length:', secret.length)
    console.log('🔑 Token to verify:', token.substring(0, 20) + '...')
    
    // Use jsonwebtoken directly instead of payload.jwt.verify
    const decoded = jwt.verify(token, secret) as any
    
    console.log('✅ JWT verification successful')
    console.log('👤 Decoded token contains:', Object.keys(decoded))
    
    if (decoded && typeof decoded === 'object' && 'id' in decoded && 'email' in decoded) {
      console.log('✅ Token has required fields (id, email)')
      console.log('👤 User ID from token:', decoded.id)
      console.log('📧 User email from token:', decoded.email)
      return {
        id: decoded.id as string,
        email: decoded.email as string
      }
    }
    
    console.error('❌ Token missing required fields')
    return null
  } catch (error) {
    console.error('❌ JWT verification failed:', error)
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('❌ JWT Error type:', error.name)
      console.error('❌ JWT Error message:', error.message)
    }
    return null
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileUserResponse>> {
  try {
    console.log('📱 Mobile /me endpoint called')
    console.log('📱 Request method:', request.method)
    console.log('📱 Request URL:', request.url)
    
    // Log all headers for debugging
    console.log('📱 Request headers:')
    request.headers.forEach((value, key) => {
      console.log(`📱   ${key}: ${value}`)
    })
    
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔍 Authorization header:', authHeader ? `"${authHeader}"` : 'null')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header found')
      console.log('❌ AuthHeader exists:', !!authHeader)
      console.log('❌ AuthHeader starts with Bearer:', authHeader?.startsWith('Bearer '))
      return NextResponse.json({
        success: false,
        message: 'Authentication token required',
        error: 'MISSING_TOKEN',
        code: 'AUTH_001'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Extracted token:', token.substring(0, 20) + '...')
    console.log('🔑 Token length:', token.length)

    // Verify the JWT token using Payload's verification
    const tokenData = await verifyPayloadToken(token)
    if (!tokenData) {
      console.log('❌ Token verification failed')
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired authentication token',
        error: 'INVALID_TOKEN',
        code: 'AUTH_002'
      }, { status: 401 })
    }

    console.log('✅ Token verified for user:', tokenData.id)

    // Get Payload instance
    const payload = await getPayload({ config })

    // Fetch user data from database
    const user = await payload.findByID({
      collection: 'users',
      id: tokenData.id
    })

    if (!user) {
      console.log('❌ User not found in database:', tokenData.id)
      return NextResponse.json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
        code: 'AUTH_003'
      }, { status: 404 })
    }

    console.log('✅ User found:', user.email)

    // Get user stats (optional, can be cached)
    let userStats = {
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      savedPostsCount: 0,
      likedPostsCount: 0
    }

    try {
      // Get posts count
      const posts = await payload.find({
        collection: 'posts',
        where: {
          author: {
            equals: user.id
          }
        },
        limit: 0 // Just get count
      })
      userStats.postsCount = posts.totalDocs

      // Get saved locations count (bucket lists)
      const bucketLists = await payload.find({
        collection: 'bucket-lists',
        where: {
          user: {
            equals: user.id
          }
        },
        limit: 0
      })
      userStats.savedPostsCount = bucketLists.totalDocs

    } catch (statsError) {
      console.warn('Warning: Could not fetch user stats:', statsError)
      // Continue without stats rather than failing
    }

    // Extract user preferences
    const preferences = {
      categories: user.interests || [],
      notifications: user.receiveUpdates !== false,
      radius: 5 // Default radius, could be from user preferences
    }

    // Prepare response data
    const responseData = {
      user: {
        id: user.id,
        name: user.name || '',
        email: user.email,
        profileImage: user.profileImage ? {
          url: typeof user.profileImage === 'object' && 'url' in user.profileImage 
            ? user.profileImage.url 
            : null
        } : null,
        location: user.location ? {
          coordinates: user.location.coordinates ? {
            latitude: user.location.coordinates.latitude,
            longitude: user.location.coordinates.longitude
          } : undefined,
          address: user.location.city || user.location.address || undefined
        } : undefined,
        role: user.role || 'user',
        preferences,
        stats: userStats,
        deviceInfo: {
          platform: 'ios',
          appVersion: '1.0.0',
          lastSeen: new Date().toISOString()
        },
        joinedAt: user.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
    }

    console.log('✅ Returning user data for:', user.email)

    return NextResponse.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: responseData
    })

  } catch (error) {
    console.error('❌ Mobile /me endpoint error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR',
      code: 'AUTH_500'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 