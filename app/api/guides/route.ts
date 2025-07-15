import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/guides - Get guides with filtering, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const location = searchParams.get('location') // specific location ID
    const locationSearch = searchParams.get('locationSearch') // location name/city/state search
    const userState = searchParams.get('userState') // user's state for nearby filtering
    const priceType = searchParams.get('priceType') // free, paid, pwyw
    const search = searchParams.get('search')
    const difficulty = searchParams.get('difficulty')
    const sort = searchParams.get('sort') || '-createdAt' // Default to newest first
    const creator = searchParams.get('creator')
    const featured = searchParams.get('featured') === 'true'
    
    // Build where clause
    const where: any = {
      status: { equals: 'published' }
    }
    
    console.log('🔍 Guide filtering params:', {
      location,
      locationSearch,
      userState,
      search,
      showingNearby: !!userState
    })
    
    // Note: Category filtering removed - guides are no longer categorized
    
    // Filter by specific location ID
    if (location) {
      where.primaryLocation = { equals: location }
    }
    
    // Filter by location search (city, state, location name)
    if (locationSearch) {
      where.or = [
        // Search in primary location
        { 'primaryLocation.name': { contains: locationSearch } },
        { 'primaryLocation.address.city': { contains: locationSearch } },
        { 'primaryLocation.address.state': { contains: locationSearch } },
        // Search in guide locations
        { 'locations.location.name': { contains: locationSearch } },
        { 'locations.location.address.city': { contains: locationSearch } },
        { 'locations.location.address.state': { contains: locationSearch } }
      ]
    }
    
    // Filter by user's state for nearby guides
    if (userState && !location && !locationSearch) {
      where.or = [
        { 'primaryLocation.address.state': { equals: userState } },
        { 'locations.location.address.state': { equals: userState } }
      ]
    }
    
    // Filter by price type
    if (priceType && priceType !== 'all') {
      where['pricing.type'] = { equals: priceType }
    }
    
    // Filter by difficulty
    if (difficulty && difficulty !== 'all') {
      where.difficulty = { equals: difficulty }
    }
    
    // Filter by creator
    if (creator) {
      where.creator = { equals: creator }
    }
    
    // Search functionality (general search)
    if (search && !locationSearch) {
      where.or = [
        { title: { contains: search } },
        { description: { contains: search } },
        { 'tags.tag': { contains: search } },
        // Also search in location names when doing general search
        { 'primaryLocation.name': { contains: search } },
        { 'primaryLocation.address.city': { contains: search } },
        { 'primaryLocation.address.state': { contains: search } }
      ]
    }
    
    // Filter by featured guides
    if (featured) {
      where['stats.rating'] = { greater_than: 4 }
      where['stats.reviewCount'] = { greater_than: 2 }
    }
    
    // Log final where clause for debugging
    console.log('📋 Final where clause:', JSON.stringify(where, null, 2))
    
    // Execute query
    const result = await payload.find({
      collection: 'guides',
      where,
      page,
      limit,
      sort,
      populate: {
        creator: {},
        'creator.profileImage': {},
        primaryLocation: {},
        'locations.location': {},
        featuredImage: {}
      }
    })
    
    console.log(`✅ Found ${result.docs.length} guides`)
    
    return NextResponse.json({
      success: true,
      guides: result.docs,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalDocs: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      }
    })
    
  } catch (error) {
    console.error('Error fetching guides:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guides' },
      { status: 500 }
    )
  }
}

// POST /api/guides - Create a new guide
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Parse request body
    let data
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await request.json()
      } else {
        // Fallback to form data if not JSON
        const formData = await request.formData()
        const formDataObj: any = {}
        for (const [key, value] of formData.entries()) {
          formDataObj[key] = value
        }
        data = formDataObj
      }
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }
    
    console.log('🔍 Creating guide with status:', data.status)
    
    // Create a proper request object with headers for authentication
    const req: any = {
      headers: request.headers,
      user: null
    }
    
    // Try to authenticate the user
    try {
      const authResult = await payload.auth({ headers: request.headers })
      req.user = authResult.user
      console.log('Authenticated user:', authResult.user?.id)
    } catch (authError) {
      console.log('No authenticated user found')
    }
    
    // Transform the data to match the collection schema
    const guideData = {
      title: data.title,
      description: data.description,
      primaryLocation: data.primaryLocation,
      locations: data.locations || [],
      difficulty: data.difficulty,
      duration: data.duration,
      pricing: data.pricing,
      // Convert plain text content to Lexical rich text format
      content: data.content ? {
        root: {
          type: 'root',
          format: '',
          indent: 0,
          version: 1,
          children: data.content.split('\n\n').map((paragraph: string) => ({
            type: 'paragraph',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'text',
                format: 0,
                style: '',
                mode: 'normal',
                text: paragraph.trim(),
                version: 1
              }
            ]
          })).filter((p: any) => p.children[0].text.length > 0)
        }
      } : {
        root: {
          type: 'root',
          format: '',
          indent: 0,
          version: 1,
          children: []
        }
      },
      highlights: data.highlights || [],
      insiderTips: data.insiderTips || [],
      tags: data.tags || [],
      language: data.language || 'en',
      featuredImage: data.featuredImage || undefined,
      itinerary: data.itinerary || [],
      meta: data.meta || {
        title: '',
        description: '',
        keywords: ''
      },
      status: data.status || 'draft'
    }
    
    // Create the guide with proper request context
    const guide = await payload.create({
      collection: 'guides',
      data: guideData,
      req
    })
    
    console.log('✅ Created guide:', guide.id, 'Status:', guide.status)
    
    return NextResponse.json({
      success: true,
      guide
    })
    
  } catch (error) {
    console.error('Error creating guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create guide', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/guides - Delete guides (used by Payload admin)
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Get the where clause from query parameters (Payload admin sends this)
    const whereParam = searchParams.get('where')
    let where = {}
    
    if (whereParam) {
      try {
        where = JSON.parse(decodeURIComponent(whereParam))
      } catch (parseError) {
        console.error('Error parsing where clause:', parseError)
        return NextResponse.json(
          { success: false, error: 'Invalid where clause' },
          { status: 400 }
        )
      }
    }
    
    // Authenticate the user
    let user
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
    } catch (authError) {
      console.log('No authenticated user found for guide deletion')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user has permission to delete guides
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    console.log('🗑️ Deleting guides with where clause:', where)
    
    // Find guides to delete
    const guidesToDelete = await payload.find({
      collection: 'guides',
      where,
      limit: 1000 // Set a reasonable limit
    })
    
    if (guidesToDelete.docs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No guides found to delete' },
        { status: 404 }
      )
    }
    
    // Delete each guide
    const deletedGuides = []
    for (const guide of guidesToDelete.docs) {
      try {
        await payload.delete({
          collection: 'guides',
          id: guide.id,
          req: { user }
        })
        deletedGuides.push(guide.id)
        console.log(`✅ Deleted guide: ${guide.id}`)
      } catch (deleteError) {
        console.error(`❌ Error deleting guide ${guide.id}:`, deleteError)
      }
    }
    
    console.log(`🗑️ Successfully deleted ${deletedGuides.length} guides`)
    
    return NextResponse.json({
      success: true,
      deletedCount: deletedGuides.length,
      deletedIds: deletedGuides
    })
    
  } catch (error) {
    console.error('Error deleting guides:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete guides' },
      { status: 500 }
    )
  }
} 