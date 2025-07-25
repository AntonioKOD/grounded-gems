import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getServerSideUser } from '@/lib/auth-server'

// List of authorized admin emails
const AUTHORIZED_ADMIN_EMAILS = [
  'antonio_kodheli@icloud.com',
  'ermir1mata@yahoo.com'
]

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    // Check if user is admin
    const isAdmin = user.role === 'admin' || AUTHORIZED_ADMIN_EMAILS.includes(user.email)
    
    if (!isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Admin access required' 
      }, { status: 403 })
    }
    
    const payload = await getPayload({ config })
    
    // Get all locations with pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') // Optional filter by status
    
    // Build where clause
    let where: any = {}
    if (status) {
      where.status = { equals: status }
    }
    
    const result = await payload.find({
      collection: 'locations',
      where,
      limit,
      page,
      depth: 2,
      sort: '-createdAt'
    })
    
    // Format locations for admin view
    const locations = result.docs.map(location => ({
      id: location.id,
      name: location.name,
      status: location.status,
      privacy: location.privacy,
      createdBy: location.createdBy,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      isFeatured: location.isFeatured,
      isVerified: location.isVerified,
      address: location.address,
      coordinates: location.coordinates,
      categories: location.categories,
      featuredImage: location.featuredImage,
      gallery: location.gallery,
      description: location.description,
      shortDescription: location.shortDescription
    }))
    
    // Get status counts
    const allLocations = await payload.find({
      collection: 'locations',
      limit: 1000,
      depth: 0
    })
    
    const statusCounts: any = {}
    allLocations.docs.forEach(loc => {
      const status = loc.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    
    return NextResponse.json({
      success: true,
      data: {
        locations,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        },
        statusCounts,
        meta: {
          currentUser: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        }
      }
    })
    
  } catch (error) {
    console.error('Admin locations API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch locations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH endpoint to update location status
export async function PATCH(request: NextRequest) {
  try {
    // Get current user
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    // Check if user is admin
    const isAdmin = user.role === 'admin' || AUTHORIZED_ADMIN_EMAILS.includes(user.email)
    
    if (!isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Admin access required' 
      }, { status: 403 })
    }
    
    const payload = await getPayload({ config })
    const body = await request.json()
    const { locationId, status, isFeatured, isVerified } = body
    
    if (!locationId) {
      return NextResponse.json({
        success: false,
        error: 'Location ID is required'
      }, { status: 400 })
    }
    
    // Prepare update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (typeof isFeatured === 'boolean') updateData.isFeatured = isFeatured
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified
    
    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        id: updatedLocation.id,
        name: updatedLocation.name,
        status: updatedLocation.status,
        isFeatured: updatedLocation.isFeatured,
        isVerified: updatedLocation.isVerified
      }
    })
    
  } catch (error) {
    console.error('Admin location update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update location',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 