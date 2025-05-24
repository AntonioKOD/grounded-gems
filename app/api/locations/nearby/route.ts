import { NextRequest, NextResponse } from "next/server"
import { getPublicLocations } from "@/app/(frontend)/home-page-actions/actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude, limit = 12 } = body

    console.log('Nearby locations API called with:', { latitude, longitude, limit })

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude values" },
        { status: 400 }
      )
    }

    // Fetch nearby locations using the optimized server action
    const nearbyLocations = await getPublicLocations(
      limit,
      { latitude, longitude }
    )

    console.log(`Returning ${nearbyLocations.length} nearby locations`)

    return NextResponse.json(nearbyLocations)
  } catch (error) {
    console.error("Error in nearby locations API:", error)
    return NextResponse.json(
      { error: "Failed to fetch nearby locations" },
      { status: 500 }
    )
  }
} 