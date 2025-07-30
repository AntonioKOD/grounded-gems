import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface PostInteractionState {
  postId: string
  isLiked: boolean
  isSaved: boolean
  likeCount: number
  saveCount: number
}

interface MobileInteractionStateResponse {
  success: boolean
  message: string
  data?: {
    interactions: PostInteractionState[]
    totalPosts: number
    totalLiked: number
    totalSaved: number
  }
  error?: string
  code?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileInteractionStateResponse>> {
  try {
    console.log('🔄 [Interaction State API] Request received')
    const payload = await getPayload({ config })

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    console.log('🔄 [Interaction State API] Auth header present:', !!authHeader)
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('🔄 [Interaction State API] No Bearer token found')
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
    console.log('🔄 [Interaction State API] User authenticated:', user?.id)
    
    if (!user) {
      console.log('🔄 [Interaction State API] Authentication failed')
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

    // Get the request body with post IDs
    const body = await request.json()
    const { postIds } = body
    
    console.log('🔄 [Interaction State API] Request body:', body)

    // Validate postIds
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      console.log('🔄 [Interaction State API] Invalid post IDs')
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid post IDs',
          error: 'Post IDs array is required and must not be empty',
          code: 'INVALID_POST_IDS'
        },
        { status: 400 }
      )
    }

    // Limit the number of posts to check at once (performance optimization)
    const maxPostsToCheck = 50
    const postsToCheck = postIds.slice(0, maxPostsToCheck)
    
    console.log('🔄 [Interaction State API] Checking \(postsToCheck.length) posts')

    // Fetch all posts in one query for efficiency
    const posts = await payload.find({
      collection: 'posts',
      where: {
        id: {
          in: postsToCheck
        }
      },
      depth: 1, // Include relationship data
      limit: maxPostsToCheck
    })

    console.log('🔄 [Interaction State API] Found \(posts.docs.length) posts in database')

    // Create a map for quick lookup
    const postsMap = new Map(posts.docs.map(post => [post.id, post]))

    // Process each post ID and check interaction state
    const interactions: PostInteractionState[] = []
    let totalLiked = 0
    let totalSaved = 0

    for (const postId of postsToCheck) {
      const post = postsMap.get(postId)
      
      if (!post) {
        // Post not found, return default state
        interactions.push({
          postId,
          isLiked: false,
          isSaved: false,
          likeCount: 0,
          saveCount: 0
        })
        continue
      }

      // Check if user has liked this post
      const currentLikes = Array.isArray(post.likes) ? post.likes : []
      const isLiked = currentLikes.some((like: any) => {
        const likeId = typeof like === 'string' ? like : like.id
        return likeId === user.id
      })

      // Check if user has saved this post
      const currentSaves = Array.isArray(post.savedBy) ? post.savedBy : []
      const isSaved = currentSaves.some((save: any) => {
        const saveId = typeof save === 'string' ? save : save.id
        return saveId === user.id
      })

      // Get counts
      const likeCount = currentLikes.length
      const saveCount = currentSaves.length

      // Update totals
      if (isLiked) totalLiked++
      if (isSaved) totalSaved++
      
      console.log('🔄 [Interaction State API] Post \(postId): isLiked=\(isLiked), isSaved=\(isSaved), likeCount=\(likeCount), saveCount=\(saveCount)')

      interactions.push({
        postId,
        isLiked,
        isSaved,
        likeCount,
        saveCount
      })
    }

    const response: MobileInteractionStateResponse = {
      success: true,
      message: 'Interaction states retrieved successfully',
      data: {
        interactions,
        totalPosts: interactions.length,
        totalLiked,
        totalSaved
      }
    }

    console.log('🔄 [Interaction State API] Response: \(interactions.length) interactions, \(totalLiked) liked, \(totalSaved) saved')

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile interaction state check error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Interaction state service unavailable',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 