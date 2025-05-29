import { NextRequest, NextResponse } from 'next/server'
import { savePost } from '@/app/actions'

export async function POST(request: NextRequest) {
  try {
    const { postId, userId, shouldSave } = await request.json()

    if (!postId || !userId || typeof shouldSave !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await savePost(postId, userId, shouldSave)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error saving post:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save post'
      },
      { status: 500 }
    )
  }
} 