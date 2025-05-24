import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const type = searchParams.get("type") // 'users', 'locations', or 'all'
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        error: "Search query must be at least 2 characters long" 
      }, { status: 400 })
    }

    const payload = await getPayload({ config })
    
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
              {
                name: {
                  like: query,
                },
              },
              {
                username: {
                  like: query,
                },
              },
              {
                email: {
                  like: query,
                },
              },
            ],
          },
          limit: type === "users" ? limit : Math.floor(limit / 2),
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            // Don't expose sensitive data
          },
          overrideAccess: true,
        })

        results.users = usersResult.docs
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
                  {
                    name: {
                      like: query,
                    },
                  },
                  {
                    description: {
                      like: query,
                    },
                  },
                  {
                    "address.city": {
                      like: query,
                    },
                  },
                  {
                    "address.state": {
                      like: query,
                    },
                  },
                ],
              },
            ],
          },
          limit: type === "locations" ? limit : Math.floor(limit / 2),
          depth: 2,
          overrideAccess: true,
        })

        results.locations = locationsResult.docs
      } catch (error) {
        console.error("Error searching locations:", error)
      }
    }

    results.total = results.users.length + results.locations.length

    console.log(`Search for "${query}" returned ${results.total} results (${results.users.length} users, ${results.locations.length} locations)`)

    return NextResponse.json(results)
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 