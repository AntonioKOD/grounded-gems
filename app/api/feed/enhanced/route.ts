import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { FeedAlgorithm } from '@/lib/feed-algorithm'
import type { FeedItem, FeedAlgorithmParams } from '@/types/feed'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Get user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const feedType = searchParams.get('feedType') || 'mixed'
    const sortBy = searchParams.get('sortBy') || 'recommended'
    
    // Get location from query params
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const location = lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : undefined
    
    // Get weather and time context
    const weather = searchParams.get('weather') || undefined
    const timeOfDay = searchParams.get('timeOfDay') || undefined
    
    // Get user preferences
    const interests = searchParams.get('interests')?.split(',').filter(Boolean) || []
    const socialCircle = searchParams.get('socialCircle')?.split(',').filter(Boolean) || []
    
    // Get filters - handle both old and new parameter names for compatibility
    const excludeTypes = searchParams.get('excludeTypes')?.split(',').filter(Boolean) || []
    const includeTypes = searchParams.get('includeTypes')?.split(',').filter(Boolean) || 
                        searchParams.get('contentTypes')?.split(',').filter(Boolean) || []
    
    console.log('🎯 Enhanced Feed API called with params:', {
      userId: user?.id,
      page,
      limit,
      feedType,
      sortBy,
      hasLocation: !!location,
      location,
      weather,
      timeOfDay,
      interestsCount: interests.length,
      interests: interests.slice(0, 3), // Log first 3 for debugging
      socialCircleCount: socialCircle.length,
      excludeTypes,
      includeTypes,
      hasFilters: includeTypes.length > 0 || excludeTypes.length > 0
    })

    // Initialize feed algorithm
    const feedAlgorithm = new FeedAlgorithm()
    
    // Generate feed with proper parameters
    const feedItems = await feedAlgorithm.generateFeed({
      userId: user?.id,
      page,
      limit,
      feedType: feedType as any,
      sortBy: sortBy as any,
      location,
      weather,
      timeOfDay,
      interests,
      socialCircle,
      filters: {
        excludeTypes: excludeTypes as any,
        includeTypes: includeTypes as any
      }
    })

    // Update user interaction states if user is logged in
    if (user?.id && feedItems.length > 0) {
      await updateUserInteractionStates(feedItems, user.id, payload)
    }

    const itemTypeCounts = feedItems.reduce((acc: Record<string, number>, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {})

    console.log('✅ Enhanced Feed API returned', feedItems.length, 'items:', itemTypeCounts)

    return NextResponse.json({
      success: true,
      data: {
        items: feedItems,
        pagination: {
          page,
          limit,
          hasMore: feedItems.length === limit,
          nextPage: page + 1,
          total: feedItems.length
        },
        meta: {
          totalItems: feedItems.length,
          feedType,
          sortBy,
          filters: {
            excludeTypes,
            includeTypes,
            hasFilters: includeTypes.length > 0 || excludeTypes.length > 0
          },
          itemTypeCounts,
          userId: user?.id || null,
          hasLocation: !!location
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Enhanced Feed API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate feed',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: {
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          hasMore: false,
          nextPage: 1,
          total: 0
        },
        meta: {
          totalItems: 0,
          feedType: 'mixed',
          sortBy: 'recommended',
          filters: {
            excludeTypes: [],
            includeTypes: [],
            hasFilters: false
          },
          itemTypeCounts: {},
          userId: null,
          hasLocation: false
        }
      }
    }, { status: 500 })
  }
}

/**
 * Update interaction states (likes, saves) for feed items
 */
async function updateUserInteractionStates(
  items: FeedItem[],
  userId: string,
  payload: any
): Promise<void> {
  try {
    // Get user with their liked posts, saved posts, and purchased guides
    const [userWithInteractions, purchasedGuides] = await Promise.all([
      payload.findByID({
        collection: 'users',
        id: userId,
        depth: 1
      }),
      payload.find({
        collection: 'guide-purchases',
        where: { user: { equals: userId } },
        limit: 1000
      })
    ])
    
    const likedPostIds = new Set((userWithInteractions.likedPosts || []).map((post: any) => 
      typeof post === 'string' ? post : post?.id
    ))
    
    const savedPostIds = new Set((userWithInteractions.savedPosts || []).map((post: any) => 
      typeof post === 'string' ? post : post?.id
    ))
    
    const purchasedGuideIds = new Set(purchasedGuides.docs.map((purchase: any) => 
      purchase.guide?.id || purchase.guide
    ))
    
    // Update post items with interaction states
    items.forEach(item => {
      if (item.type === 'post' && item.post) {
        // Check if this post is in the user's liked/saved arrays
        item.post.isLiked = likedPostIds.has(item.post.id)
        item.post.isSaved = savedPostIds.has(item.post.id)
        
        console.log(`📝 Post ${item.post.id} interaction states:`, {
          isLiked: item.post.isLiked,
          isSaved: item.post.isSaved,
          userLikedPosts: Array.from(likedPostIds),
          userSavedPosts: Array.from(savedPostIds)
        })
      }
      
      if (item.type === 'guide_spotlight' && item.guide) {
        item.guide.isPurchased = purchasedGuideIds.has(item.guide.id)
      }
    })
  } catch (error) {
    console.error('Error updating user interaction states:', error)
  }
}

/**
 * Calculate content mix percentages
 */
function calculateContentMix(items: FeedItem[]): Record<string, number> {
  const counts: Record<string, number> = {}
  const total = items.length
  
  if (total === 0) return {}
  
  items.forEach(item => {
    counts[item.type] = (counts[item.type] || 0) + 1
  })
  
  return Object.fromEntries(
    Object.entries(counts).map(([type, count]) => [
      type, 
      Math.round((count / total) * 100)
    ])
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 