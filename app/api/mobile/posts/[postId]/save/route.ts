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

    // Get the post with its current saves
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

    // Check if user already saved this post
    const currentSaves = Array.isArray(post.savedBy) ? post.savedBy : []
    const userAlreadySaved = currentSaves.some((save: any) => {
      const saveId = typeof save === 'string' ? save : save.id
      return saveId === user.id
    })

    if (userAlreadySaved) {
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

    // Add user to savedBy array
    const newSaves = [...currentSaves.map((save: any) => typeof save === 'string' ? save : save.id), user.id]
    
    // Update the post with new saves - with retry logic for write conflicts
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        await payload.update({
          collection: 'posts',
          id: postId,
          data: {
            savedBy: newSaves,
            saveCount: newSaves.length, // Update the count field as well
          },
        })
        break // Success, exit retry loop
      } catch (error: any) {
        retryCount++
        console.log(`Save update attempt ${retryCount} failed:`, error.message)
        
        // Check if it's a write conflict
        if (error.code === 112 || error.codeName === 'WriteConflict') {
          if (retryCount >= maxRetries) {
            console.error('Max retries reached for save operation')
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

    const newSaveCount = newSaves.length

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

    // Get the post with its current saves
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

    // Check if user has saved this post
    const currentSaves = Array.isArray(post.savedBy) ? post.savedBy : []
    const userHasSaved = currentSaves.some((save: any) => {
      const saveId = typeof save === 'string' ? save : save.id
      return saveId === user.id
    })

    if (!userHasSaved) {
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

    // Remove user from savedBy array
    const newSaves = currentSaves
      .map((save: any) => typeof save === 'string' ? save : save.id)
      .filter((saveId: string) => saveId !== user.id)
    
    // Update the post with new saves - with retry logic for write conflicts
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        await payload.update({
          collection: 'posts',
          id: postId,
          data: {
            savedBy: newSaves,
            saveCount: newSaves.length, // Update the count field as well
          },
        })
        break // Success, exit retry loop
      } catch (error: any) {
        retryCount++
        console.log(`Unsave update attempt ${retryCount} failed:`, error.message)
        
        // Check if it's a write conflict
        if (error.code === 112 || error.codeName === 'WriteConflict') {
          if (retryCount >= maxRetries) {
            console.error('Max retries reached for unsave operation')
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

    const newSaveCount = newSaves.length

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