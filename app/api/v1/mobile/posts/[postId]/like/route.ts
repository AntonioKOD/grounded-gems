import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileLikeResponse {
  success: boolean
  message: string
  data?: {
    isLiked: boolean
    likeCount: number
    postId: string
  }
  error?: string
  code?: string
}

interface RouteParams {
  params: Promise<{ postId: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MobileLikeResponse>> {
  try {
    const { postId } = await params
    const payload = await getPayload({ config })

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
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

    // Validate postId
    if (!postId || typeof postId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid post ID',
          error: 'Post ID is required and must be a valid string',
          code: 'INVALID_POST_ID'
        },
        { status: 400 }
      )
    }

    // Check if post exists
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
    })

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not found',
          error: 'The specified post does not exist',
          code: 'POST_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Check if user already liked this post
    const existingLike = await payload.find({
      collection: 'post-likes',
      where: {
        and: [
          { post: { equals: postId } },
          { user: { equals: user.id } }
        ]
      },
      limit: 1,
    })

    const isAlreadyLiked = existingLike.docs.length > 0

    if (isAlreadyLiked) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post already liked',
          error: 'You have already liked this post',
          code: 'ALREADY_LIKED'
        },
        { status: 409 }
      )
    }

    // Create like record
    await payload.create({
      collection: 'post-likes',
      data: {
        post: postId,
        user: user.id,
        createdAt: new Date(),
      },
    })

    // Update post like count
    const currentLikeCount = post.likeCount || 0
    const newLikeCount = currentLikeCount + 1

    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        likeCount: newLikeCount,
      },
    })

    // Update user's liked posts array (if this field exists)
    try {
      const userData = await payload.findByID({
        collection: 'users',
        id: user.id,
      })

      const currentLikedPosts = Array.isArray(userData.likedPosts) ? userData.likedPosts : []
      if (!currentLikedPosts.includes(postId)) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            likedPosts: [...currentLikedPosts, postId],
          },
        })
      }
    } catch (userUpdateError) {
      console.warn('Failed to update user liked posts:', userUpdateError)
    }

    const response: MobileLikeResponse = {
      success: true,
      message: 'Post liked successfully',
      data: {
        isLiked: true,
        likeCount: newLikeCount,
        postId,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile like error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Like service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MobileLikeResponse>> {
  try {
    const { postId } = await params
    const payload = await getPayload({ config })

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
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

    // Validate postId
    if (!postId || typeof postId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid post ID',
          error: 'Post ID is required and must be a valid string',
          code: 'INVALID_POST_ID'
        },
        { status: 400 }
      )
    }

    // Check if post exists
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
    })

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not found',
          error: 'The specified post does not exist',
          code: 'POST_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Find and delete like record
    const existingLike = await payload.find({
      collection: 'post-likes',
      where: {
        and: [
          { post: { equals: postId } },
          { user: { equals: user.id } }
        ]
      },
      limit: 1,
    })

    if (existingLike.docs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not liked',
          error: 'You have not liked this post',
          code: 'NOT_LIKED'
        },
        { status: 409 }
      )
    }

    // Delete like record
    await payload.delete({
      collection: 'post-likes',
      id: existingLike.docs[0].id,
    })

    // Update post like count
    const currentLikeCount = post.likeCount || 0
    const newLikeCount = Math.max(0, currentLikeCount - 1)

    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        likeCount: newLikeCount,
      },
    })

    // Update user's liked posts array (if this field exists)
    try {
      const userData = await payload.findByID({
        collection: 'users',
        id: user.id,
      })

      const currentLikedPosts = Array.isArray(userData.likedPosts) ? userData.likedPosts : []
      const updatedLikedPosts = currentLikedPosts.filter((id: string) => id !== postId)
      
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          likedPosts: updatedLikedPosts,
        },
      })
    } catch (userUpdateError) {
      console.warn('Failed to update user liked posts:', userUpdateError)
    }

    const response: MobileLikeResponse = {
      success: true,
      message: 'Post unliked successfully',
      data: {
        isLiked: false,
        likeCount: newLikeCount,
        postId,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile unlike error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Unlike service unavailable',
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
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 