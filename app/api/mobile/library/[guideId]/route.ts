import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const guideDetailQuerySchema = z.object({
  includeContent: z.string().transform(val => val === 'true').default('false'),
  includeReviews: z.string().transform(val => val === 'true').default('false'),
  includeRelated: z.string().transform(val => val === 'true').default('false'),
  reviewsLimit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('10'),
  relatedLimit: z.string().transform(Number).pipe(z.number().min(1).max(20)).default('5'),
})

interface MobileGuideDetailResponse {
  success: boolean
  message: string
  data?: {
    guide: {
      id: string
      title: string
      slug: string
      description: string
      content?: string
      excerpt?: string
      creator: {
        id: string
        name: string
        username: string
        profileImage?: {
          url: string
        } | null
        isVerified?: boolean
        bio?: string
        followerCount?: number
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
      categories?: string[]
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
      gallery?: Array<{
        url: string
        alt?: string
        width?: number
        height?: number
      }>
      stats: {
        views: number
        purchases: number
        rating?: number
        reviewCount: number
        downloadCount: number
        completionRate?: number
      }
      tags?: string[]
      sections?: Array<{
        id: string
        title: string
        content: string
        order: number
      }>
      requirements?: string[]
      whatYoullLearn?: string[]
      purchase: {
        purchaseId: string
        purchaseDate: string
        amount: number
        paymentMethod: string
        downloadCount: number
        lastAccessedAt?: string
        hasReviewed: boolean
        purchaseRating?: number
        accessCount: number
        progress?: number
        isCompleted?: boolean
        completedAt?: string
      }
      reviews?: Array<{
        id: string
        rating: number
        content: string
        author: {
          id: string
          name: string
          profileImage?: {
            url: string
          } | null
        }
        createdAt: string
        helpfulCount: number
      }>
      relatedGuides?: Array<{
        id: string
        title: string
        slug: string
        description: string
        creator: {
          id: string
          name: string
          profileImage?: {
            url: string
          } | null
        }
        featuredImage?: {
          url: string
        } | null
        pricing: {
          type: 'free' | 'paid' | 'pwyw'
          price?: number
        }
        stats: {
          rating?: number
          reviewCount: number
        }
        isOwned?: boolean
      }>
      createdAt: string
      updatedAt: string
    }
  }
  error?: string
  code?: string
}

interface RouteContext {
  params: Promise<{ guideId: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<MobileGuideDetailResponse>> {
  try {
    console.log('📚 Mobile library guide detail endpoint called')
    
    const payload = await getPayload({ config })
    console.log('✅ Payload instance created')
    
    const { guideId } = await context.params
    const { searchParams } = new URL(request.url)
    console.log('📊 Guide ID:', guideId)
    console.log('📊 Raw search params:', Object.fromEntries(searchParams))
    
    // Validate query parameters
    const queryValidation = guideDetailQuerySchema.safeParse(Object.fromEntries(searchParams))
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

    const { includeContent, includeReviews, includeRelated, reviewsLimit, relatedLimit } = queryValidation.data
    console.log('📊 Validated params:', { includeContent, includeReviews, includeRelated, reviewsLimit, relatedLimit })

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

    // Build populate configuration
    const guidePopulate: any = {
      creator: {
        populate: {
          profileImage: {}
        }
      },
      primaryLocation: {},
      featuredImage: {},
      gallery: {},
      categories: {},
      tags: {},
      stats: {},
      sections: {}
    }

    // Add reviews populate if requested
    if (includeReviews) {
      guidePopulate.reviews = {
        populate: {
          author: {
            populate: {
              profileImage: {}
            }
          }
        },
        limit: reviewsLimit
      }
    }

    // Verify user owns this guide (has a completed purchase)
    const purchase = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { user: { equals: currentUser.id } },
          { guide: { equals: guideId } },
          { status: { equals: 'completed' } }
        ]
      },
      populate: {
        guide: {
          populate: guidePopulate
        }
      },
      limit: 1
    })

    if (purchase.docs.length === 0) {
      console.log('❌ User does not own guide:', { userId: currentUser.id, guideId })
      return NextResponse.json(
        {
          success: false,
          message: 'Guide not found in library',
          error: 'You do not own this guide or the purchase is not completed',
          code: 'GUIDE_NOT_OWNED'
        },
        { status: 404 }
      )
    }

    const purchaseRecord = purchase.docs[0]
    if (!purchaseRecord) {
      console.log('❌ Purchase record not found')
      return NextResponse.json(
        {
          success: false,
          message: 'Guide not found in library',
          error: 'You do not own this guide or the purchase is not completed',
          code: 'GUIDE_NOT_OWNED'
        },
        { status: 404 }
      )
    }
    
    const guide = purchaseRecord.guide as any
    console.log('✅ Guide found in user library:', guide.title)

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
      if (!creator) return {
        id: '',
        name: '',
        username: '',
        profileImage: null,
        isVerified: false,
        bio: '',
        followerCount: 0
      }
      
      return {
        id: creator.id || '',
        name: creator.name || '',
        username: creator.username || '',
        profileImage: creator.profileImage ? {
          url: processImageUrl(creator.profileImage) || ''
        } : null,
        isVerified: creator.isVerified || false,
        bio: creator.bio || '',
        followerCount: creator.followerCount || 0
      }
    }

    // Process categories
    const categories = Array.isArray(guide.categories)
      ? guide.categories.map((cat: any) => typeof cat === 'string' ? cat : cat.name || cat.slug).filter(Boolean)
      : []

    // Process tags
    const tags = Array.isArray(guide.tags) 
      ? guide.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.tag).filter(Boolean)
      : []

    // Process gallery
    const gallery = Array.isArray(guide.gallery)
      ? guide.gallery.map((img: any) => ({
          url: processImageUrl(img),
          alt: typeof img === 'object' ? img.alt : undefined,
          width: typeof img === 'object' ? img.width : undefined,
          height: typeof img === 'object' ? img.height : undefined
        })).filter((img: any) => img.url)
      : []

    // Process sections
    const sections = Array.isArray(guide.sections)
      ? guide.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          content: section.content,
          order: section.order || 0
        })).sort((a: any, b: any) => a.order - b.order)
      : []

    // Process reviews
    let reviews = []
    if (includeReviews && Array.isArray(guide.reviews)) {
      reviews = guide.reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        author: {
          id: review.author?.id,
          name: review.author?.name || 'Anonymous',
          profileImage: review.author?.profileImage ? {
            url: processImageUrl(review.author.profileImage)
          } : null
        },
        createdAt: review.createdAt,
        helpfulCount: review.helpfulCount || 0
      }))
    }

    // Get related guides if requested
    let relatedGuides: any[] = []
    if (includeRelated && categories.length > 0) {
      try {
        const relatedResult = await payload.find({
          collection: 'guides',
          where: {
            and: [
              { id: { not_equals: guideId } },
              { status: { equals: 'published' } },
              { categories: { in: categories.slice(0, 2) } } // Use first 2 categories
            ]
          },
          populate: {
            creator: {
              populate: {
                profileImage: {}
              }
            },
            featuredImage: {},
            stats: {}
          },
          sort: '-createdAt',
          limit: relatedLimit
        })

        // Check which related guides the user owns
        const userPurchases = await payload.find({
          collection: 'guide-purchases',
          where: {
            and: [
              { user: { equals: currentUser.id } },
              { status: { equals: 'completed' } },
              { guide: { in: relatedResult.docs.map((g: any) => g.id) } }
            ]
          },
          limit: 0
        })

        const ownedGuideIds = userPurchases.docs.map((p: any) => p.guide)

        relatedGuides = relatedResult.docs.map((relatedGuide: any) => ({
          id: relatedGuide.id,
          title: relatedGuide.title,
          slug: relatedGuide.slug,
          description: relatedGuide.description,
          creator: processCreator(relatedGuide.creator),
          featuredImage: relatedGuide.featuredImage ? {
            url: processImageUrl(relatedGuide.featuredImage)
          } : null,
          pricing: {
            type: relatedGuide.pricing?.type || 'paid',
            price: relatedGuide.pricing?.price
          },
          stats: {
            rating: relatedGuide.stats?.rating,
            reviewCount: relatedGuide.stats?.reviewCount || 0
          },
          isOwned: ownedGuideIds.includes(relatedGuide.id)
        }))
      } catch (relatedError) {
        console.warn('⚠️ Failed to fetch related guides:', relatedError)
      }
    }

    // Build the guide detail response
    const guideDetail = {
      id: guide.id,
      title: guide.title || 'Untitled Guide',
      slug: guide.slug,
      description: guide.description || '',
      content: includeContent ? guide.content : undefined,
      excerpt: guide.description ? guide.description.substring(0, 200) + (guide.description.length > 200 ? '...' : '') : undefined,
      creator: processCreator(guide.creator),
      primaryLocation: (() => {
        const loc = processLocation(guide.primaryLocation)
        return loc && loc.id ? loc : undefined
      })(),
      category: categories[0], // Primary category
      categories,
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
      gallery,
      stats: {
        views: guide.stats?.views || 0,
        purchases: guide.stats?.purchases || 0,
        rating: guide.stats?.rating,
        reviewCount: guide.stats?.reviewCount || 0,
        downloadCount: purchaseRecord.downloadCount || 0,
        completionRate: guide.stats?.completionRate
      },
      tags,
      sections,
      requirements: guide.requirements || [],
      whatYoullLearn: guide.whatYoullLearn || [],
      purchase: {
        purchaseId: String(purchaseRecord.id),
        purchaseDate: purchaseRecord.purchaseDate,
        amount: purchaseRecord.amount || 0,
        paymentMethod: purchaseRecord.paymentMethod || 'unknown',
        downloadCount: purchaseRecord.downloadCount || 0,
        lastAccessedAt: purchaseRecord.lastAccessedAt,
        hasReviewed: purchaseRecord.hasReviewed || false,
        purchaseRating: purchaseRecord.purchaseRating,
        accessCount: purchaseRecord.downloadCount || 0,
        progress: purchaseRecord.progress,
        isCompleted: purchaseRecord.isCompleted || false,
        completedAt: purchaseRecord.completedAt
      },
      reviews: reviews.length > 0 ? reviews : undefined,
      relatedGuides: relatedGuides.length > 0 ? relatedGuides : undefined,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt
    }

    console.log(`📚 Guide detail formatted successfully:`, {
      id: guideDetail.id,
      title: guideDetail.title,
      creator: guideDetail.creator?.name,
      hasContent: !!guideDetail.content,
      hasReviews: !!guideDetail.reviews,
      hasRelated: !!guideDetail.relatedGuides
    })

    // Build response
    const response: MobileGuideDetailResponse = {
      success: true,
      message: 'Guide details retrieved successfully',
      data: {
        guide: guideDetail
      }
    }

    console.log('✅ Guide detail response built successfully')
    
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
    console.error('❌ Mobile library guide detail error:', error)
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack)
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? `Guide detail service unavailable: ${error.message}` : 'Guide detail service unavailable',
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