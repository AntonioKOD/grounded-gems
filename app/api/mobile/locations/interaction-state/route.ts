import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface LocationInteractionState {
  locationId: string
  isSaved: boolean
  isSubscribed: boolean
  saveCount: number
  subscriberCount: number
}

interface MobileLocationInteractionStateResponse {
  success: boolean
  message: string
  data?: {
    interactions: LocationInteractionState[]
    totalLocations: number
    totalSaved: number
    totalSubscribed: number
  }
  error?: string
  code?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileLocationInteractionStateResponse>> {
  try {
    console.log('🔄 [Location Interaction State API] Request received')
    const payload = await getPayload({ config })

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    console.log('🔄 [Location Interaction State API] Auth header present:', !!authHeader)
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('🔄 [Location Interaction State API] No Bearer token found')
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authentication token provided',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      )
    }

    const { user } = await payload.auth({ headers: request.headers })
    console.log('🔄 [Location Interaction State API] User authenticated:', user?.id)
    
    if (!user) {
      console.log('🔄 [Location Interaction State API] Authentication failed')
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token',
          error: 'Authentication token is invalid or expired',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // Get the request body with location IDs
    const body = await request.json()
    const { locationIds } = body
    
    console.log('🔄 [Location Interaction State API] Request body:', body)

    // Validate locationIds
    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      console.log('🔄 [Location Interaction State API] Invalid location IDs')
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid location IDs',
          error: 'Location IDs array is required and must not be empty',
          code: 'INVALID_LOCATION_IDS'
        },
        { status: 400 }
      )
    }

    // Limit the number of locations to check at once (performance optimization)
    const maxLocationsToCheck = 50
    const locationsToCheck = locationIds.slice(0, maxLocationsToCheck)
    
    console.log('🔄 [Location Interaction State API] Checking \(locationsToCheck.length) locations')

    // Get user's saved locations
    const savedLocationsResult = await payload.find({
      collection: 'savedLocations',
      where: {
        user: { equals: user.id }
      },
      depth: 1
    })

    // Get user's subscribed locations
    const subscribedLocationsResult = await payload.find({
      collection: 'locationSubscriptions',
      where: {
        and: [
          { user: { equals: user.id } },
          { isActive: { equals: true } }
        ]
      },
      depth: 1
    })

    // Create sets for quick lookup
    const savedLocationIds = new Set(savedLocationsResult.docs.map((sl: any) => sl.location?.id || sl.location))
    const subscribedLocationIds = new Set(subscribedLocationsResult.docs.map((sl: any) => sl.location?.id || sl.location))

    console.log('🔄 [Location Interaction State API] User saved locations:', Array.from(savedLocationIds))
    console.log('🔄 [Location Interaction State API] User subscribed locations:', Array.from(subscribedLocationIds))

    // Fetch all locations in one query for efficiency
    const locations = await payload.find({
      collection: 'locations',
      where: {
        id: {
          in: locationsToCheck
        }
      },
      depth: 1, // Include relationship data
      limit: maxLocationsToCheck
    })

    console.log('🔄 [Location Interaction State API] Found \(locations.docs.length) locations in database')

    // Create a map for quick lookup
    const locationsMap = new Map(locations.docs.map(location => [location.id, location]))

    // Process each location ID and check interaction state
    const interactions: LocationInteractionState[] = []
    let totalSaved = 0
    let totalSubscribed = 0

    for (const locationId of locationsToCheck) {
      const location = locationsMap.get(locationId)
      
      if (!location) {
        // Location not found, return default state
        interactions.push({
          locationId,
          isSaved: false,
          isSubscribed: false,
          saveCount: 0,
          subscriberCount: 0
        })
        continue
      }

      // Check if user has saved this location
      const isSaved = savedLocationIds.has(locationId)

      // Check if user has subscribed to this location
      const isSubscribed = subscribedLocationIds.has(locationId)

      // Get save count (from savedLocations collection)
      const locationSavesResult = await payload.find({
        collection: 'savedLocations',
        where: {
          location: { equals: locationId }
        },
        limit: 1 // We only need the count
      })
      const saveCount = locationSavesResult.totalDocs

      // Get subscriber count (from locationSubscriptions collection)
      const locationSubscriptionsResult = await payload.find({
        collection: 'locationSubscriptions',
        where: {
          and: [
            { location: { equals: locationId } },
            { isActive: { equals: true } }
          ]
        },
        limit: 1 // We only need the count
      })
      const subscriberCount = locationSubscriptionsResult.totalDocs

      // Update totals
      if (isSaved) totalSaved++
      if (isSubscribed) totalSubscribed++
      
      console.log('🔄 [Location Interaction State API] Location \(locationId): isSaved=\(isSaved), isSubscribed=\(isSubscribed), saveCount=\(saveCount), subscriberCount=\(subscriberCount)')

      interactions.push({
        locationId,
        isSaved,
        isSubscribed,
        saveCount,
        subscriberCount
      })
    }

    const response: MobileLocationInteractionStateResponse = {
      success: true,
      message: 'Location interaction states retrieved successfully',
      data: {
        interactions,
        totalLocations: interactions.length,
        totalSaved,
        totalSubscribed
      }
    }

    console.log('🔄 [Location Interaction State API] Response: \(interactions.length) interactions, \(totalSaved) saved, \(totalSubscribed) subscribed')

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile location interaction state check error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Location interaction state service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
} 