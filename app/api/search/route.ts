import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const type = searchParams.get("type") // 'users', 'locations', 'categories', or 'all'
    const limit = parseInt(searchParams.get("limit") || "20")
    const sortBy = searchParams.get("sortBy") || "relevance" // 'relevance', 'name', 'recent', 'rating'
    const latitude = searchParams.get("lat")
    const longitude = searchParams.get("lng")

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ 
        users: [],
        locations: [],
        categories: [],
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
                or: [
                  {
                    status: {
                      equals: "published",
                    },
                  },
                  {
                    status: {
                      equals: "review",
                    },
                  },
                ],
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
                  {
                    "address.zip": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  {
                    "address.country": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Neighborhood search
                  {
                    neighborhood: {
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
          sort: sortBy === "name" ? "name" : sortBy === "recent" ? "-createdAt" : sortBy === "rating" ? "-averageRating" : "-averageRating",
          overrideAccess: true,
        })

        // Score and sort locations by relevance and distance if user location is provided
        let scoredLocations = locationsResult.docs.map((location: any) => {
          let score = 0
          const lowerQuery = trimmedQuery.toLowerCase()
          const locationName = location.name?.toLowerCase() || ''
          const locationDesc = location.description?.toLowerCase() || ''
          const locationCity = location.address?.city?.toLowerCase() || ''
          const locationNeighborhood = location.neighborhood?.toLowerCase() || ''

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
          
          // Neighborhood matches
          if (locationNeighborhood.includes(lowerQuery)) score += 25
          
          // Category matches
          if (location.categories && location.categories.some((cat: any) => 
            cat.name?.toLowerCase().includes(lowerQuery)
          )) {
            score += 20
          }
          
          // Boost for highly rated locations
          if (location.averageRating >= 4.5) score += 15
          else if (location.averageRating >= 4.0) score += 10
          else if (location.averageRating >= 3.5) score += 5
          
          // Boost for featured locations
          if (location.isFeatured) score += 10
          
          // Boost for verified locations
          if (location.isVerified) score += 5

          // Calculate distance if user location is provided
          let distance = null
          if (latitude && longitude && location.coordinates?.latitude && location.coordinates?.longitude) {
            const R = 3959 // Earth's radius in miles
            const dLat = (location.coordinates.latitude - parseFloat(latitude)) * Math.PI / 180
            const dLon = (location.coordinates.longitude - parseFloat(longitude)) * Math.PI / 180
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(parseFloat(latitude) * Math.PI / 180) * Math.cos(location.coordinates.latitude * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            distance = R * c
            
            // Boost score for nearby locations
            if (distance <= 5) score += 20
            else if (distance <= 10) score += 15
            else if (distance <= 25) score += 10
            else if (distance <= 50) score += 5
          }

          return { ...location, relevanceScore: score, distance }
        })

        if (sortBy === "relevance") {
          scoredLocations.sort((a, b) => b.relevanceScore - a.relevanceScore)
        } else if (sortBy === "distance" && latitude && longitude) {
          scoredLocations.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
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
                  // Slug contains (for URL-friendly searches)
                  {
                    slug: {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                ],
              },
            ],
          },
          limit: type === "categories" ? limit : Math.ceil(limit / 3),
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
          const categorySlug = category.slug?.toLowerCase() || ''

          // Exact name match gets highest score
          if (categoryName === lowerQuery) score += 100
          
          // Name starts with query
          if (categoryName.startsWith(lowerQuery)) score += 80
          
          // Name contains query
          if (categoryName.includes(lowerQuery)) score += 60
          
          // Description contains query
          if (categoryDesc.includes(lowerQuery)) score += 40
          
          // Slug matches
          if (categorySlug.includes(lowerQuery)) score += 30
          
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

    // Calculate total results
    results.total = results.users.length + results.locations.length + results.categories.length

    return NextResponse.json({
      ...results,
      query: trimmedQuery,
      searchType: type,
      hasResults: results.total > 0,
      metadata: {
        userLocation: latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null,
        sortBy,
        limit
      }
    })

  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { 
        error: "Search failed", 
        users: [],
        locations: [],
        categories: [],
        total: 0 
      },
      { status: 500 }
    )
  }
} 