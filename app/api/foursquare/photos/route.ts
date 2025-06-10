import { NextRequest, NextResponse } from 'next/server'
import { getFoursquareAPI } from '@/lib/foursquare'

export async function GET(request: NextRequest) {
  try {
    // Get FoursquareAPI instance dynamically
    const foursquareAPI = getFoursquareAPI()
    
    // Check if Foursquare API is configured
    if (!process.env.FOURSQUARE_API_KEY || !foursquareAPI) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Foursquare API not configured. Please add FOURSQUARE_API_KEY to environment variables.',
          details: 'The Foursquare integration requires an API key to function.' 
        },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const fsqId = searchParams.get('fsq_id')
    const limit = searchParams.get('limit') || '20'

    // Validate required parameters
    if (!fsqId) {
      return NextResponse.json(
        { error: 'fsq_id parameter is required' },
        { status: 400 }
      )
    }

    try {
      // Get detailed photos for the place
      const photosData = await foursquareAPI.getPlacePhotosDetailed(fsqId, parseInt(limit))
      
      return NextResponse.json({
        success: true,
        fsq_id: fsqId,
        total: photosData.total,
        photos: photosData.photos,
        // Add helper URLs for different sizes
        photoSizes: {
          thumbnail: '300x300',
          medium: '800x600',
          large: 'original'
        }
      })

    } catch (error: any) {
      console.error(`Error fetching photos for ${fsqId}:`, error)
      
      // Check if it's a 404 (place not found) or other error
      if (error.message.includes('404')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Place not found',
            details: `Place with ID ${fsqId} was not found in Foursquare`
          },
          { status: 404 }
        )
      }
      
      throw error // Re-throw other errors to be caught by outer try-catch
    }

  } catch (error: any) {
    console.error('Foursquare photos API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch photos from Foursquare',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get FoursquareAPI instance dynamically
    const foursquareAPI = getFoursquareAPI()
    
    // Check if Foursquare API is configured
    if (!process.env.FOURSQUARE_API_KEY || !foursquareAPI) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Foursquare API not configured',
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { fsq_ids, limit = 10 } = body

    // Validate required parameters
    if (!fsq_ids || !Array.isArray(fsq_ids) || fsq_ids.length === 0) {
      return NextResponse.json(
        { error: 'fsq_ids array is required' },
        { status: 400 }
      )
    }

    // Fetch photos for multiple places
    const results = await Promise.allSettled(
      fsq_ids.map(async (fsqId: string) => {
        try {
          const photosData = await foursquareAPI.getPlacePhotosDetailed(fsqId, limit)
          return {
            fsq_id: fsqId,
            success: true,
            ...photosData
          }
        } catch (error: any) {
          return {
            fsq_id: fsqId,
            success: false,
            error: error.message,
            photos: [],
            total: 0
          }
        }
      })
    )

    const processedResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          photos: [],
          total: 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      results: processedResults,
      summary: {
        total_places: fsq_ids.length,
        successful: processedResults.filter(r => r.success).length,
        failed: processedResults.filter(r => !r.success).length,
        total_photos: processedResults.reduce((sum, r) => sum + (r.total || 0), 0)
      }
    })

  } catch (error: any) {
    console.error('Foursquare batch photos API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch photos from Foursquare',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 