import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔄 Fetching categories from API...')
    
    // Fetch categories from Payload CMS, similar to the getCategories action
    const result = await payload.find({
      collection: "categories",
      depth: 1,
      where: {
        isActive: {
          equals: true,
        },
      },
      sort: "order",
      limit: 1000, // Increased limit to ensure we get all categories
      overrideAccess: true,
    })

    console.log(`📊 Categories API: Found ${result.docs.length} active categories`)
    console.log(`📋 Total in database: ${result.totalDocs}`)
    
    // Log category sources for debugging
    const bySources = result.docs.reduce((acc: any, cat: any) => {
      const source = cat.source || 'manual'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})
    console.log('📈 Categories by source:', bySources)

    return NextResponse.json({
      success: true,
      docs: result.docs,
      totalDocs: result.totalDocs,
      limit: result.limit,
      page: result.page,
      totalPages: result.totalPages,
    })

  } catch (error: any) {
    console.error('❌ Categories API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const data = await request.json()
    
    console.log('🔄 Creating category via API:', data.name)
    
    // Validate required fields
    if (!data.name || !data.slug || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, type' },
        { status: 400 }
      )
    }

    // Check if category already exists
    const existingCategory = await payload.find({
      collection: 'categories',
      where: {
        slug: {
          equals: data.slug
        }
      }
    })

    if (existingCategory.docs.length > 0) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 409 }
      )
    }

    // Create new category
    const result = await payload.create({
      collection: 'categories',
      data: {
        ...data,
        source: data.source || 'manual',
        isActive: data.isActive !== undefined ? data.isActive : true,
        showInFilter: data.showInFilter !== undefined ? data.showInFilter : true,
      },
      overrideAccess: true,
    })

    console.log(`✅ Created category: ${data.name} (ID: ${result.id})`)

    return NextResponse.json({
      success: true,
      doc: result,
    })

  } catch (error: any) {
    console.error('❌ Create category API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to create category', details: error.message },
      { status: 500 }
    )
  }
} 