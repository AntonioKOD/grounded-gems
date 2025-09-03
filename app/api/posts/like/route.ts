import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Authenticate the user
    const { user } = await payload.auth({
      headers: request.headers,
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { postId, shouldLike } = body

    if (!postId || typeof shouldLike !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: postId and shouldLike' },
        { status: 400 }
      )
    }

    console.log(`👤 User ${user.id} ${shouldLike ? 'liking' : 'unliking'} post ${postId}`)

    // Get the current post and user
    const [post, currentUser] = await Promise.all([
      payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 0,
      }),
      payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 0,
      })
    ])

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Get current likes arrays
    const currentPostLikes = Array.isArray(post.likes) ? post.likes : []
    const currentUserLikedPosts = Array.isArray(currentUser.likedPosts) ? currentUser.likedPosts : []

    // Check current like status
    const isCurrentlyLiked = currentPostLikes.includes(user.id)
    const userHasLikedPost = currentUserLikedPosts.includes(postId)

    // Validate operation
    if (shouldLike && isCurrentlyLiked) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Post already liked',
          data: { 
            isLiked: true, 
            likeCount: currentPostLikes.length,
            postId 
          } 
        }
      )
    }

    if (!shouldLike && !isCurrentlyLiked) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Post already not liked',
          data: { 
            isLiked: false, 
            likeCount: currentPostLikes.length,
            postId 
          } 
        }
      )
    }

    let updatedPostLikes: string[]
    let updatedUserLikedPosts: string[]

    if (shouldLike) {
      // Add like
      updatedPostLikes = Array.from(new Set([...currentPostLikes, user.id]))
      updatedUserLikedPosts = Array.from(new Set([...currentUserLikedPosts, postId]))
      console.log(`➕ Adding like: Post ${postId} now has ${updatedPostLikes.length} likes`)
    } else {
      // Remove like
      updatedPostLikes = currentPostLikes.filter((id: string) => id !== user.id)
      updatedUserLikedPosts = currentUserLikedPosts.filter((id: string) => id !== postId)
      console.log(`➖ Removing like: Post ${postId} now has ${updatedPostLikes.length} likes`)
    }

    // Update both post and user in parallel
    await Promise.all([
      payload.update({
        collection: 'posts',
        id: postId,
        data: {
          likes: updatedPostLikes,
          likeCount: updatedPostLikes.length,
        },
      }),
      payload.update({
        collection: 'users',
        id: user.id,
        data: {
          likedPosts: updatedUserLikedPosts,
        },
      })
    ])

    // Send push notification if liking (not when unliking)
    if (shouldLike && post.createdBy && post.createdBy !== user.id) {
      try {
        const { notificationHooks } = await import('@/lib/notification-hooks')
        await notificationHooks.onUserLike(
          post.createdBy,
          String(user.id),
          currentUser.name || 'Someone',
          postId,
          'post'
        )
        console.log(`✅ [Posts Like API] Like notification sent to post owner ${post.createdBy}`)
      } catch (notificationError) {
        console.warn('Failed to send like notification:', notificationError)
        // Don't fail the like operation if notification fails
      }
    }

    const response = {
      success: true,
      message: shouldLike ? 'Post liked successfully' : 'Post unliked successfully',
      data: { 
        isLiked: shouldLike,
        likeCount: updatedPostLikes.length,
        postId,
        userId: user.id
      }
    }

    console.log(`✅ Like operation completed:`, response.data)

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error in like API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to like post',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}