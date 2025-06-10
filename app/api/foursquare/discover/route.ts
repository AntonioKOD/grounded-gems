import { NextRequest, NextResponse } from 'next/server'
import { getFoursquareAPI, FOURSQUARE_CATEGORIES } from '@/lib/foursquare'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get FoursquareAPI instance dynamically
    const foursquareAPI = getFoursquareAPI()
    
    if (!process.env.FOURSQUARE_API_KEY || !foursquareAPI) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Foursquare API not configured. Please add FOURSQUARE_API_KEY to environment variables.',
          details: 'The Foursquare integration requires an API key to function.' 
        },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')
    const radius = searchParams.get('radius') || '1000'
    const limit = searchParams.get('limit') || '50'
    const categories = searchParams.get('categories')
    const exclude_all_chains = searchParams.get('exclude_chains') === 'true'

    // Validate required parameters
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      )
    }

    // Build search parameters
    const searchParams_foursquare: any = {
      ll: `${lat},${lng}`,
      radius: parseInt(radius),
      limit: parseInt(limit),
      sort: 'DISTANCE'
    }

    if (categories) {
      searchParams_foursquare.categories = categories
    }

    if (exclude_all_chains) {
      searchParams_foursquare.exclude_all_chains = true
    }

    // Discover places nearby
    const results = await foursquareAPI.searchPlaces(searchParams_foursquare)
    
    // Group by categories for better discovery experience
    const groupedResults = groupByCategory(results.results)
    
    // Map results with additional discovery metadata
    const mappedResults = results.results.map(place => {
      const mapped = foursquareAPI.mapToSacaviaLocation(place)
      
      // Calculate distance (approximate)
      const distance = calculateDistance(lat, lng, place.geocodes.main.latitude, place.geocodes.main.longitude)
      
      return {
        foursquareId: place.fsq_id,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        distanceText: distance < 1 ? `${Math.round(distance * 1000)}m` : `${Math.round(distance * 10) / 10}km`,
        preview: mapped,
        categories: place.categories?.map(cat => cat.name) || [],
        rating: place.rating,
        verified: place.verified,
        photos: place.photos?.length || 0,
        tips: place.tips?.length || 0
      }
    })

    // Sort by distance and rating combination
    mappedResults.sort((a, b) => {
      // Prioritize verified places and those with ratings
      const aScore = (a.verified ? 1 : 0) + (a.rating ? a.rating / 5 : 0)
      const bScore = (b.verified ? 1 : 0) + (b.rating ? b.rating / 5 : 0)
      
      if (Math.abs(aScore - bScore) > 0.5) {
        return bScore - aScore // Higher score first
      }
      
      return a.distance - b.distance // Closer distance first
    })

    return NextResponse.json({
      success: true,
      count: mappedResults.length,
      location: { latitude: lat, longitude: lng },
      radius: parseInt(radius),
      results: mappedResults,
      grouped: groupedResults,
      context: results.context
    })

  } catch (error: any) {
    console.error('Foursquare discover error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to discover places',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get FoursquareAPI instance dynamically
    const foursquareAPI = getFoursquareAPI()
    
    // Check if Foursquare API is configured
    if (!process.env.FOURSQUARE_API_KEY || !foursquareAPI) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Foursquare API not configured. Please add FOURSQUARE_API_KEY to environment variables.',
          details: 'The Foursquare integration requires an API key to function.' 
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'bulk_discover':
        return await bulkDiscoverPlaces(data, foursquareAPI)
      case 'discover_by_interests':
        return await discoverByInterests(data, foursquareAPI)
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Foursquare discover POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process discovery request',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

async function bulkDiscoverPlaces(data: any, foursquareAPI: any) {
  const { locations, radius = 1000, limit = 20 } = data
  
  if (!locations || !Array.isArray(locations)) {
    return NextResponse.json(
      { error: 'locations array is required' },
      { status: 400 }
    )
  }

  const allResults = []
  const errors = []

  for (const location of locations) {
    try {
      const { latitude, longitude, name } = location
      
      if (!latitude || !longitude) {
        errors.push({ location: name || 'Unknown', error: 'Missing coordinates' })
        continue
      }

      const results = await foursquareAPI.searchNearby(latitude, longitude, radius, limit)
      
      allResults.push({
        location: { latitude, longitude, name },
        count: results.results.length,
        places: results.results.map(place => ({
          foursquareId: place.fsq_id,
          name: place.name,
          categories: place.categories?.map(cat => cat.name) || [],
          distance: calculateDistance(latitude, longitude, place.geocodes.main.latitude, place.geocodes.main.longitude)
        }))
      })
    } catch (error: any) {
      errors.push({ 
        location: location.name || 'Unknown', 
        error: error.message 
      })
    }
  }

  return NextResponse.json({
    success: true,
    discovered: allResults.length,
    errors: errors.length,
    results: allResults,
    errors
  })
}

async function discoverByInterests(data: any, foursquareAPI: any) {
  const { latitude, longitude, interests, radius = 2000, limit = 50 } = data
  
  if (!latitude || !longitude || !interests) {
    return NextResponse.json(
      { error: 'latitude, longitude, and interests are required' },
      { status: 400 }
    )
  }

  // Map interests to Foursquare categories
  const categoryMapping: Record<string, string[]> = {
    'coffee': [FOURSQUARE_CATEGORIES.COFFEE, FOURSQUARE_CATEGORIES.CAFE],
    'restaurants': [FOURSQUARE_CATEGORIES.RESTAURANT, FOURSQUARE_CATEGORIES.FAST_FOOD],
    'nightlife': [FOURSQUARE_CATEGORIES.BAR, FOURSQUARE_CATEGORIES.NIGHTCLUB],
    'arts': [FOURSQUARE_CATEGORIES.MUSEUM, FOURSQUARE_CATEGORIES.ART_GALLERY, FOURSQUARE_CATEGORIES.THEATER],
    'nature': [FOURSQUARE_CATEGORIES.PARK, FOURSQUARE_CATEGORIES.HIKING_TRAIL],
    'shopping': [FOURSQUARE_CATEGORIES.SHOPPING_MALL, FOURSQUARE_CATEGORIES.BOOKSTORE],
    'sports': [FOURSQUARE_CATEGORIES.GYM, FOURSQUARE_CATEGORIES.SPORTS_COMPLEX],
    'entertainment': [FOURSQUARE_CATEGORIES.MOVIE_THEATER, FOURSQUARE_CATEGORIES.MUSIC_VENUE]
  }

  const results = []
  
  for (const interest of interests) {
    const categories = categoryMapping[interest.toLowerCase()]
    if (!categories) continue

    try {
      for (const category of categories) {
        const searchResults = await foursquareAPI.searchPlaces({
          ll: `${latitude},${longitude}`,
          categories: category,
          radius,
          limit: Math.floor(limit / categories.length),
          sort: 'POPULARITY'
        })

        searchResults.results.forEach(place => {
          const distance = calculateDistance(latitude, longitude, place.geocodes.main.latitude, place.geocodes.main.longitude)
          
          results.push({
            foursquareId: place.fsq_id,
            interest,
            name: place.name,
            categories: place.categories?.map(cat => cat.name) || [],
            distance,
            rating: place.rating,
            verified: place.verified,
            preview: foursquareAPI.mapToSacaviaLocation(place)
          })
        })
      }
    } catch (error: any) {
      console.error(`Error discovering places for interest ${interest}:`, error)
    }
  }

  // Remove duplicates and sort by relevance
  const uniqueResults = Array.from(
    new Map(results.map(item => [item.foursquareId, item])).values()
  )

  uniqueResults.sort((a, b) => {
    // Prioritize by rating and verification, then by distance
    const aScore = (a.verified ? 1 : 0) + (a.rating || 0) / 5
    const bScore = (b.verified ? 1 : 0) + (b.rating || 0) / 5
    
    if (Math.abs(aScore - bScore) > 0.5) {
      return bScore - aScore
    }
    
    return a.distance - b.distance
  })

  return NextResponse.json({
    success: true,
    interests,
    count: uniqueResults.length,
    results: uniqueResults.slice(0, limit) // Limit final results
  })
}

function groupByCategory(places: any[]) {
  const grouped: Record<string, any[]> = {}
  
  places.forEach(place => {
    place.categories.forEach((category: any) => {
      if (!grouped[category.name]) {
        grouped[category.name] = []
      }
      grouped[category.name].push(place)
    })
  })
  
  return grouped
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
} 