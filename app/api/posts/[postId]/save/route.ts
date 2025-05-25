import { NextRequest, NextResponse } from 'next/server'
import { savePost } from '@/app/actions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { userId, shouldSave } = await request.json()
    const { postId } = await params
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const result = await savePost(postId, userId, shouldSave)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in save post API:', error)
    return NextResponse.json(
      { error: 'Failed to save post' },
      { status: 500 }
    )
  }
} 