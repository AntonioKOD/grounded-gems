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
    
    // Check if body.location is a valid ObjectId (24 character hex string)
    const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id)
    
    if (!locationId && body.location) {
      if (isValidObjectId(body.location)) {
        // body.location is a valid ObjectId, use it directly
        locationId = body.location
        console.log('Mobile API: Using provided location ID:', locationId)
      } else {
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

    // Generate AI metadata for public events
    let eventMeta = body.meta || {
      title: title,
      description: body.description?.substring(0, 160) || ''
    }

    // Only generate AI metadata for public events
    if (body.privacy !== 'private' && body.status !== 'draft') {
      try {
        console.log('🤖 Generating AI metadata for public event:', title)
        
        const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://sacavia.com'}/api/ai/generate-event-metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: title,
            description: body.description,
            category: category,
            eventType: eventType,
            location: body.location || 'TBD',
            startDate: body.startDate
          })
        })

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          if (aiData.success && aiData.metadata) {
            eventMeta = {
              title: aiData.metadata.title,
              description: aiData.metadata.description,
              keywords: aiData.metadata.keywords
            }
            console.log('🤖 AI metadata generated successfully:', eventMeta)
          }
        } else {
          console.log('🤖 AI metadata generation failed, using fallback')
        }
      } catch (aiError) {
        console.error('🤖 AI metadata generation error:', aiError)
        // Continue with fallback metadata
      }
    }

    // Validate locationId is a valid ObjectId before creating event
    let validLocationId: string | undefined = undefined
    if (locationId) {
      if (/^[0-9a-fA-F]{24}$/.test(locationId)) {
        // Verify the location exists in the database
        try {
          const location = await payload.findByID({
            collection: 'locations',
            id: locationId,
            depth: 0
          })
          if (location) {
            validLocationId = locationId
            console.log('Mobile API: Validated location ID:', locationId)
          } else {
            console.log('Mobile API: Location not found in database, skipping location')
          }
        } catch (error) {
          console.log('Mobile API: Error validating location, skipping:', error)
        }
      } else {
        console.log('Mobile API: Invalid location ID format, skipping location')
      }
    }

    // Validate organizer ID is a valid ObjectId
    let validOrganizerId: string | undefined = undefined
    const organizerId = String(currentUser.id)
    if (/^[0-9a-fA-F]{24}$/.test(organizerId)) {
      validOrganizerId = organizerId
      console.log('Mobile API: Validated organizer ID:', organizerId)
    } else {
      console.log('Mobile API: Invalid organizer ID format:', organizerId)
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID format',
        message: 'User authentication error'
      }, { status: 400 })
    }

    // Validate image ID if provided
    let validImageId: string | undefined = undefined
    if (body.image && body.image !== 'placeholder_image_id') {
      if (/^[0-9a-fA-F]{24}$/.test(body.image)) {
        validImageId = body.image
        console.log('Mobile API: Validated image ID:', body.image)
      } else {
        console.log('Mobile API: Invalid image ID format, skipping:', body.image)
      }
    } else if (body.image === 'placeholder_image_id') {
      console.log('Mobile API: Skipping placeholder image ID')
    }

    // Transform mobile app data to match EventFormData interface
    const eventData: any = {
      name: title,
      slug: slug,
      description: body.description,
      category: category,
      eventType: eventType,
      startDate: body.startDate,
      endDate: body.endDate,
      durationMinutes: body.durationMinutes,
      location: validLocationId || '', // Only set if valid ObjectId
      capacity: body.maxParticipants || body.capacity,
      organizer: validOrganizerId, // Use validated organizer ID
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
      image: validImageId, // Use validated image ID if available
      meta: eventMeta
    }

    // Handle invited users if provided
    if (body.invitedUsers && Array.isArray(body.invitedUsers) && body.invitedUsers.length > 0) {
      console.log(`Mobile API: Processing ${body.invitedUsers.length} invited users`)
      
      // Validate all invited user IDs are valid ObjectIds
      const validInvitedUsers = body.invitedUsers.filter((userId: string) => {
        if (/^[0-9a-fA-F]{24}$/.test(userId)) {
          return true
        } else {
          console.log('Mobile API: Invalid invited user ID format, skipping:', userId)
          return false
        }
      })
      
      if (validInvitedUsers.length > 0) {
        // Create RSVP entries for valid invited users
        const rsvpEntries = validInvitedUsers.map((userId: string) => ({
          user: userId,
          status: 'invited',
          invitedAt: new Date().toISOString(),
          invitedBy: validOrganizerId // Use validated organizer ID
        }))
        
        // Note: RSVP entries will be created separately after event creation
        console.log(`Mobile API: Will create ${validInvitedUsers.length} RSVP entries after event creation`)
      } else {
        console.log('Mobile API: No valid invited user IDs found, skipping RSVP creation')
      }
    }

    console.log(`Mobile API: Creating event for user ${currentUser.id}`)
    console.log('Mobile API: Transformed event data:', JSON.stringify(eventData, null, 2))
    
    // Log each field to identify potential BSON issues
    console.log('Mobile API: Field validation:')
    console.log('- organizer:', eventData.organizer, 'type:', typeof eventData.organizer, 'valid:', /^[0-9a-fA-F]{24}$/.test(eventData.organizer))
    console.log('- location:', eventData.location, 'type:', typeof eventData.location, 'valid:', eventData.location ? /^[0-9a-fA-F]{24}$/.test(eventData.location) : 'empty')
    console.log('- image:', eventData.image ? 'File object' : 'null', 'type:', typeof eventData.image)
    console.log('- startDate:', eventData.startDate, 'type:', typeof eventData.startDate)
    console.log('- endDate:', eventData.endDate, 'type:', typeof eventData.endDate)
    console.log('- tags:', eventData.tags, 'type:', typeof eventData.tags, 'isArray:', Array.isArray(eventData.tags))
    console.log('- privateAccess:', eventData.privateAccess, 'type:', typeof eventData.privateAccess, 'isArray:', Array.isArray(eventData.privateAccess))

    // Create event directly with payload to ensure proper authentication context
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