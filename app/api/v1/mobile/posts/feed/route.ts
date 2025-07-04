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
      caption: string
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
    console.log('🚀 Mobile feed endpoint called - ENHANCED VERSION')
    
    const payload = await getPayload({ config })
    console.log('✅ Payload instance created')
    
    const { searchParams } = new URL(request.url)
    console.log('📊 Raw search params:', Object.fromEntries(searchParams))
    
    // Validate query parameters
    const queryValidation = feedQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      console.error('❌ Validation failed:', queryValidation.error.errors)
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

    const { page, limit, feedType, category, sortBy } = queryValidation.data
    console.log('📊 Validated feed params:', { page, limit, feedType, category, sortBy })

    // Get current user (optional for personalization)
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('👤 Current user:', currentUser?.name || 'None')
      }
    } catch (authError) {
      console.log('No authenticated user for feed request')
    }

    // Build query - start with published posts
    let whereClause: any = {
      status: { equals: 'published' }
    }

    // Apply basic feed type filtering
    if (feedType === 'discover' && currentUser) {
      // Exclude current user's posts for discover feed
      whereClause.author = { not_equals: currentUser.id }
      console.log('🔍 Discover feed - excluding user posts')
    }

    // Apply category filter
    if (category && category !== 'all') {
      console.log('🏷️ Filtering by category:', category)
      whereClause.categories = { in: [category] }
    }

    console.log('🔧 Where clause:', JSON.stringify(whereClause))

    // Determine sort order (Payload expects string format)
    let sort: string = '-createdAt' // Default: newest first, ensure it's a string
    
    switch (sortBy) {
      case 'popularity':
        // We'll sort by engagement after fetching, but use date for DB query
        sort = '-createdAt'
        break
      case 'trending':
        // Recent posts that we'll sort by engagement after fetching
        sort = '-createdAt'
        break
      case 'createdAt':
      default:
        sort = '-createdAt'
        break
    }

    // Ensure sort is always a string (safety check)
    if (typeof sort !== 'string') {
      console.warn('⚠️ Sort parameter is not a string, converting:', sort)
      sort = '-createdAt'
    }

    // To fix pagination issues with duplicate posts when sorting by fields with common values,
    // we need to add a secondary sort by _id to ensure consistent ordering
    // Based on: https://github.com/payloadcms/payload/discussions/2409
    const compoundSort = `${sort},-id` // Always include ID as secondary sort (comma-separated string)

    console.log('📡 Starting database query with sort:', compoundSort, 'primary type:', typeof sort)
    
    // Fetch posts with relationships
    const postsResult = await payload.find({
      collection: 'posts',
      where: whereClause,
      sort: compoundSort, // Use compound sort to prevent pagination duplicates
      page,
      limit: sortBy === 'popularity' || sortBy === 'trending' ? Math.min(limit * 2, 50) : limit, // Cap at 50 to avoid memory issues
      depth: 2, // Include author and location relationships
    })

    console.log(`📝 Database query completed: Found ${postsResult.docs.length} posts out of ${postsResult.totalDocs} total`)

    // Enhanced post formatting with relationships
    console.log('🔧 Starting enhanced post formatting...')
    const formattedPosts = postsResult.docs.map((post: any, index: number) => {
      console.log(`🔧 Formatting post ${index + 1}/${postsResult.docs.length}: ${post.id}`)
      
      // Calculate engagement stats
      const likeCount = Array.isArray(post.likes) ? post.likes.length : 0
      const commentCount = Array.isArray(post.comments) ? post.comments.length : 0
      const saveCount = Array.isArray(post.savedBy) ? post.savedBy.length : 0

      // Check if current user liked/saved this post
      let isLiked = false
      let isSaved = false

      if (currentUser) {
        // Check likes using the existing relationship
        isLiked = Array.isArray(post.likes) && 
                 post.likes.some((like: any) => {
                   const likeId = typeof like === 'string' ? like : like.id
                   return likeId === currentUser.id
                 })

        // Check saves using the existing relationship
        isSaved = Array.isArray(post.savedBy) && 
                 post.savedBy.some((save: any) => {
                   const saveId = typeof save === 'string' ? save : save.id
                   return saveId === currentUser.id
                 })
      }

      // Enhanced media handling with better video support
      let media: any[] = []
      
      // Add main image
      if (post.image) {
        const imageUrl = typeof post.image === 'object' ? post.image.url : post.image
        if (imageUrl) {
          media.push({
            type: 'image',
            url: imageUrl,
            alt: typeof post.image === 'object' ? post.image.alt : undefined
          })
        }
      }

      // Add video if exists - reels-style (no thumbnail)
      if (post.video) {
        const videoUrl = typeof post.video === 'object' ? post.video.url : post.video
        if (videoUrl) {
          const videoItem = {
            type: 'video',
            url: videoUrl,
            // No thumbnail for reels-style autoplay
            duration: typeof post.video === 'object' ? post.video.duration : undefined,
            alt: 'Post video'
          }
          media.push(videoItem)
          console.log(`📹 Added video to post ${post.id}:`, videoItem)
        }
      }

      // Add photos array if exists
      if (post.photos && Array.isArray(post.photos)) {
        const validPhotos = post.photos
          .map((photo: any) => ({
            type: 'image',
            url: typeof photo === 'object' ? photo.url : photo,
            alt: typeof photo === 'object' ? photo.alt : undefined
          }))
          .filter(photo => photo.url) // Only include photos with valid URLs

        media = media.concat(validPhotos)
      }

      const formattedPost = {
        id: post.id,
        caption: post.content || '',
        author: {
          id: post.author?.id || 'unknown',
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
          likeCount,
          commentCount,
          shareCount: 0, // Not implemented yet
          saveCount,
          isLiked,
          isSaved
        },
        categories: Array.isArray(post.categories) 
          ? post.categories.map((cat: any) => typeof cat === 'string' ? cat : cat.name || cat.slug)
          : [],
        tags: Array.isArray(post.tags) 
          ? post.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.tag)
          : [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        rating: post.rating,
        isPromoted: post.isSponsored || post.isFeatured || false,
        // Add engagement score for sorting
        _engagementScore: likeCount + commentCount * 2 + saveCount * 3
      }

      console.log(`📝 Final formatted post ${post.id}:`, {
        id: formattedPost.id,
        mediaCount: formattedPost.media.length,
        mediaTypes: formattedPost.media.map(m => m.type),
        hasVideo: formattedPost.media.some(m => m.type === 'video')
      })

      return formattedPost
    })

    console.log('✅ All posts formatted successfully')

    // Apply post-processing sorting if needed
    let finalPosts = formattedPosts
    if (sortBy === 'popularity') {
      finalPosts = formattedPosts
        .sort((a, b) => b.engagement.likeCount - a.engagement.likeCount)
        .slice(0, limit)
      console.log('📊 Applied popularity sorting')
    } else if (sortBy === 'trending') {
      finalPosts = formattedPosts
        .sort((a, b) => (b as any)._engagementScore - (a as any)._engagementScore)
        .slice(0, limit)
      console.log('📊 Applied trending sorting')
    }

    // Remove temporary fields
    finalPosts.forEach((post: any) => delete post._engagementScore)

    // Calculate pagination
    const totalPages = Math.ceil(postsResult.totalDocs / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    const response: MobileFeedResponse = {
      success: true,
      message: 'Feed retrieved successfully',
      data: {
        posts: finalPosts,
        pagination: {
          page,
          limit,
          total: postsResult.totalDocs,
          totalPages,
          hasNext,
          hasPrev,
          nextCursor: finalPosts.length > 0 
            ? finalPosts[finalPosts.length - 1].createdAt 
            : undefined
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

    console.log(`✅ Returning ${finalPosts.length} posts successfully`)
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': feedType === 'personalized' || feedType === 'following'
          ? 'private, no-cache, no-store, must-revalidate' // No caching for personalized feeds
          : sortBy === 'recent' || sortBy === 'createdAt'
          ? 'public, max-age=30, must-revalidate' // Very short cache for recent posts (30 seconds)
          : 'public, max-age=120, must-revalidate', // 2 minutes for other feeds
        'X-Content-Type-Options': 'nosniff',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Authorization' // Cache varies based on auth
      }
    })

  } catch (error) {
    console.error('❌ Mobile feed error:', error)
    console.error('❌ Error stack:', error.stack)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: `Feed service unavailable: ${error.message}`,
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