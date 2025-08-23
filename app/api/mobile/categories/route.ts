import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileCategoriesResponse {
  success: boolean
  message: string
  data?: {
    categories: Array<{
      id: string
      name: string
      slug: string
      description?: string
      source: 'manual' | 'foursquare' | 'imported'
      foursquareIcon?: {
        prefix: string
        suffix: string
      }
      subcategories?: any[]
      parent?: string
      order?: number
      isActive?: boolean
    }>
    total: number
  }
  error?: string
  code?: string
}

// GET /api/mobile/categories - Get all active categories
export async function GET(request: NextRequest): Promise<NextResponse<MobileCategoriesResponse>> {
  try {
    const payload = await getPayload({ config })
    
    console.log('📱 Mobile Categories API: GET request received')
    
    // Get current user for potential future personalization
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      const cookieHeader = request.headers.get('Cookie')
      
      // Check for Bearer token in Authorization header
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('📱 Mobile Categories API: Authenticated user via Bearer token:', user?.id)
      }
      // Check for payload-token in Cookie header (fallback for mobile apps)
      else if (cookieHeader?.includes('payload-token=')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('📱 Mobile Categories API: Authenticated user via cookie:', user?.id)
      }
    } catch (authError) {
      console.log('📱 Mobile Categories API: Authentication failed (continuing without auth):', authError)
      // Continue without authentication - categories are public
    }
    
    console.log('📱 Mobile Categories API: Fetching categories...')
    
    // Fetch categories from Payload CMS
    const result = await payload.find({
      collection: "categories",
      depth: 1,
      where: {
        isActive: {
          equals: true,
        },
      },
      sort: "order",
      limit: 1000, // Get all categories
      overrideAccess: true,
    })

    console.log(`📱 Mobile Categories API: Found ${result.docs.length} active categories`)
    
    // Format categories for mobile response
    const categories = result.docs.map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      source: category.source || 'manual',
      foursquareIcon: category.foursquareIcon,
      subcategories: category.subcategories,
      parent: category.parent,
      order: category.order,
      isActive: category.isActive
    }))

    return NextResponse.json({
      success: true,
      message: 'Categories fetched successfully',
      data: {
        categories,
        total: result.totalDocs
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Authorization'
      }
    })

  } catch (error) {
    console.error('📱 Mobile Categories API: Error fetching categories:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch categories',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}
