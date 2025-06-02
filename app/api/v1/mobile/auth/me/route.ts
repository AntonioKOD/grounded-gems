import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

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

export async function GET(request: NextRequest): Promise<NextResponse<MobileUserResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authentication token provided',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      )
    }

    // Verify token and get current user
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token',
          error: 'Authentication token is invalid or expired',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // Get detailed user information
    const detailedUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 2,
    })

    if (!detailedUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'User account no longer exists',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Get user statistics (optional - these might need separate queries depending on your schema)
    let stats = {
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      savedPostsCount: 0,
      likedPostsCount: 0,
    }

    try {
      // Get posts count
      const postsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: user.id }
        },
        limit: 0, // Just get count
      })
      stats.postsCount = postsResult.totalDocs

      // Get saved posts count
      if (detailedUser.savedPosts && Array.isArray(detailedUser.savedPosts)) {
        stats.savedPostsCount = detailedUser.savedPosts.length
      }

      // Get liked posts count  
      if (detailedUser.likedPosts && Array.isArray(detailedUser.likedPosts)) {
        stats.likedPostsCount = detailedUser.likedPosts.length
      }

      // Get followers count
      const followersResult = await payload.find({
        collection: 'users',
        where: {
          following: { contains: user.id }
        },
        limit: 0,
      })
      stats.followersCount = followersResult.totalDocs

      // Get following count
      if (detailedUser.following && Array.isArray(detailedUser.following)) {
        stats.followingCount = detailedUser.following.length
      }

    } catch (statsError) {
      console.warn('Failed to fetch user stats:', statsError)
    }

    // Prepare mobile-optimized response
    const response: MobileUserResponse = {
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: detailedUser.id,
          name: detailedUser.name || '',
          email: detailedUser.email,
          profileImage: detailedUser.profileImage ? {
            url: typeof detailedUser.profileImage === 'object' && detailedUser.profileImage.url
              ? detailedUser.profileImage.url
              : typeof detailedUser.profileImage === 'string' 
              ? detailedUser.profileImage 
              : '' // Fallback for unexpected types
          } : null,
          location: detailedUser.location ? {
            coordinates: detailedUser.location.coordinates,
            address: detailedUser.location.address,
          } : undefined,
          role: detailedUser.role || 'user',
          preferences: {
            categories: detailedUser.interests || [],
            notifications: detailedUser.notificationSettings?.enabled ?? true,
            radius: detailedUser.searchRadius || 25,
          },
          stats,
          deviceInfo: detailedUser.deviceInfo ? {
            platform: detailedUser.deviceInfo.platform,
            appVersion: detailedUser.deviceInfo.appVersion,
            lastSeen: detailedUser.deviceInfo.lastSeen,
          } : undefined,
          joinedAt: detailedUser.createdAt,
          lastLogin: detailedUser.lastLogin,
        },
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile profile error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Profile service unavailable',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 