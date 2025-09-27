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

// Helper function to get location name by ID
async function getLocationName(locationId: string, payload: any): Promise<string> {
  try {
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      depth: 0
    })
    
    if (!location?.name) {
      return 'Unknown Location'
    }
    
    // Check if the name looks like an ID (24 character hex string)
    const isIdPattern = /^[a-f0-9]{24}$/i
    if (isIdPattern.test(location.name)) {
      // The name is actually an ID, recursively resolve it
      console.log('🔍 [Location Debug] Name is an ID, recursively resolving:', location.name)
      return await getLocationName(location.name, payload)
    }
    
    return location.name
  } catch (error) {
    console.error('Error fetching location name:', error)
    return 'Unknown Location'
  }
}

// Helper function to get location name by ID (for use in map function) - DEPRECATED
async function getLocationNameForEvent(event: any, payload: any): Promise<string> {
  // This function is no longer used, kept for backward compatibility
  return 'Unknown Location'
}

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

    // Initialize payload for location name fetching
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })

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
    const formattedEvents = []
    
    for (const event of events) {
      // Check if user is attending
      let userRsvpStatus = null
      if (currentUserId && event.participants) {
        const participation = event.participants.find((p: any) => 
          (typeof p.user === 'string' ? p.user : p.user?.id) === currentUserId
        )
        userRsvpStatus = participation ? participation.status : null
      }

      // Get location name - always fetch directly from database
      let locationName = 'Unknown Location'
      if (event.location) {
        const locationId = typeof event.location === 'object' ? event.location.id : event.location
        if (locationId) {
          locationName = await getLocationName(locationId, payload)
        }
      }

      formattedEvents.push({
        id: event.id,
        name: event.name, // Events collection uses 'name' field
        description: event.description,
        slug: event.slug,
        eventType: event.eventType,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        image: event.image ? {
          url: event.image.url,
          alt: event.image.alt
        } : null, // Events collection uses 'image' field
        gallery: event.gallery?.map((item: any) => ({
          url: item.image?.url,
          alt: item.caption
        })) || [],
        location: event.location ? {
          id: typeof event.location === 'object' ? event.location.id : event.location,
          name: locationName,
          address: typeof event.location === 'object' ? event.location.address : undefined,
          coordinates: typeof event.location === 'object' ? event.location.coordinates : undefined
        } : null,
        organizer: event.organizer ? {
          id: typeof event.organizer === 'object' ? event.organizer.id : event.organizer,
          name: typeof event.organizer === 'object' ? event.organizer.name : 'Unknown Organizer',
          avatar: typeof event.organizer === 'object' ? event.organizer.profileImage?.url : undefined
        } : null,
        capacity: event.capacity, // Events collection uses 'capacity' field
        attendeeCount: event.attendeeCount || 0, // Events collection uses 'attendeeCount'
        interestedCount: event.interestedCount || 0,
        goingCount: event.goingCount || 0,
        invitedCount: event.invitedCount || 0,
        isFree: event.isFree !== false, // Default to true if not specified
        price: event.price,
        currency: event.currency,
        status: event.status || 'published',
        isMatchmaking: event.isMatchmaking || false,
        matchmakingSettings: event.matchmakingSettings,
        ageRestriction: event.ageRestriction,
        requiresApproval: event.requiresApproval || false,
        tags: event.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.tag) || [],
        userRsvpStatus,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      })
    }

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
    
    const payload = await getPayload({ config })
    
    let currentUser = null
    
    // Try to authenticate using Payload directly
    try {
      const authResult = await payload.auth({ headers: request.headers })
      currentUser = authResult.user
      console.log('🔐 [Events API] Direct Payload authentication successful')
    } catch (authError) {
      console.log('❌ [Events API] Direct Payload authentication failed:', authError instanceof Error ? authError.message : String(authError))
    }
    
    if (!currentUser) {
      console.log('Mobile events POST - No user found, returning 401')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Mobile API: Received event data:', body)

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
              privacy: 'public',
              createdBy: currentUser.id,
              address: {},
              coordinates: {},
              contactInfo: { socialMedia: {} },
              accessibility: {},
              partnershipDetails: {},
              meta: {},
              ownership: { claimStatus: 'unclaimed' },
              businessSettings: {
                allowSpecials: false,
                allowNotifications: false,
                notificationPreferences: {
                  pushNotifications: true,
                  emailNotifications: false,
                  targetAudience: 'all'
                }
              },
              gallery: [],
              tags: [],
              businessHours: [],
              bestTimeToVisit: [],
              insiderTips: [],
              communityPhotos: []
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

    // If no location provided, create a default "TBD" location
    if (!locationId) {
      try {
        const defaultLocation = await payload.create({
          collection: 'locations',
          data: {
            name: 'Location TBD',
            slug: 'location-tbd',
            description: 'Location to be determined',
            status: 'draft',
            privacy: 'public',
            createdBy: currentUser.id,
            address: {},
            coordinates: {},
            contactInfo: { socialMedia: {} },
            accessibility: {},
            partnershipDetails: {},
            meta: {},
            ownership: { claimStatus: 'unclaimed' },
            businessSettings: {
              allowSpecials: false,
              allowNotifications: false,
              notificationPreferences: {
                pushNotifications: true,
                emailNotifications: false,
                targetAudience: 'all'
              }
            },
            gallery: [],
            tags: [],
            businessHours: [],
            bestTimeToVisit: [],
            insiderTips: [],
            communityPhotos: []
          }
        })
        locationId = String(defaultLocation.id)
        console.log('Mobile API: Created default TBD location:', locationId)
      } catch (locationError) {
        console.error('Mobile API: Failed to create default location:', locationError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create default location',
          message: 'Location creation failed'
        }, { status: 400 })
      }
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
      organizer: String(currentUser.id),
      status: body.status || 'published',
      tags: body.tags || [],
      privacy: body.privacy || 'public',
      privateAccess: body.privateAccess || [],
      isFree: body.isFree !== false, // Default to true
      price: body.price,
      currency: body.currency || 'USD',
      requiresApproval: body.requiresApproval || false,
      ageRestriction: body.ageRestriction || 'all',
      isMatchmaking: body.isMatchmaking || false,
      matchmakingSettings: body.matchmakingSettings,
      image: body.image, // Add image field
      meta: body.meta || {
        title: title,
        description: body.description?.substring(0, 160) || ''
      }
    }

    // Handle invited users if provided
    if (body.invitedUsers && Array.isArray(body.invitedUsers) && body.invitedUsers.length > 0) {
      console.log(`Mobile API: Processing ${body.invitedUsers.length} invited users`)
      
      // Create RSVP entries for invited users
      const rsvpEntries = body.invitedUsers.map((userId: string) => ({
        user: userId,
        status: 'invited',
        invitedAt: new Date().toISOString(),
        invitedBy: String(currentUser.id)
      }))
      
      // Note: RSVP entries will be created separately after event creation
      console.log(`Mobile API: Will create ${body.invitedUsers.length} RSVP entries after event creation`)
    }

    console.log(`Mobile API: Creating event for user ${currentUser.id}`)
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