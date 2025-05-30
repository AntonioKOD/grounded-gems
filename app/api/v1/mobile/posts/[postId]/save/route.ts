import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileSaveResponse {
  success: boolean
  message: string
  data?: {
    isSaved: boolean
    saveCount: number
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
): Promise<NextResponse<MobileSaveResponse>> {
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

    // Check if user already saved this post
    const existingSave = await payload.find({
      collection: 'saved-posts',
      where: {
        and: [
          { post: { equals: postId } },
          { user: { equals: user.id } }
        ]
      },
      limit: 1,
    })

    const isAlreadySaved = existingSave.docs.length > 0

    if (isAlreadySaved) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post already saved',
          error: 'You have already saved this post',
          code: 'ALREADY_SAVED'
        },
        { status: 409 }
      )
    }

    // Create save record
    await payload.create({
      collection: 'saved-posts',
      data: {
        post: postId,
        user: user.id,
        createdAt: new Date(),
      },
    })

    // Update post save count
    const currentSaveCount = post.saveCount || 0
    const newSaveCount = currentSaveCount + 1

    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        saveCount: newSaveCount,
      },
    })

    // Update user's saved posts array (if this field exists)
    try {
      const userData = await payload.findByID({
        collection: 'users',
        id: user.id,
      })

      const currentSavedPosts = Array.isArray(userData.savedPosts) ? userData.savedPosts : []
      if (!currentSavedPosts.includes(postId)) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            savedPosts: [...currentSavedPosts, postId],
          },
        })
      }
    } catch (userUpdateError) {
      console.warn('Failed to update user saved posts:', userUpdateError)
    }

    const response: MobileSaveResponse = {
      success: true,
      message: 'Post saved successfully',
      data: {
        isSaved: true,
        saveCount: newSaveCount,
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
    console.error('Mobile save post error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Save service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MobileSaveResponse>> {
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

    // Find and delete save record
    const existingSave = await payload.find({
      collection: 'saved-posts',
      where: {
        and: [
          { post: { equals: postId } },
          { user: { equals: user.id } }
        ]
      },
      limit: 1,
    })

    if (existingSave.docs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not saved',
          error: 'You have not saved this post',
          code: 'NOT_SAVED'
        },
        { status: 409 }
      )
    }

    // Delete save record
    await payload.delete({
      collection: 'saved-posts',
      id: existingSave.docs[0].id,
    })

    // Update post save count
    const currentSaveCount = post.saveCount || 0
    const newSaveCount = Math.max(0, currentSaveCount - 1)

    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        saveCount: newSaveCount,
      },
    })

    // Update user's saved posts array (if this field exists)
    try {
      const userData = await payload.findByID({
        collection: 'users',
        id: user.id,
      })

      const currentSavedPosts = Array.isArray(userData.savedPosts) ? userData.savedPosts : []
      const updatedSavedPosts = currentSavedPosts.filter((id: string) => id !== postId)
      
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          savedPosts: updatedSavedPosts,
        },
      })
    } catch (userUpdateError) {
      console.warn('Failed to update user saved posts:', userUpdateError)
    }

    const response: MobileSaveResponse = {
      success: true,
      message: 'Post unsaved successfully',
      data: {
        isSaved: false,
        saveCount: newSaveCount,
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
    console.error('Mobile unsave post error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Unsave service unavailable',
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