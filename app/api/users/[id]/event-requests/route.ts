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

    // First, get user's locations
    const userLocations = await payload.find({
      collection: 'locations',
      where: {
        createdBy: {
          equals: userId,
        },
      },
      select: {
        id: true,
      },
    })

    if (userLocations.docs.length === 0) {
      return NextResponse.json({
        success: true,
        eventRequests: [],
        total: 0,
      })
    }

    // Get event requests for user's locations
    const locationIds = userLocations.docs.map(loc => loc.id)
    
    const eventRequests = await payload.find({
      collection: 'eventRequests',
      where: {
        location: {
          in: locationIds,
        },
      },
      limit: 100,
      sort: '-createdAt',
      depth: 2, // Populate related fields
    })

    return NextResponse.json({
      success: true,
      eventRequests: eventRequests.docs,
      total: eventRequests.totalDocs,
    })

  } catch (error) {
    console.error('Error fetching user event requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event requests' },
      { status: 500 }
    )
  }
} 