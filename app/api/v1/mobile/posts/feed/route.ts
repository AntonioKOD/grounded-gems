import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const feedQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  feedType: z.enum(['personalized', 'discover', 'popular', 'latest', 'following']).default('personalized'),
  category: z.string().optional(),
  sortBy: z.enum(['createdAt', 'popularity', 'trending']).default('createdAt'),
  lastSeen: z.string().optional(), // For cursor-based pagination
})

interface MobileFeedResponse {
  success: boolean
  message: string
  data?: {
    posts: Array<{
      id: string
      title?: string
      content: string
      author: {
        id: string
        name: string
        profileImage?: {
          url: string
        } | null
      }
      location?: {
        id: string
        name: string
        coordinates?: {
          latitude: number
          longitude: number
        }
      }
      media?: Array<{
        type: 'image' | 'video'
        url: string
        thumbnail?: string
        duration?: number
        alt?: string
      }>
      engagement: {
        likeCount: number
        commentCount: number
        shareCount: number
        saveCount: number
        isLiked: boolean
        isSaved: boolean
      }
      categories: string[]
      tags: string[]
      createdAt: string
      updatedAt: string
      rating?: number
      isPromoted?: boolean
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
      nextCursor?: string
    }
    meta: {
      feedType: string
      appliedFilters: {
        category?: string
        sortBy: string
      }
      recommendations?: string[]
    }
  }
  error?: string
  code?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileFeedResponse>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = feedQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          error: queryValidation.error.errors[0].message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { page, limit, feedType, category, sortBy, lastSeen } = queryValidation.data

    // Get current user (optional for some feed types)
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
      console.log('No authenticated user for feed request')
    }

    // Build base query
    let whereClause: any = {
      status: { equals: 'published' }
    }

    // Apply category filter
    if (category) {
      whereClause.categories = { contains: category }
    }

    // Apply feed type specific filters
    switch (feedType) {
      case 'following':
        if (!currentUser) {
          return NextResponse.json(
            {
              success: false,
              message: 'Authentication required for following feed',
              error: 'Must be logged in to view following feed',
              code: 'AUTH_REQUIRED'
            },
            { status: 401 }
          )
        }
        
        // Get user's following list
        const userWithFollowing = await payload.findByID({
          collection: 'users',
          id: currentUser.id,
          depth: 1
        })
        
        const followingIds = Array.isArray(userWithFollowing.following) 
          ? userWithFollowing.following.map((f: any) => typeof f === 'string' ? f : f.id)
          : []

        if (followingIds.length === 0) {
          whereClause.author = { equals: 'no-following' } // No results
        } else {
          whereClause.author = { in: followingIds }
        }
        break

      case 'popular':
        // Add popularity filter (posts with high engagement)
        whereClause.likeCount = { greater_than: 5 }
        break

      case 'latest':
        // Latest posts (no additional filter needed)
        break

      case 'discover':
        // Exclude current user's posts if logged in
        if (currentUser) {
          whereClause.author = { not_equals: currentUser.id }
        }
        break

      case 'personalized':
      default:
        // Personalized feed based on user interests
        if (currentUser) {
          try {
            const userData = await payload.findByID({
              collection: 'users',
              id: currentUser.id,
            })
            
            if (userData.interests && userData.interests.length > 0) {
              whereClause.or = [
                { categories: { in: userData.interests } },
                { tags: { in: userData.interests } }
              ]
            }
          } catch (error) {
            console.warn('Failed to personalize feed:', error)
          }
        }
        break
    }

    // Apply cursor-based pagination if lastSeen is provided
    if (lastSeen) {
      whereClause.createdAt = { less_than: lastSeen }
    }

    // Determine sort order
    let sort: any = {}
    switch (sortBy) {
      case 'popularity':
        sort = { likeCount: 'desc', createdAt: 'desc' }
        break
      case 'trending':
        // Trending algorithm: recent posts with high engagement
        sort = { 
          likeCount: 'desc',
          commentCount: 'desc', 
          createdAt: 'desc' 
        }
        break
      case 'createdAt':
      default:
        sort = { createdAt: 'desc' }
        break
    }

    // Fetch posts
    const postsResult = await payload.find({
      collection: 'posts',
      where: whereClause,
      sort,
      page,
      limit,
      depth: 3, // Include related data
    })

    // Format posts for mobile consumption
    const formattedPosts = await Promise.all(
      postsResult.docs.map(async (post: any) => {
        // Get engagement stats for current user
        let isLiked = false
        let isSaved = false

        if (currentUser) {
          try {
            // Check if user liked this post
            const userLikes = await payload.find({
              collection: 'post-likes',
              where: {
                and: [
                  { post: { equals: post.id } },
                  { user: { equals: currentUser.id } }
                ]
              },
              limit: 1
            })
            isLiked = userLikes.docs.length > 0

            // Check if user saved this post
            const userSaves = await payload.find({
              collection: 'saved-posts',
              where: {
                and: [
                  { post: { equals: post.id } },
                  { user: { equals: currentUser.id } }
                ]
              },
              limit: 1
            })
            isSaved = userSaves.docs.length > 0
          } catch (engagementError) {
            console.warn('Failed to fetch engagement for post:', post.id, engagementError)
          }
        }

        // Format media
        let media: any[] = []
        if (post.featuredImage) {
          media.push({
            type: 'image',
            url: typeof post.featuredImage === 'object' 
              ? post.featuredImage.url 
              : post.featuredImage,
            alt: typeof post.featuredImage === 'object' 
              ? post.featuredImage.alt 
              : undefined
          })
        }

        if (post.gallery && Array.isArray(post.gallery)) {
          media = media.concat(
            post.gallery.map((item: any) => ({
              type: 'image',
              url: typeof item.image === 'object' ? item.image.url : item.image,
              alt: item.caption || undefined
            }))
          )
        }

        return {
          id: post.id,
          title: post.title,
          content: post.content || '',
          author: {
            id: post.author?.id || '',
            name: post.author?.name || 'Anonymous',
            profileImage: post.author?.profileImage ? {
              url: typeof post.author.profileImage === 'object'
                ? post.author.profileImage.url
                : post.author.profileImage
            } : null
          },
          location: post.location ? {
            id: post.location.id,
            name: post.location.name,
            coordinates: post.location.coordinates
          } : undefined,
          media,
          engagement: {
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0,
            shareCount: post.shareCount || 0,
            saveCount: post.saveCount || 0,
            isLiked,
            isSaved
          },
          categories: Array.isArray(post.categories) 
            ? post.categories.map((cat: any) => typeof cat === 'string' ? cat : cat.name)
            : [],
          tags: Array.isArray(post.tags) 
            ? post.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.tag)
            : [],
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          rating: post.rating,
          isPromoted: post.isPromoted || false
        }
      })
    )

    // Calculate pagination
    const totalPages = Math.ceil(postsResult.totalDocs / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1
    const nextCursor = formattedPosts.length > 0 
      ? formattedPosts[formattedPosts.length - 1].createdAt 
      : undefined

    const response: MobileFeedResponse = {
      success: true,
      message: 'Feed retrieved successfully',
      data: {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total: postsResult.totalDocs,
          totalPages,
          hasNext,
          hasPrev,
          nextCursor
        },
        meta: {
          feedType,
          appliedFilters: {
            category,
            sortBy
          }
        }
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': feedType === 'personalized' || feedType === 'following' 
          ? 'private, max-age=60' // 1 minute for personalized feeds
          : 'public, max-age=300', // 5 minutes for public feeds
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Authorization' // Cache varies based on auth
      }
    })

  } catch (error) {
    console.error('Mobile feed error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Feed service unavailable',
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