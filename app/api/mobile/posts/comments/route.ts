import { NextRequest, NextResponse } from 'next/server'
import { addComment, getCommentsWithReplies } from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/v1/mobile/posts/comments?postId=... - Get comments for a post
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

    console.log(`Mobile API: Getting comments for post ${postId}`)

    const comments = await getCommentsWithReplies(postId, currentUserId)

    return NextResponse.json({
      success: true,
      data: {
        comments,
        count: comments.length
      }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching comments:', error)
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

// POST /api/v1/mobile/posts/comments - Add a comment to a post
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
    const { postId, content, parentCommentId } = body

    if (!postId || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Post ID and content are required' },
        { status: 400 }
      )
    }

    console.log(`Mobile API: Adding comment to post ${postId} by user ${user.id}`)

    let comment
    if (parentCommentId) {
      // This is a reply
      const { addCommentReply } = await import('@/app/actions')
      comment = await addCommentReply(postId, parentCommentId, content.trim(), user.id)
    } else {
      // This is a top-level comment
      comment = await addComment(postId, content.trim(), user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: { comment }
    })
  } catch (error) {
    console.error('Mobile API: Error adding comment:', error)
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