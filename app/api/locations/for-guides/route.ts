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
      const addressParts = [
        location.address?.city,
        location.address?.state,
        location.address?.country,
      ].filter(Boolean)
      
      const displayAddress = addressParts.join(', ')
      
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
        imageUrl: location.featuredImage?.url || null,
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