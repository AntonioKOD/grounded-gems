import { NextRequest, NextResponse } from 'next/server'
import { 
  getReviewsbyId, 
  recordLocationInteraction,
  removeLocationInteraction,
  toggleSaveLocationAction,
  toggleSubscribeLocationAction,
  getLocationSpecials
} from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'

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
    const user = await getServerSideUser()
    const currentUserId = user?.id

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
      contactInfo: location.contactInfo || {},
      accessibility: location.accessibility || {},
      bestTimeToVisit: location.bestTimeToVisit || [],
      insiderTips: location.insiderTips,
      isVerified: location.isVerified || false,
      isFeatured: location.isFeatured || false,
      hasBusinessPartnership: location.hasBusinessPartnership || false,
      partnershipDetails: location.partnershipDetails,
      // User interaction state
      isSaved,
      isSubscribed,
      // Creator info
      createdBy: location.createdBy?.name || 'Unknown',
      createdAt: location.createdAt,
      updatedAt: location.updatedAt
    }

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
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
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
        result = await toggleSaveLocationAction(locationId)
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
    const user = await getServerSideUser()
    
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