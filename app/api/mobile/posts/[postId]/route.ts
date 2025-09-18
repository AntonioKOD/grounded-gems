import { NextRequest, NextResponse } from 'next/server'
import { getPostById } from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@payload-config'

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

// DELETE /api/mobile/posts/[postId] - Delete a specific post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const payload = await getPayload({ config })
    
    // Get current user for authentication
    const user = await getServerSideUser()
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to delete posts'
        },
        { status: 401 }
      )
    }

    console.log(`Mobile API: Deleting post ${postId} by user ${user.id}`)

    // Get the post to verify ownership
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 1
    })

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
          message: 'The specified post does not exist'
        },
        { status: 404 }
      )
    }

    // Check if the current user is the author of the post
    const postAuthorId = typeof post.author === 'string' ? post.author : post.author?.id
    if (postAuthorId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'You can only delete your own posts'
        },
        { status: 403 }
      )
    }

    // Delete the post
    await payload.delete({
      collection: 'posts',
      id: postId
    })

    console.log(`Mobile API: Successfully deleted post ${postId}`)

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
      data: { postId }
    })

  } catch (error) {
    console.error('Mobile API: Error deleting post:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete post',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 