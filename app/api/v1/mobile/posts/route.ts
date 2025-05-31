import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Request body validation schema
const createPostSchema = z.object({
  caption: z.string().min(1, 'Caption is required').max(2000, 'Caption too long'),
  type: z.enum(['post', 'review', 'recommendation']).default('post'),
  rating: z.number().min(1).max(5).optional(),
  location: z.string().optional(), // Location ID
  tags: z.array(z.string()).optional(),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    id: z.string(), // Changed from url to id - media ID from upload API
    url: z.string().optional(), // Keep URL for backward compatibility
    thumbnail: z.string().optional(),
    alt: z.string().optional()
  })).optional(),
})

interface MobileCreatePostResponse {
  success: boolean
  message: string
  data?: {
    id: string
    caption: string
    author: {
      id: string
      name: string
      profileImage?: {
        url: string
      } | null
    }
    media?: Array<{
      type: 'image' | 'video'
      url: string
      thumbnail?: string
      alt?: string
    }>
    location?: {
      id: string
      name: string
    }
    type: string
    rating?: number
    tags: string[]
    createdAt: string
    updatedAt: string
  }
  error?: string
  code?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileCreatePostResponse>> {
  try {
    const payload = await getPayload({ config })

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
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

    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
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

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON',
          error: 'Request body must be valid JSON',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      )
    }

    console.log('📱 Mobile post creation request:', {
      userId: user.id,
      userEmail: user.email,
      bodyKeys: Object.keys(body),
      captionLength: body.caption?.length,
      mediaCount: body.media?.length || 0,
      hasLocation: !!body.location,
      hasRating: !!body.rating,
      tagsCount: body.tags?.length || 0
    })

    // Validate request data
    let validatedData
    try {
      validatedData = createPostSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0]
        return NextResponse.json(
          {
            success: false,
            message: 'Validation failed',
            error: firstError.message,
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Handle media uploads - use media IDs directly from upload API
    let imageId: string | null = null
    let videoId: string | null = null
    let videoThumbnailId: string | null = null
    const photoIds: string[] = []

    if (validatedData.media && validatedData.media.length > 0) {
      console.log('📱 Processing media items:', validatedData.media.length)
      
      for (const mediaItem of validatedData.media) {
        try {
          // Validate that the media ID exists in the database
          const existingMedia = await payload.findByID({
            collection: 'media',
            id: mediaItem.id,
            depth: 0,
          })

          if (!existingMedia) {
            console.warn('📱 Media not found:', mediaItem.id)
            continue
          }

          if (mediaItem.type === 'image') {
            if (!imageId) {
              imageId = mediaItem.id
            }
            photoIds.push(mediaItem.id)
          } else if (mediaItem.type === 'video') {
            if (!videoId) {
              videoId = mediaItem.id
              
              // Handle video thumbnail if provided
              if (mediaItem.thumbnail) {
                // If thumbnail is provided as a URL, we might need to create a media record for it
                // For now, we'll assume thumbnail is also uploaded separately and has an ID
                // This could be enhanced to handle thumbnail URLs
                console.log('📱 Video thumbnail provided:', mediaItem.thumbnail)
              }
            }
          }
        } catch (mediaError) {
          console.error('📱 Error validating media:', mediaError)
          // Continue with other media items
        }
      }
    }

    // Validate location if provided
    let locationId: string | null = null
    if (validatedData.location) {
      try {
        const location = await payload.findByID({
          collection: 'locations',
          id: validatedData.location,
          depth: 0,
        })
        if (location) {
          locationId = validatedData.location
        }
      } catch (locationError) {
        console.warn('📱 Location not found:', validatedData.location)
        // Continue without location
      }
    }

    // Prepare post data
    const postData: any = {
      content: validatedData.caption.trim(),
      author: user.id,
      type: videoId ? 'video' : validatedData.type,
      status: 'published',
      visibility: 'public',
    }

    if (imageId) {
      postData.image = imageId
    }

    if (videoId) {
      postData.video = videoId
    }

    if (videoThumbnailId) {
      postData.videoThumbnail = videoThumbnailId
    }

    if (photoIds.length > 0) {
      postData.photos = photoIds
    }

    if (locationId) {
      postData.location = locationId
    }

    // Add tags
    if (validatedData.tags && validatedData.tags.length > 0) {
      postData.tags = validatedData.tags.map(tag => ({ tag: tag.trim() }))
    }

    console.log('📱 Creating post with data:', {
      ...postData,
      image: imageId ? 'Set' : 'Not set',
      video: videoId ? 'Set' : 'Not set',
      photos: `${photoIds.length} photos`,
      location: locationId ? 'Set' : 'Not set',
      tagsCount: validatedData.tags?.length || 0,
      mediaProcessed: {
        imageId,
        videoId,
        photoIds,
        totalMediaItems: validatedData.media?.length || 0
      }
    })

    // Create the post
    const newPost = await payload.create({
      collection: 'posts',
      data: postData,
      depth: 2, // Include related data
    })

    console.log('📱 Post created successfully:', newPost.id)

    // Format response data
    const responseData = {
      id: newPost.id,
      caption: newPost.content,
      author: {
        id: user.id,
        name: user.name,
        profileImage: user.profileImage ? {
          url: typeof user.profileImage === 'object' ? user.profileImage.url : user.profileImage
        } : null
      },
      media: validatedData.media?.map(m => ({
        type: m.type,
        id: m.id,
        url: m.url || '', // Include URL for display purposes
        alt: m.alt
      })) || [],
      location: locationId && newPost.location ? {
        id: newPost.location.id,
        name: newPost.location.name
      } : undefined,
      type: newPost.type,
      rating: newPost.rating,
      tags: validatedData.tags || [],
      createdAt: newPost.createdAt,
      updatedAt: newPost.updatedAt,
    }

    const response: MobileCreatePostResponse = {
      success: true,
      message: 'Post created successfully',
      data: responseData,
    }

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('📱 Mobile post creation error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Post creation service unavailable',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 