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