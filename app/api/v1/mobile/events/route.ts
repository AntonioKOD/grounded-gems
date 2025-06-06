import { NextRequest, NextResponse } from 'next/server'
import { 
  getEvents, 
  createEvent, 
  getNearbyEventsAction,
  getUserEventsByCategory,
  type EventFormData,
  type EventFilterOptions 
} from '@/app/(frontend)/events/actions'
import { getSuggestedOrPopularEvents } from '@/app/(frontend)/home-page-actions/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/v1/mobile/events - Get events with various filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, nearby, popular, created, attending, suggested
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category')
    const eventType = searchParams.get('eventType')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseInt(searchParams.get('radius') || '50')
    const isMatchmaking = searchParams.get('isMatchmaking') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sort = searchParams.get('sort') || 'startDate'

    // Get current user for personalization
    const user = await getServerSideUser()
    const currentUserId = user?.id

    console.log(`Mobile API: Getting ${type} events`)

    let events: any[] = []
    let hasMore = false
    let totalCount = 0

    switch (type) {
      case 'nearby':
        const nearbyParams = {
          userId: currentUserId,
          radiusKm: radius,
          category,
          eventType,
          isMatchmaking,
          limit,
          offset: (page - 1) * limit
        }
        
        if (lat && lng) {
          // Add coordinates if provided
          Object.assign(nearbyParams, { lat: parseFloat(lat), lng: parseFloat(lng) })
        }
        
        const nearbyResult = await getNearbyEventsAction(nearbyParams)
        events = nearbyResult.events || []
        hasMore = nearbyResult.pagination?.hasMore || false
        totalCount = nearbyResult.pagination?.total || 0
        break
        
      case 'popular':
      case 'suggested':
        const coordinates = lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : undefined
        events = await getSuggestedOrPopularEvents(currentUserId, coordinates, limit)
        break
        
      case 'created':
        if (currentUserId) {
          const filters: EventFilterOptions = {
            createdBy: currentUserId,
            startDate: startDate ? { from: startDate } : { from: new Date().toISOString() },
            sort: sort as any,
            page,
            limit
          }
          
          if (category) filters.category = category
          if (eventType) filters.eventType = eventType
          if (endDate) filters.endDate = { to: endDate }
          
          const result = await getEvents(filters)
          events = result.events || []
          hasMore = result.pagination?.hasMore || false
          totalCount = result.pagination?.total || 0
        }
        break
        
      case 'attending':
        if (currentUserId) {
          // Get events user is attending
          const { getPayload } = await import('payload')
          const config = (await import('@payload-config')).default
          const payload = await getPayload({ config })
          
          const result = await payload.find({
            collection: 'events',
            where: {
              'participants.user': { equals: currentUserId },
              'participants.status': { in: ['going', 'interested'] },
              startDate: { greater_than: new Date().toISOString() }
            },
            sort: 'startDate',
            limit,
            page,
            depth: 2
          })
          
          events = result.docs
          hasMore = result.hasNextPage || false
          totalCount = result.totalDocs
        }
        break
        
      case 'categories':
        if (currentUserId) {
          const categoryEvents = await getUserEventsByCategory(currentUserId)
          events = Object.values(categoryEvents).flat()
        }
        break
        
      default: // 'all'
        const filters: EventFilterOptions = {
          startDate: startDate ? { from: startDate } : { from: new Date().toISOString() },
          sort: sort as any,
          page,
          limit
        }
        
        if (category) filters.category = category
        if (eventType) filters.eventType = eventType
        if (endDate) filters.endDate = { to: endDate }
        if (isMatchmaking) filters.isMatchmaking = true
        
        const result = await getEvents(filters)
        events = result.events || []
        hasMore = result.pagination?.hasMore || false
        totalCount = result.pagination?.total || 0
    }

    // Format events for mobile
    const formattedEvents = events.map((event: any) => {
      // Check if user is attending
      let userParticipation = null
      if (currentUserId && event.participants) {
        const participation = event.participants.find((p: any) => 
          (typeof p.user === 'string' ? p.user : p.user?.id) === currentUserId
        )
        userParticipation = participation ? {
          status: participation.status,
          joinedAt: participation.joinedAt
        } : null
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        slug: event.slug,
        eventType: event.eventType,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        featuredImage: event.featuredImage?.url,
        gallery: event.gallery?.map((item: any) => ({
          image: item.image?.url,
          caption: item.caption
        })) || [],
        location: event.location ? {
          id: typeof event.location === 'object' ? event.location.id : event.location,
          name: typeof event.location === 'object' ? event.location.name : 'Unknown Location',
          address: typeof event.location === 'object' ? event.location.address : undefined,
          coordinates: typeof event.location === 'object' ? event.location.coordinates : undefined
        } : null,
        organizer: event.organizer ? {
          id: typeof event.organizer === 'object' ? event.organizer.id : event.organizer,
          name: typeof event.organizer === 'object' ? event.organizer.name : 'Unknown Organizer',
          avatar: typeof event.organizer === 'object' ? event.organizer.profileImage?.url : undefined
        } : null,
        maxParticipants: event.maxParticipants,
        participantCount: event.participants?.length || 0,
        interestedCount: event.participants?.filter((p: any) => p.status === 'interested').length || 0,
        goingCount: event.participants?.filter((p: any) => p.status === 'going').length || 0,
        isMatchmaking: event.isMatchmaking || false,
        matchmakingSettings: event.matchmakingSettings,
        ageRestriction: event.ageRestriction,
        requiresApproval: event.requiresApproval || false,
        tags: event.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.tag) || [],
        userParticipation,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        events: formattedEvents,
        pagination: {
          page,
          limit,
          hasMore,
          total: totalCount
        },
        meta: {
          type,
          category,
          eventType,
          isMatchmaking,
          coordinates: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching events:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/mobile/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const eventData: EventFormData = body

    console.log(`Mobile API: Creating event for user ${user.id}`)

    const event = await createEvent(eventData, user.id, user.name, user.profileImage?.url)

    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
      data: { event }
    })
  } catch (error) {
    console.error('Mobile API: Error creating event:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
} 