import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"
import { getFoursquareAPI } from "@/lib/foursquare"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const type = searchParams.get("type") // 'users', 'locations', 'categories', 'places', or 'all'
    const limit = parseInt(searchParams.get("limit") || "20")
    const sortBy = searchParams.get("sortBy") || "relevance" // 'relevance', 'name', 'recent'
    const includeDiscovery = searchParams.get("discovery") === "true" || type === "places" || type === "all"
    const latitude = searchParams.get("lat")
    const longitude = searchParams.get("lng")
    const location = searchParams.get("location") // For text-based location search

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ 
        users: [],
        locations: [],
        categories: [],
        places: [],
        total: 0,
        message: "Enter at least 1 character to search"
      })
    }

    const payload = await getPayload({ config })
    const trimmedQuery = query.trim()
    
    let results = {
      users: [],
      locations: [],
      categories: [],
      places: [], // New: Foursquare place discoveries
      total: 0
    }

    // Search users if requested
    if (type === "users" || type === "all" || !type) {
      try {
        const usersResult = await payload.find({
          collection: "users",
          where: {
            or: [
              // Exact username match (highest priority)
              {
                username: {
                  equals: trimmedQuery.toLowerCase(),
                },
              },
              // Username starts with query
              {
                username: {
                  like: `${trimmedQuery}%`,
                },
              },
              // Username contains query
              {
                username: {
                  like: `%${trimmedQuery}%`,
                },
              },
              // Name exact match
              {
                name: {
                  like: trimmedQuery,
                },
              },
              // Name starts with query
              {
                name: {
                  like: `${trimmedQuery}%`,
                },
              },
              // Name contains query
              {
                name: {
                  like: `%${trimmedQuery}%`,
                },
              },
              // Email starts with query (for partial matches)
              {
                email: {
                  like: `${trimmedQuery}%`,
                },
              },
            ],
          },
          limit: type === "users" ? limit : Math.ceil(limit / 3),
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            profileImage: true,
            bio: true,
            location: true,
            isCreator: true,
            followers: true,
          },
          sort: sortBy === "name" ? "name" : sortBy === "recent" ? "-createdAt" : "name",
          overrideAccess: true,
        })

        // Score and sort users by relevance if using relevance sort
        let scoredUsers = usersResult.docs.map((user: any) => {
          let score = 0
          const lowerQuery = trimmedQuery.toLowerCase()
          const userName = user.name?.toLowerCase() || ''
          const userUsername = user.username?.toLowerCase() || ''
          const userEmail = user.email?.toLowerCase() || ''

          // Exact matches get highest score
          if (userUsername === lowerQuery) score += 100
          if (userName === lowerQuery) score += 90
          
          // Starts with matches
          if (userUsername.startsWith(lowerQuery)) score += 80
          if (userName.startsWith(lowerQuery)) score += 70
          if (userEmail.startsWith(lowerQuery)) score += 60
          
          // Contains matches
          if (userUsername.includes(lowerQuery)) score += 50
          if (userName.includes(lowerQuery)) score += 40
          if (userEmail.includes(lowerQuery)) score += 30
          
          // Boost for verified/creator accounts
          if (user.isCreator) score += 10
          
          // Boost for accounts with followers
          if (user.followers && user.followers.length > 0) score += 5

          return { ...user, relevanceScore: score }
        })

        if (sortBy === "relevance") {
          scoredUsers.sort((a, b) => b.relevanceScore - a.relevanceScore)
        }

        results.users = scoredUsers
      } catch (error) {
        console.error("Error searching users:", error)
      }
    }

    // Search locations if requested
    if (type === "locations" || type === "all" || !type) {
      try {
        const locationsResult = await payload.find({
          collection: "locations",
          where: {
            and: [
              {
                status: {
                  equals: "published",
                },
              },
              {
                or: [
                  // Location name exact match
                  {
                    name: {
                      like: trimmedQuery,
                    },
                  },
                  // Location name starts with
                  {
                    name: {
                      like: `${trimmedQuery}%`,
                    },
                  },
                  // Location name contains
                  {
                    name: {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Description contains
                  {
                    description: {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Address fields
                  {
                    "address.city": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  {
                    "address.state": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  {
                    "address.street": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Category search
                  {
                    "categories.name": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                ],
              },
            ],
          },
          limit: type === "locations" ? limit : Math.ceil(limit / 3),
          depth: 2,
          sort: sortBy === "name" ? "name" : sortBy === "recent" ? "-createdAt" : "-averageRating",
          overrideAccess: true,
        })

        // Score and sort locations by relevance
        let scoredLocations = locationsResult.docs.map((location: any) => {
          let score = 0
          const lowerQuery = trimmedQuery.toLowerCase()
          const locationName = location.name?.toLowerCase() || ''
          const locationDesc = location.description?.toLowerCase() || ''
          const locationCity = location.address?.city?.toLowerCase() || ''

          // Exact name match gets highest score
          if (locationName === lowerQuery) score += 100
          
          // Name starts with query
          if (locationName.startsWith(lowerQuery)) score += 80
          
          // Name contains query
          if (locationName.includes(lowerQuery)) score += 60
          
          // Description contains query
          if (locationDesc.includes(lowerQuery)) score += 40
          
          // City matches
          if (locationCity.includes(lowerQuery)) score += 30
          
          // Boost for highly rated locations
          if (location.averageRating >= 4.5) score += 15
          else if (location.averageRating >= 4.0) score += 10
          else if (location.averageRating >= 3.5) score += 5
          
          // Boost for featured locations
          if (location.isFeatured) score += 10
          
          // Boost for verified locations
          if (location.isVerified) score += 5

          return { ...location, relevanceScore: score }
        })

        if (sortBy === "relevance") {
          scoredLocations.sort((a, b) => b.relevanceScore - a.relevanceScore)
        }

        results.locations = scoredLocations
      } catch (error) {
        console.error("Error searching locations:", error)
      }
    }

    // Search categories if requested
    if (type === "categories" || type === "all" || !type) {
      try {
        const categoriesResult = await payload.find({
          collection: "categories",
          where: {
            and: [
              {
                isActive: {
                  equals: true,
                },
              },
              {
                or: [
                  // Category name exact match
                  {
                    name: {
                      like: trimmedQuery,
                    },
                  },
                  // Category name starts with
                  {
                    name: {
                      like: `${trimmedQuery}%`,
                    },
                  },
                  // Category name contains
                  {
                    name: {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Description contains
                  {
                    description: {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                ],
              },
            ],
          },
          limit: type === "categories" ? limit : Math.ceil(limit / 4),
          depth: 1,
          sort: sortBy === "name" ? "name" : sortBy === "recent" ? "-createdAt" : "order",
          overrideAccess: true,
        })

        // Score and sort categories by relevance
        let scoredCategories = categoriesResult.docs.map((category: any) => {
          let score = 0
          const lowerQuery = trimmedQuery.toLowerCase()
          const categoryName = category.name?.toLowerCase() || ''
          const categoryDesc = category.description?.toLowerCase() || ''

          // Exact name match gets highest score
          if (categoryName === lowerQuery) score += 100
          
          // Name starts with query
          if (categoryName.startsWith(lowerQuery)) score += 80
          
          // Name contains query
          if (categoryName.includes(lowerQuery)) score += 60
          
          // Description contains query
          if (categoryDesc.includes(lowerQuery)) score += 40
          
          // Boost for categories with lower order (more important)
          if (category.order <= 5) score += 10
          else if (category.order <= 10) score += 5

          return { ...category, relevanceScore: score }
        })

        if (sortBy === "relevance") {
          scoredCategories.sort((a, b) => b.relevanceScore - a.relevanceScore)
        }

        results.categories = scoredCategories
      } catch (error) {
        console.error("Error searching categories:", error)
      }
    }

    // Search Foursquare places if requested and API is available
    if (includeDiscovery && (type === "places" || type === "all" || !type)) {
      try {
        const foursquareAPI = getFoursquareAPI()
        
        if (process.env.FOURSQUARE_API_KEY && foursquareAPI) {
          const searchParams: any = {
            query: trimmedQuery,
            limit: type === "places" ? limit : Math.min(10, Math.ceil(limit / 4)),
            sort: 'RELEVANCE'
          }

          // Add location parameters if provided
          if (latitude && longitude) {
            searchParams.ll = `${latitude},${longitude}`
            searchParams.radius = 10000 // 10km radius
          } else if (location) {
            searchParams.near = location
          } else {
            // Default to general search without specific location
            searchParams.near = "United States"
          }

          const foursquareResult = await foursquareAPI.searchPlaces(searchParams)
          
          // Map Foursquare results to our format
          const mappedPlaces = foursquareResult.results.map((place: any) => ({
            id: place.fsq_id,
            foursquareId: place.fsq_id,
            name: place.name,
            description: place.description || `${place.categories?.[0]?.name || 'Place'} in ${place.location?.locality || 'Unknown location'}`,
            address: {
              street: place.location?.address,
              city: place.location?.locality,
              state: place.location?.region,
              country: place.location?.country,
              postalCode: place.location?.postcode,
              formattedAddress: place.location?.formatted_address
            },
            coordinates: place.geocodes?.main ? {
              latitude: place.geocodes.main.latitude,
              longitude: place.geocodes.main.longitude
            } : null,
            categories: place.categories?.map((cat: any) => ({
              name: cat.name,
              id: cat.id,
              color: '#4ECDC4' // Default color for Foursquare categories
            })) || [],
            averageRating: place.rating || null,
            reviewCount: place.stats?.total_ratings || 0,
            isVerified: place.verified || false,
            photos: place.photos?.length || 0,
            website: place.website,
            phone: place.tel,
            source: 'foursquare',
            distance: place.distance || null,
            relevanceScore: calculateFoursquareRelevance(place, trimmedQuery)
          }))

          // Sort by relevance if requested
          if (sortBy === "relevance") {
            mappedPlaces.sort((a, b) => b.relevanceScore - a.relevanceScore)
          }

          results.places = mappedPlaces
        }
      } catch (error) {
        console.error("Error searching Foursquare places:", error)
        // Don't fail the entire search if Foursquare is unavailable
      }
    }

    results.total = results.users.length + results.locations.length + results.categories.length + results.places.length

    // Log search analytics
    console.log(`Search: "${trimmedQuery}" (${type || 'all'}) -> ${results.total} results (${results.users.length} users, ${results.locations.length} locations, ${results.categories.length} categories, ${results.places.length} places)`)

    return NextResponse.json({
      ...results,
      query: trimmedQuery,
      searchType: type || 'all',
      hasResults: results.total > 0,
      hasPlaceDiscovery: results.places.length > 0
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      { 
        error: "Search temporarily unavailable. Please try again.",
        users: [],
        locations: [],
        categories: [],
        places: [],
        total: 0
      },
      { status: 500 }
    )
  }
}

// Helper function to calculate relevance score for Foursquare places
function calculateFoursquareRelevance(place: any, query: string): number {
  let score = 0
  const lowerQuery = query.toLowerCase()
  const placeName = place.name?.toLowerCase() || ''
  const placeDesc = place.description?.toLowerCase() || ''
  const categoryNames = place.categories?.map((cat: any) => cat.name.toLowerCase()).join(' ') || ''

  // Exact name match gets highest score
  if (placeName === lowerQuery) score += 100
  
  // Name starts with query
  if (placeName.startsWith(lowerQuery)) score += 80
  
  // Name contains query
  if (placeName.includes(lowerQuery)) score += 60
  
  // Category matches
  if (categoryNames.includes(lowerQuery)) score += 50
  
  // Description contains query
  if (placeDesc.includes(lowerQuery)) score += 30
  
  // Boost for highly rated places
  if (place.rating >= 4.5) score += 15
  else if (place.rating >= 4.0) score += 10
  else if (place.rating >= 3.5) score += 5
  
  // Boost for verified places
  if (place.verified) score += 10
  
  // Boost for places with photos
  if (place.photos && place.photos.length > 0) score += 5

  return score
} 