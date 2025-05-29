import { NextRequest, NextResponse } from 'next/server'
import { likePost } from '@/app/actions'

export async function POST(request: NextRequest) {
  try {
    const { postId, shouldLike, userId } = await request.json()

    if (!postId || !userId || typeof shouldLike !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await likePost(postId, shouldLike, userId)
    
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