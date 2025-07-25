import { NextRequest, NextResponse } from "next/server"
import { getLocations } from "@/app/actions"
import { getServerSideUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    console.log("📍 [API] /api/locations/all - Fetching all locations...")
    
    // Get current user for access filtering
    const user = await getServerSideUser()
    const userId = user?.id
    
    // Call the server action to get locations with access filtering
    const locations = await getLocations(userId)
    
    console.log(`📍 [API] Retrieved ${locations.length} locations from database`)
    
    // Transform and filter locations for client consumption
    const processedLocations = locations
      .map((loc: any) => {
        // Extract coordinates properly
        let latitude = loc.latitude
        let longitude = loc.longitude
        
        if (loc.coordinates) {
          latitude = loc.coordinates.latitude || latitude
          longitude = loc.coordinates.longitude || longitude
        }
        
        return {
          ...loc,
          latitude: typeof latitude === 'number' ? latitude : parseFloat(latitude || '0'),
          longitude: typeof longitude === 'number' ? longitude : parseFloat(longitude || '0'),
          name: loc.name || "Unnamed Location",
          // Format address
          address: typeof loc.address === 'string' 
            ? loc.address 
            : loc.address 
              ? Object.values(loc.address).filter(Boolean).join(', ')
              : '',
          // Extract image URL
          imageUrl: typeof loc.featuredImage === 'string' 
            ? loc.featuredImage 
            : loc.featuredImage?.url || loc.imageUrl || '/placeholder.svg'
        }
      })
      .filter((loc: any) => 
        typeof loc.latitude === 'number' && 
        typeof loc.longitude === 'number' && 
        !isNaN(loc.latitude) && 
        !isNaN(loc.longitude) &&
        loc.latitude !== 0 && 
        loc.longitude !== 0
      )
    
    console.log(`📍 [API] Returning ${processedLocations.length} valid locations`)
    
    return NextResponse.json({
      success: true,
      locations: processedLocations,
      count: processedLocations.length
    })
    
  } catch (error) {
    console.error("❌ [API] Error in /api/locations/all:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch locations",
        locations: [],
        count: 0
      },
      { status: 500 }
    )
  }
} 