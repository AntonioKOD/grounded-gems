import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // Get user and verify authentication
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is accessing their own data or has admin privileges
    if (user.id !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's locations with stats
    const userLocations = await payload.find({
      collection: 'locations',
      where: {
        createdBy: {
          equals: userId,
        },
      },
    })

    const locationIds = userLocations.docs.map(loc => loc.id)
    
    // Initialize stats
    let stats = {
      totalLocations: userLocations.totalDocs,
      publishedLocations: 0,
      totalViews: 0,
      totalInteractions: 0,
      pendingRequests: 0,
      totalEvents: 0,
    }

    // Count published locations
    stats.publishedLocations = userLocations.docs.filter(
      loc => loc.status === 'published'
    ).length

    if (locationIds.length > 0) {
      try {
        // Get location interactions count
        const interactions = await payload.find({
          collection: 'locationInteractions',
          where: {
            location: {
              in: locationIds,
            },
          },
          limit: 0, // Just get the count
        })
        stats.totalInteractions = interactions.totalDocs

        // Count views specifically
        const viewInteractions = await payload.find({
          collection: 'locationInteractions',
          where: {
            and: [
              {
                location: {
                  in: locationIds,
                },
              },
              {
                type: {
                  equals: 'view',
                },
              },
            ],
          },
          limit: 0,
        })
        stats.totalViews = viewInteractions.totalDocs
      } catch (error) {
        console.warn('LocationInteractions collection not found or error:', error)
      }

      try {
        // Get pending event requests
        const pendingRequests = await payload.find({
          collection: 'eventRequests',
          where: {
            and: [
              {
                location: {
                  in: locationIds,
                },
              },
              {
                status: {
                  equals: 'pending',
                },
              },
            ],
          },
          limit: 0,
        })
        stats.pendingRequests = pendingRequests.totalDocs
      } catch (error) {
        console.warn('EventRequests collection not found or error:', error)
      }

      try {
        // Get total events
        const events = await payload.find({
          collection: 'events',
          where: {
            location: {
              in: locationIds,
            },
          },
          limit: 0,
        })
        stats.totalEvents = events.totalDocs
      } catch (error) {
        console.warn('Events collection not found or error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      stats,
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
} 