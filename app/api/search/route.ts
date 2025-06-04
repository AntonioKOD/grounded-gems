import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const type = searchParams.get("type") // 'users', 'locations', or 'all'
    const limit = parseInt(searchParams.get("limit") || "20")
    const sortBy = searchParams.get("sortBy") || "relevance" // 'relevance', 'name', 'recent'

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ 
        users: [],
        locations: [],
        total: 0,
        message: "Enter at least 1 character to search"
      })
    }

    const payload = await getPayload({ config })
    const trimmedQuery = query.trim()
    
    let results = {
      users: [],
      locations: [],
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
          limit: type === "users" ? limit : Math.ceil(limit / 2),
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
          limit: type === "locations" ? limit : Math.ceil(limit / 2),
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

    results.total = results.users.length + results.locations.length

    // Log search analytics
    console.log(`Search: "${trimmedQuery}" (${type || 'all'}) -> ${results.total} results (${results.users.length} users, ${results.locations.length} locations)`)

    return NextResponse.json({
      ...results,
      query: trimmedQuery,
      searchType: type || 'all',
      hasResults: results.total > 0
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      { 
        error: "Search temporarily unavailable. Please try again.",
        users: [],
        locations: [],
        total: 0
      },
      { status: 500 }
    )
  }
} 