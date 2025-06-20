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
    const location = searchParams.get('location')
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
    
    // Filter by category
    if (category && category !== 'all') {
      where.category = { equals: category }
    }
    
    // Filter by location
    if (location) {
      where.location = { equals: location }
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
    
    // Search functionality
    if (search) {
      where.or = [
        { title: { contains: search } },
        { description: { contains: search } },
        { 'tags.tag': { contains: search } }
      ]
    }
    
    // Featured guides
    if (featured) {
      where['stats.rating'] = { greater_than: 4 }
      where['stats.reviewCount'] = { greater_than: 2 }
    }
    
    // Execute query
    const result = await payload.find({
      collection: 'guides',
      where,
      page,
      limit,
      sort,
      populate: [
        'creator',
        'location',
        'featuredImage'
      ]
    })
    
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
    const data = await request.json()
    
    // Create the guide
    const guide = await payload.create({
      collection: 'guides',
      data: {
        ...data,
        status: 'draft' // All new guides start as drafts
      }
    })
    
    return NextResponse.json({
      success: true,
      guide
    })
    
  } catch (error) {
    console.error('Error creating guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create guide' },
      { status: 500 }
    )
  }
} 