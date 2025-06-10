import { NextRequest, NextResponse } from 'next/server'
import { getFoursquareAPI, FOURSQUARE_CATEGORIES } from '@/lib/foursquare'

export const dynamic = 'force-dynamic'

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
    
    const query = searchParams.get('query')
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')
    const near = searchParams.get('near')
    const category = searchParams.get('category')
    const radius = searchParams.get('radius')
    const limit = searchParams.get('limit')
    const sort = searchParams.get('sort')

    // Validate required parameters
    if (!query && !latitude && !longitude && !near && !category) {
      return NextResponse.json(
        { error: 'At least one search parameter is required: query, coordinates, near, or category' },
        { status: 400 }
      )
    }

    // Build search parameters
    const searchParams_foursquare: any = {}
    
    if (query) searchParams_foursquare.query = query
    
    // Location parameters - use only ONE approach per Foursquare API requirements
    // Priority: 1. lat/lng with radius, 2. near (text location - no radius allowed)
    if (latitude && longitude) {
      searchParams_foursquare.ll = `${latitude},${longitude}`
      // Only add radius when using lat/lng coordinates
      if (radius) searchParams_foursquare.radius = parseInt(radius)
    } else if (near) {
      // Use text-based location - radius not allowed with 'near'
      searchParams_foursquare.near = near
      // Note: radius is not compatible with 'near' parameter
    }
    
    if (category) {
      // Map category name to Foursquare category ID if needed
      const categoryId = (FOURSQUARE_CATEGORIES as any)[category.toUpperCase()] || category
      searchParams_foursquare.categories = categoryId
    }
    if (limit) searchParams_foursquare.limit = parseInt(limit)
    if (sort) searchParams_foursquare.sort = sort.toUpperCase()

    // Search Foursquare places
    const results = await foursquareAPI.searchPlaces(searchParams_foursquare)
    
    // Map results to Sacavia format for preview
    const mappedResults = results.results.map(place => ({
      foursquareId: place.fsq_id,
      preview: foursquareAPI.mapToSacaviaLocation(place),
      original: place,
      // Add commonly used fields to top level for easier access
      categories: place.categories?.map(cat => cat.name) || [],
      rating: place.rating,
      verified: place.verified || false
    }))

    return NextResponse.json({
      success: true,
      count: mappedResults.length,
      results: mappedResults,
      context: results.context
    })

  } catch (error: any) {
    console.error('Foursquare search error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to search Foursquare places',
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
          error: 'Foursquare API not configured. Please add FOURSQUARE_API_KEY to environment variables.',
          details: 'The Foursquare integration requires an API key to function.' 
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'import':
        return await importPlaces(data, foursquareAPI)
      case 'sync':
        return await syncPlace(data, foursquareAPI)
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Foursquare POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

async function importPlaces(data: any, foursquareAPI: any) {
  const { foursquareIds, createdBy } = data
  
  if (!foursquareIds || !Array.isArray(foursquareIds)) {
    return NextResponse.json(
      { error: 'foursquareIds array is required' },
      { status: 400 }
    )
  }

  const results = []
  const errors = []

  for (const fsqId of foursquareIds) {
    try {
      // Get detailed place info from Foursquare
      const place = await foursquareAPI.getPlaceDetails(fsqId)
      
      // Map to Sacavia format
      const locationData = foursquareAPI.mapToSacaviaLocation(place)
      
      // Resolve categories to actual category IDs if available
      let categoryIds = []
      if (locationData.categories && locationData.categories.length > 0) {
        try {
          // Try to fetch existing categories and match by name
          const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/categories`)
          if (categoriesResponse.ok) {
            const existingCategories = await categoriesResponse.json()
            
            categoryIds = locationData.categories
              .map((catName: string) => {
                const matchingCat = existingCategories.docs?.find(
                  (cat: any) => cat.name.toLowerCase() === catName.toLowerCase()
                )
                return matchingCat?.id
              })
              .filter(Boolean) // Remove undefined values
              .filter((id: string) => id && typeof id === 'string' && id.length === 24) // Ensure valid ObjectId format
          }
        } catch (error) {
          console.warn('Could not resolve categories:', error)
          // Continue without category IDs - they can be assigned manually
        }
      }
      
      // Add creator and import metadata - start with minimal required fields only
      const finalData = {
        name: locationData.name,
        slug: locationData.slug,
        description: locationData.description,
        status: 'review', // Import as review status by default for approval
        foursquareId: fsqId, // Store the Foursquare ID for reference
        importedFrom: 'foursquare',
        importedAt: new Date().toISOString(),
        
        // Only add safe, non-relationship fields
        shortDescription: locationData.shortDescription || '',
        priceRange: locationData.priceRange || 'moderate',
        
        // Simple data structures only
        address: locationData.address || {},
        coordinates: locationData.coordinates || {},
        contactInfo: locationData.contactInfo || {},
        
        // Accessibility and meta as simple objects
        accessibility: {
          wheelchairAccess: false,
          parking: false,
          other: 'Not verified'
        },
        meta: {
          title: locationData.meta?.title || `${locationData.name} | Sacavia`,
          description: locationData.meta?.description || '',
          keywords: locationData.meta?.keywords || ''
        },
        
        // Skip relationship fields for now
        // ...(categoryIds.length > 0 ? { categories: categoryIds } : {}),
        // ...(createdBy && typeof createdBy === 'string' && createdBy.length === 24 ? { createdBy } : {}),
      }

      // Clean up the data to prevent BSON errors
      const cleanedData = cleanDataForPayload(finalData)

      console.log('Importing place with data:', {
        name: place.name,
        foursquareId: fsqId,
        hasCategories: categoryIds.length > 0,
        categoriesCount: categoryIds.length,
        hasCreatedBy: !!cleanedData.createdBy,
        addressType: typeof cleanedData.address,
        coordinatesType: typeof cleanedData.coordinates,
        hasBusinessHours: !!cleanedData.businessHours,
        businessHoursCount: cleanedData.businessHours?.length || 0
      })

      // Create location in Payload CMS
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      })

      if (response.ok) {
        const created = await response.json()
        console.log(`Successfully imported: ${place.name} (ID: ${created.id})`)
        results.push({
          foursquareId: fsqId,
          locationId: created.id,
          name: place.name,
          status: 'imported'
        })
      } else {
        let errorMessage = 'Unknown error'
        let errorData = null
        
        try {
          errorData = await response.json()
          errorMessage = errorData.errors 
            ? errorData.errors.map((e: any) => e.message || e.field || 'Field error').join(', ')
            : errorData.message || 'Failed to create location'
        } catch (e) {
          // If JSON parsing fails, get text response
          try {
            errorMessage = await response.text()
          } catch (e2) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        }
        
        console.error(`Failed to create location for ${place.name}:`, {
          status: response.status,
          errorData,
          finalData: {
            ...cleanedData,
            // Log just the structure, not all content
            address: typeof cleanedData.address,
            coordinates: cleanedData.coordinates,
            businessHours: cleanedData.businessHours?.length || 0,
            categories: cleanedData.categories,
            createdBy: cleanedData.createdBy
          }
        })
        
        errors.push({
          foursquareId: fsqId,
          name: place.name,
          status: 'error',
          error: errorMessage
        })
      }
    } catch (error: any) {
      console.error(`Error importing place ${fsqId}:`, error)
      errors.push({
        foursquareId: fsqId,
        name: 'Unknown',
        status: 'error',
        error: error.message
      })
    }
  }

  return NextResponse.json({
    success: true,
    imported: results.length,
    errors: errors.length,
    results: [...results, ...errors],
    summary: {
      total: foursquareIds.length,
      successful: results.length,
      failed: errors.length
    }
  })
}

// Function to clean data for Payload CMS to prevent BSON errors
function cleanDataForPayload(data: any): any {
  const cleaned = { ...data }
  
  // Remove any fields that might have invalid ObjectIds
  if (cleaned.gallery && Array.isArray(cleaned.gallery)) {
    cleaned.gallery = cleaned.gallery.map((item: any) => {
      if (typeof item === 'object' && item !== null) {
        // Remove any invalid ObjectId references
        const cleanedItem = { ...item }
        Object.keys(cleanedItem).forEach(key => {
          if (typeof cleanedItem[key] === 'string' && cleanedItem[key].length !== 24 && key.includes('id')) {
            delete cleanedItem[key]
          }
        })
        return cleanedItem
      }
      return item
    })
  }
  
  // Ensure tags array doesn't have invalid ObjectIds
  if (cleaned.tags && Array.isArray(cleaned.tags)) {
    cleaned.tags = cleaned.tags.map((tag: any) => {
      if (typeof tag === 'object' && tag !== null) {
        return { tag: String(tag.tag || '') }
      }
      return { tag: String(tag || '') }
    })
  }
  
  // Ensure bestTimeToVisit array is clean
  if (cleaned.bestTimeToVisit && Array.isArray(cleaned.bestTimeToVisit)) {
    cleaned.bestTimeToVisit = cleaned.bestTimeToVisit.map((time: any) => {
      if (typeof time === 'object' && time !== null) {
        return { season: String(time.season || '') }
      }
      return { season: String(time || '') }
    })
  }
  
  // Clean business hours
  if (cleaned.businessHours && Array.isArray(cleaned.businessHours)) {
    cleaned.businessHours = cleaned.businessHours.map((hour: any) => ({
      day: String(hour.day || ''),
      open: String(hour.open || ''),
      close: String(hour.close || ''),
      closed: Boolean(hour.closed)
    }))
  }
  
  // Ensure coordinates are numbers
  if (cleaned.coordinates) {
    cleaned.coordinates = {
      latitude: Number(cleaned.coordinates.latitude) || 0,
      longitude: Number(cleaned.coordinates.longitude) || 0
    }
  }
  
  // Clean address
  if (cleaned.address && typeof cleaned.address === 'object') {
    cleaned.address = {
      street: String(cleaned.address.street || ''),
      city: String(cleaned.address.city || ''),
      state: String(cleaned.address.state || ''),
      zip: String(cleaned.address.zip || ''),
      country: String(cleaned.address.country || 'USA')
    }
  }
  
  // Clean contact info
  if (cleaned.contactInfo) {
    cleaned.contactInfo = {
      phone: String(cleaned.contactInfo.phone || ''),
      email: String(cleaned.contactInfo.email || ''),
      website: String(cleaned.contactInfo.website || ''),
      socialMedia: {
        facebook: String(cleaned.contactInfo.socialMedia?.facebook || ''),
        twitter: String(cleaned.contactInfo.socialMedia?.twitter || ''),
        instagram: String(cleaned.contactInfo.socialMedia?.instagram || ''),
        linkedin: String(cleaned.contactInfo.socialMedia?.linkedin || '')
      }
    }
  }
  
  // Ensure meta fields are strings
  if (cleaned.meta) {
    cleaned.meta = {
      title: String(cleaned.meta.title || ''),
      description: String(cleaned.meta.description || ''),
      keywords: String(cleaned.meta.keywords || '')
    }
  }
  
  // Clean accessibility
  if (cleaned.accessibility) {
    cleaned.accessibility = {
      wheelchairAccess: Boolean(cleaned.accessibility.wheelchairAccess),
      parking: Boolean(cleaned.accessibility.parking),
      other: String(cleaned.accessibility.other || '')
    }
  }
  
  // Clean partnership details
  if (cleaned.partnershipDetails) {
    cleaned.partnershipDetails = {
      partnerName: String(cleaned.partnershipDetails.partnerName || ''),
      partnerContact: String(cleaned.partnershipDetails.partnerContact || ''),
      details: String(cleaned.partnershipDetails.details || '')
    }
  }
  
  return cleaned
}

async function syncPlace(data: any, foursquareAPI: any) {
  const { foursquareId, locationId } = data
  
  if (!foursquareId) {
    return NextResponse.json(
      { error: 'foursquareId is required' },
      { status: 400 }
    )
  }

  try {
    // Get latest data from Foursquare
    const place = await foursquareAPI.getPlaceDetails(foursquareId)
    const updatedData = foursquareAPI.mapToSacaviaLocation(place)
    
    // Update the location if locationId is provided
    if (locationId) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/locations/${locationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updatedData,
          lastSyncedAt: new Date().toISOString()
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        return NextResponse.json({
          success: true,
          action: 'updated',
          location: updated
        })
      } else {
        throw new Error('Failed to update location')
      }
    }

    // Return the updated data for preview
    return NextResponse.json({
      success: true,
      action: 'preview',
      data: updatedData,
      original: place
    })

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync place data',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 