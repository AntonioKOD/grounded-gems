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

import { getPayload } from 'payload'
import config from '@/payload.config'

// Enhanced recommendation algorithm
interface LocationScore {
  location: any
  score: number
  factors: {
    categoryMatch: number
    distanceScore: number
    popularityScore: number
    ratingScore: number
    timeRelevance: number
    userBehaviorScore: number
    diversityScore: number
  }
}

interface UserPreferences {
  categories: string[]
  radius: number
  location?: {
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  savedLocations: string[]
  visitedLocations: string[]
  interactionHistory: Array<{
    locationId: string
    action: 'save' | 'visit' | 'like' | 'review'
    timestamp: Date
  }>
}

// Calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  // Round to 2 decimal places to avoid Swift JSON decoding issues
  return Math.round(distance * 100) / 100
}

// Get time-based relevance score
function getTimeRelevanceScore(location: any): number {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()
  
  // Check if location is currently open
  if (location.businessHours && location.businessHours.length > 0) {
    const todayHours = location.businessHours.find((h: any) => 
      h.day?.toLowerCase() === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
    )
    
    if (todayHours && !todayHours.closed) {
      const openHour = parseInt(todayHours.open?.split(':')[0] || '0')
      const closeHour = parseInt(todayHours.close?.split(':')[0] || '23')
      
      if (hour >= openHour && hour <= closeHour) {
        return 1.2 // Boost for currently open locations
      }
    }
  }
  
  // Time-based category relevance
  const firstCategory = location.categories?.[0]
  const category = typeof firstCategory === 'string'
    ? firstCategory.toLowerCase()
    : firstCategory?.name?.toLowerCase() || ''
  if (hour >= 6 && hour <= 11 && (category.includes('coffee') || category.includes('breakfast'))) {
    return 1.1
  }
  if (hour >= 11 && hour <= 15 && (category.includes('restaurant') || category.includes('lunch'))) {
    return 1.1
  }
  if (hour >= 17 && hour <= 22 && (category.includes('restaurant') || category.includes('dinner') || category.includes('bar'))) {
    return 1.1
  }
  if (hour >= 22 || hour <= 2 && category.includes('bar') || category.includes('nightlife')) {
    return 1.1
  }
  
  return 1.0
}

// Calculate user behavior score based on interaction history
function calculateUserBehaviorScore(location: any, userPrefs: UserPreferences): number {
  let score = 1.0
  
  // Check if user has interacted with similar locations
  const firstCategory = location.categories?.[0]
  const locationCategory = typeof firstCategory === 'string' 
    ? firstCategory.toLowerCase() 
    : firstCategory?.name?.toLowerCase() || ''
  
  const similarInteractions = userPrefs.interactionHistory.filter(interaction => {
    // This would need to be enhanced with actual location data lookup
    return interaction.action === 'save' || interaction.action === 'visit'
  })
  
  if (similarInteractions.length > 0) {
    score += 0.3
  }
  
  // Check if user has saved this specific location
  if (userPrefs.savedLocations.includes(location.id)) {
    score += 0.5
  }
  
  // Check if user has visited this location
  if (userPrefs.visitedLocations.includes(location.id)) {
    score -= 0.2 // Slightly reduce score for already visited locations
  }
  
  return score
}

// Calculate diversity score to avoid showing too many similar locations
function calculateDiversityScore(location: any, recommendedLocations: any[]): number {
  const firstCategory = location.categories?.[0]
  const locationCategory = typeof firstCategory === 'string'
    ? firstCategory.toLowerCase()
    : firstCategory?.name?.toLowerCase() || ''
  const similarCount = recommendedLocations.filter(rec => {
    const recFirstCategory = rec.categories?.[0]
    const recCategory = typeof recFirstCategory === 'string'
      ? recFirstCategory.toLowerCase()
      : recFirstCategory?.name?.toLowerCase() || ''
    return recCategory === locationCategory
  }).length
  
  // Reduce score if we already have many locations of this category
  return Math.max(0.5, 1.0 - (similarCount * 0.1))
}

// Main recommendation algorithm
async function getRecommendedLocations(
  allLocations: any[], 
  userPrefs: UserPreferences, 
  limit: number = 20
): Promise<any[]> {
  const scoredLocations: LocationScore[] = []
  const userLat = userPrefs.location?.coordinates?.latitude
  const userLng = userPrefs.location?.coordinates?.longitude
  
  for (const location of allLocations) {
    let categoryMatch = 0
    let distanceScore = 1.0
    let popularityScore = 1.0
    let ratingScore = 1.0
    
    // Category matching
    if (userPrefs.categories.length > 0 && location.categories) {
      const locationCategories = location.categories.map((cat: any) => 
        typeof cat === 'string' ? cat.toLowerCase() : cat.name?.toLowerCase()
      )
      const matches = userPrefs.categories.filter(userCat => 
        locationCategories.some((locCat: string) => locCat.includes(userCat.toLowerCase()))
      )
      categoryMatch = matches.length / userPrefs.categories.length
    }
    
    // Distance scoring
    if (userLat && userLng && location.coordinates) {
      const distance = calculateDistance(
        userLat, userLng, 
        location.coordinates.latitude, location.coordinates.longitude
      )
      // Exponential decay based on distance
      distanceScore = Math.exp(-distance / userPrefs.radius)
    }
    
    // Popularity scoring (based on visit count, review count, etc.)
    const visitCount = location.visitCount || 0
    const reviewCount = location.reviewCount || 0
    popularityScore = Math.min(2.0, 1.0 + (visitCount / 100) + (reviewCount / 50))
    
    // Rating scoring
    const rating = location.rating || 0
    ratingScore = rating >= 4.0 ? 1.3 : rating >= 3.5 ? 1.1 : 1.0
    
    // Time relevance
    const timeRelevance = getTimeRelevanceScore(location)
    
    // User behavior
    const userBehavior = calculateUserBehaviorScore(location, userPrefs)
    
    // Calculate total score
    const totalScore = (
      categoryMatch * 0.3 +
      distanceScore * 0.25 +
      popularityScore * 0.15 +
      ratingScore * 0.15 +
      timeRelevance * 0.1 +
      userBehavior * 0.05
    )
    
    scoredLocations.push({
      location,
      score: totalScore,
      factors: {
        categoryMatch,
        distanceScore,
        popularityScore,
        ratingScore,
        timeRelevance,
        userBehaviorScore: userBehavior,
        diversityScore: 1.0 // Will be calculated later
      }
    })
  }
  
  // Sort by score and apply diversity
  scoredLocations.sort((a, b) => b.score - a.score)
  
  const recommended: any[] = []
  for (const scored of scoredLocations) {
    // Apply diversity score
    scored.factors.diversityScore = calculateDiversityScore(scored.location, recommended)
    scored.score *= scored.factors.diversityScore
    
    recommended.push(scored.location)
    if (recommended.length >= limit) break
  }
  
  // Re-sort with diversity applied
  recommended.sort((a, b) => {
    const scoreA = scoredLocations.find(s => s.location.id === a.id)?.score || 0
    const scoreB = scoredLocations.find(s => s.location.id === b.id)?.score || 0
    return scoreB - scoreA
  })
  
  return recommended
}

// Get user preferences and interaction history
async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const payload = await getPayload({ config })
  
  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 2
    })
    
    // Get user's saved locations
    const savedLocationsResult = await payload.find({
      collection: 'savedLocations',
      where: {
        user: { equals: userId }
      },
      limit: 100
    })
    
    // Get user's interaction history (this would need to be implemented)
    const interactionHistory: Array<{
      locationId: string
      action: 'save' | 'visit' | 'like' | 'review'
      timestamp: Date
    }> = []
    
    // For now, we'll use saved locations as a proxy for interaction history
    savedLocationsResult.docs.forEach(saved => {
      interactionHistory.push({
        locationId: saved.location?.id || '',
        action: 'save',
        timestamp: new Date(saved.createdAt)
      })
    })
    
    return {
      categories: user.preferences?.categories || [],
      radius: user.preferences?.radius || 25,
      location: user.location,
      savedLocations: savedLocationsResult.docs.map(saved => saved.location?.id || ''),
      visitedLocations: [], // Would need to be implemented
      interactionHistory
    }
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return {
      categories: [],
      radius: 25,
      savedLocations: [],
      visitedLocations: [],
      interactionHistory: []
    }
  }
}

// GET /api/v1/mobile/locations - Get locations with smart recommendations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'recommended' // recommended, nearby, popular, saved, created, all
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = parseInt(searchParams.get('radius') || '25')
    const search = searchParams.get('search')

    // Get current user for personalization
    let currentUserId = null
    
    try {
      const authHeader = request.headers.get('Authorization')
      const cookieHeader = request.headers.get('Cookie')
      
      // Check for Bearer token in Authorization header
      if (authHeader?.startsWith('Bearer ')) {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: request.headers })
        currentUserId = user?.id
        console.log('📱 Mobile Locations API: Authenticated user via Bearer token:', user?.id)
      }
      // Check for payload-token in Cookie header (fallback for mobile apps)
      else if (cookieHeader?.includes('payload-token=')) {
        const payload = await getPayload({ config })
        const { user } = await payload.auth({ headers: request.headers })
        currentUserId = user?.id
        console.log('📱 Mobile Locations API: Authenticated user via cookie:', user?.id)
      }
    } catch (authError) {
      console.log('📱 Mobile Locations API: Authentication failed:', authError)
      // Continue without authentication for public endpoints
    }

    console.log(`Mobile API: Getting ${type} locations for user ${currentUserId}`)

    let locations: any[] = []
    let hasMore = false

    switch (type) {
      case 'recommended':
        if (currentUserId) {
          // Get all locations first
          const allLocations = await getLocations(String(currentUserId))
          const userPrefs = await getUserPreferences(String(currentUserId))
          
          // Apply smart recommendations
          locations = await getRecommendedLocations(allLocations, userPrefs, limit)
          
          console.log(`Generated ${locations.length} recommended locations for user ${currentUserId}`)
        } else {
          // Fallback to popular locations for non-authenticated users
          locations = await getNearbyOrPopularLocations(undefined, limit, radius)
        }
        break
        
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
              createdBy: { equals: String(currentUserId) }
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
        const allLocations = await getLocations(currentUserId ? String(currentUserId) : undefined)
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
          coordinates: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
          recommendationFactors: type === 'recommended' ? {
            userPreferences: currentUserId ? 'applied' : 'not_available',
            timeRelevance: 'applied',
            diversity: 'applied',
            popularity: 'applied'
          } : undefined
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
    
    console.log('📱 Mobile Locations API: POST request received')
    
    // Get current user - support both Bearer token and cookie authentication
    let user = null
    
    try {
      const authHeader = request.headers.get('Authorization')
      const cookieHeader = request.headers.get('Cookie')
      
      // Check for Bearer token in Authorization header
      if (authHeader?.startsWith('Bearer ')) {
        const { user: authUser } = await payload.auth({ headers: request.headers })
        user = authUser
        console.log('📱 Mobile Locations API: Authenticated user via Bearer token:', user?.id)
      }
      // Check for payload-token in Cookie header (fallback for mobile apps)
      else if (cookieHeader?.includes('payload-token=')) {
        const { user: authUser } = await payload.auth({ headers: request.headers })
        user = authUser
        console.log('📱 Mobile Locations API: Authenticated user via cookie:', user?.id)
      }
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }
      
      console.log('📱 Mobile Locations API: User authenticated:', user.id)
    } catch (authError) {
      console.error('📱 Mobile Locations API: Authentication error:', authError)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
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
      console.log('🔍 Validating categories:', categories)
      
      // Filter out invalid ObjectIds and validate they exist
      const validCategoryIds = categories.filter(catId => {
        // Check if it's a valid 24-character hex string (MongoDB ObjectId format)
        const isValid = typeof catId === 'string' && /^[0-9a-fA-F]{24}$/.test(catId)
        if (!isValid) {
          console.log('❌ Invalid category ID format:', catId, 'Expected 24-character hex string')
        }
        return isValid
      })
      
      console.log('✅ Valid category IDs after format check:', validCategoryIds)
      
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
          console.log('✅ Valid categories found in database:', validCategories.length, 'out of', categories.length)
          console.log('✅ Valid category IDs:', validCategories)
        } catch (categoryError) {
          console.error('❌ Error validating categories:', categoryError)
          validCategories = []
        }
      } else {
        console.log('❌ No valid category IDs found after format validation')
      }
    } else {
      console.log('ℹ️ No categories provided or categories is not an array')
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

    // Validate createdBy field to ensure it's a valid ObjectId
    const createdById = String(user.id)
    if (!/^[0-9a-fA-F]{24}$/.test(createdById)) {
      console.error('❌ Invalid createdBy ID format:', createdById)
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID format',
        details: 'User ID must be a valid 24-character hex string'
      }, { status: 400 })
    }

    // Create the location with all fields
    console.log('🏗️ Creating location with validated data...')
    console.log('📝 Categories:', validCategories)
    console.log('📝 CreatedBy:', createdById)
    console.log('📝 FeaturedImage:', validFeaturedImage)
    
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
        createdBy: createdById, // Use validated createdBy ID
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
