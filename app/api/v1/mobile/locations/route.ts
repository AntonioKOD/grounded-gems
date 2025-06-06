import { NextRequest, NextResponse } from 'next/server'
import { 
  getLocations, 
  createLocation, 
  updateLocation,
  getReviewsbyId,
  recordLocationInteraction,
  toggleSaveLocationAction,
  toggleSubscribeLocationAction,
  getUserLocationDataAction,
  type LocationFormData 
} from '@/app/actions'
import { getNearbyOrPopularLocations } from '@/app/(frontend)/home-page-actions/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/v1/mobile/locations - Get locations with various filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, nearby, popular, saved, created
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseInt(searchParams.get('radius') || '25')
    const search = searchParams.get('search')

    // Get current user for personalization
    const user = await getServerSideUser()
    const currentUserId = user?.id

    console.log(`Mobile API: Getting ${type} locations`)

    let locations: any[] = []
    let hasMore = false

    switch (type) {
      case 'nearby':
      case 'popular':
        if (lat && lng) {
          const coordinates = { latitude: parseFloat(lat), longitude: parseFloat(lng) }
          locations = await getNearbyOrPopularLocations(coordinates, limit, radius)
        } else {
          locations = await getNearbyOrPopularLocations(undefined, limit, radius)
        }
        break
        
      case 'saved':
        if (currentUserId) {
          const { getSavedLocationsAction } = await import('@/app/actions')
          const savedLocations = await getSavedLocationsAction()
          locations = savedLocations.map(item => item.location).filter(Boolean)
        }
        break
        
      case 'created':
        if (currentUserId) {
          const { getPayload } = await import('payload')
          const config = (await import('@payload-config')).default
          const payload = await getPayload({ config })
          
          const result = await payload.find({
            collection: 'locations',
            where: {
              createdBy: { equals: currentUserId }
            },
            limit,
            page,
            depth: 2
          })
          
          locations = result.docs
          hasMore = result.hasNextPage || false
        }
        break
        
      default: // 'all'
        const allLocations = await getLocations()
        
        // Apply filters
        let filteredLocations = allLocations
        
        if (category) {
          filteredLocations = allLocations.filter(location => 
            location.categories?.some((cat: any) => 
              typeof cat === 'string' ? cat === category : cat.name === category
            )
          )
        }
        
        if (search) {
          const searchLower = search.toLowerCase()
          filteredLocations = filteredLocations.filter(location =>
            location.name?.toLowerCase().includes(searchLower) ||
            location.description?.toLowerCase().includes(searchLower) ||
            location.address?.toLowerCase().includes(searchLower)
          )
        }
        
        // Apply pagination
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        locations = filteredLocations.slice(startIndex, endIndex)
        hasMore = endIndex < filteredLocations.length
    }

    // Get user's saved and subscribed locations for interaction state
    let savedLocations: string[] = []
    let subscribedLocations: string[] = []
    
    if (currentUserId) {
      try {
        const userData = await getUserLocationDataAction()
        savedLocations = userData.savedLocations
        subscribedLocations = userData.subscribedLocations
      } catch (error) {
        console.warn('Could not fetch user location data:', error)
      }
    }

    // Format locations for mobile with interaction state
    const formattedLocations = locations.map((location: any) => ({
      id: location.id,
      name: location.name,
      description: location.description,
      shortDescription: location.shortDescription,
      address: typeof location.address === 'string' ? location.address : 
        [
          location.address?.street,
          location.address?.city,
          location.address?.state,
          location.address?.zip
        ].filter(Boolean).join(', '),
      coordinates: {
        latitude: location.latitude || location.coordinates?.latitude,
        longitude: location.longitude || location.coordinates?.longitude
      },
      featuredImage: location.featuredImage?.url || location.imageUrl,
      gallery: location.gallery?.map((item: any) => ({
        image: item.image?.url,
        caption: item.caption
      })) || [],
      categories: location.categories?.map((cat: any) => 
        typeof cat === 'string' ? cat : cat.name
      ) || [],
      priceRange: location.priceRange,
      rating: location.averageRating || 0,
      reviewCount: location.reviewCount || 0,
      visitCount: location.visitCount || 0,
      businessHours: location.businessHours || [],
      contactInfo: location.contactInfo || {},
      isVerified: location.isVerified || false,
      isFeatured: location.isFeatured || false,
      // User interaction state
      isSaved: savedLocations.includes(location.id),
      isSubscribed: subscribedLocations.includes(location.id),
      createdAt: location.createdAt,
      updatedAt: location.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: {
        locations: formattedLocations,
        pagination: {
          page,
          limit,
          hasMore
        },
        meta: {
          type,
          category,
          search,
          coordinates: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching locations:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch locations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/mobile/locations - Create a new location
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
    const locationData: LocationFormData = {
      ...body,
      createdBy: user.id,
      status: 'review' // Default to review status for mobile submissions
    }

    console.log(`Mobile API: Creating location for user ${user.id}`)

    const location = await createLocation(locationData)

    return NextResponse.json({
      success: true,
      message: 'Location created successfully and is under review',
      data: { location }
    })
  } catch (error) {
    console.error('Mobile API: Error creating location:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create location',
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
      'Access-Control-Max-Age': '86400',
    },
  })
} 