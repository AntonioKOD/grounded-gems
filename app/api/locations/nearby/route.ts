import { NextRequest, NextResponse } from "next/server"
import { getPublicLocations } from "@/app/(frontend)/home-page-actions/actions"
import { getPayload } from 'payload'
import config from '@payload-config'

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
    const { latitude, longitude, radius = 25, limit = 15 } = await req.json()
    
    if (!latitude || !longitude) {
      return NextResponse.json({ 
        success: false, 
        error: 'Latitude and longitude are required',
        locations: []
      }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Fetch all published locations with coordinates
    const { docs } = await payload.find({
      collection: 'locations',
      where: {
        and: [
          { 
            or: [
              { status: { equals: 'published' } },
              { status: { equals: 'review' } }
            ]
          },
          { 'coordinates.latitude': { exists: true } },
          { 'coordinates.longitude': { exists: true } }
        ]
      },
      limit: 1000, // Get more locations for better filtering
      depth: 1,
    })

    // Calculate distances and filter nearby locations
    const nearbyLocations = docs
      .map(location => {
        if (!location.coordinates?.latitude || !location.coordinates?.longitude) return null
        
        const distance = haversineDistance(
          latitude, 
          longitude, 
          location.coordinates.latitude, 
          location.coordinates.longitude
        )
        
        return { ...location, distance }
      })
      .filter(loc => loc && loc.distance <= radius)
      .sort((a, b) => a!.distance - b!.distance)
      .slice(0, limit)

    // Format locations for frontend
    const formattedLocations = nearbyLocations.map(loc => {
      if (!loc) return null

      const addressParts = [
        loc.address?.street,
        loc.address?.city,
        loc.address?.state,
        loc.address?.zip,
        loc.address?.country,
      ].filter(Boolean)
      const formattedAddress = addressParts.join(', ')

      const { latitude: locLat = null, longitude: locLng = null } = loc.coordinates || {}

      return {
        id: loc.id,
        name: loc.name,
        slug: loc.slug || null,
        description: loc.description || '',
        address: formattedAddress,
        coordinates: { latitude: locLat, longitude: locLng },
        distance: Math.round(loc.distance * 10) / 10, // Round to 1 decimal
        averageRating: loc.averageRating || 0,
        reviewCount: loc.reviewCount || 0,
        category: loc.categories?.[0]?.name || '',
        imageUrl: loc.featuredImage?.url || null,
        isVerified: loc.isVerified || false,
        priceRange: loc.priceRange || null
      }
    }).filter(Boolean)

    return NextResponse.json({ 
      success: true, 
      locations: formattedLocations,
      count: formattedLocations.length,
      searchRadius: radius,
      userLocation: { latitude, longitude }
    })

  } catch (error) {
    console.error('Nearby locations search error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to find nearby locations',
      locations: []
    }, { status: 500 })
  }
} 