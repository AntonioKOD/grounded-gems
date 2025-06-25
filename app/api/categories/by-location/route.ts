import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching categories for location:', locationId)
    
    // First, get the location to see its categories
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      depth: 2,
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Get categories associated with this location
    const locationCategories = location.categories || []
    const locationCategoryIds = locationCategories.map((cat: any) => cat.id)

    // Fetch all active categories, prioritizing those used by this location
    const result = await payload.find({
      collection: 'categories',
      where: {
        and: [
          { isActive: { equals: true } },
          { type: { in: ['location', 'general'] } }, // Only location and general categories for guides
          { showInFilter: { equals: true } },
        ]
      },
      depth: 1,
      sort: 'order',
      limit: 100,
    })

    // Format and prioritize categories
    const formattedCategories = result.docs.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      type: category.type,
      icon: category.icon?.url || null,
      color: category.color || null,
      isUsedByLocation: locationCategoryIds.includes(category.id),
      order: category.order || 999,
    }))

    // Sort with location-associated categories first
    const sortedCategories = formattedCategories.sort((a, b) => {
      if (a.isUsedByLocation && !b.isUsedByLocation) return -1
      if (!a.isUsedByLocation && b.isUsedByLocation) return 1
      return a.order - b.order
    })

    console.log(`📊 Found ${sortedCategories.length} categories for location ${location.name}`)
    console.log(`🎯 ${sortedCategories.filter(c => c.isUsedByLocation).length} categories are used by this location`)

    return NextResponse.json({
      success: true,
      categories: sortedCategories,
      location: {
        id: location.id,
        name: location.name,
        categories: locationCategories,
      },
    })

  } catch (error: any) {
    console.error('❌ Categories by location API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch categories for location', details: error.message },
      { status: 500 }
    )
  }
} 