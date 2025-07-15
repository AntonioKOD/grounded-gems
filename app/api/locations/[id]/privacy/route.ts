import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = params.id
    const body = await request.json()
    const { privacy, privateAccess } = body

    // Validate input
    if (!privacy || !['public', 'private'].includes(privacy)) {
      return NextResponse.json({ error: 'Invalid privacy setting' }, { status: 400 })
    }

    if (privacy === 'private' && (!Array.isArray(privateAccess) || privateAccess.length === 0)) {
      return NextResponse.json({ error: 'Private locations must have at least one friend selected' }, { status: 400 })
    }

    // Get the location to check ownership
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      depth: 0
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Check if user can update this location
    const canUpdate = user.role === 'admin' || location.createdBy === user.id
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      privacy: privacy
    }

    if (privacy === 'private') {
      updateData.privateAccess = privateAccess
    } else {
      // Clear private access when switching to public
      updateData.privateAccess = []
    }

    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: updateData
    })

    return NextResponse.json({
      success: true,
      location: {
        id: updatedLocation.id,
        privacy: updatedLocation.privacy,
        privateAccess: updatedLocation.privateAccess || []
      }
    })

  } catch (error) {
    console.error('Error updating location privacy:', error)
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = params.id

    // Get the location
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      depth: 0
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Check if user can view this location's privacy settings
    const canView = user.role === 'admin' || location.createdBy === user.id
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      privacy: location.privacy || 'public',
      privateAccess: location.privateAccess || []
    })

  } catch (error) {
    console.error('Error fetching location privacy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500 }
    )
  }
} 