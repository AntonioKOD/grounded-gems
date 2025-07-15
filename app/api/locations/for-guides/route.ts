import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Where } from 'payload'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    
    console.log('🔍 Searching locations for guides:', { query, limit })
    
    let whereClause: Where = {}
    
    // Add search functionality if query provided
    if (query.trim().length >= 2) {
      const searchTerm = query.trim()
      whereClause = {
        or: [
          { name: { like: searchTerm } },
          { 'address.city': { like: searchTerm } },
          { 'address.state': { like: searchTerm } },
          { 'address.country': { like: searchTerm } },
          { neighborhood: { like: searchTerm } },
        ]
      }
    }
    
    const result = await payload.find({
      collection: 'locations',
      where: whereClause,
      limit,
      depth: 1,
      sort: '-averageRating', // Prioritize higher-rated locations
      select: {
        id: true,
        name: true,
        address: true,
        neighborhood: true,
        coordinates: true,
        averageRating: true,
        reviewCount: true,
        categories: true,
        featuredImage: true,
        isVerified: true,
      }
    })

    // Format locations for the guide form
    const formattedLocations = result.docs.map(location => {
      const address = (location.address && typeof location.address === 'object') ? location.address as Record<string, any> : {};
      const addressParts = [
        address.city,
        address.state,
        address.country,
      ].filter(Boolean)
      const displayAddress = addressParts.join(', ')

      let imageUrl = null;
      if (location.featuredImage && typeof location.featuredImage === 'object' && 'url' in location.featuredImage) {
        imageUrl = (location.featuredImage as any).url;
      }

      return {
        id: location.id,
        name: location.name,
        fullName: `${location.name}${displayAddress ? ` - ${displayAddress}` : ''}`,
        address: location.address,
        neighborhood: location.neighborhood,
        coordinates: location.coordinates,
        averageRating: location.averageRating || 0,
        reviewCount: location.reviewCount || 0,
        categories: location.categories || [],
        imageUrl,
        isVerified: location.isVerified || false,
      }
    })

    console.log(`📍 Found ${formattedLocations.length} locations for guides`)

    return NextResponse.json({
      success: true,
      locations: formattedLocations,
      totalCount: result.totalDocs,
    })

  } catch (error: any) {
    console.error('❌ Locations for guides API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch locations for guides', details: error.message },
      { status: 500 }
    )
  }
} 