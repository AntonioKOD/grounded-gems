import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const libraryQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  sortBy: z.enum(['purchaseDate', 'lastAccessed', 'downloadCount', 'title', 'price', 'rating']).default('purchaseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  search: z.string().optional(),
  includeStats: z.string().transform(val => val === 'true').default('true'),
})

interface MobileLibraryResponse {
  success: boolean
  message: string
  data?: {
    library: Array<{
      id: string
      purchaseId: string
      title: string
      slug: string
      description: string
      excerpt?: string
      creator: {
        id: string
        name: string
        username: string
        profileImage?: {
          url: string
        } | null
        isVerified?: boolean
      }
      primaryLocation?: {
        id: string
        name: string
        address?: string
        coordinates?: {
          latitude: number
          longitude: number
        }
      }
      category?: string
      difficulty: string
      duration?: {
        value: number
        unit: string
      }
      pricing: {
        type: 'free' | 'paid' | 'pwyw'
        price?: number
        currency?: string
      }
      featuredImage?: {
        url: string
        alt?: string
        width?: number
        height?: number
      }
      stats: {
        views: number
        purchases: number
        rating?: number
        reviewCount: number
        downloadCount: number
      }
      tags?: string[]
      purchase: {
        purchaseDate: string
        amount: number
        paymentMethod: string
        downloadCount: number
        lastAccessedAt?: string
        hasReviewed: boolean
        purchaseRating?: number
        accessCount: number
      }
      createdAt: string
      updatedAt: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
      nextCursor?: string
    }
    meta: {
      totalPurchases: number
      totalValue: number
      averageRating?: number
      mostAccessedGuide?: {
        id: string
        title: string
        accessCount: number
      }
      recentPurchases: number
      categories: Array<{
        name: string
        count: number
      }>
    }
  }
  error?: string
  code?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileLibraryResponse>> {
  try {
    console.log('📚 Mobile library endpoint called')
    
    const payload = await getPayload({ config })
    console.log('✅ Payload instance created')
    
    const { searchParams } = new URL(request.url)
    console.log('📊 Raw search params:', Object.fromEntries(searchParams))
    
    // Validate query parameters
    const queryValidation = libraryQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      console.error('❌ Validation failed:', queryValidation.error.errors)
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          error: queryValidation.error.errors[0]?.message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { page, limit, sortBy, sortOrder, category, difficulty, search, includeStats } = queryValidation.data
    console.log('📊 Validated library params:', { page, limit, sortBy, sortOrder, category, difficulty, search, includeStats })

    // Get current user (required for library access)
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('👤 Current user:', currentUser?.name || 'None')
      }
    } catch (authError) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'Valid authentication token required to access library',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      )
    }

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'Valid authentication token required to access library',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      )
    }

    // Build where clause for purchases
    let whereClause: any = {
      and: [
        { user: { equals: currentUser.id } },
        { status: { equals: 'completed' } }
      ]
    }

    // Apply filters
    if (category && category !== 'all') {
      console.log('🏷️ Filtering by category:', category)
      whereClause.and.push({ 'guide.categories': { in: [category] } })
    }

    if (difficulty && difficulty !== 'all') {
      console.log('📊 Filtering by difficulty:', difficulty)
      whereClause.and.push({ 'guide.difficulty': { equals: difficulty } })
    }

    if (search && search.trim()) {
      console.log('🔍 Filtering by search:', search)
      whereClause.and.push({
        or: [
          { 'guide.title': { contains: search } },
          { 'guide.description': { contains: search } },
          { 'guide.tags.tag': { contains: search } }
        ]
      })
    }

    console.log('🔧 Where clause:', JSON.stringify(whereClause))

    // Determine sort order
    let sort: string = '-purchaseDate' // Default: newest purchases first
    
    switch (sortBy) {
      case 'purchaseDate':
        sort = sortOrder === 'asc' ? 'purchaseDate' : '-purchaseDate'
        break
      case 'lastAccessed':
        sort = sortOrder === 'asc' ? 'lastAccessedAt' : '-lastAccessedAt'
        break
      case 'downloadCount':
        sort = sortOrder === 'asc' ? 'downloadCount' : '-downloadCount'
        break
      case 'title':
        sort = sortOrder === 'asc' ? 'guide.title' : '-guide.title'
        break
      case 'price':
        sort = sortOrder === 'asc' ? 'amount' : '-amount'
        break
      case 'rating':
        sort = sortOrder === 'asc' ? 'guide.stats.rating' : '-guide.stats.rating'
        break
      default:
        sort = '-purchaseDate'
    }

    // Ensure sort is always a string (safety check)
    if (typeof sort !== 'string') {
      console.warn('⚠️ Sort parameter is not a string, converting:', sort)
      sort = '-purchaseDate'
    }

    // Add secondary sort for consistency
    const compoundSort = `${sort},-id`

    console.log('📡 Starting database query with sort:', compoundSort)
    
    // Fetch user's completed purchases with guide details
    const purchases = await payload.find({
      collection: 'guide-purchases',
      where: whereClause,
      populate: {
        guide: {
          populate: {
            creator: {
              populate: {
                profileImage: {}
              }
            },
            primaryLocation: {},
            featuredImage: {},
            categories: {},
            tags: {},
            stats: {}
          }
        }
      },
      sort: compoundSort,
      page,
      limit
    })

    console.log(`📚 Found ${purchases.docs.length} purchases for user ${currentUser.id}`)

    // Transform the data for mobile response
    const libraryItems = purchases.docs.map(purchase => {
      const guide = purchase.guide as any
      
      // Helper function to process image URLs
      const processImageUrl = (image: any): string | null => {
        if (!image) return null
        
        if (typeof image === 'string' && image.trim() !== '') {
          return image.trim()
        }
        
        if (typeof image === 'object' && image !== null) {
          if (image.url) return image.url
          if (image.filename) return `/api/media/file/${image.filename}`
          if (image.sizes?.card?.url) return image.sizes.card.url
          if (image.sizes?.thumbnail?.url) return image.sizes.thumbnail.url
        }
        
        return null
      }

      // Helper function to process location data
      const processLocation = (location: any) => {
        if (!location) return null
        
        return {
          id: location.id,
          name: location.name,
          address: typeof location.address === 'string' 
            ? location.address 
            : location.address 
              ? [location.address.street, location.address.city, location.address.state]
                  .filter(Boolean)
                  .join(', ')
              : undefined,
          coordinates: location.coordinates ? {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude
          } : undefined
        }
      }

      // Helper function to process creator data
      const processCreator = (creator: any) => {
        if (!creator) return null
        
        return {
          id: creator.id,
          name: creator.name || 'Unknown Creator',
          username: creator.username,
          profileImage: creator.profileImage ? {
            url: processImageUrl(creator.profileImage)
          } : null,
          isVerified: creator.isVerified || false
        }
      }

      // Process tags
      const tags = Array.isArray(guide.tags) 
        ? guide.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.tag).filter(Boolean)
        : []

      // Process categories
      const categories = Array.isArray(guide.categories)
        ? guide.categories.map((cat: any) => typeof cat === 'string' ? cat : cat.name || cat.slug).filter(Boolean)
        : []

      const formattedItem = {
        id: guide.id,
        purchaseId: String(purchase.id),
        title: guide.title || 'Untitled Guide',
        slug: guide.slug,
        description: guide.description || '',
        excerpt: guide.description ? guide.description.substring(0, 150) + (guide.description.length > 150 ? '...' : '') : undefined,
        creator: (() => {
            const c = guide.creator
            if (!c) return {
              id: '',
              name: '',
              username: '',
              profileImage: null,
              isVerified: false
            }
            return {
              id: c.id || '',
              name: c.name || '',
              username: c.username || '',
              profileImage: c.profileImage ? { url: processImageUrl(c.profileImage) || '' } : null,
              isVerified: c.isVerified || false
            }
          })(),
        primaryLocation: (() => {
            const loc = processLocation(guide.primaryLocation)
            return loc && loc.id ? loc : undefined
          })(),
        category: categories[0], // Primary category
        difficulty: guide.difficulty || 'beginner',
        duration: guide.duration ? {
          value: guide.duration.value || 0,
          unit: guide.duration.unit || 'hours'
        } : undefined,
        pricing: {
          type: guide.pricing?.type || 'paid',
          price: guide.pricing?.price,
          currency: guide.pricing?.currency || 'USD'
        },
        featuredImage: (() => {
            if (!guide.featuredImage) return undefined
            const url = processImageUrl(guide.featuredImage)
            if (!url) return undefined
            return {
              url,
              alt: typeof guide.featuredImage === 'object' ? guide.featuredImage.alt : undefined,
              width: typeof guide.featuredImage === 'object' ? guide.featuredImage.width : undefined,
              height: typeof guide.featuredImage === 'object' ? guide.featuredImage.height : undefined
            }
          })(),
        stats: {
          views: guide.stats?.views || 0,
          purchases: guide.stats?.purchases || 0,
          rating: guide.stats?.rating,
          reviewCount: guide.stats?.reviewCount || 0,
          downloadCount: purchase.downloadCount || 0
        },
        tags,
        purchase: {
          id: String(purchase.id),
          purchaseDate: purchase.purchaseDate,
          amount: purchase.amount,
          paymentMethod: purchase.paymentMethod,
          downloadCount: purchase.downloadCount || 0,
          lastAccessedAt: purchase.lastAccessedAt,
          hasReviewed: purchase.hasReviewed || false,
          purchaseRating: purchase.purchaseRating,
          accessCount: purchase.downloadCount || 0
        },
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt
      }

      console.log(`📚 Formatted library item ${guide.id}:`, {
        id: formattedItem.id,
        title: formattedItem.title,
        creator: formattedItem.creator?.name,
        purchaseDate: formattedItem.purchase.purchaseDate,
        downloadCount: formattedItem.purchase.downloadCount
      })

      return formattedItem
    })

    // Calculate meta statistics if requested
    let meta = {
      totalPurchases: purchases.totalDocs,
      totalValue: 0,
      averageRating: 0,
      mostAccessedGuide: undefined as | { id: string; title: string; accessCount: number } | undefined,
      recentPurchases: 0,
      categories: [] as Array<{ name: string; count: number }>
    }

    if (includeStats) {
      // Calculate total value
      meta.totalValue = libraryItems.reduce((sum, item) => sum + (item.purchase.amount || 0), 0)

      // Calculate average rating
      const ratedItems = libraryItems.filter(item => item.stats.rating)
      if (ratedItems.length > 0) {
        meta.averageRating = ratedItems.reduce((sum, item) => sum + (item.stats.rating || 0), 0) / ratedItems.length
      }

      // Find most accessed guide
      let mostAccessed: typeof libraryItems[0] | undefined = libraryItems.length > 0 ? libraryItems[0] : undefined
      if (libraryItems.length > 1) {
        mostAccessed = libraryItems.reduce((max, item) =>
          (item.purchase.downloadCount || 0) > (max!.purchase.downloadCount || 0) ? item : max!,
          libraryItems[0]
        )
      }
      if (mostAccessed) {
        meta.mostAccessedGuide = {
          id: mostAccessed.id,
          title: mostAccessed.title,
          accessCount: mostAccessed.purchase.downloadCount
        }
      }

      // Count recent purchases (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      meta.recentPurchases = libraryItems.filter(item => 
        new Date(item.purchase.purchaseDate) > thirtyDaysAgo
      ).length

      // Count categories
      const categoryCounts: Record<string, number> = {}
      libraryItems.forEach(item => {
        if (item.category) {
          categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
        }
      })
      meta.categories = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }))
    }

    // Build response
    const response: MobileLibraryResponse = {
      success: true,
      message: 'Library retrieved successfully',
      data: {
        library: libraryItems,
        pagination: {
          page,
          limit,
          total: purchases.totalDocs,
          totalPages: purchases.totalPages,
          hasNext: purchases.hasNextPage,
          hasPrev: purchases.hasPrevPage,
          nextCursor: libraryItems.length > 0 ? libraryItems[libraryItems.length - 1]?.purchase.purchaseDate : undefined
        },
        meta
      }
    }

    console.log(`✅ Returning ${libraryItems.length} library items successfully`)
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Authorization'
      }
    })

  } catch (error: unknown) {
    console.error('❌ Mobile library error:', error)
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack)
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? `Library service unavailable: ${error.message}` : 'Library service unavailable',
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