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
  'insiderTips'
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

    // Generate slug from name
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }

    // Prepare location data with server-enforced defaults
    const locationData = {
      // Whitelisted fields
      name: filteredData.name.trim(),
      slug: generateSlug(filteredData.name),
      shortDescription: filteredData.shortDescription.trim(),
      coordinates: {
        latitude: filteredData.coordinates.latitude,
        longitude: filteredData.coordinates.longitude
      },
      featuredImage: filteredData.featuredImage || undefined,
      gallery: filteredData.gallery || undefined,
      insiderTips: filteredData.insiderTips || undefined,

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


