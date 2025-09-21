import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const location = await payload.findByID({
      collection: 'locations',
      id: params.id,
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if user can edit this location
    const canEdit = 
      user.role === 'admin' || // Admin can edit any location
      user.role === 'editor' || // Editor can edit any location
      (location.ownership?.ownerId && location.ownership.ownerId === user.id) || // Owner can edit their location
      (location.createdBy && location.createdBy === user.id) // Creator can edit their location

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You can only edit locations you own or have permission to edit' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      location: location,
    })
  } catch (error) {
    console.error('Error fetching location for comprehensive edit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/[id]/edit-comprehensive - Update location in comprehensive edit mode
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🚀 PUT /api/locations/[id]/edit-comprehensive called for locationId:', params.id);
    
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the request body
    const body = await request.json()
    console.log('📥 Request body received:', JSON.stringify(body, null, 2));

    // Extract location data from the request
    const { locationData } = body
    if (!locationData) {
      return NextResponse.json(
        { error: 'Location data is required' },
        { status: 400 }
      )
    }

    // Check if location exists
    const existingLocation = await payload.findByID({
      collection: 'locations',
      id: params.id,
    })

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if user can edit this location
    const canEdit = 
      user.role === 'admin' || // Admin can edit any location
      user.role === 'editor' || // Editor can edit any location
      (existingLocation.ownership?.ownerId && existingLocation.ownership.ownerId === user.id) || // Owner can edit their location
      (existingLocation.createdBy && existingLocation.createdBy === user.id) // Creator can edit their location

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You can only edit locations you own or have permission to edit' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData = {
      ...locationData,
      updatedAt: new Date().toISOString(),
    }

    console.log('📤 Updating location with data:', JSON.stringify(updateData, null, 2));

    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: params.id,
      data: updateData,
    })

    console.log('✅ Location updated successfully:', updatedLocation.id);

    return NextResponse.json({
      success: true,
      location: updatedLocation,
      message: 'Location updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating location in comprehensive edit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
