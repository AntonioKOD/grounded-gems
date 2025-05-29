import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
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
      limit: 100,
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      docs: result.docs,
      totalDocs: result.totalDocs,
      limit: result.limit,
      page: result.page,
      totalPages: result.totalPages,
    })

  } catch (error: any) {
    console.error('Categories API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
} 