import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'
import { createPost, getFeedPosts, getPostById } from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'

// Input validation schema for mobile post creation
const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(500, 'Content cannot exceed 500 characters'),
  title: z.string().optional(),
  type: z.enum(['post', 'review', 'recommendation']).default('post'),
  rating: z.number().min(1).max(5).optional(),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
})

interface MobileCreatePostResponse {
  success: boolean
  message: string
  data?: {
    id: string
    content: string
    author: {
      id: string
      name: string
      profileImage?: {
        url: string
      } | null
    }
    media?: Array<{
      type: 'image' | 'video'
      url: string
      thumbnail?: string
      alt?: string
    }>
    location?: {
      id: string
      name: string
    }
    type: string
    rating?: number
    tags: string[]
    createdAt: string
    updatedAt: string
  }
  error?: string
  code?: string
}

// GET /api/v1/mobile/posts - Get posts (feed, user posts, saved posts, or liked posts)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedType = searchParams.get('type') || 'discover'
    const sortBy = searchParams.get('sortBy') || 'recent'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const authorId = searchParams.get('authorId')
    const saved = searchParams.get('saved') === 'true'
    const liked = searchParams.get('liked') === 'true'
    
    // Get current user for personalization
    const user = await getServerSideUser()
    const currentUserId = user?.id

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    let posts = []

    if (saved) {
      // Fetch saved posts for current user
      console.log(`Mobile API: Getting saved posts for user ${currentUserId}, page ${page}, limit ${limit}`)
      
      const payload = await getPayload({ config })
      
      // Get user's saved posts through relationships
      const userDoc = await payload.findByID({
        collection: 'users',
        id: currentUserId,
        depth: 3,
      })

      // Extract saved posts (assuming there's a savedPosts field)
      const savedPosts = userDoc?.savedPosts || []
      
      // Format saved posts for mobile response
      posts = savedPosts.slice((page - 1) * limit, page * limit).map((post: any) => ({
        id: post.id,
        caption: post.content || post.caption || '',
        author: {
          id: post.author?.id || post.author,
          name: post.author?.name || 'Unknown Author',
          profileImage: post.author?.profileImage ? { url: post.author.profileImage.url } : null,
        },
        location: post.location ? {
          id: post.location.id,
          name: post.location.name,
          coordinates: post.location.coordinates,
        } : null,
        media: post.media?.map((m: any) => ({
          type: m.mimeType?.startsWith('video/') ? 'video' : 'image',
          url: m.url,
          thumbnail: m.thumbnail?.url,
          alt: m.alt,
        })) || [],
        engagement: {
          likeCount: post.likes?.length || 0,
          commentCount: post.comments?.length || 0,
          shareCount: post.shares?.length || 0,
          saveCount: 0, // We don't track this separately
          isLiked: post.likes?.some((like: any) => like.user === currentUserId) || false,
          isSaved: true, // All posts in this response are saved
        },
        categories: post.categories?.map((cat: any) => cat.name || cat) || [],
        tags: post.tags || [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        rating: post.rating,
      }))
      
    } else if (liked) {
      // Fetch liked posts for current user
      console.log(`Mobile API: Getting liked posts for user ${currentUserId}, page ${page}, limit ${limit}`)
      
      const payload = await getPayload({ config })
      
      // Find all posts that the current user has liked
      const result = await payload.find({
        collection: 'posts',
        where: {
          likes: {
            contains: currentUserId
          }
        },
        sort: sortBy === 'popular' ? '-likes' : '-createdAt',
        limit,
        page,
        depth: 2,
      })

      // Format liked posts for mobile response
      posts = result.docs.map((post: any) => ({
        id: post.id,
        caption: post.content || post.caption || '',
        author: {
          id: post.author?.id || post.author,
          name: post.author?.name || 'Unknown Author',
          profileImage: post.author?.profileImage ? { url: post.author.profileImage.url } : null,
        },
        location: post.location ? {
          id: post.location.id,
          name: post.location.name,
          coordinates: post.location.coordinates,
        } : null,
        media: post.media?.map((m: any) => ({
          type: m.mimeType?.startsWith('video/') ? 'video' : 'image',
          url: m.url,
          thumbnail: m.thumbnail?.url,
          alt: m.alt,
        })) || [],
        engagement: {
          likeCount: post.likes?.length || 0,
          commentCount: post.comments?.length || 0,
          shareCount: post.shares?.length || 0,
          saveCount: 0,
          isLiked: true, // All posts in this response are liked by the current user
          isSaved: false, // Would need to check user's saved posts
        },
        categories: post.categories?.map((cat: any) => cat.name || cat) || [],
        tags: post.tags || [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        rating: post.rating,
      }))
      
    } else if (authorId) {
      // Fetch posts by specific author
      console.log(`Mobile API: Getting posts by author ${authorId}, page ${page}, limit ${limit}`)
      
      const payload = await getPayload({ config })
      
      const result = await payload.find({
        collection: 'posts',
        where: {
          author: {
            equals: authorId
          }
        },
        sort: sortBy === 'popular' ? '-likes' : '-createdAt',
        limit,
        page,
        depth: 2,
      })

      // Format posts for mobile response
      posts = result.docs.map((post: any) => ({
        id: post.id,
        caption: post.content || post.caption || '',
        author: {
          id: post.author?.id || post.author,
          name: post.author?.name || 'Unknown Author',
          profileImage: post.author?.profileImage ? { url: post.author.profileImage.url } : null,
        },
        location: post.location ? {
          id: post.location.id,
          name: post.location.name,
          coordinates: post.location.coordinates,
        } : null,
        media: post.media?.map((m: any) => ({
          type: m.mimeType?.startsWith('video/') ? 'video' : 'image',
          url: m.url,
          thumbnail: m.thumbnail?.url,
          alt: m.alt,
        })) || [],
        engagement: {
          likeCount: post.likes?.length || 0,
          commentCount: post.comments?.length || 0,
          shareCount: post.shares?.length || 0,
          saveCount: 0,
          isLiked: post.likes?.some((like: any) => like.user === currentUserId) || false,
          isSaved: false, // Would need to check user's saved posts
        },
        categories: post.categories?.map((cat: any) => cat.name || cat) || [],
        tags: post.tags || [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        rating: post.rating,
      }))
      
    } else {
      // Fetch regular feed posts
      console.log(`Mobile API: Getting ${feedType} posts, page ${page}, limit ${limit}`)
      posts = await getFeedPosts(feedType, sortBy, page, category, currentUserId)
    }

    return NextResponse.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          hasMore: posts.length === limit,
          total: posts.length,
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching posts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/mobile/posts - Create a new post
export async function POST(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    
    // Add user ID to form data
    formData.append('userId', user.id)

    console.log('Mobile API: Creating post for user:', user.id)

    const result = await createPost(formData)

    if (result.success) {
      // Get the created post details
      const post = result.postId ? await getPostById(result.postId, user.id) : null
      
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          post,
          postId: result.postId
        }
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Mobile API: Error creating post:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create post',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 