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

    let posts: any[] = []

    // Route to appropriate feed function based on parameters
    switch (category) {
      case 'discover':
        posts = await getDiscoverFeed(currentUserId || undefined, page, 10)
        break
      case 'trending':
        posts = await getPopularFeed(currentUserId || undefined, page, 10, '7d')
        break
      case 'recent':
        posts = await getLatestFeed(currentUserId || undefined, page, 10)
        break
      case 'bookmarks':
        if (currentUserId) {
          posts = await getSavedPostsFeed(currentUserId, page, 10)
        } else {
          posts = []
        }
        break
      default:
        if (feedType === 'personalized' && currentUserId) {
          const personalizedPosts = await getPersonalizedFeed(currentUserId, 10, (page - 1) * 10, category || undefined)
          posts = personalizedPosts || []
        } else {
          posts = await getFeedPosts(feedType, sortBy, page, category || undefined, currentUserId || undefined)
        }
    }

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
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch feed',
        posts: []
      },
      { status: 500 }
    )
  }
} 