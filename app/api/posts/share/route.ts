import { NextRequest, NextResponse } from 'next/server'
import { sharePost } from '@/app/actions'

export async function POST(request: NextRequest) {
  try {
    const { postId, userId } = await request.json()

    if (!postId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await sharePost(postId, userId)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error sharing post:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to share post'
      },
      { status: 500 }
    )
  }
} 