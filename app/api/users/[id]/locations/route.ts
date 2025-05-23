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

    // Fetch user's locations
    const userLocations = await payload.find({
      collection: 'locations',
      where: {
        createdBy: {
          equals: userId,
        },
      },
      limit: 100,
      sort: '-updatedAt',
    })

    return NextResponse.json({
      success: true,
      locations: userLocations.docs,
      total: userLocations.totalDocs,
    })

  } catch (error) {
    console.error('Error fetching user locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
} 