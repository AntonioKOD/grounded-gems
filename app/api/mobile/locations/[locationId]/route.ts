import { NextRequest, NextResponse } from 'next/server'
import { 
  getReviewsbyId, 
  recordLocationInteraction,
  removeLocationInteraction,
  toggleSaveLocationAction,
  toggleSubscribeLocationAction,
  getLocationSpecials
} from '@/app/actions'
import { getMobileUser } from '@/lib/auth-server'

// GET /api/v1/mobile/locations/[locationId] - Get location details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    const { searchParams } = new URL(request.url)
    const includeReviews = searchParams.get('includeReviews') === 'true'
    const includeSpecials = searchParams.get('includeSpecials') === 'true'
    const reviewsLimit = parseInt(searchParams.get('reviewsLimit') || '10')

    // Get current user for personalization
    let currentUserId = null
    
    try {
      const user = await getMobileUser(request)
      currentUserId = user?.id
      console.log('🔍 [Location GET] getMobileUser result:', !!user)
      console.log('🔍 [Location GET] User ID:', currentUserId)
    } catch (authError) {
      console.error('🔍 [Location GET] getMobileUser error:', authError)
    }

    console.log(`Mobile API: Getting location details for ${locationId}`)

    // Get location data
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      depth: 2
    })

    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location not found'
        },
        { status: 404 }
      )
    }

    // Get user's interaction data
    let isSaved = false
    let isSubscribed = false
    
    if (currentUserId) {
      try {
        const { getUserLocationDataAction } = await import('@/app/actions')
        const userData = await getUserLocationDataAction()
        isSaved = userData.savedLocations.includes(locationId)
        isSubscribed = userData.subscribedLocations.includes(locationId)
      } catch (error) {
        console.warn('Could not fetch user location data:', error)
      }
    }

    // Debug: Log the raw location data from database
    console.log('🔍 [Mobile API] Raw location from database:', JSON.stringify({
      id: location.id,
      name: location.name,
      ownership: location.ownership,
      status: location.status,
      source: location.source
    }, null, 2))
    
    // Debug: Log the ownership data specifically
    console.log('🔍 [Mobile API] Raw ownership data:', JSON.stringify(location.ownership, null, 2))
    console.log('🔍 [Mobile API] ownerId type:', typeof location.ownership?.ownerId)
    console.log('🔍 [Mobile API] ownerId value:', location.ownership?.ownerId)

    // Format location for mobile
    const locationData = {
      id: location.id,
      name: location.name,
      description: location.description,
      shortDescription: location.shortDescription,
      slug: location.slug,
      address: typeof location.address === 'string' ? location.address : 
        [
          location.address?.street,
          location.address?.city,
          location.address?.state,
          location.address?.zip
        ].filter(Boolean).join(', '),
      coordinates: {
        latitude: location.coordinates?.latitude,
        longitude: location.coordinates?.longitude
      },
      featuredImage: location.featuredImage?.url,
      gallery: location.gallery?.map((item: any) => ({
        image: item.image?.url,
        caption: item.caption
      })) || [],
      categories: location.categories?.map((cat: any) => 
        typeof cat === 'string' ? cat : cat.name
      ) || [],
      tags: location.tags?.map((tag: any) => 
        typeof tag === 'string' ? tag : tag.tag
      ) || [],
      priceRange: location.priceRange,
      rating: location.averageRating || 0,
      reviewCount: location.reviewCount || 0,
      visitCount: location.visitCount || 0,
      businessHours: location.businessHours || [],
      contactInfo: {
        ...location.contactInfo,
        socialMedia: location.contactInfo?.socialMedia || location.socialMedia || undefined
      },
      accessibility: location.accessibility || {},
      bestTimeToVisit: location.bestTimeToVisit || [],
      insiderTips: location.insiderTips,
      isVerified: location.isVerified || false,
      isFeatured: location.isFeatured || false,
      hasBusinessPartnership: location.hasBusinessPartnership || false,
      partnershipDetails: location.partnershipDetails,
      neighborhood: location.neighborhood || undefined,
      // User interaction state
      isSaved,
      isSubscribed,
      // Creator info
      createdBy: location.createdBy?.name || 'Unknown',
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      // Ownership information
      ownership: {
        claimStatus: location.ownership?.claimStatus || 'unclaimed',
        ownerId: (() => {
          const ownerId = location.ownership?.ownerId;
          if (typeof ownerId === 'string') {
            return ownerId;
          } else if (ownerId && typeof ownerId === 'object' && ownerId.id) {
            return ownerId.id;
          } else {
            return null;
          }
        })(),
        claimedAt: location.ownership?.claimedAt || null,
        claimEmail: location.ownership?.claimEmail || null
      }
    }

    // Debug: Log the final serialized ownership data
    console.log('🔍 [Mobile API] Final serialized ownership:', JSON.stringify(locationData.ownership, null, 2))

    const responseData: any = { location: locationData }

    // Include reviews if requested
    if (includeReviews) {
      const reviewsResult = await getReviewsbyId(locationId)
      const reviews = reviewsResult.docs.slice(0, reviewsLimit).map((review: any) => ({
        id: review.id,
        title: review.title,
        content: review.content,
        rating: review.rating,
        author: {
          id: review.author?.id,
          name: review.author?.name || 'Anonymous',
          avatar: review.author?.profileImage?.url
        },
        visitDate: review.visitDate,
        pros: review.pros || [],
        cons: review.cons || [],
        tips: review.tips,
        isVerifiedVisit: review.isVerifiedVisit || false,
        helpfulCount: review.helpfulCount || 0,
        createdAt: review.createdAt
      }))
      
      responseData.reviews = reviews
      responseData.reviewsCount = reviewsResult.totalDocs
    }

    // Include specials if requested
    if (includeSpecials) {
      const specials = await getLocationSpecials(locationId)
      responseData.specials = specials.map((special: any) => ({
        id: special.id,
        title: special.title,
        description: special.description,
        type: special.type,
        discountValue: special.discountValue,
        startDate: special.startDate,
        endDate: special.endDate,
        isOngoing: special.isOngoing,
        terms: special.terms
      }))
    }

    // Debug: Log the final response data
    console.log('🔍 [Mobile API] Final response data:', JSON.stringify({
      success: true,
      data: {
        location: {
          id: locationData.id,
          name: locationData.name,
          ownership: locationData.ownership,
          featuredImage: locationData.featuredImage,
          gallery: locationData.gallery
        }
      }
    }, null, 2))

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Mobile API: Error fetching location details:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch location details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/mobile/locations/[locationId]/interact - Record location interaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    
    // Direct Bearer token authentication using the same method as /api/mobile/users/me
    let user = null
    
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      
      try {
        // Use the same authentication method as /api/mobile/users/me
        const { getPayload } = await import('payload')
        const config = (await import('@payload-config')).default
        const payload = await getPayload({ config })
        
        // Create headers object with the Bearer token (same as /api/mobile/users/me)
        const authHeaders = new Headers()
        authHeaders.set('Authorization', `Bearer ${token}`)
        
        const userAuthResult = await payload.auth({ headers: authHeaders })
        console.log('🔍 [Location POST] payload.auth result:', userAuthResult)
        
        if (userAuthResult && userAuthResult.user) {
          user = userAuthResult.user
          console.log('🔍 [Location POST] Direct auth result:', !!user)
          console.log('🔍 [Location POST] User ID:', user?.id)
        }
      } catch (authError) {
        console.error('🔍 [Location POST] Direct auth error:', authError)
      }
    }
    // Check for payload-token in Cookie header (fallback for mobile apps)
    else if (cookieHeader?.includes('payload-token=')) {
      try {
        // Use the same authentication method as /api/mobile/users/me
        const { getPayload } = await import('payload')
        const config = (await import('@payload-config')).default
        const payload = await getPayload({ config })
        
        // Create headers object with the cookie (same as /api/mobile/users/me)
        const authHeaders = new Headers()
        authHeaders.set('Cookie', cookieHeader)
        
        const userAuthResult = await payload.auth({ headers: authHeaders })
        console.log('🔍 [Location POST] payload.auth (cookie) result:', userAuthResult)
        
        if (userAuthResult && userAuthResult.user) {
          user = userAuthResult.user
          console.log('🔍 [Location POST] Cookie auth result:', !!user)
          console.log('🔍 [Location POST] User ID:', user?.id)
        }
      } catch (authError) {
        console.error('🔍 [Location POST] Cookie auth error:', authError)
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: 'Please log in to save locations'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      action, // 'like', 'save', 'subscribe', 'check_in', 'visit', 'share'
      coordinates, 
      metadata 
    } = body

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      )
    }

    console.log(`Mobile API: Recording ${action} interaction for location ${locationId}`)

    let result
    switch (action) {
      case 'save':
      case 'unsave':
        result = await toggleSaveLocationAction(locationId, user)
        break
        
      case 'subscribe':
      case 'unsubscribe':
        result = await toggleSubscribeLocationAction(locationId)
        break
        
      case 'like':
      case 'check_in':
      case 'visit':
      case 'share':
        result = await recordLocationInteraction(locationId, action, metadata, coordinates)
        break
        
      case 'unlike':
        result = await removeLocationInteraction(locationId, 'like')
        break
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result
    })
  } catch (error) {
    console.error('Mobile API: Error recording location interaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record interaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/mobile/locations/[locationId] - Update location (for creators)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params
    
    // Direct Bearer token authentication
    let user = null
    
    try {
      user = await getMobileUser(request)
      console.log('🔍 [Location PUT] getMobileUser result:', !!user)
      console.log('🔍 [Location PUT] User ID:', user?.id)
    } catch (authError) {
      console.error('🔍 [Location PUT] getMobileUser error:', authError)
    }
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is the creator of this location
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      depth: 0
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    const creatorId = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id

    if (creatorId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    console.log(`Mobile API: Updating location ${locationId}`)

    const { updateLocation } = await import('@/app/actions')
    const updatedLocation = await updateLocation(locationId, body)

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      data: { location: updatedLocation }
    })
  } catch (error) {
    console.error('Mobile API: Error updating location:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update location',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 