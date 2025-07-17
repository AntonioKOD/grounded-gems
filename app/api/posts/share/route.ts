import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { postId, userId, shareMethod = 'link' } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { success: false, message: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Find the post
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
    })

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    // Update share count
    const currentShareCount = post.shareCount || 0
    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        shareCount: currentShareCount + 1,
      },
    })

    // Create share analytics record if user is logged in
    if (userId) {
      try {
        await payload.create({
          collection: 'analytics',
          data: {
            type: 'post_share',
            postId: postId,
            userId: userId,
            shareMethod: shareMethod, // 'native', 'clipboard', 'link', etc.
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent') || '',
            referrer: request.headers.get('referer') || '',
          },
        })
      } catch (error) {
        console.error('Error creating share analytics:', error)
        // Don't fail the request if analytics fails
      }
    }

    // Generate shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const shareableUrl = `${baseUrl}/post/${postId}`

    return NextResponse.json({
      success: true,
      message: 'Post shared successfully',
      shareableUrl,
      shareCount: currentShareCount + 1,
    })

  } catch (error) {
    console.error('Error sharing post:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to share post' },
      { status: 500 }
    )
  }
} 