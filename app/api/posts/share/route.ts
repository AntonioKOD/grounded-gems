import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sharePost } from '@/app/actions'

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

    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use the authenticated user's ID
    const result = await sharePost(postId, user.id)
    
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