import { NextRequest, NextResponse } from 'next/server'
import { addComment, getCommentsWithReplies, likeCommentOrReply } from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/posts/comments?postId=... - Get comments for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Get current user for personalization
    const user = await getServerSideUser()
    const currentUserId = user?.id

    console.log(`API: Getting comments for post ${postId}`)

    const comments = await getCommentsWithReplies(postId, currentUserId)

    return NextResponse.json({
      success: true,
      data: {
        comments,
        count: comments.length
      }
    })
  } catch (error) {
    console.error('API: Error fetching comments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/posts/comments - Add a comment to a post
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
    const { postId, content } = body

    if (!postId || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Post ID and content are required' },
        { status: 400 }
      )
    }

    console.log(`API: Adding comment to post ${postId} by user ${user.id}`)

    const comment = await addComment(postId, content.trim(), user.id)

    // Notifications are handled by the addComment function
    console.log('✅ [Comments API] Comment created successfully, notifications sent via hooks')

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: { comment }
    })
  } catch (error) {
    console.error('API: Error adding comment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add comment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 