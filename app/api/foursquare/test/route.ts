import { NextRequest, NextResponse } from 'next/server'
import { getFoursquareAPI } from '@/lib/foursquare'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get FoursquareAPI instance dynamically
    const foursquareAPI = getFoursquareAPI()
    
    if (!process.env.FOURSQUARE_API_KEY) {
      return NextResponse.json(
        { 
          success: false,
          configured: false,
          message: 'Foursquare API key not found in environment variables' 
        },
        { status: 503 }
      )
    }

    if (!foursquareAPI) {
      return NextResponse.json(
        { 
          success: false,
          configured: false,
          message: 'Failed to initialize Foursquare API client' 
        },
        { status: 503 }
      )
    }

    // Try a simple search to test connectivity
    const testResults = await foursquareAPI.searchPlaces({
      query: 'starbucks',
      near: 'New York, NY',
      limit: 1
    })

    return NextResponse.json({
      success: true,
      message: 'Foursquare API is working correctly',
      configured: true,
      testResultsCount: testResults.results?.length || 0,
      sampleResult: testResults.results?.[0]?.name || 'No results'
    })

  } catch (error: any) {
    console.error('Foursquare test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Foursquare API',
      details: error.message,
      configured: !!process.env.FOURSQUARE_API_KEY
    }, { status: 500 })
  }
} 