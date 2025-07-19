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
      userId: user?.id as string,
      location,
      weather,
      timeOfDay: timeOfDay as any,
      interests,
      socialCircle,
      page,
      limit,
      feedType,
      sortBy,
      filters: {
        includeTypes,
        excludeTypes
      }
    })

    // Note: User interaction states are now handled within the feed algorithm
    // No need for additional user data queries here

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
 * NOTE: This function is now deprecated as interaction states are handled within the feed algorithm
 */
async function updateUserInteractionStates(
  items: FeedItem[],
  userId: string,
  payload: any
): Promise<void> {
  // This function is no longer needed as interaction states are handled in the feed algorithm
  console.log('⚠️ updateUserInteractionStates is deprecated - interaction states handled in feed algorithm')
}

function calculateContentMix(items: FeedItem[]): Record<string, number> {
  return items.reduce((acc: Record<string, number>, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {})
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