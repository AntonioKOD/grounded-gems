import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const profileQuerySchema = z.object({
  userId: z.string().optional(), // User ID to fetch, defaults to current user
  includeStats: z.string().optional().transform(val => val === 'true'),
  includePosts: z.string().optional().transform(val => val === 'true'),
  postsLimit: z.string().optional().transform(val => parseInt(val || '10')),
  includeFollowers: z.string().optional().transform(val => val === 'true'),
  includeFollowing: z.string().optional().transform(val => val === 'true'),
})

interface MobileProfileResponse {
  success: boolean
  message: string
  data?: {
    user: {
      id: string
      name: string
      email: string
      username?: string
      profileImage?: {
        url: string
      } | null
      coverImage?: {
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
      isVerified: boolean
      preferences: {
        categories: string[]
        notifications: boolean
        radius: number
        primaryUseCase?: string
        budgetPreference?: string
        travelRadius?: number
      }
      stats: {
        postsCount: number
        followersCount: number
        followingCount: number
        savedPostsCount: number
        likedPostsCount: number
        locationsCount: number
        reviewCount: number
        recommendationCount: number
        averageRating?: number
      }
      socialLinks?: Array<{
        platform: string
        url: string
      }>
      interests?: string[]
      deviceInfo?: {
        platform?: string
        appVersion?: string
        lastSeen?: string
      }
      isFollowing?: boolean // Only included if viewing another user's profile
      isFollowedBy?: boolean // Only included if viewing another user's profile
      joinedAt: string
      lastLogin?: string
      website?: string
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
      type?: string
    }>
    followers?: Array<{
      id: string
      name: string
      username?: string
      profileImage?: {
        url: string
      } | null
      bio?: string
      location?: string
      isVerified: boolean
    }>
    following?: Array<{
      id: string
      name: string
      username?: string
      profileImage?: {
        url: string
      } | null
      bio?: string
      location?: string
      isVerified: boolean
    }>
  }
  error?: string
  code?: string
}

// GET /api/v1/mobile/users/profile - Get user profile
export async function GET(request: NextRequest): Promise<NextResponse<MobileProfileResponse>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = profileQuerySchema.safeParse(Object.fromEntries(searchParams))
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

    const { 
      userId: requestedUserId, 
      includeStats = true, 
      includePosts = false, 
      postsLimit = 10,
      includeFollowers = false,
      includeFollowing = false
    } = queryValidation.data

    // Get current authenticated user
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('🔐 [Profile API] Authenticated user:', user?.id)
      }
    } catch (authError) {
      console.log('🔐 [Profile API] Auth error:', authError)
      // If no user ID provided, authentication is required
      if (!requestedUserId) {
        console.log('🔐 [Profile API] No user ID provided and no auth token')
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
      reviewCount: 0,
      recommendationCount: 0,
      averageRating: undefined as number | undefined,
    }

    if (includeStats) {
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

        // Get reviews count
        const reviewsResult = await payload.find({
          collection: 'reviews',
          where: {
            author: { equals: targetUserId }
          },
          limit: 0,
        })
        stats.reviewCount = reviewsResult.totalDocs

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

        // Calculate average rating from reviews
        if (stats.reviewCount > 0) {
          const reviewsWithRatings = await payload.find({
            collection: 'reviews',
            where: {
              author: { equals: targetUserId },
              rating: { exists: true }
            },
            limit: 100,
          })
          
          const totalRating = reviewsWithRatings.docs.reduce((sum: number, review: any) => {
            return sum + (review.rating || 0)
          }, 0)
          
          if (reviewsWithRatings.docs.length > 0) {
            stats.averageRating = totalRating / reviewsWithRatings.docs.length
          }
        }

      } catch (statsError) {
        console.warn('Failed to fetch user stats:', statsError)
      }
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

    // Get recent posts if requested
    let recentPosts: any[] = []
    if (includePosts) {
      try {
        const postsResult = await payload.find({
          collection: 'posts',
          where: {
            author: { equals: targetUserId },
            status: { equals: 'published' }
          },
          sort: 'createdAt-desc',
          limit: postsLimit,
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
              : ''
          } : null,
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          createdAt: post.createdAt,
          type: post.type
        }))
      } catch (postsError) {
        console.warn('Failed to fetch user posts:', postsError)
      }
    }

    // Get followers list if requested
    let followers: any[] = []
    if (includeFollowers) {
      try {
        const followersResult = await payload.find({
          collection: 'users',
          where: {
            following: { contains: targetUserId }
          },
          limit: 50,
          depth: 1
        })

        followers = followersResult.docs.map((user: any) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage ? {
            url: typeof user.profileImage === 'object' && user.profileImage.url
              ? user.profileImage.url 
              : typeof user.profileImage === 'string'
              ? user.profileImage
              : ''
          } : null,
          bio: user.bio,
          location: user.location ? 
            [user.location.city, user.location.state, user.location.country].filter(Boolean).join(', ') 
            : undefined,
          isVerified: user.isVerified || false
        }))
      } catch (followersError) {
        console.warn('Failed to fetch followers:', followersError)
      }
    }

    // Get following list if requested
    let following: any[] = []
    if (includeFollowing && targetUser.following && Array.isArray(targetUser.following)) {
      try {
        const followingIds = targetUser.following.slice(0, 50)
        const followingUsers = await Promise.all(
          followingIds.map(async (followingId: string) => {
            try {
              const user = await payload.findByID({
                collection: 'users',
                id: followingId,
                depth: 1
              })
              return {
                id: user.id,
                name: user.name,
                username: user.username,
                profileImage: user.profileImage ? {
                  url: typeof user.profileImage === 'object' && user.profileImage.url
                    ? user.profileImage.url 
                    : typeof user.profileImage === 'string'
                    ? user.profileImage
                    : ''
                } : null,
                bio: user.bio,
                location: user.location ? 
                  [user.location.city, user.location.state, user.location.country].filter(Boolean).join(', ') 
                  : undefined,
                isVerified: user.isVerified || false
              }
            } catch (error) {
              console.warn(`Failed to fetch following user ${followingId}:`, error)
              return null
            }
          })
        )
        following = followingUsers.filter(user => user !== null)
      } catch (followingError) {
        console.warn('Failed to fetch following:', followingError)
      }
    }

    // Prepare mobile-optimized response
    const response: MobileProfileResponse = {
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: String(targetUser.id),
          name: targetUser.name || '',
          email: isOwnProfile ? targetUser.email : '', // Only show email for own profile
          username: targetUser.username,
          profileImage: targetUser.profileImage ? {
            url: typeof targetUser.profileImage === 'object' && targetUser.profileImage.url
              ? targetUser.profileImage.url 
              : typeof targetUser.profileImage === 'string'
              ? targetUser.profileImage
              : ''
          } : null,
          coverImage: targetUser.coverImage ? {
            url: typeof targetUser.coverImage === 'object' && targetUser.coverImage.url
              ? targetUser.coverImage.url 
              : typeof targetUser.coverImage === 'string'
              ? targetUser.coverImage
              : ''
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
          isVerified: targetUser.isVerified || false,
          preferences: {
            categories: targetUser.interests || [],
            notifications: targetUser.notificationSettings?.enabled ?? true,
            radius: targetUser.searchRadius || 25,
            primaryUseCase: targetUser.onboardingData?.primaryUseCase,
            budgetPreference: targetUser.onboardingData?.budgetPreference,
            travelRadius: targetUser.onboardingData?.travelRadius
          },
          stats,
          socialLinks: targetUser.socialLinks || [],
          interests: targetUser.interests || [],
          deviceInfo: isOwnProfile ? (targetUser.deviceInfo ? {
            platform: targetUser.deviceInfo.platform,
            appVersion: targetUser.deviceInfo.appVersion,
            lastSeen: targetUser.deviceInfo.lastSeen,
          } : undefined) : undefined, // Only show device info for own profile
          isFollowing: !isOwnProfile ? isFollowing : undefined,
          isFollowedBy: !isOwnProfile ? isFollowedBy : undefined,
          joinedAt: targetUser.createdAt,
          lastLogin: isOwnProfile ? targetUser.lastLogin : undefined, // Only show last login for own profile
          website: targetUser.website,
        },
        recentPosts: recentPosts.length > 0 ? recentPosts : undefined,
        followers: followers.length > 0 ? followers : undefined,
        following: following.length > 0 ? following : undefined,
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
    console.error('Mobile profile error:', error)
    console.error('Mobile profile error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Profile service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/mobile/users/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get current authenticated user
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
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

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authenticated user found',
          code: 'NO_USER'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log(`Mobile API: Updating profile for user ${currentUser.id}`)

    // Validate update data
    const updateData: any = {}
    
    // Basic profile fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.username !== undefined) updateData.username = body.username
    if (body.bio !== undefined) updateData.bio = body.bio
    if (body.email !== undefined) updateData.email = body.email
    if (body.website !== undefined) updateData.website = body.website
    
    // Location data
    if (body.location !== undefined) updateData.location = body.location
    
    // Preferences
    if (body.interests !== undefined) updateData.interests = body.interests
    if (body.searchRadius !== undefined) updateData.searchRadius = body.searchRadius
    if (body.notificationSettings !== undefined) updateData.notificationSettings = body.notificationSettings
    
    // Social links
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks
    
    // Device info
    if (body.deviceInfo !== undefined) updateData.deviceInfo = body.deviceInfo

    // Update the user
    const updatedUser = await payload.update({
      collection: 'users',
      id: currentUser.id,
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    })
  } catch (error) {
    console.error('Mobile API: Error updating user profile:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user profile',
        message: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 