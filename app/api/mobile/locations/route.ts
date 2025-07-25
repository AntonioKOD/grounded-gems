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
import { getPayload } from 'payload'
import config from '@/payload.config'

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
        const allLocations = await getLocations(currentUserId)
        // Use the same formatting as the web API
        locations = allLocations
          .map((loc: any) => {
            // Extract coordinates properly
            let latitude = loc.latitude
            let longitude = loc.longitude
            if (loc.coordinates) {
              latitude = loc.coordinates.latitude || latitude
              longitude = loc.coordinates.longitude || longitude
            }
            return {
              ...loc,
              latitude: typeof latitude === 'number' ? latitude : parseFloat(latitude || '0'),
              longitude: typeof longitude === 'number' ? longitude : parseFloat(longitude || '0'),
              name: loc.name || "Unnamed Location",
              // Format address
              address: typeof loc.address === 'string' 
                ? loc.address 
                : loc.address 
                  ? Object.values(loc.address).filter(Boolean).join(', ')
                  : '',
              // Extract image URL
              imageUrl: typeof loc.featuredImage === 'string' 
                ? loc.featuredImage 
                : loc.featuredImage?.url || loc.imageUrl || '/placeholder.svg'
            }
          })
          .filter((loc: any) => 
            typeof loc.latitude === 'number' && 
            typeof loc.longitude === 'number' && 
            !isNaN(loc.latitude) && 
            !isNaN(loc.longitude) &&
            loc.latitude !== 0 && 
            loc.longitude !== 0
          )
        hasMore = false // Not paginated for now
        break
    }

    // For 'all', return the same structure as the web API
    if (type === 'all') {
      return NextResponse.json({
        success: true,
        locations: locations,
        count: locations.length
      })
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

// POST /api/mobile/locations - Add a new location (mobile)
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    // Accept all fields from the mobile/web form
    const {
      name,
      slug,
      description,
      shortDescription,
      categories,
      tags,
      featuredImage,
      gallery,
      address,
      neighborhood,
      coordinates,
      contactInfo,
      businessHours,
      priceRange,
      bestTimeToVisit,
      insiderTips,
      accessibility,
      privacy,
      privateAccess,
      isFeatured,
      isVerified,
      hasBusinessPartnership,
      partnershipDetails,
      meta
    } = body

    // Basic validation
    if (!name || !address) {
      return NextResponse.json({
        success: false,
        error: 'Name and address are required.'
      }, { status: 400 })
    }

    // Handle coordinates - if not provided, try to geocode from address
    let finalCoordinates = coordinates
    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      try {
        // Build full address string
        const addressParts = [
          address.street,
          address.city,
          address.state,
          address.zip,
          address.country
        ].filter(Boolean)
        const fullAddress = addressParts.join(', ')
        
        console.log('Geocoding address:', fullAddress)
        
        // Use a simple geocoding service (you might want to use Google Maps, Mapbox, etc.)
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
        const geocodeResponse = await fetch(geocodeUrl, {
          headers: { 'User-Agent': 'SacaviaApp/1.0 (contact@sacavia.com)' }
        })
        const geocodeData = await geocodeResponse.json()
        
        if (geocodeData && geocodeData.length > 0) {
          finalCoordinates = {
            latitude: parseFloat(geocodeData[0].lat),
            longitude: parseFloat(geocodeData[0].lon)
          }
          console.log('Geocoded coordinates:', finalCoordinates)
        } else {
          console.warn('Could not geocode address:', fullAddress)
          // Set default coordinates (you might want to handle this differently)
          finalCoordinates = {
            latitude: 0,
            longitude: 0
          }
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError)
        // Set default coordinates
        finalCoordinates = {
          latitude: 0,
          longitude: 0
        }
      }
    }

    // Validate and filter categories to ensure they are valid ObjectIds
    let validCategories: string[] = []
    if (categories && Array.isArray(categories) && categories.length > 0) {
      // Filter out invalid ObjectIds and validate they exist
      const validCategoryIds = categories.filter(catId => {
        // Check if it's a valid 24-character hex string (MongoDB ObjectId format)
        return typeof catId === 'string' && /^[0-9a-fA-F]{24}$/.test(catId)
      })
      
      if (validCategoryIds.length > 0) {
        // Verify these categories actually exist in the database
        try {
          const existingCategories = await payload.find({
            collection: 'categories',
            where: {
              id: {
                in: validCategoryIds
              }
            },
            limit: 100
          })
          
          validCategories = existingCategories.docs.map(cat => String(cat.id))
          console.log('Valid categories found:', validCategories.length, 'out of', categories.length)
        } catch (categoryError) {
          console.error('Error validating categories:', categoryError)
          validCategories = []
        }
      }
    }

    // Validate featuredImage
    let validFeaturedImage = undefined
    if (featuredImage && typeof featuredImage === 'string' && /^[0-9a-fA-F]{24}$/.test(featuredImage)) {
      try {
        const mediaDoc = await payload.findByID({
          collection: 'media',
          id: featuredImage
        })
        if (mediaDoc) {
          validFeaturedImage = featuredImage
          console.log('Valid featured image found:', featuredImage)
        }
      } catch (mediaError) {
        console.error('Invalid featured image ID:', featuredImage, mediaError)
      }
    }

    // Validate gallery images
    let validGallery: any[] = []
    if (gallery && Array.isArray(gallery) && gallery.length > 0) {
      for (const galleryItem of gallery) {
        if (galleryItem.image && typeof galleryItem.image === 'string' && /^[0-9a-fA-F]{24}$/.test(galleryItem.image)) {
          try {
            const mediaDoc = await payload.findByID({
              collection: 'media',
              id: galleryItem.image
            })
            if (mediaDoc) {
              validGallery.push({
                image: galleryItem.image,
                caption: galleryItem.caption || undefined
              })
            }
          } catch (mediaError) {
            console.error('Invalid gallery image ID:', galleryItem.image, mediaError)
          }
        }
      }
      console.log('Valid gallery images found:', validGallery.length, 'out of', gallery.length)
    }

    // Create the location with all fields
    const location = await payload.create({
      collection: 'locations',
      data: {
        name,
        slug,
        description: description || '',
        shortDescription,
        categories: validCategories, // Use validated categories
        tags: tags || [],
        featuredImage: validFeaturedImage, // Use validated featuredImage
        gallery: validGallery, // Use validated gallery
        address,
        neighborhood,
        coordinates: finalCoordinates,
        contactInfo,
        businessHours,
        priceRange,
        bestTimeToVisit,
        insiderTips,
        accessibility,
        privacy,
        privateAccess,
        isFeatured,
        isVerified,
        hasBusinessPartnership,
        partnershipDetails: hasBusinessPartnership && partnershipDetails ? {
          partnerName: partnershipDetails.partnerName || undefined,
          partnerContact: partnershipDetails.partnerContact || undefined,
          details: partnershipDetails.details || undefined,
        } : undefined,
        meta,
        status: 'review', // Always set status to review for mobile
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Location added successfully',
      data: location
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding location (mobile):', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add location',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
