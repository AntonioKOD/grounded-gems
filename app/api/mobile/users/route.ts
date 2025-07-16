import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const userQuerySchema = z.object({
  id: z.string().optional(), // User ID to fetch, defaults to current user
})

interface MobileUserProfileResponse {
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
      bio?: string
      location?: {
        coordinates?: {
          latitude: number
          longitude: number
        }
        address?: string
        city?: string
        state?: string
        country?: string
      }
      role: string
      isCreator: boolean
      creatorLevel?: string
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
        locationsCount: number
      }
      socialLinks?: Array<{
        platform: string
        url: string
      }>
      deviceInfo?: {
        platform?: string
        appVersion?: string
        lastSeen?: string
      }
      isFollowing?: boolean // Only included if viewing another user's profile
      isFollowedBy?: boolean // Only included if viewing another user's profile
      joinedAt: string
      lastLogin?: string
      isVerified: boolean
    }
    recentPosts?: Array<{
      id: string
      title?: string
      content: string
      featuredImage?: {
        url: string
      } | null
      likeCount: number
      commentCount: number
      createdAt: string
    }>
  }
  error?: string
  code?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileUserProfileResponse>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = userQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          error: queryValidation.error.errors[0]?.message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { id: requestedUserId } = queryValidation.data

    // Get current authenticated user
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
      // If no user ID provided, authentication is required
      if (!requestedUserId) {
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
    }

    // Determine which user profile to fetch
    const targetUserId = requestedUserId || currentUser?.id
    const isOwnProfile = currentUser?.id === targetUserId

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'No user ID provided and no authenticated user',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Get detailed user information
    const targetUser = await payload.findByID({
      collection: 'users',
      id: targetUserId,
      depth: 2,
    })

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'User account does not exist',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Get user statistics
    let stats = {
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      savedPostsCount: 0,
      likedPostsCount: 0,
      locationsCount: 0,
    }

    try {
      // Get posts count
      const postsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: targetUserId }
        },
        limit: 0,
      })
      stats.postsCount = postsResult.totalDocs

      // Get locations count (if user has created locations)
      const locationsResult = await payload.find({
        collection: 'locations',
        where: {
          createdBy: { equals: targetUserId }
        },
        limit: 0,
      })
      stats.locationsCount = locationsResult.totalDocs

      // Get saved posts count
      if (targetUser.savedPosts && Array.isArray(targetUser.savedPosts)) {
        stats.savedPostsCount = targetUser.savedPosts.length
      }

      // Get liked posts count  
      if (targetUser.likedPosts && Array.isArray(targetUser.likedPosts)) {
        stats.likedPostsCount = targetUser.likedPosts.length
      }

      // Get followers count
      const followersResult = await payload.find({
        collection: 'users',
        where: {
          following: { contains: targetUserId }
        },
        limit: 0,
      })
      stats.followersCount = followersResult.totalDocs

      // Get following count
      if (targetUser.following && Array.isArray(targetUser.following)) {
        stats.followingCount = targetUser.following.length
      }

    } catch (statsError) {
      console.warn('Failed to fetch user stats:', statsError)
    }

    // Check follow relationship if viewing another user's profile
    let isFollowing = false
    let isFollowedBy = false

    if (currentUser && !isOwnProfile) {
      try {
        // Check if current user follows target user
        if (currentUser.following && Array.isArray(currentUser.following)) {
          isFollowing = currentUser.following.includes(targetUserId)
        }

        // Check if target user follows current user
        if (targetUser.following && Array.isArray(targetUser.following)) {
          isFollowedBy = targetUser.following.includes(currentUser.id)
        }
      } catch (followError) {
        console.warn('Failed to check follow relationship:', followError)
      }
    }

    // Get recent posts (limited to 5 for mobile optimization)
    let recentPosts: any[] = []
    try {
      const postsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: targetUserId },
          status: { equals: 'published' }
        },
        sort: 'createdAt-desc',
        limit: 5,
        depth: 1
      })

      recentPosts = postsResult.docs.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content?.length > 150 
          ? post.content.substring(0, 150) + '...' 
          : post.content,
        featuredImage: post.featuredImage ? {
          url: typeof post.featuredImage === 'object' && post.featuredImage.url
            ? post.featuredImage.url 
            : typeof post.featuredImage === 'string'
            ? post.featuredImage
            : '' // Fallback
        } : null,
        likeCount: post.likeCount || 0,
        commentCount: post.commentCount || 0,
        createdAt: post.createdAt
      }))
    } catch (postsError) {
      console.warn('Failed to fetch user posts:', postsError)
    }

    // Prepare mobile-optimized response
    const response: MobileUserProfileResponse = {
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: String(targetUser.id),
          name: targetUser.name || '',
          email: isOwnProfile ? targetUser.email : '', // Only show email for own profile
          profileImage: targetUser.profileImage ? {
            url: typeof targetUser.profileImage === 'object' && targetUser.profileImage.url
              ? targetUser.profileImage.url 
              : typeof targetUser.profileImage === 'string'
              ? targetUser.profileImage
              : '' // Fallback
          } : null,
          bio: targetUser.bio,
          location: targetUser.location ? {
            coordinates: targetUser.location.coordinates,
            address: targetUser.location.address,
            city: targetUser.location.city,
            state: targetUser.location.state,
            country: targetUser.location.country,
          } : undefined,
          role: targetUser.role || 'user',
          isCreator: targetUser.isCreator || false,
          creatorLevel: targetUser.creatorLevel,
          preferences: {
            categories: targetUser.interests || [],
            notifications: targetUser.notificationSettings?.enabled ?? true,
            radius: targetUser.searchRadius || 25,
          },
          stats,
          socialLinks: targetUser.socialLinks || [],
          deviceInfo: isOwnProfile ? (targetUser.deviceInfo ? {
            platform: targetUser.deviceInfo.platform,
            appVersion: targetUser.deviceInfo.appVersion,
            lastSeen: targetUser.deviceInfo.lastSeen,
          } : undefined) : undefined, // Only show device info for own profile
          isFollowing: !isOwnProfile ? isFollowing : undefined,
          isFollowedBy: !isOwnProfile ? isFollowedBy : undefined,
          joinedAt: targetUser.createdAt,
          lastLogin: isOwnProfile ? targetUser.lastLogin : undefined, // Only show last login for own profile
          isVerified: targetUser.isVerified || false,
        },
        recentPosts: recentPosts.length > 0 ? recentPosts : undefined,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': isOwnProfile 
          ? 'private, max-age=300' // 5 minutes for own profile
          : 'public, max-age=600', // 10 minutes for other profiles
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Authorization'
      }
    })

  } catch (error) {
    console.error('Mobile user profile error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'User service unavailable',
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