import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { likePost } from '@/app/actions'

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

    const { postId, shouldLike } = await request.json()

    if (!postId || typeof shouldLike !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use the authenticated user's ID
    const result = await likePost(postId, shouldLike, user.id)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error liking post:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to like post'
      },
      { status: 500 }
    )
  }
} 