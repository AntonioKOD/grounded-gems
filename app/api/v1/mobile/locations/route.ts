import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const locationsQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  search: z.string().optional(),
  category: z.string().optional(),
  latitude: z.string().transform(Number).pipe(z.number().min(-90).max(90)).optional(),
  longitude: z.string().transform(Number).pipe(z.number().min(-180).max(180)).optional(),
  radius: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('25'),
  priceRange: z.enum(['free', 'budget', 'moderate', 'expensive', 'luxury']).optional(),
  rating: z.string().transform(Number).pipe(z.number().min(1).max(5)).optional(),
  sortBy: z.enum(['distance', 'rating', 'popularity', 'name', 'createdAt']).default('distance'),
  isOpen: z.string().transform((val) => val === 'true').optional(),
})

interface MobileLocationsResponse {
  success: boolean
  message: string
  data?: {
    locations: Array<{
      id: string
      name: string
      slug: string
      description?: string
      shortDescription?: string
      featuredImage?: {
        url: string
        alt?: string
      } | null
      gallery?: Array<{
        url: string
        caption?: string
      }>
      coordinates: {
        latitude: number
        longitude: number
      }
      address: {
        street?: string
        city?: string
        state?: string
        zip?: string
        country?: string
        formatted?: string
      }
      categories: Array<{
        id: string
        name: string
        color?: string
      }>
      rating: {
        average: number
        count: number
      }
      priceRange?: string
      businessHours?: Array<{
        day: string
        open?: string
        close?: string
        closed?: boolean
      }>
      contactInfo?: {
        phone?: string
        website?: string
      }
      distance?: number // in km if user location provided
      isOpen?: boolean
      isSaved?: boolean
      isVerified: boolean
      isFeatured: boolean
      createdAt: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    meta: {
      appliedFilters: {
        search?: string
        category?: string
        coordinates?: {
          latitude: number
          longitude: number
          radius: number
        }
        priceRange?: string
        rating?: number
        sortBy: string
        isOpen?: boolean
      }
      searchRadius?: number
    }
  }
  error?: string
  code?: string
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Check if location is currently open
function isLocationOpen(businessHours: any[]): boolean {
  if (!businessHours || !Array.isArray(businessHours)) return false
  
  const now = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDay = dayNames[now.getDay()]
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
  
  const todayHours = businessHours.find(h => h.day === currentDay)
  if (!todayHours || todayHours.closed) return false
  
  if (!todayHours.open || !todayHours.close) return false
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileLocationsResponse>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = locationsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          error: queryValidation.error.errors[0].message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { 
      page, 
      limit, 
      search, 
      category, 
      latitude, 
      longitude, 
      radius, 
      priceRange, 
      rating, 
      sortBy, 
      isOpen 
    } = queryValidation.data

    // Get current user (optional)
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
      console.log('No authenticated user for locations request')
    }

    // Build base query
    let whereClause: any = {
      status: { equals: 'published' }
    }

    // Apply text search
    if (search) {
      whereClause.or = [
        { name: { contains: search } },
        { description: { contains: search } },
        { shortDescription: { contains: search } }
      ]
    }

    // Apply category filter
    if (category) {
      whereClause.categories = { contains: category }
    }

    // Apply price range filter
    if (priceRange) {
      whereClause.priceRange = { equals: priceRange }
    }

    // Apply rating filter
    if (rating) {
      whereClause.averageRating = { greater_than_equal: rating }
    }

    // Determine sort order
    let sort: string = '-createdAt' // Default sort by newest first
    switch (sortBy) {
      case 'rating':
        sort = '-averageRating' // Descending order
        break
      case 'popularity':
        sort = '-reviewCount' // Descending order
        break
      case 'name':
        sort = 'name' // Ascending order
        break
      case 'createdAt':
        sort = '-createdAt' // Descending order
        break
      case 'distance':
      default:
        // Distance sorting will be done post-query if coordinates provided
        sort = '-createdAt' // Descending order
        break
    }

    // Fetch locations
    const locationsResult = await payload.find({
      collection: 'locations',
      where: whereClause,
      sort,
      page,
      limit: latitude && longitude ? 1000 : limit, // Get more for distance filtering
      depth: 2,
    })

    let processedLocations = locationsResult.docs

    // Apply distance filtering and sorting if coordinates provided
    if (latitude && longitude) {
      // Calculate distances and filter by radius
      processedLocations = processedLocations
        .map((location: any) => {
          const locLat = location.coordinates?.latitude || location.latitude
          const locLng = location.coordinates?.longitude || location.longitude
          
          if (!locLat || !locLng) return null
          
          const distance = calculateDistance(latitude, longitude, locLat, locLng)
          
          return {
            ...location,
            distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
          }
        })
        .filter((location: any) => location && location.distance <= radius)
        .sort((a: any, b: any) => {
          if (sortBy === 'distance') {
            return a.distance - b.distance
          }
          return 0 // Keep original sort for other types
        })

      // Apply pagination after distance filtering
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      processedLocations = processedLocations.slice(startIndex, endIndex)
    }

    // Apply open/closed filter if requested
    if (isOpen !== undefined) {
      processedLocations = processedLocations.filter((location: any) => {
        const locationIsOpen = isLocationOpen(location.businessHours)
        return isOpen ? locationIsOpen : !locationIsOpen
      })
    }

    // Get user's saved locations if authenticated
    let userSavedLocations: string[] = []
    if (currentUser) {
      try {
        const userData = await payload.findByID({
          collection: 'users',
          id: currentUser.id,
        })
        userSavedLocations = Array.isArray(userData.savedLocations) ? userData.savedLocations : []
      } catch (error) {
        console.warn('Failed to fetch user saved locations:', error)
      }
    }

    // Format locations for mobile consumption
    const formattedLocations = processedLocations.map((location: any) => {
      // Format address
      const address = typeof location.address === 'string' 
        ? { formatted: location.address }
        : {
            street: location.address?.street,
            city: location.address?.city,
            state: location.address?.state,
            zip: location.address?.zip,
            country: location.address?.country,
            formatted: location.address ? 
              `${location.address.street || ''} ${location.address.city || ''} ${location.address.state || ''} ${location.address.zip || ''}`.trim()
              : undefined
          }

      // Format categories
      const categories = Array.isArray(location.categories)
        ? location.categories.map((cat: any) => ({
            id: typeof cat === 'string' ? cat : cat.id,
            name: typeof cat === 'string' ? cat : cat.name,
            color: typeof cat === 'object' ? cat.color : undefined
          }))
        : []

      // Format featured image
      const featuredImage = location.featuredImage ? {
        url: typeof location.featuredImage === 'object' && location.featuredImage.url
          ? location.featuredImage.url
          : typeof location.featuredImage === 'string'
          ? location.featuredImage
          : '', // Fallback
        alt: typeof location.featuredImage === 'object' 
          ? location.featuredImage.alt 
          : undefined
      } : null

      // Format gallery
      const gallery = Array.isArray(location.gallery) 
        ? location.gallery.map((item: any) => ({
            url: typeof item.image === 'object' && item.image.url
              ? item.image.url
              : typeof item.image === 'string'
              ? item.image
              : '', // Fallback
            caption: item.caption
          }))
        : []

      return {
        id: location.id,
        name: location.name,
        slug: location.slug,
        description: location.description,
        shortDescription: location.shortDescription,
        featuredImage,
        gallery,
        coordinates: {
          latitude: location.coordinates?.latitude || location.latitude,
          longitude: location.coordinates?.longitude || location.longitude
        },
        address,
        categories,
        rating: {
          average: location.averageRating || 0,
          count: location.reviewCount || 0
        },
        priceRange: location.priceRange,
        businessHours: location.businessHours || [],
        contactInfo: {
          phone: location.contactInfo?.phone,
          website: location.contactInfo?.website
        },
        distance: location.distance,
        isOpen: isLocationOpen(location.businessHours),
        isSaved: userSavedLocations.includes(location.id),
        isVerified: location.isVerified || false,
        isFeatured: location.isFeatured || false,
        createdAt: location.createdAt
      }
    })

    // Calculate pagination (adjust for distance filtering)
    const totalAfterFiltering = latitude && longitude 
      ? processedLocations.length 
      : locationsResult.totalDocs
    const totalPages = Math.ceil(totalAfterFiltering / limit)

    const response: MobileLocationsResponse = {
      success: true,
      message: 'Locations retrieved successfully',
      data: {
        locations: formattedLocations,
        pagination: {
          page,
          limit,
          total: totalAfterFiltering,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        meta: {
          appliedFilters: {
            search,
            category,
            coordinates: latitude && longitude ? {
              latitude,
              longitude,
              radius
            } : undefined,
            priceRange,
            rating,
            sortBy,
            isOpen
          },
          searchRadius: latitude && longitude ? radius : undefined
        }
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': currentUser 
          ? 'private, max-age=300' // 5 minutes for authenticated users
          : 'public, max-age=600', // 10 minutes for public
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Authorization'
      }
    })

  } catch (error) {
    console.error('Mobile locations error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Locations service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 