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
      events: [],
      total: 0,
      message: "Enter at least 1 character to search"
    })
    }

    const payload = await getPayload({ config })
    const trimmedQuery = query.trim()
    
    let results: {
      users: any[];
      locations: any[];
      categories: any[];
      events: any[];
      total: number;
    } = {
      users: [],
      locations: [],
      categories: [],
      events: [],
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

        results.users = scoredUsers as any[]
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
            const rawDistance = R * c
            // Round to 2 decimal places to avoid Swift JSON decoding issues
            distance = Math.round(rawDistance * 100) / 100
            
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

    // Search events if requested
    if (type === "events" || type === "all" || !type) {
      try {
        const eventsResult = await payload.find({
          collection: "events",
          where: {
            and: [
              {
                status: {
                  equals: "published",
                },
              },
              {
                privacy: {
                  equals: "public",
                },
              },
              {
                or: [
                  // Event name exact match
                  {
                    name: {
                      like: trimmedQuery,
                    },
                  },
                  // Event name starts with
                  {
                    name: {
                      like: `${trimmedQuery}%`,
                    },
                  },
                  // Event name contains
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
                  // Category search
                  {
                    category: {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Event type search
                  {
                    eventType: {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Tags search
                  {
                    tags: {
                      contains: trimmedQuery,
                    },
                  },
                  // Meta title search
                  {
                    "meta.title": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Meta description search
                  {
                    "meta.description": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                  // Meta keywords search
                  {
                    "meta.keywords": {
                      like: `%${trimmedQuery}%`,
                    },
                  },
                ],
              },
            ],
          },
          limit: type === "events" ? limit : Math.ceil(limit / 4),
          depth: 2,
          sort: sortBy === "name" ? "name" : sortBy === "recent" ? "-createdAt" : "-createdAt",
          overrideAccess: true,
        })

        // Score and sort events by relevance
        let scoredEvents = eventsResult.docs.map((event: any) => {
          let score = 0
          const lowerQuery = trimmedQuery.toLowerCase()
          const eventName = event.name?.toLowerCase() || ''
          const eventDesc = event.description?.toLowerCase() || ''
          const eventCategory = event.category?.toLowerCase() || ''
          const eventType = event.eventType?.toLowerCase() || ''
          const eventTags = event.tags?.join(' ').toLowerCase() || ''
          const metaTitle = event.meta?.title?.toLowerCase() || ''
          const metaDesc = event.meta?.description?.toLowerCase() || ''
          const metaKeywords = event.meta?.keywords?.toLowerCase() || ''

          // Exact name match gets highest score
          if (eventName === lowerQuery) score += 100
          
          // Name starts with query
          if (eventName.startsWith(lowerQuery)) score += 80
          
          // Name contains query
          if (eventName.includes(lowerQuery)) score += 60
          
          // Meta title matches (AI-generated metadata)
          if (metaTitle.includes(lowerQuery)) score += 70
          
          // Meta description matches
          if (metaDesc.includes(lowerQuery)) score += 50
          
          // Meta keywords matches
          if (metaKeywords.includes(lowerQuery)) score += 40
          
          // Description contains query
          if (eventDesc.includes(lowerQuery)) score += 40
          
          // Category matches
          if (eventCategory.includes(lowerQuery)) score += 30
          
          // Event type matches
          if (eventType.includes(lowerQuery)) score += 25
          
          // Tags matches
          if (eventTags.includes(lowerQuery)) score += 20
          
          // Boost for upcoming events
          const eventDate = new Date(event.startDate)
          const now = new Date()
          if (eventDate > now) {
            const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            if (daysUntil <= 7) score += 15 // This week
            else if (daysUntil <= 30) score += 10 // This month
            else if (daysUntil <= 90) score += 5 // Next 3 months
          }
          
          // Boost for events with high attendance
          if (event.goingCount >= 50) score += 10
          else if (event.goingCount >= 20) score += 5
          
          // Boost for free events
          if (event.isFree) score += 5

          return { ...event, relevanceScore: score }
        })

        if (sortBy === "relevance") {
          scoredEvents.sort((a, b) => b.relevanceScore - a.relevanceScore)
        }

        results.events = scoredEvents
      } catch (error) {
        console.error("Error searching events:", error)
      }
    }

    // Calculate total results
    results.total = results.users.length + results.locations.length + results.categories.length + results.events.length

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
        events: [],
        total: 0 
      },
      { status: 500 }
    )
  }
} 