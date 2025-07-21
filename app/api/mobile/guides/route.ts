import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// POST /api/mobile/guides - Create a new guide (mobile)
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { title, description, content, categories, price, isPublic } = body

    // Basic validation
    if (!title || !description || !content) {
      return NextResponse.json({
        success: false,
        error: 'Title, description, and content are required.'
      }, { status: 400 })
    }

    // TODO: Add authentication and user association
    // const { user } = await payload.auth({ headers: request.headers })
    // if (!user) { ... }

    // Create the guide (replace with your actual collection/fields)
    const guide = await payload.create({
      collection: 'guides',
      data: {
        title,
        description,
        content,
        categories: categories || [],
        price: price || 0,
        isPublic: isPublic !== false,
        // author: user.id, // Uncomment when auth is added
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Guide created successfully',
      data: {
        id: guide.id,
        title: guide.title,
        description: guide.description,
        categories: guide.categories,
        price: guide.price,
        isPublic: guide.isPublic,
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating guide (mobile):', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create guide',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/mobile/guides - List guides (mobile)
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = { isPublic: { equals: true } }
    if (category) {
      where.categories = { in: [category] }
    }
    if (search) {
      where.title = { like: search }
    }

    // Fetch guides
    const result = await payload.find({
      collection: 'guides',
      where,
      page,
      limit,
      sort: '-createdAt',
      depth: 1,
      populate: {
        featuredImage: { select: { url: true, alt: true } },
        creator: { select: { id: true, name: true, profileImage: true } }
      }
    })

    // Format guides for mobile
    const guides = result.docs.map((guide: any) => ({
      id: guide.id,
      title: guide.title,
      description: guide.description,
      categories: guide.categories,
      price: guide.price,
      isPublic: guide.isPublic,
      featuredImage: guide.featuredImage ? {
        url: guide.featuredImage.url,
        alt: guide.featuredImage.alt || ''
      } : null,
      creator: guide.creator ? {
        id: guide.creator.id,
        name: guide.creator.name,
        profileImage: guide.creator.profileImage?.url || null
      } : null,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: {
        guides,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.totalDocs,
          totalPages: result.totalPages,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPrevPage
        }
      }
    })
  } catch (error) {
    console.error('Error listing guides (mobile):', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch guides',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 