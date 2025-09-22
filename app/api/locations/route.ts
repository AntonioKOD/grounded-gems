import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Whitelisted fields for community submissions
const ALLOWED_FIELDS = new Set([
  'name',
  'shortDescription', 
  'coordinates',
  'featuredImage',
  'gallery',
  'insiderTips',
  'categories',
  'address',
  'privacy',
  'privateAccess'
])

// Governance fields that should be rejected
const GOVERNANCE_FIELDS = new Set([
  'status',
  'isVerified',
  'isFeatured',
  'source',
  'createdBy',
  'ownership',
  'averageRating',
  'reviewCount',
  'followerCount',
  'visitVerificationCount',
  'hasBusinessPartnership',
  'partnershipDetails',
  'businessSettings',
  'communityPhotos',
  'meta'
])

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get authenticated user
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!body.shortDescription || typeof body.shortDescription !== 'string' || body.shortDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'Short description is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!body.coordinates || typeof body.coordinates !== 'object') {
      return NextResponse.json(
        { error: 'Coordinates are required' },
        { status: 400 }
      )
    }

    if (typeof body.coordinates.latitude !== 'number' || typeof body.coordinates.longitude !== 'number') {
      return NextResponse.json(
        { error: 'Coordinates must contain valid latitude and longitude numbers' },
        { status: 400 }
      )
    }

    // Validate coordinates range
    if (body.coordinates.latitude < -90 || body.coordinates.latitude > 90) {
      return NextResponse.json(
        { error: 'Latitude must be between -90 and 90' },
        { status: 400 }
      )
    }

    if (body.coordinates.longitude < -180 || body.coordinates.longitude > 180) {
      return NextResponse.json(
        { error: 'Longitude must be between -180 and 180' },
        { status: 400 }
      )
    }

    // Check for governance fields and reject them
    const providedGovernanceFields = Object.keys(body).filter(key => GOVERNANCE_FIELDS.has(key))
    if (providedGovernanceFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Governance fields are not allowed in community submissions',
          rejectedFields: providedGovernanceFields
        },
        { status: 400 }
      )
    }

    // Filter to only allow whitelisted fields
    const filteredData: any = {}
    
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        filteredData[key] = value
      }
    }

    // Validate insider tips if provided
    if (filteredData.insiderTips) {
      if (!Array.isArray(filteredData.insiderTips)) {
        return NextResponse.json(
          { error: 'Insider tips must be an array' },
          { status: 400 }
        )
      }

      if (filteredData.insiderTips.length > 3) {
        return NextResponse.json(
          { error: 'Maximum 3 insider tips allowed' },
          { status: 400 }
        )
      }

      // Validate each tip structure
      for (const tip of filteredData.insiderTips) {
        if (!tip.category || !tip.tip) {
          return NextResponse.json(
            { error: 'Each insider tip must have category and tip fields' },
            { status: 400 }
          )
        }
      }
    }

    // Validate gallery if provided
    if (filteredData.gallery) {
      if (!Array.isArray(filteredData.gallery)) {
        return NextResponse.json(
          { error: 'Gallery must be an array' },
          { status: 400 }
        )
      }

      // Validate each gallery item
      for (const item of filteredData.gallery) {
        if (!item.image) {
          return NextResponse.json(
            { error: 'Each gallery item must have an image' },
            { status: 400 }
          )
        }
      }
    }

    // Validate categories if provided
    if (filteredData.categories) {
      if (!Array.isArray(filteredData.categories)) {
        return NextResponse.json(
          { error: 'Categories must be an array' },
          { status: 400 }
        )
      }

      if (filteredData.categories.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 categories allowed' },
          { status: 400 }
        )
      }

      // Validate each category ID
      for (const categoryId of filteredData.categories) {
        if (typeof categoryId !== 'string' || categoryId.trim().length === 0) {
          return NextResponse.json(
            { error: 'Each category must be a valid ID string' },
            { status: 400 }
          )
        }
        
        // Validate MongoDB ObjectId format (24 character hex string)
        if (!/^[0-9a-fA-F]{24}$/.test(categoryId.trim())) {
          return NextResponse.json(
            { error: `Invalid category ID format: ${categoryId}. Must be a 24-character hex string.` },
            { status: 400 }
          )
        }
      }
      
      // Verify that all category IDs exist in the database
      if (filteredData.categories.length > 0) {
        try {
          const existingCategories = await payload.find({
            collection: 'categories',
            where: {
              id: {
                in: filteredData.categories
              }
            },
            limit: 100
          })
          
          if (existingCategories.docs.length !== filteredData.categories.length) {
            const foundIds = existingCategories.docs.map(cat => String(cat.id))
            const missingIds = filteredData.categories.filter((id: string) => !foundIds.includes(id))
            return NextResponse.json(
              { error: `Some categories do not exist: ${missingIds.join(', ')}` },
              { status: 400 }
            )
          }
        } catch (categoryError) {
          console.error('Error validating categories:', categoryError)
          return NextResponse.json(
            { error: 'Failed to validate categories' },
            { status: 500 }
          )
        }
      }
    }

    // Validate privacy if provided
    if (filteredData.privacy) {
      const validPrivacyValues = ['public', 'private', 'followers']
      if (!validPrivacyValues.includes(filteredData.privacy)) {
        return NextResponse.json(
          { error: 'Privacy must be one of: public, private, followers' },
          { status: 400 }
        )
      }
    }

    // Validate privateAccess if provided
    if (filteredData.privateAccess) {
      if (!Array.isArray(filteredData.privateAccess)) {
        return NextResponse.json(
          { error: 'Private access must be an array of user IDs' },
          { status: 400 }
        )
      }

      // Validate each user ID in privateAccess
      for (const userId of filteredData.privateAccess) {
        if (typeof userId !== 'string' || userId.trim().length === 0) {
          return NextResponse.json(
            { error: 'Each private access entry must be a valid user ID string' },
            { status: 400 }
          )
        }
      }
    }

    // Generate slug from name and description
    const generateSlug = (name: string, description?: string): string => {
      // Combine name and description for better slug generation
      const combinedText = `${name} ${description || ''}`
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      
      // Ensure slug is not too long (max 100 chars)
      return combinedText.length > 100 ? combinedText.substring(0, 100).replace(/-+$/, '') : combinedText
    }

    // Generate metadata from name and description
    const generateMetadata = (name: string, description: string) => {
      const metaTitle = `${name} - Discover with Sacavia`
      const metaDescription = description.length > 160 
        ? description.substring(0, 157) + '...'
        : description
      
      return {
        title: metaTitle,
        description: metaDescription,
        keywords: `${name}, ${description.split(' ').slice(0, 10).join(', ')}`
      }
    }

    // Generate metadata
    const metadata = generateMetadata(filteredData.name.trim(), filteredData.shortDescription.trim())

    // Prepare location data with server-enforced defaults
    const locationData = {
      // Whitelisted fields
      name: filteredData.name.trim(),
      slug: generateSlug(filteredData.name, filteredData.shortDescription),
      shortDescription: filteredData.shortDescription.trim(),
      coordinates: {
        latitude: filteredData.coordinates.latitude,
        longitude: filteredData.coordinates.longitude
      },
      featuredImage: filteredData.featuredImage || undefined,
      gallery: filteredData.gallery || undefined,
      insiderTips: filteredData.insiderTips || undefined,
      categories: filteredData.categories || undefined,

      // Generated metadata
      meta: {
        title: metadata.title,
        description: metadata.description,
        keywords: metadata.keywords
      },

      // Server-enforced defaults
      status: 'published',
      privacy: filteredData.privacy || 'public', // Use provided privacy or default to public
      privateAccess: filteredData.privateAccess || [], // Use provided private access or empty array
      isVerified: false,
      source: 'community',
      createdBy: user.id,
      
      // Set ownership defaults
      ownership: {
        claimStatus: 'unclaimed'
      }
    }

    // Create the location
    const location = await payload.create({
      collection: 'locations',
      data: locationData,
    })

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        name: location.name,
        slug: location.slug,
        shortDescription: location.shortDescription,
        coordinates: location.coordinates,
        status: location.status,
        privacy: location.privacy,
        isVerified: location.isVerified,
        source: location.source,
        ownership: location.ownership,
        createdAt: location.createdAt
      }
    })

  } catch (error) {
    console.error('Error creating location:', error)
    
    // Handle specific Payload errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'A location with this name already exists' },
          { status: 409 }
        )
      }
      
      if (error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Validation error: ' + error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get authenticated user
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters to get location IDs
    const { searchParams } = new URL(request.url)
    
    console.log('DELETE /api/locations - URL:', request.url)
    console.log('DELETE /api/locations - searchParams:', Object.fromEntries(searchParams.entries()))
    
    // Extract location IDs from the URL parameters
    let locationIds: string[] = []
    
    // Method 1: Extract from individual query parameters
    // The URL format is: where%5Band%5D%5B1%5D%5Bid%5D%5Bin%5D%5B0%5D=ID&where%5Band%5D%5B1%5D%5Bid%5D%5Bin%5D%5B1%5D=ID...
    for (const [key, value] of searchParams.entries()) {
      // Check if this is a location ID parameter
      if (key.includes('where') && key.includes('id') && key.includes('in') && value) {
        // Validate that the value looks like a MongoDB ObjectId (24 hex characters)
        if (/^[a-f0-9]{24}$/.test(value)) {
          locationIds.push(value)
        }
      }
    }
    
    // Method 2: Extract all MongoDB ObjectIds from the URL
    if (locationIds.length === 0) {
      const urlString = request.url
      const objectIdMatches = urlString.match(/[a-f0-9]{24}/g)
      if (objectIdMatches) {
        locationIds = [...new Set(objectIdMatches)] // Remove duplicates
      }
    }
    
    // Method 3: Try to get from 'where' parameter if it exists
    const whereParam = searchParams.get('where')
    if (whereParam && locationIds.length === 0) {
      try {
        const whereData = JSON.parse(decodeURIComponent(whereParam))
        
        // Handle the complex where structure from the URL
        if (whereData.and && Array.isArray(whereData.and)) {
          for (const condition of whereData.and) {
            if (condition.id && condition.id.in && Array.isArray(condition.id.in)) {
              locationIds = [...locationIds, ...condition.id.in]
            }
          }
        }
      } catch (parseError) {
        console.log('JSON parsing failed:', parseError)
      }
    }

    console.log('DELETE /api/locations - extracted locationIds:', locationIds)
    
    if (locationIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid location IDs found' },
        { status: 400 }
      )
    }

    // Check permissions for each location
    const locations = await payload.find({
      collection: 'locations',
      where: {
        id: {
          in: locationIds
        }
      },
      limit: 1000
    })

    console.log('DELETE /api/locations - found locations:', locations.docs.length)
    console.log('DELETE /api/locations - user:', { id: user.id, role: user.role })

    // Filter locations that the user can delete
    const deletableLocations = locations.docs.filter(location => {
      console.log('DELETE /api/locations - checking location:', {
        id: location.id,
        createdBy: location.createdBy,
        ownership: location.ownership,
        userCanDelete: false
      })
      
      // Admins can delete any location
      if (user.role === 'admin') {
        console.log('DELETE /api/locations - admin can delete:', location.id)
        return true
      }
      
      // Users can delete their own locations
      if (location.createdBy === user.id) {
        console.log('DELETE /api/locations - creator can delete:', location.id)
        return true
      }
      
      // Claimed owners can delete their locations (if approved)
      if (location.ownership?.ownerId === user.id && 
          location.ownership?.claimStatus === 'approved') {
        console.log('DELETE /api/locations - claimed owner can delete:', location.id)
        return true
      }
      
      console.log('DELETE /api/locations - user cannot delete:', location.id)
      return false
    })

    console.log('DELETE /api/locations - deletable locations:', deletableLocations.length)

    if (locations.docs.length === 0) {
      return NextResponse.json(
        { 
          error: 'No locations found with the provided IDs',
          details: {
            requestedIds: locationIds,
            foundLocations: 0,
            message: 'The location(s) may have already been deleted or the IDs may be incorrect'
          }
        },
        { status: 404 }
      )
    }

    if (deletableLocations.length === 0) {
      return NextResponse.json(
        { 
          error: 'No locations found that you have permission to delete',
          details: {
            requestedIds: locationIds,
            foundLocations: locations.docs.length,
            userRole: user.role,
            userId: user.id
          }
        },
        { status: 403 }
      )
    }

    // Delete the locations
    const deletedLocations = []
    for (const location of deletableLocations) {
      try {
        await payload.delete({
          collection: 'locations',
          id: location.id
        })
        deletedLocations.push(location.id)
      } catch (deleteError) {
        console.error(`Failed to delete location ${location.id}:`, deleteError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedLocations.length} location(s)`,
      deletedCount: deletedLocations.length,
      deletedIds: deletedLocations
    })

  } catch (error) {
    console.error('Error deleting locations:', error)
    return NextResponse.json(
      { error: 'Failed to delete locations' },
      { status: 500 }
    )
  }
}


