import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface SavedLocation {
  id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  address?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  featuredImage?: {
    url: string
    alt?: string
  }
  categories?: Array<{
    id: string
    name: string
    icon?: string
  }>
  rating?: number
  reviewCount?: number
  isVerified?: boolean
  isFeatured?: boolean
  savedAt: string
}

interface SavedPost {
  id: string
  type: 'post' | 'review' | 'recommendation'
  title?: string
  content: string
  author: {
    id: string
    name: string
    profileImage?: {
      url: string
    } | null
    isVerified?: boolean
  }
  location?: {
    id: string
    name: string
    address?: string
  }
  media?: Array<{
    type: 'image' | 'video'
    url: string
    thumbnail?: string
    alt?: string
  }>
  engagement: {
    likeCount: number
    commentCount: number
    saveCount: number
  }
  rating?: number
  categories?: string[]
  tags?: string[]
  createdAt: string
  savedAt: string
}

interface SavedResponse {
  success: boolean
  message: string
  data?: {
    locations: SavedLocation[]
    posts: SavedPost[]
    stats: {
      totalSaved: number
      savedLocations: number
      savedPosts: number
    }
  }
  error?: string
  code?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<SavedResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Verify authentication - check both Authorization header and Cookie
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('Cookie')
    
    // Check for Bearer token in Authorization header
    const hasBearerToken = authHeader?.startsWith('Bearer ')
    
    // Check for payload-token in Cookie header
    const hasPayloadToken = cookieHeader?.includes('payload-token=')
    
    if (!hasBearerToken && !hasPayloadToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authentication token provided',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      )
    }

    const { user: currentUser } = await payload.auth({ headers: request.headers })
    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token',
          error: 'Authentication token is invalid or expired',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // Get user's saved locations using the SavedLocations collection
    const savedLocationRecords = await payload.find({
      collection: 'savedLocations',
      where: {
        user: { equals: currentUser.id }
      },
      depth: 2,
      sort: '-createdAt'
    })

    // Get the actual location data for saved locations
    const savedLocationIds = savedLocationRecords.docs.map((record: any) => record.location?.id).filter(Boolean)
    let savedLocations: any[] = []
    
    if (savedLocationIds.length > 0) {
      const locationsResult = await payload.find({
        collection: 'locations',
        where: {
          id: { in: savedLocationIds }
        },
        depth: 2
      })
      savedLocations = locationsResult.docs
    }

    // Get user's saved posts (Posts collection has savedBy field)
    const savedPosts = await payload.find({
      collection: 'posts',
      where: {
        savedBy: { contains: currentUser.id }
      },
      depth: 2,
      sort: '-updatedAt'
    })

    // Transform saved locations to match iOS app format
    const transformedLocations: SavedLocation[] = savedLocations.map(location => {
      // Format address as string
      let addressString: string | undefined
      if (location.address) {
        if (typeof location.address === 'string') {
          addressString = location.address
        } else if (typeof location.address === 'object') {
          const addr = location.address
          const parts = [
            addr.street,
            addr.city,
            addr.state,
            addr.zip,
            addr.country
          ].filter(Boolean)
          addressString = parts.join(', ')
        }
      }

      return {
        id: location.id,
        name: location.name,
        slug: location.slug,
        description: location.description,
        shortDescription: location.shortDescription,
        address: addressString,
        coordinates: location.coordinates ? {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude
        } : undefined,
        featuredImage: location.featuredImage ? {
          url: typeof location.featuredImage === 'string' 
            ? location.featuredImage 
            : location.featuredImage.url,
          alt: typeof location.featuredImage === 'object' ? location.featuredImage.alt : undefined
        } : undefined,
        categories: location.categories?.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon
        })),
        rating: location.averageRating,
        reviewCount: location.reviewCount,
        isVerified: location.isVerified,
        isFeatured: location.isFeatured,
        savedAt: location.updatedAt
      }
    })

    // Transform saved posts to match iOS app format
    const transformedPosts: SavedPost[] = savedPosts.docs.map(post => ({
      id: String(post.id),
      type: post.type || 'post',
      title: post.title,
      content: post.content,
      author: {
        id: post.author?.id || '',
        name: post.author?.name || 'Unknown',
        profileImage: post.author?.profileImage ? {
          url: typeof post.author.profileImage === 'string' 
            ? post.author.profileImage 
            : post.author.profileImage.url
        } : null,
        isVerified: post.author?.isVerified
      },
      location: post.location ? {
        id: post.location.id,
        name: post.location.name,
        address: post.location.address
      } : undefined,
      media: post.media?.map((item: any) => ({
        type: item.type || 'image',
        url: typeof item === 'string' ? item : item.url,
        thumbnail: typeof item === 'object' ? item.thumbnail : undefined,
        alt: typeof item === 'object' ? item.alt : undefined
      })),
      engagement: {
        likeCount: post.likeCount || 0,
        commentCount: post.commentCount || 0,
        saveCount: post.saveCount || 0
      },
      rating: post.rating,
      categories: post.categories?.map((cat: any) => typeof cat === 'string' ? cat : cat.name || cat.id),
      tags: post.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.tag),
      createdAt: post.createdAt,
      savedAt: post.updatedAt
    }))

    const response: SavedResponse = {
      success: true,
      message: 'Saved content retrieved successfully',
      data: {
        locations: transformedLocations,
        posts: transformedPosts,
        stats: {
          totalSaved: transformedLocations.length + transformedPosts.length,
          savedLocations: transformedLocations.length,
          savedPosts: transformedPosts.length
        }
      }
    }

    // Debug logging
    console.log('🔍 Saved API Response:', {
      success: response.success,
      locationsCount: transformedLocations.length,
      postsCount: transformedPosts.length,
      sampleLocation: transformedLocations[0] ? {
        id: transformedLocations[0].id,
        name: transformedLocations[0].name,
        address: transformedLocations[0].address,
        coordinates: transformedLocations[0].coordinates,
        categories: transformedLocations[0].categories?.length
      } : null,
      samplePost: transformedPosts[0] ? {
        id: transformedPosts[0].id,
        type: transformedPosts[0].type,
        author: transformedPosts[0].author,
        engagement: transformedPosts[0].engagement
      } : null
    })

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Error fetching saved content:', error)
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch saved content',
        error: error instanceof Error ? error.message : 'Internal server error',
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