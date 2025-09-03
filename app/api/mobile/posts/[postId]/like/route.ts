import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// Helper function to authenticate user with fallback support
async function authenticateUser(request: NextRequest, payload: any) {
  const authHeader = request.headers.get('Authorization')
  const cookieHeader = request.headers.get('Cookie')
  
  let user = null
  
  // Try Authorization header first (Bearer token)
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
    } catch (error) {
      console.log('Authorization header auth failed:', error)
    }
  }
  
  // Fallback to cookie-based auth if Authorization header failed
  if (!user && cookieHeader?.includes('payload-token=')) {
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
    } catch (error) {
      console.log('Cookie auth failed:', error)
    }
  }
  
  return user
}

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

    // Verify authentication using helper function
    const user = await authenticateUser(request, payload)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No valid authentication token provided',
          code: 'NO_TOKEN'
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

    // Get the post with its current likes
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 1, // Include relationship data
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
    const currentLikes = Array.isArray(post.likes) ? post.likes : []
    const userAlreadyLiked = currentLikes.some((like: any) => {
      const likeId = typeof like === 'string' ? like : like.id
      return likeId === user.id
    })

    if (userAlreadyLiked) {
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

    // Add user to likes array
    const newLikes = [...currentLikes.map((like: any) => typeof like === 'string' ? like : like.id), user.id]
    
    // Update the post with new likes - with retry logic for write conflicts
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        await payload.update({
          collection: 'posts',
          id: postId,
          data: {
            likes: newLikes,
          },
        })
        break // Success, exit retry loop
      } catch (error: any) {
        retryCount++
        console.log(`Like update attempt ${retryCount} failed:`, error.message)
        
        // Check if it's a write conflict
        if (error.code === 112 || error.codeName === 'WriteConflict') {
          if (retryCount >= maxRetries) {
            console.error('Max retries reached for like operation')
            throw error
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100))
          continue
        } else {
          // Not a write conflict, don't retry
          throw error
        }
      }
    }

    const newLikeCount = newLikes.length

    // Send push notification to post owner
    if (post.createdBy && post.createdBy !== user.id) {
      try {
        const { notificationHooks } = await import('@/lib/notification-hooks')
        await notificationHooks.onUserLike(
          post.createdBy,
          user.id,
          user.name || 'Someone',
          postId,
          'post'
        )
        console.log(`✅ [Mobile Posts Like API] Like notification sent to post owner ${post.createdBy}`)
      } catch (notificationError) {
        console.warn('Failed to send like notification:', notificationError)
        // Don't fail the like operation if notification fails
      }
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

    // Verify authentication using helper function
    const user = await authenticateUser(request, payload)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No valid authentication token provided',
          code: 'NO_TOKEN'
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

    // Get the post with its current likes
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 1, // Include relationship data
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

    // Check if user has liked this post
    const currentLikes = Array.isArray(post.likes) ? post.likes : []
    const userHasLiked = currentLikes.some((like: any) => {
      const likeId = typeof like === 'string' ? like : like.id
      return likeId === user.id
    })

    if (!userHasLiked) {
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

    // Remove user from likes array
    const newLikes = currentLikes
      .map((like: any) => typeof like === 'string' ? like : like.id)
      .filter((likeId: string) => likeId !== user.id)
    
    // Update the post with new likes - with retry logic for write conflicts
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        await payload.update({
          collection: 'posts',
          id: postId,
          data: {
            likes: newLikes,
          },
        })
        break // Success, exit retry loop
      } catch (error: any) {
        retryCount++
        console.log(`Unlike update attempt ${retryCount} failed:`, error.message)
        
        // Check if it's a write conflict
        if (error.code === 112 || error.codeName === 'WriteConflict') {
          if (retryCount >= maxRetries) {
            console.error('Max retries reached for unlike operation')
            throw error
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100))
          continue
        } else {
          // Not a write conflict, don't retry
          throw error
        }
      }
    }

    const newLikeCount = newLikes.length

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