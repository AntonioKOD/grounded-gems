import { NextRequest, NextResponse } from 'next/server'
import { getPostById } from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/v1/mobile/posts/[postId] - Get a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    
    // Get current user for personalization
    const user = await getServerSideUser()
    const currentUserId = user?.id

    console.log(`Mobile API: Getting post ${postId}`)

    const post = await getPostById(postId, currentUserId)

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { post }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching post:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch post',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 