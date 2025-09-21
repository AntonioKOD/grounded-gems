import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { parseLocationParam } from '@/lib/slug-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id: urlParam } = await params
    const { slug, id, isLegacyId } = parseLocationParam(urlParam)

    // Try to find location by slug first, then by ID
    let location
    
    if (!isLegacyId && slug) {
      // Try slug lookup first
      console.log('🔍 Attempting slug lookup for:', slug)
      try {
        const slugResult = await payload.find({
          collection: 'locations',
          where: {
            slug: {
              equals: slug
            }
          },
          limit: 1
        })
        
        console.log('🔍 Slug lookup result:', {
          found: slugResult.docs.length > 0,
          count: slugResult.docs.length,
          firstResult: slugResult.docs[0]?.slug || 'none'
        })
        
        if (slugResult.docs.length > 0) {
          location = slugResult.docs[0]
          console.log('✅ Found location via slug:', location?.name)
        }
      } catch (error) {
        console.log('❌ Slug lookup failed:', error)
      }
    }

    // If slug lookup failed or this is a legacy ID, try ID lookup
    if (!location && id) {
      console.log('🔍 Attempting ID lookup for:', id)
      try {
        location = await payload.findByID({
          collection: 'locations',
          id: id
        })
        console.log('✅ Found location via ID:', location?.name || 'none')
      } catch (error) {
        console.log('❌ ID lookup failed:', error)
      }
    }

    // If still no location found, try treating the param as a direct ID
    if (!location) {
      console.log('🔍 Attempting direct ID lookup for:', urlParam)
      try {
        location = await payload.findByID({
          collection: 'locations',
          id: urlParam
        })
        console.log('✅ Found location via direct ID:', location?.name || 'none')
      } catch (error) {
        console.log('❌ Direct ID lookup failed:', error)
      }
    }

    if (!location) {
      console.log('❌ No location found for param:', urlParam)
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Only return published locations (unless in development)
    if (location.status !== 'published' && process.env.NODE_ENV === 'production') {
      console.log('❌ Location not published:', location.name)
      return NextResponse.json({ error: 'Location not available' }, { status: 404 })
    }

    console.log('✅ Successfully found location:', location.name)

    // Add flag to indicate if this was found via legacy ID (for potential redirects)
    const responseData = {
      ...location,
      _meta: {
        foundViaLegacyId: isLegacyId && location.slug,
        canonicalSlug: location.slug
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('❌ Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

// PUT handler removed to avoid conflict with /edit route
// All PUT requests should go to /api/locations/[id]/edit instead

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params
    const payload = await getPayload({ config })
    
    // Debug the request
    const contentType = req.headers.get('content-type') || ''
    console.log('📝 Request content-type:', contentType)
    console.log('📝 Request method:', req.method)
    
    let body
    try {
      if (contentType.includes('multipart/form-data')) {
        // Handle multipart form data (from Payload CMS admin)
        console.log('📝 Parsing multipart form data')
        const formData = await req.formData()
        const payloadData = formData.get('_payload')
        
        if (payloadData && typeof payloadData === 'string') {
          body = JSON.parse(payloadData)
          console.log('✅ Successfully parsed _payload from form data')
        } else {
          console.log('⚠️ No _payload field found in form data')
          body = {}
        }
      } else {
        // Handle regular JSON
        console.log('📝 Parsing JSON request body')
        const rawBody = await req.text()
        
        if (rawBody.trim() === '') {
          console.log('⚠️ Empty request body received')
          body = {}
        } else {
          body = JSON.parse(rawBody)
          console.log('✅ Successfully parsed JSON body')
        }
      }
    } catch (error) {
      console.error('❌ Error parsing request body:', error)
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }

    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers })
    
    console.log('🔐 Auth check - User found:', !!user)
    console.log('🔐 User ID:', user?.id)
    console.log('🔐 User role:', user?.role)
    
    if (!user) {
      console.log('❌ No authenticated user found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // First, get the existing location to check ownership
    const existingLocation = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!existingLocation) {
      console.log('❌ Location not found:', locationId)
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    console.log('📍 Location found:', existingLocation.name)
    console.log('📍 Location createdBy:', existingLocation.createdBy)

    // Extract creator ID properly (handle both string and populated object)
    const locationCreatedBy = typeof existingLocation.createdBy === 'string' 
      ? existingLocation.createdBy 
      : existingLocation.createdBy?.id || existingLocation.createdBy;

    console.log('🔍 Ownership check:')
    console.log('   - Location created by:', locationCreatedBy)
    console.log('   - Current user ID:', user.id)
    console.log('   - Match:', locationCreatedBy === user.id)

    // For now, allow editing if:
    // 1. User owns the location
    // 2. Location has no owner (createdBy is null/undefined) 
    // 3. User is accessing through Payload CMS admin (temporary override)
    const isOwner = locationCreatedBy === user.id;
    const hasNoOwner = !locationCreatedBy;
    const isPayloadAdmin = contentType.includes('multipart/form-data'); // Payload CMS admin requests

    console.log('   - Is owner:', isOwner)
    console.log('   - Has no owner:', hasNoOwner)
    console.log('   - Is Payload admin request:', isPayloadAdmin)

    if (!isOwner && !hasNoOwner && !isPayloadAdmin) {
      console.log('❌ Access denied: User does not own this location')
      return NextResponse.json(
        { error: 'You can only edit your own locations' },
        { status: 403 }
      )
    }

    console.log('✅ Authorization passed')

    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: body,
    })

    return NextResponse.json({
      success: true,
      location: updatedLocation,
    })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
} 