import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const userPostsQuerySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1')),
  limit: z.string().optional().transform(val => parseInt(val || '20')),
  sortBy: z.enum(['createdAt-desc', 'createdAt-asc', 'likeCount-desc', 'commentCount-desc']).optional().default('createdAt-desc'),
})

interface UserPostsResponse {
  success: boolean
  message: string
  data?: {
    posts: Array<{
      id: string
      title?: string
      content: string
      caption?: string
      featuredImage?: {
        url: string
      } | null
      image?: string
      video?: string
      videoThumbnail?: string
      photos?: string[]
      videos?: string[]
      media?: string[]
      likeCount: number
      commentCount: number
      shareCount: number
      saveCount: number
      rating?: number
      tags?: string[]
      location?: {
        id: string
        name: string
      }
      createdAt: string
      updatedAt: string
      type?: string
      mimeType?: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    user: {
      id: string
      name: string
      username?: string
      profileImage?: {
        url: string
      } | null
      isVerified: boolean
      followerCount: number
    }
  }
  error?: string
  code?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<UserPostsResponse>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const { userId } = await params
    
    // Validate query parameters
    const queryValidation = userPostsQuerySchema.safeParse(Object.fromEntries(searchParams))
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

    const { page = 1, limit = 20, sortBy = 'createdAt-desc' } = queryValidation.data

    console.log('🔍 [User Posts API] Fetching posts for user:', userId)
    console.log('🔍 [User Posts API] Page:', page, 'Limit:', limit, 'Sort:', sortBy)

    // Get user information
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1,
    })

    if (!user) {
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

    // Get all posts from this user
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        author: { equals: userId },
        status: { equals: 'published' }
      },
      sort: sortBy,
      page,
      limit,
      depth: 2
    })

    console.log('🔍 [User Posts API] Found posts:', postsResult.docs.length)
    console.log('🔍 [User Posts API] Total posts:', postsResult.totalDocs)

    // Process posts
    const posts = postsResult.docs.map((post: any) => {
      // Process featured image
      let featuredImageUrl = null
      if (post.featuredImage) {
        if (typeof post.featuredImage === 'object' && post.featuredImage.url) {
          featuredImageUrl = post.featuredImage.url
        } else if (typeof post.featuredImage === 'string') {
          featuredImageUrl = post.featuredImage
        }
      }

      // Process media array
      let mediaArray = []
      if (post.media && Array.isArray(post.media)) {
        mediaArray = post.media.map((mediaItem: any) => {
          if (typeof mediaItem === 'object' && mediaItem.url) {
            return mediaItem.url
          } else if (typeof mediaItem === 'string') {
            return mediaItem
          }
          return null
        }).filter(Boolean)
      }

      // Process photos array - convert complex objects to simple URLs
      let photosArray = []
      if (post.photos && Array.isArray(post.photos)) {
        photosArray = post.photos.map((photoItem: any) => {
          if (typeof photoItem === 'object' && photoItem.url) {
            return photoItem.url
          } else if (typeof photoItem === 'string') {
            return photoItem
          }
          return null
        }).filter(Boolean)
      }

      // Process video field - convert complex objects to simple URLs
      let videoUrl = null
      if (post.video) {
        if (typeof post.video === 'object' && post.video.url) {
          videoUrl = post.video.url
        } else if (typeof post.video === 'string') {
          videoUrl = post.video
        }
      }

      // Process videoThumbnail field
      let videoThumbnailUrl = null
      if (post.videoThumbnail) {
        if (typeof post.videoThumbnail === 'object' && post.videoThumbnail.url) {
          videoThumbnailUrl = post.videoThumbnail.url
        } else if (typeof post.videoThumbnail === 'string') {
          videoThumbnailUrl = post.videoThumbnail
        }
      }

      // Process videos array - convert complex objects to simple URLs
      let videosArray = []
      if (post.videos && Array.isArray(post.videos)) {
        videosArray = post.videos.map((videoItem: any) => {
          if (typeof videoItem === 'object' && videoItem.url) {
            return videoItem.url
          } else if (typeof videoItem === 'string') {
            return videoItem
          }
          return null
        }).filter(Boolean)
      }

      // Debug video processing
      console.log(`🔍 [User Posts API] Video processing for post ${post.id}:`, {
        originalVideo: post.video,
        processedVideo: videoUrl,
        originalVideoThumbnail: post.videoThumbnail,
        processedVideoThumbnail: videoThumbnailUrl,
        originalVideos: post.videos,
        processedVideos: videosArray,
        type: post.type,
        mimeType: post.mimeType
      })

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        caption: post.caption || post.content,
        featuredImage: featuredImageUrl ? { url: featuredImageUrl } : null,
        image: post.image,
        video: videoUrl,
        videoThumbnail: videoThumbnailUrl,
        photos: photosArray.length > 0 ? photosArray : undefined,
        videos: videosArray.length > 0 ? videosArray : undefined,
        media: mediaArray.length > 0 ? mediaArray : undefined,
        likeCount: post.likeCount || (Array.isArray(post.likes) ? post.likes.length : 0),
        commentCount: post.commentCount || (Array.isArray(post.comments) ? post.comments.length : 0),
        shareCount: post.shareCount || 0,
        saveCount: post.saveCount || 0,
        rating: post.rating,
        tags: post.tags || [],
        location: post.location ? {
          id: typeof post.location === 'object' ? post.location.id : post.location,
          name: typeof post.location === 'object' ? post.location.name : 'Unknown Location'
        } : undefined,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        type: post.type || 'post',
        mimeType: post.mimeType
      }
    })

    // Calculate pagination
    const totalPages = Math.ceil(postsResult.totalDocs / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    const response: UserPostsResponse = {
      success: true,
      message: 'User posts retrieved successfully',
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: postsResult.totalDocs,
          totalPages,
          hasNext,
          hasPrev,
        },
        user: {
          id: String(user.id),
          name: user.name || '',
          username: user.username,
          profileImage: user.profileImage ? {
            url: typeof user.profileImage === 'object' && user.profileImage.url
              ? user.profileImage.url 
              : typeof user.profileImage === 'string'
              ? user.profileImage
              : ''
          } : null,
          isVerified: user.isVerified || user.creatorProfile?.verification?.isVerified || false,
          followerCount: user.followerCount || 0,
        }
      }
    }

    console.log('🔍 [User Posts API] Response prepared successfully')
    console.log('🔍 [User Posts API] Posts returned:', posts.length)
    console.log('🔍 [User Posts API] Pagination:', response.data?.pagination)

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('User posts API error:', error)
    console.error('User posts API error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'User posts service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

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