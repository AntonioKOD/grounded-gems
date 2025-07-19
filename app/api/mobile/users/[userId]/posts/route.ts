import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const postsQuerySchema = z.object({
  type: z.enum(['all', 'posts', 'reviews', 'recommendations']).optional().default('all'),
  limit: z.string().optional().transform(val => parseInt(val || '20')),
  page: z.string().optional().transform(val => parseInt(val || '1')),
  sort: z.enum(['newest', 'oldest', 'popular']).optional().default('newest'),
})

interface MobileUserPostsResponse {
  success: boolean
  message: string
  data?: {
    posts: Array<{
      id: string
      type: 'post' | 'review' | 'recommendation'
      title?: string
      content: string
      featuredImage?: {
        url: string
      } | null
      likeCount: number
      commentCount: number
      shareCount: number
      saveCount: number
      rating?: number
      location?: {
        id: string
        name: string
        address?: string
      }
      createdAt: string
      updatedAt: string
      isLiked?: boolean
      isSaved?: boolean
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    stats: {
      totalPosts: number
      totalReviews: number
      totalRecommendations: number
      averageRating?: number
    }
  }
  error?: string
  code?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<MobileUserPostsResponse>> {
  try {
    const { userId } = await params
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = postsQuerySchema.safeParse(Object.fromEntries(searchParams))
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

    const { type, limit, page, sort } = queryValidation.data

    // Get current authenticated user for context
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
      // Continue without authentication for public posts
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

    // Build query based on type
    let collection = 'posts'
    let whereClause: any = {
      author: { equals: userId },
      status: { equals: 'published' }
    }

    // Add type-specific filters
    if (type === 'reviews') {
      collection = 'reviews'
      whereClause = {
        author: { equals: userId },
        status: { equals: 'published' }
      }
    } else if (type === 'recommendations') {
      collection = 'posts'
      whereClause = {
        author: { equals: userId },
        status: { equals: 'published' },
        type: { equals: 'recommendation' }
      }
    } else if (type === 'posts') {
      collection = 'posts'
      whereClause = {
        author: { equals: userId },
        status: { equals: 'published' },
        type: { not_equals: 'recommendation' }
      }
    }

    // Determine sort order
    let sortOrder: string
    switch (sort) {
      case 'oldest':
        sortOrder = 'createdAt'
        break
      case 'popular':
        sortOrder = 'likeCount-desc'
        break
      case 'newest':
      default:
        sortOrder = 'createdAt-desc'
        break
    }

    // Get posts with pagination
    const postsResult = await payload.find({
      collection,
      where: whereClause,
      sort: sortOrder,
      limit,
      page,
      depth: 2
    })

    // Get user's liked and saved posts for context
    let userLikedPosts: string[] = []
    let userSavedPosts: string[] = []
    
    if (currentUser) {
      try {
        if (currentUser.likedPosts && Array.isArray(currentUser.likedPosts)) {
          userLikedPosts = currentUser.likedPosts.map((post: any) => 
            typeof post === 'string' ? post : post.id
          )
        }
        if (currentUser.savedPosts && Array.isArray(currentUser.savedPosts)) {
          userSavedPosts = currentUser.savedPosts.map((post: any) => 
            typeof post === 'string' ? post : post.id
          )
        }
      } catch (error) {
        console.warn('Failed to get user liked/saved posts:', error)
      }
    }

    // Format posts for mobile
    const formattedPosts = postsResult.docs.map((post: any) => ({
      id: post.id,
      type: (collection === 'reviews' ? 'review' : (post.type === 'recommendation' ? 'recommendation' : 'post')) as 'post' | 'review' | 'recommendation',
      title: post.title,
      content: post.content?.length > 200 
        ? post.content.substring(0, 200) + '...' 
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
      shareCount: post.shareCount || 0,
      saveCount: post.saveCount || 0,
      rating: post.rating,
      location: post.location ? {
        id: typeof post.location === 'object' ? post.location.id : post.location,
        name: typeof post.location === 'object' ? post.location.name : 'Unknown Location',
        address: typeof post.location === 'object' ? post.location.address : undefined
      } : undefined,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isLiked: userLikedPosts.includes(post.id),
      isSaved: userSavedPosts.includes(post.id)
    }))

    // Get statistics for all user content
    let stats = {
      totalPosts: 0,
      totalReviews: 0,
      totalRecommendations: 0,
      averageRating: undefined as number | undefined,
    }

    try {
      // Get posts count
      const allPostsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: userId },
          status: { equals: 'published' },
          type: { not_equals: 'recommendation' }
        },
        limit: 0,
      })
      stats.totalPosts = allPostsResult.totalDocs

      // Get recommendations count
      const recommendationsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: userId },
          status: { equals: 'published' },
          type: { equals: 'recommendation' }
        },
        limit: 0,
      })
      stats.totalRecommendations = recommendationsResult.totalDocs

      // Get reviews count
      const reviewsResult = await payload.find({
        collection: 'reviews',
        where: {
          author: { equals: userId },
          status: { equals: 'published' }
        },
        limit: 0,
      })
      stats.totalReviews = reviewsResult.totalDocs

      // Calculate average rating from reviews
      if (stats.totalReviews > 0) {
        const reviewsWithRatings = await payload.find({
          collection: 'reviews',
          where: {
            author: { equals: userId },
            status: { equals: 'published' },
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
      console.warn('Failed to fetch user content stats:', statsError)
    }

    const response: MobileUserPostsResponse = {
      success: true,
      message: 'User posts retrieved successfully',
      data: {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total: postsResult.totalDocs,
          totalPages: Math.ceil(postsResult.totalDocs / limit),
          hasNext: postsResult.hasNextPage,
          hasPrev: postsResult.hasPrevPage,
        },
        stats
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
    console.error('Mobile user posts error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Posts service unavailable',
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