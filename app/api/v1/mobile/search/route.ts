import { NextRequest, NextResponse } from 'next/server'
import { searchUsers, searchLocationsAction, searchEventsAction } from '@/app/(frontend)/events/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/v1/mobile/search - Global search endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all' // all, users, locations, events, posts
    const limit = parseInt(searchParams.get('limit') || '10')
    const filters = {
      category: searchParams.get('category'),
      eventType: searchParams.get('eventType'),
      priceRange: searchParams.get('priceRange'),
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius: parseInt(searchParams.get('radius') || '50')
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Get current user for personalization
    const user = await getServerSideUser()
    const currentUserId = user?.id

    console.log(`Mobile API: Searching for "${query}" with type: ${type}`)

    let results: any = {}

    // Search based on type
    switch (type) {
      case 'users':
        const users = await searchUsers(query, currentUserId, limit)
        results.users = users.map((user: any) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          bio: user.bio,
          profileImage: user.profileImage?.url,
          followerCount: user.followerCount || 0,
          isFollowing: user.isFollowing || false,
          isVerified: user.isVerified || false,
          lastActiveAt: user.lastActiveAt,
          location: user.location
        }))
        break

      case 'locations':
        const locationSearchParams = {
          query,
          category: filters.category,
          priceRange: filters.priceRange,
          coordinates: filters.lat && filters.lng ? {
            latitude: parseFloat(filters.lat),
            longitude: parseFloat(filters.lng)
          } : undefined,
          radius: filters.radius,
          limit
        }
        const locations = await searchLocationsAction(locationSearchParams)
        results.locations = locations.map((location: any) => ({
          id: location.id,
          name: location.name,
          slug: location.slug,
          description: location.shortDescription || location.description,
          address: location.address,
          coordinates: location.coordinates,
          featuredImage: location.featuredImage?.url,
          categories: location.categories?.map((cat: any) => 
            typeof cat === 'string' ? cat : cat.name
          ),
          rating: location.averageRating || 0,
          reviewCount: location.reviewCount || 0,
          priceRange: location.priceRange,
          isVerified: location.isVerified || false,
          distance: location.distance
        }))
        break

      case 'events':
        const eventSearchParams = {
          query,
          category: filters.category,
          eventType: filters.eventType,
          coordinates: filters.lat && filters.lng ? {
            latitude: parseFloat(filters.lat),
            longitude: parseFloat(filters.lng)
          } : undefined,
          radius: filters.radius,
          limit
        }
        const events = await searchEventsAction(eventSearchParams)
        results.events = events.map((event: any) => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          featuredImage: event.featuredImage?.url,
          category: event.category,
          eventType: event.eventType,
          location: event.location ? {
            id: typeof event.location === 'object' ? event.location.id : event.location,
            name: typeof event.location === 'object' ? event.location.name : 'Unknown Location'
          } : null,
          organizer: event.organizer ? {
            id: typeof event.organizer === 'object' ? event.organizer.id : event.organizer,
            name: typeof event.organizer === 'object' ? event.organizer.name : 'Unknown Organizer'
          } : null,
          participantCount: event.participants?.length || 0,
          maxParticipants: event.maxParticipants,
          isMatchmaking: event.isMatchmaking || false,
          distance: event.distance
        }))
        break

      case 'posts':
        // Search posts using the payload API
        const { getPayload } = await import('payload')
        const config = (await import('@payload-config')).default
        const payload = await getPayload({ config })
        
        const postSearchResult = await payload.find({
          collection: 'posts',
          where: {
            or: [
              { title: { contains: query } },
              { content: { contains: query } },
              { caption: { contains: query } }
            ],
            status: { equals: 'published' }
          },
          limit,
          depth: 2,
          sort: '-createdAt'
        })

        results.posts = postSearchResult.docs.map((post: any) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          caption: post.caption,
          slug: post.slug,
          featuredImage: post.featuredImage?.url,
          author: post.author ? {
            id: typeof post.author === 'object' ? post.author.id : post.author,
            name: typeof post.author === 'object' ? post.author.name : 'Unknown Author',
            avatar: typeof post.author === 'object' ? post.author.profileImage?.url : undefined
          } : null,
          location: post.location ? {
            id: typeof post.location === 'object' ? post.location.id : post.location,
            name: typeof post.location === 'object' ? post.location.name : 'Unknown Location'
          } : null,
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          createdAt: post.createdAt
        }))
        break

      case 'all':
      default:
        // Search all types with reduced limits
        const allLimit = Math.ceil(limit / 4)
        
        // Search users
        const allUsers = await searchUsers(query, currentUserId, allLimit)
        results.users = allUsers.slice(0, allLimit).map((user: any) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage?.url,
          isVerified: user.isVerified || false
        }))

        // Search locations
        const allLocations = await searchLocationsAction({
          query,
          limit: allLimit,
          coordinates: filters.lat && filters.lng ? {
            latitude: parseFloat(filters.lat),
            longitude: parseFloat(filters.lng)
          } : undefined
        })
        results.locations = allLocations.slice(0, allLimit).map((location: any) => ({
          id: location.id,
          name: location.name,
          address: location.address,
          featuredImage: location.featuredImage?.url,
          rating: location.averageRating || 0,
          categories: location.categories?.slice(0, 2)
        }))

        // Search events
        const allEvents = await searchEventsAction({
          query,
          limit: allLimit,
          coordinates: filters.lat && filters.lng ? {
            latitude: parseFloat(filters.lat),
            longitude: parseFloat(filters.lng)
          } : undefined
        })
        results.events = allEvents.slice(0, allLimit).map((event: any) => ({
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          featuredImage: event.featuredImage?.url,
          participantCount: event.participants?.length || 0
        }))

        // Search posts
        const { getPayload: getPayloadAll } = await import('payload')
        const configAll = (await import('@payload-config')).default
        const payloadAll = await getPayloadAll({ config: configAll })
        
        const allPostsResult = await payloadAll.find({
          collection: 'posts',
          where: {
            or: [
              { title: { contains: query } },
              { content: { contains: query } }
            ],
            status: { equals: 'published' }
          },
          limit: allLimit,
          depth: 1,
          sort: '-createdAt'
        })

        results.posts = allPostsResult.docs.slice(0, allLimit).map((post: any) => ({
          id: post.id,
          title: post.title,
          featuredImage: post.featuredImage?.url,
          author: post.author ? {
            name: typeof post.author === 'object' ? post.author.name : 'Unknown'
          } : null,
          likeCount: post.likeCount || 0
        }))
        break
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum: number, arr: any) => 
      sum + (Array.isArray(arr) ? arr.length : 0), 0
    )

    return NextResponse.json({
      success: true,
      data: {
        query,
        type,
        results,
        meta: {
          totalResults,
          filters: Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined)
          ),
          searchTime: Date.now()
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error performing search:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform search',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/v1/mobile/search/suggestions - Get search suggestions
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.trim().length < 1) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [] }
      })
    }

    // Get current user for personalization
    const user = await getServerSideUser()

    console.log(`Mobile API: Getting search suggestions for "${query}"`)

    // Generate suggestions based on partial query
    const suggestions: string[] = []

    // Add popular searches related to the query
    const popularSearches = [
      'restaurants', 'hiking trails', 'coffee shops', 'beaches', 'museums',
      'parks', 'bars', 'shopping', 'events', 'activities', 'nightlife'
    ]

    popularSearches
      .filter(search => search.toLowerCase().includes(query.toLowerCase()))
      .forEach(search => suggestions.push(search))

    // Add location-based suggestions if we have user context
    if (user && query.length >= 2) {
      try {
        const quickLocations = await searchLocationsAction({
          query,
          limit: 3
        })
        
        quickLocations.forEach((location: any) => {
          if (!suggestions.includes(location.name)) {
            suggestions.push(location.name)
          }
        })
      } catch (error) {
        console.warn('Error fetching location suggestions:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        suggestions: suggestions.slice(0, 8) // Limit to 8 suggestions
      }
    })
  } catch (error) {
    console.error('Mobile API: Error getting search suggestions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 