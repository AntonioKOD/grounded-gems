import { NextRequest, NextResponse } from 'next/server'
import { getSavedPostsFeed } from '@/app/actions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const savedPosts = await getSavedPostsFeed(userId, page, limit)
    
    return NextResponse.json({
      success: true,
      posts: savedPosts,
      page,
      limit,
      hasMore: savedPosts.length === limit
    })
  } catch (error) {
    console.error('Error fetching saved posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved posts' },
      { status: 500 }
    )
  }
} 