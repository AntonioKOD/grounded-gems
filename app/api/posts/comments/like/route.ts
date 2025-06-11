import { NextRequest, NextResponse } from 'next/server'
import { likeCommentOrReply } from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'

// POST /api/posts/comments/like - Like/unlike a comment or reply
export async function POST(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { postId, commentId, shouldLike, isReply } = body

    if (!postId || !commentId || typeof shouldLike !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Post ID, comment ID, and shouldLike are required' },
        { status: 400 }
      )
    }

    console.log(`API: ${shouldLike ? 'Liking' : 'Unliking'} ${isReply ? 'reply' : 'comment'} ${commentId} by user ${user.id}`)

    await likeCommentOrReply(postId, commentId, shouldLike, user.id, isReply || false)

    return NextResponse.json({
      success: true,
      message: `Comment ${shouldLike ? 'liked' : 'unliked'} successfully`
    })
  } catch (error) {
    console.error('API: Error liking comment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to like comment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 