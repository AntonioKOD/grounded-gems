import { NextRequest, NextResponse } from 'next/server'
import { 
  getFeedPosts, 
  getPersonalizedFeed, 
  getDiscoverFeed, 
  getPopularFeed, 
  getLatestFeed,
  getSavedPostsFeed 
} from '@/app/actions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedType = searchParams.get('feedType') || 'all'
    const sortBy = searchParams.get('sortBy') || 'recent'
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category')
    const currentUserId = searchParams.get('currentUserId')

    // Validate and sanitize currentUserId
    const validCurrentUserId = currentUserId && currentUserId !== 'undefined' && currentUserId !== 'null' && currentUserId.trim() !== '' 
      ? currentUserId.trim() 
      : undefined

    console.log('Feed API - Parameters:', {
      feedType,
      sortBy,
      page,
      category,
      originalCurrentUserId: currentUserId,
      validCurrentUserId,
    })

    let posts: any[] = []

    // Route to appropriate feed function based on parameters
    switch (category) {
      case 'discover':
        console.log('Fetching discover feed with userId:', validCurrentUserId)
        posts = await getDiscoverFeed(validCurrentUserId, page, 10)
        break
      case 'trending':
        console.log('Fetching trending feed with userId:', validCurrentUserId)
        posts = await getPopularFeed(validCurrentUserId, page, 10, '7d')
        break
      case 'recent':
        console.log('Fetching recent feed with userId:', validCurrentUserId)
        posts = await getLatestFeed(validCurrentUserId, page, 10)
        break
      case 'bookmarks':
        if (validCurrentUserId) {
          console.log('Fetching bookmarks feed for userId:', validCurrentUserId)
          posts = await getSavedPostsFeed(validCurrentUserId, page, 10)
        } else {
          console.log('No valid user ID for bookmarks, returning empty array')
          posts = []
        }
        break
      default:
        if (feedType === 'personalized' && validCurrentUserId) {
          console.log('Fetching personalized feed for userId:', validCurrentUserId)
          const personalizedPosts = await getPersonalizedFeed(validCurrentUserId, 10, (page - 1) * 10, category || undefined)
          posts = personalizedPosts || []
        } else {
          console.log('Fetching general feed with userId:', validCurrentUserId)
          posts = await getFeedPosts(feedType, sortBy, page, category || undefined, validCurrentUserId)
        }
    }

    console.log(`Feed API - Successfully fetched ${posts.length} posts`)

    return NextResponse.json({
      success: true,
      posts,
      pagination: {
        page,
        limit: 10,
        hasMore: posts.length >= 10
      }
    })
  } catch (error) {
    console.error('Error fetching feed:', error)
    
    // Provide more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch feed',
        details: errorMessage,
        posts: []
      },
      { status: 500 }
    )
  }
} 