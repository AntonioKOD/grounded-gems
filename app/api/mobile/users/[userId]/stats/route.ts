import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileUserStatsResponse {
  success: boolean
  message: string
  data?: {
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
      totalEngagement: number
      totalPosts: number
    }
    achievements: {
      isExpertReviewer: boolean
      isVerified: boolean
      isCreator: boolean
      creatorLevel?: string
      joinDate: string
      daysActive: number
    }
  }
  error?: string
  code?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<MobileUserStatsResponse>> {
  try {
    const { userId } = await params
    const payload = await getPayload({ config })

    // Get current authenticated user for context
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
      // Continue without authentication for public stats
    }

    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid user ID',
          error: 'User ID is required and must be a valid string',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'The specified user does not exist',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Get comprehensive user statistics
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
      totalEngagement: 0,
      totalPosts: 0,
    }

    try {
      // Get posts count
      const postsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: userId }
        },
        limit: 0,
      })
      stats.postsCount = postsResult.totalDocs

      // Get locations count (if user has created locations)
      const locationsResult = await payload.find({
        collection: 'locations',
        where: {
          createdBy: { equals: userId }
        },
        limit: 0,
      })
      stats.locationsCount = locationsResult.totalDocs

      // Get reviews count
      const reviewsResult = await payload.find({
        collection: 'reviews',
        where: {
          author: { equals: userId }
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
          following: { contains: userId }
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
            author: { equals: userId },
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

      // Calculate total engagement (likes + comments + shares)
      const postsWithEngagement = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: userId }
        },
        limit: 100,
      })

      stats.totalEngagement = postsWithEngagement.docs.reduce((sum: number, post: any) => {
        return sum + (post.likeCount || 0) + (post.commentCount || 0) + (post.shareCount || 0)
      }, 0)

      // Calculate total posts (posts + reviews + recommendations)
      stats.totalPosts = stats.postsCount + stats.reviewCount + stats.recommendationCount

    } catch (statsError) {
      console.warn('Failed to fetch user stats:', statsError)
    }

    // Calculate achievements and badges
    const joinDate = new Date(targetUser.createdAt)
    const daysActive = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const achievements = {
      isExpertReviewer: stats.reviewCount > 10,
      isVerified: targetUser.isVerified || false,
      isCreator: targetUser.isCreator || false,
      creatorLevel: targetUser.creatorLevel,
      joinDate: targetUser.createdAt,
      daysActive: daysActive
    }

    const response: MobileUserStatsResponse = {
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        stats,
        achievements
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile user stats error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Statistics service unavailable',
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