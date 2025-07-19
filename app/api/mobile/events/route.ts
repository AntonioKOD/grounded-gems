import { NextRequest, NextResponse } from 'next/server'
import { 
  getEvents, 
  createEvent, 
  getNearbyEventsAction,
  getUserEventsByCategory,
} from '@/app/(frontend)/events/actions'
import { getSuggestedOrPopularEvents } from '@/app/(frontend)/home-page-actions/actions'
import { getAuthenticatedUser, getMobileUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { EventFormData } from '@/types/event'
import type { EventFilterOptions } from '@/types/event-filter'

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
    const user = await getAuthenticatedUser(request)
    const currentUserId = user?.id

    console.log(`Mobile API: Getting ${type} events`)

    let events: any[] = []
    let hasMore = false
    let totalCount = 0

    switch (type) {
      case 'nearby':
        const nearbyParams: EventFilterOptions = {
          userId: currentUserId,
          radiusKm: radius,
          category: category ?? undefined,
          eventType: eventType ?? undefined,
          isMatchmaking,
          limit,
          offset: (page - 1) * limit
        }
        
        if (lat && lng) {
          // Add coordinates if provided
          Object.assign(nearbyParams, { lat: parseFloat(lat), lng: parseFloat(lng) })
        }
        
        const nearbyResult = await getNearbyEventsAction(nearbyParams)
        events = Array.isArray(nearbyResult) ? nearbyResult.map(e => e.event) : []
        hasMore = false
        totalCount = events.length
        break
        
      case 'popular':
      case 'suggested':
        const coordinates = lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : undefined
        events = await getSuggestedOrPopularEvents(currentUserId, coordinates, limit)
        break
        
      case 'created':
        if (currentUserId) {
          // Get events created by the current user
          const { getPayload } = await import('payload')
          const config = (await import('@payload-config')).default
          const payload = await getPayload({ config })
          
          const result = await payload.find({
            collection: 'events',
            where: {
              organizer: { equals: currentUserId },
              startDate: { greater_than_equal: startDate || new Date().toISOString() }
            },
            sort: sort === 'desc' ? '-startDate' : 'startDate',
            limit,
            page,
            depth: 2
          })
          
          events = result.docs
          hasMore = result.hasNextPage || false
          totalCount = result.totalDocs
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
        const allowedSorts = ['startDate', 'name', 'createdAt', 'popularity'] as const;
        type AllowedSort = typeof allowedSorts[number];
        const sortValue: AllowedSort = allowedSorts.includes(sort as AllowedSort) ? (sort as AllowedSort) : 'startDate';
        const filters: EventFilterOptions = {
          startDate: { from: startDate || new Date().toISOString() },
          sort: sortValue,
          page,
          limit
        }
        
        if (category) (filters as any).category = category
        if (eventType) (filters as any).eventType = eventType
        if (isMatchmaking) (filters as any).isMatchmaking = true
        
        const result = await getEvents(filters)
        events = result.docs || []
        hasMore = result.hasNextPage || false
        totalCount = result.totalDocs
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
        title: event.name, // Events collection uses 'name' field
        description: event.description,
        slug: event.slug,
        eventType: event.eventType,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        featuredImage: event.image?.url, // Events collection uses 'image' field
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
        maxParticipants: event.capacity, // Events collection uses 'capacity' field
        participantCount: event.attendeeCount || 0, // Events collection uses 'attendeeCount'
        interestedCount: event.interestedCount || 0,
        goingCount: event.goingCount || 0,
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
    console.log('Mobile events POST - Starting authentication...')
    
    // Extract Bearer token and authenticate directly
    const authHeader = request.headers.get('authorization')
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      console.log('Mobile events POST - Extracted token:', token.substring(0, 20) + '...')
      
      try {
        // Call mobile users/me directly for authentication
        const meResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/mobile/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        console.log('Mobile events POST - Mobile users/me response status:', meResponse.status)
        
        if (meResponse.ok) {
          const meData = await meResponse.json()
          user = meData.user
          console.log('Mobile events POST - Authentication successful, user ID:', user?.id)
        } else {
          console.log('Mobile events POST - Authentication failed, status:', meResponse.status)
        }
      } catch (authError) {
        console.error('Mobile events POST - Authentication error:', authError)
      }
    }
    
    if (!user) {
      console.log('Mobile events POST - No user found, returning 401')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Mobile API: Received event data:', body)

    // Get payload instance
    const payload = await getPayload({ config })

    // Handle location - find existing location or create a placeholder
    let locationId: string | undefined = body.locationId ? String(body.locationId) : undefined // If mobile app sends locationId
    
    if (!locationId && body.location) {
      // Try to find existing location by name
      const locations = await payload.find({
        collection: 'locations',
        where: {
          name: { equals: body.location }
        },
        limit: 1
      })
      
      if (locations.docs.length > 0) {
        locationId = String(locations.docs[0]?.id)
        console.log('Mobile API: Found existing location:', locationId)
      } else {
        // Create a placeholder location for mobile events
        try {
          const locationSlug = body.location.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          const newLocation = await payload.create({
            collection: 'locations',
            data: {
              name: body.location,
              slug: locationSlug,
              description: `Location for event: ${body.title || 'Untitled Event'}`,
              status: 'draft',
              privacy: 'public'
            }
          })
          locationId = String(newLocation.id)
          console.log('Mobile API: Created placeholder location:', locationId)
        } catch (locationError) {
          console.error('Mobile API: Failed to create location:', locationError)
          return NextResponse.json({
            success: false,
            error: 'Failed to create location for event',
            message: 'Location creation failed'
          }, { status: 400 })
        }
      }
    }

    // Validate required fields
    if (!body.title && !body.name) {
      return NextResponse.json({
        success: false,
        error: 'Event title is required',
        message: 'Please provide an event title'
      }, { status: 400 })
    }

    if (!body.description) {
      return NextResponse.json({
        success: false,
        error: 'Event description is required',
        message: 'Please provide an event description'
      }, { status: 400 })
    }

    if (!body.startDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date is required',
        message: 'Please provide a start date for the event'
      }, { status: 400 })
    }

    if (!locationId) {
      return NextResponse.json({
        success: false,
        error: 'Location is required',
        message: 'Please provide a location for the event'
      }, { status: 400 })
    }

    // Validate category and event type
    const validCategories = ['entertainment', 'education', 'social', 'business', 'other']
    const validEventTypes = ['workshop', 'concert', 'meetup', 'social_event', 'other_event']
    
    const category = body.category && validCategories.includes(body.category) ? body.category : 'social'
    const eventType = body.eventType && validEventTypes.includes(body.eventType) ? body.eventType : 'social_event'

    // Generate slug from title
    const title = body.title || body.name || 'Untitled Event'
    let slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    // Ensure slug is unique by adding timestamp if needed
    try {
      const existingEvent = await payload.find({
        collection: 'events',
        where: {
          slug: { equals: slug }
        },
        limit: 1
      })
      
      if (existingEvent.docs.length > 0) {
        // Add timestamp to make slug unique
        const timestamp = Date.now().toString().slice(-6)
        slug = `${slug}-${timestamp}`
      }
    } catch (error) {
      console.log('Error checking slug uniqueness, continuing with original slug')
    }

    // Transform mobile app data to match EventFormData interface
    const eventData: EventFormData = {
      name: title,
      slug: slug,
      description: body.description,
      category: category,
      eventType: eventType,
      startDate: body.startDate,
      endDate: body.endDate,
      durationMinutes: body.durationMinutes,
      location: locationId,
      capacity: body.maxParticipants || body.capacity,
      organizer: user.id,
      status: body.status || 'published',
      tags: body.tags || [],
      privacy: body.privacy || 'public',
      privateAccess: body.privateAccess || [],
      meta: body.meta || {
        title: title,
        description: body.description?.substring(0, 160) || ''
      }
    }

    console.log(`Mobile API: Creating event for user ${user.id}`)
    console.log('Mobile API: Transformed event data:', eventData)

    // Create event directly with payload to ensure proper authentication context
    try {
      const event = await payload.create({
        collection: "events",
        data: eventData,
      })

      console.log(`Mobile API: Event created successfully: ${event.id}`)

      return NextResponse.json({
        success: true,
        message: 'Event created successfully',
        data: { event: event }
      })
    } catch (createError) {
      console.error('Mobile API: Error creating event with payload:', createError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create event',
        message: createError instanceof Error ? createError.message : 'Unknown error'
      }, { status: 400 })
    }
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