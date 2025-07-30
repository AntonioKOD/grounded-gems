import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const photosQuerySchema = z.object({
  type: z.enum(['all', 'posts', 'locations']).optional().default('all'),
  limit: z.string().optional().transform(val => parseInt(val || '20')),
  page: z.string().optional().transform(val => parseInt(val || '1')),
  sort: z.enum(['newest', 'oldest', 'popular']).optional().default('newest'),
})

interface MobileUserPhotosResponse {
  success: boolean
  message: string
  data?: {
    photos: Array<{
      id: string
      type: 'post' | 'location'
      url: string
      thumbnail?: string
      alt?: string
      caption?: string
      width?: number
      height?: number
      filesize?: number
      postId?: string
      locationId?: string
      createdAt: string
      likeCount?: number
      commentCount?: number
      location?: {
        id: string
        name: string
        address?: string
      }
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    stats: {
      totalPhotos: number
      totalPostPhotos: number
      totalReviewPhotos: number
      totalLocationPhotos: number
    }
  }
  error?: string
  code?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<MobileUserPhotosResponse>> {
  try {
    const { userId } = await params
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = photosQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
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

    const { type, limit, page, sort } = queryValidation.data

    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid user ID',
          error: 'User ID is required and must be a valid string',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'The specified user does not exist',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Determine sort order
    let sortOrder: string
    switch (sort) {
      case 'oldest':
        sortOrder = 'createdAt'
        break
      case 'popular':
        sortOrder = 'likeCount-desc'
        break
      case 'newest':
      default:
        sortOrder = 'createdAt-desc'
        break
    }

    // Collect photos from different sources
    let allPhotos: any[] = []

    try {
      // Get photos from posts
      if (type === 'all' || type === 'posts') {
        const postsResult = await payload.find({
          collection: 'posts',
          where: {
            author: { equals: userId },
            status: { equals: 'published' },
            or: [
              { image: { exists: true } },
              { photos: { exists: true } }
            ]
          },
          sort: sortOrder,
          limit: type === 'posts' ? limit : 100,
          depth: 2
        })
        
        console.log(`[Photos API] Found ${postsResult.docs.length} posts for user ${userId}`)
        postsResult.docs.forEach((post: any, index: number) => {
          console.log(`[Photos API] Post ${index + 1}:`, {
            id: post.id,
            author: post.author,
            status: post.status,
            hasImage: !!post.image,
            hasPhotos: !!post.photos
          })
        })

        const postPhotos = postsResult.docs.flatMap((post: any) => {
          const photos: any[] = []
          
          // Add main image if exists
          if (post.image) {
            photos.push({
              id: `post-${post.id}-main`,
              type: 'post' as const,
              url: typeof post.image === 'object' && post.image.url
                ? post.image.url 
                : typeof post.image === 'string'
                ? post.image
                : '',
              thumbnail: typeof post.image === 'object' && post.image.sizes?.thumbnail?.url
                ? post.image.sizes.thumbnail.url
                : undefined,
              alt: typeof post.image === 'object' ? post.image.alt : undefined,
              caption: post.title || post.content?.substring(0, 100),
              width: typeof post.image === 'object' ? post.image.width : undefined,
              height: typeof post.image === 'object' ? post.image.height : undefined,
              filesize: typeof post.image === 'object' ? post.image.filesize : undefined,
              postId: post.id,
              createdAt: post.createdAt,
              likeCount: post.likeCount || 0,
              commentCount: post.commentCount || 0,
              location: post.location ? {
                id: typeof post.location === 'object' ? post.location.id : post.location,
                name: typeof post.location === 'object' ? post.location.name : 'Unknown Location',
                address: typeof post.location === 'object' ? post.location.address : undefined
              } : undefined
            })
          }
          
          // Add additional photos if exists
          if (post.photos && Array.isArray(post.photos)) {
            post.photos.forEach((photo: any, index: number) => {
              photos.push({
                id: `post-${post.id}-photo-${index}`,
                type: 'post' as const,
                url: typeof photo === 'object' && photo.url
                  ? photo.url 
                  : typeof photo === 'string'
                  ? photo
                  : '',
                thumbnail: typeof photo === 'object' && photo.sizes?.thumbnail?.url
                  ? photo.sizes.thumbnail.url
                  : undefined,
                alt: typeof photo === 'object' ? photo.alt : undefined,
                caption: post.title || post.content?.substring(0, 100),
                width: typeof photo === 'object' ? photo.width : undefined,
                height: typeof photo === 'object' ? photo.height : undefined,
                filesize: typeof photo === 'object' ? photo.filesize : undefined,
                postId: post.id,
                createdAt: post.createdAt,
                likeCount: post.likeCount || 0,
                commentCount: post.commentCount || 0,
                location: post.location ? {
                  id: typeof post.location === 'object' ? post.location.id : post.location,
                  name: typeof post.location === 'object' ? post.location.name : 'Unknown Location',
                  address: typeof post.location === 'object' ? post.location.address : undefined
                } : undefined
              })
            })
          }
          
          return photos.filter(photo => photo.url)
        })

        allPhotos.push(...postPhotos)
      }

      // Reviews don't have images, so skip this section
      // Reviews are text-based only in the current schema

      // Get photos from location submissions
      if (type === 'all' || type === 'locations') {
        const locationPhotosResult = await payload.find({
          collection: 'locationPhotoSubmissions',
          where: {
            submittedBy: { equals: userId },
            status: { in: ['approved', 'pending'] }
          },
          sort: sortOrder,
          limit: type === 'locations' ? limit : 100,
          depth: 2
        })

        const locationPhotos = locationPhotosResult.docs.map((submission: any) => ({
          id: `location-${submission.id}`,
          type: 'location' as const,
          url: typeof submission.photo === 'object' && submission.photo.url
            ? submission.photo.url 
            : typeof submission.photo === 'string'
            ? submission.photo
            : '',
          thumbnail: typeof submission.photo === 'object' && submission.photo.sizes?.thumbnail?.url
            ? submission.photo.sizes.thumbnail.url
            : undefined,
          alt: typeof submission.photo === 'object' ? submission.photo.alt : undefined,
          caption: submission.caption,
          width: typeof submission.photo === 'object' ? submission.photo.width : undefined,
          height: typeof submission.photo === 'object' ? submission.photo.height : undefined,
          filesize: typeof submission.photo === 'object' ? submission.photo.filesize : undefined,
          locationId: submission.location?.id || submission.location,
          createdAt: submission.createdAt,
          location: submission.location ? {
            id: typeof submission.location === 'object' ? submission.location.id : submission.location,
            name: typeof submission.location === 'object' ? submission.location.name : 'Unknown Location',
            address: typeof submission.location === 'object' ? submission.location.address : undefined
          } : undefined
        })).filter((photo: any) => photo.url)

        allPhotos.push(...locationPhotos)
      }

    } catch (photosError) {
      console.warn('Failed to fetch user photos:', photosError)
    }

    // Sort all photos by the requested sort order
    allPhotos.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'popular':
          return (b.likeCount || 0) - (a.likeCount || 0)
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPhotos = allPhotos.slice(startIndex, endIndex)

    // Get statistics for all user photos
    let stats = {
      totalPhotos: 0,
      totalPostPhotos: 0,
      totalReviewPhotos: 0,
      totalLocationPhotos: 0,
    }

    try {
      // Count post photos
      const postPhotosCount = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: userId },
          status: { equals: 'published' },
          or: [
            { image: { exists: true } },
            { photos: { exists: true } }
          ]
        },
        limit: 0,
      })
      stats.totalPostPhotos = postPhotosCount.totalDocs

      // Reviews don't have images, so set to 0
      stats.totalReviewPhotos = 0

      // Count location photos
      const locationPhotosCount = await payload.find({
        collection: 'locationPhotoSubmissions',
        where: {
          submittedBy: { equals: userId },
          status: { in: ['approved', 'pending'] }
        },
        limit: 0,
      })
      stats.totalLocationPhotos = locationPhotosCount.totalDocs

      stats.totalPhotos = stats.totalPostPhotos + stats.totalReviewPhotos + stats.totalLocationPhotos

    } catch (statsError) {
      console.warn('Failed to fetch user photo stats:', statsError)
    }

    const response: MobileUserPhotosResponse = {
      success: true,
      message: 'User photos retrieved successfully',
      data: {
        photos: paginatedPhotos,
        pagination: {
          page,
          limit,
          total: allPhotos.length,
          totalPages: Math.ceil(allPhotos.length / limit),
          hasNext: endIndex < allPhotos.length,
          hasPrev: page > 1,
        },
        stats
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile user photos error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Photos service unavailable',
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