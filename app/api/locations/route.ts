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
  'address'
])

// Governance fields that should be rejected
const GOVERNANCE_FIELDS = new Set([
  'status',
  'privacy',
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
      privacy: 'public',
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
    const whereParam = searchParams.get('where')
    
    if (!whereParam) {
      return NextResponse.json(
        { error: 'Location IDs are required' },
        { status: 400 }
      )
    }

    // Parse the where parameter to extract location IDs
    let locationIds: string[] = []
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
      // If JSON parsing fails, try to extract IDs from the URL directly
      const idMatches = whereParam.match(/id.*?in.*?\[(\d+)\]/g)
      if (idMatches) {
        locationIds = idMatches.map(match => {
          const idMatch = match.match(/\[(\d+)\]/)
          return idMatch ? idMatch[1] : null
        }).filter(Boolean) as string[]
      }
    }

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

    // Filter locations that the user can delete
    const deletableLocations = locations.docs.filter(location => {
      // Admins can delete any location
      if (user.role === 'admin') return true
      
      // Users can delete their own locations
      if (location.createdBy === user.id) return true
      
      // Claimed owners can delete their locations (if approved)
      if (location.ownership?.ownerId === user.id && 
          location.ownership?.claimStatus === 'approved') return true
      
      return false
    })

    if (deletableLocations.length === 0) {
      return NextResponse.json(
        { error: 'No locations found that you have permission to delete' },
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


