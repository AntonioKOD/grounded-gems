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

// GET /api/v1/mobile/posts - Get feed posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedType = searchParams.get('type') || 'discover'
    const sortBy = searchParams.get('sortBy') || 'recent'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    
    // Get current user for personalization
    const user = await getServerSideUser()
    const currentUserId = user?.id

    console.log(`Mobile API: Getting ${feedType} posts, page ${page}, limit ${limit}`)

    const posts = await getFeedPosts(feedType, sortBy, page, category, currentUserId)

    return NextResponse.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          hasMore: posts.length === limit
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