import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Where } from 'payload'

// Haversine distance formula for calculating distance between coordinates
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function POST(req: Request) {
  try {
    const { query, coordinates, radius = 25 } = await req.json()
    
    if (!query && !coordinates) {
      return NextResponse.json({ success: true, locations: [] })
    }

    const payload = await getPayload({ config })
    let locations: any[] = []

    // Text-based search
    if (query && typeof query === 'string' && query.trim().length >= 2) {
      const searchTerm = query.trim()

      // Build search clauses for multiple fields
      const clauses: Where[] = [
        { name: { like: searchTerm } },
        { description: { like: searchTerm } },
        { 'address.street': { like: searchTerm } },
        { 'address.city': { like: searchTerm } },
        { 'address.state': { like: searchTerm } },
        { 'address.zip': { like: searchTerm } },
        { 'address.country': { like: searchTerm } },
        { neighborhood: { like: searchTerm } },
      ]

      const whereClause: Where = { 
        and: [
          { or: clauses },
          { status: { equals: 'published' } } // Only show published locations
        ]
      }

      const { docs } = await payload.find({
        collection: 'locations',
        where: whereClause,
        limit: 20,
        depth: 1,
        sort: '-averageRating' // Sort by rating for relevance
      })

      locations = docs
    }

    // Coordinate-based nearby search
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const { latitude: userLat, longitude: userLon } = coordinates

      // Fetch all published locations with coordinates for distance calculation
      const { docs } = await payload.find({
        collection: 'locations',
        where: {
          and: [
            { status: { equals: 'published' } },
            { 'coordinates.latitude': { exists: true } },
            { 'coordinates.longitude': { exists: true } }
          ]
        },
        limit: 500, // Get more locations for better distance filtering
        depth: 1,
      })

      // Calculate distances and filter
      const nearbyLocations = docs
        .map(location => {
          if (!location.coordinates?.latitude || !location.coordinates?.longitude) return null
          
          const distance = haversineDistance(
            userLat, 
            userLon, 
            location.coordinates.latitude, 
            location.coordinates.longitude
          )
          
          return { ...location, distance }
        })
        .filter(loc => loc && loc.distance <= radius)
        .sort((a, b) => a!.distance - b!.distance)
        .slice(0, 20) // Limit results

      // If we already have text search results, merge and dedupe
      if (locations.length > 0) {
        const existingIds = new Set(locations.map(loc => loc.id))
        const newNearbyLocations = nearbyLocations.filter(loc => loc && !existingIds.has(loc.id))
        locations = [...locations, ...newNearbyLocations]
      } else {
        locations = nearbyLocations.filter(Boolean)
      }
    }

    // Format locations for frontend
    const formattedLocations = locations.map(loc => {
      const addressParts = [
        loc.address?.street,
        loc.address?.city,
        loc.address?.state,
        loc.address?.zip,
        loc.address?.country,
      ].filter(Boolean)
      const formattedAddress = addressParts.join(', ')

      const { latitude = null, longitude = null } = loc.coordinates || {}

      return {
        id: loc.id,
        name: loc.name,
        description: loc.description || '',
        address: formattedAddress,
        coordinates: { latitude, longitude },
        distance: loc.distance ? Math.round(loc.distance * 10) / 10 : undefined, // Round to 1 decimal
        averageRating: loc.averageRating || 0,
        reviewCount: loc.reviewCount || 0,
        category: loc.categories?.[0]?.name || '',
        imageUrl: loc.featuredImage?.url || null,
        isVerified: loc.isVerified || false
      }
    })

    // Remove duplicates and limit final results
    const uniqueLocations = formattedLocations
      .filter((loc, index, self) => self.findIndex(l => l.id === loc.id) === index)
      .slice(0, 15)

    return NextResponse.json({ 
      success: true, 
      locations: uniqueLocations,
      count: uniqueLocations.length
    })

  } catch (error) {
    console.error('Location search error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to search locations',
      locations: []
    }, { status: 500 })
  }
}
