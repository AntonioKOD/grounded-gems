import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { savePost } from '@/app/actions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const payload = await getPayload({ config })

    // Authenticate the user
    const { user } = await payload.auth({
      headers: request.headers,
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const { shouldSave } = await request.json()
    const { postId } = await params
    
    if (typeof shouldSave !== 'boolean') {
      return NextResponse.json(
        { error: 'shouldSave is required and must be boolean' },
        { status: 400 }
      )
    }

    // Use the authenticated user's ID
    const result = await savePost(postId, user?.id as string, shouldSave)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in save post API:', error)
    return NextResponse.json(
      { error: 'Failed to save post' },
      { status: 500 }
    )
  }
} 