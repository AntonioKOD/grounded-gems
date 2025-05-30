import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Request body validation schema
const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
  title: z.string().optional(),
  type: z.enum(['post', 'review', 'recommendation']).default('post'),
  rating: z.number().min(1).max(5).optional(),
  location: z.string().optional(), // Location ID
  tags: z.array(z.string()).optional(),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string(),
    thumbnail: z.string().optional(),
    alt: z.string().optional()
  })).optional(),
})

interface MobileCreatePostResponse {
  success: boolean
  message: string
  data?: {
    id: string
    content: string
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
      contentLength: body.content?.length,
      mediaCount: body.media?.length || 0
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

    // Handle media uploads - convert URLs to media IDs
    let imageId: string | null = null
    let videoId: string | null = null
    let videoThumbnailId: string | null = null
    const photoIds: string[] = []

    if (validatedData.media && validatedData.media.length > 0) {
      console.log('📱 Processing media uploads:', validatedData.media.length)
      
      for (const mediaItem of validatedData.media) {
        try {
          if (mediaItem.type === 'image') {
            // For images, we need to create media records from URLs
            // This assumes the URLs are already uploaded to the server
            // In a real implementation, you might want to validate these URLs
            const mediaDoc = await payload.create({
              collection: 'media',
              data: {
                alt: mediaItem.alt || `Image for post by ${user.name}`,
                url: mediaItem.url,
              },
              // Note: For mobile uploads, the file should already be uploaded
              // This is a simplified version - in production you'd handle actual file uploads
            })

            if (mediaDoc?.id) {
              if (!imageId) {
                imageId = mediaDoc.id
              }
              photoIds.push(mediaDoc.id)
            }
          } else if (mediaItem.type === 'video') {
            // Similar for videos
            const videoDoc = await payload.create({
              collection: 'media',
              data: {
                alt: mediaItem.alt || `Video for post by ${user.name}`,
                url: mediaItem.url,
              },
            })

            if (videoDoc?.id && !videoId) {
              videoId = videoDoc.id
              
              // Handle video thumbnail
              if (mediaItem.thumbnail) {
                const thumbnailDoc = await payload.create({
                  collection: 'media',
                  data: {
                    alt: `Thumbnail for video by ${user.name}`,
                    url: mediaItem.thumbnail,
                  },
                })
                if (thumbnailDoc?.id) {
                  videoThumbnailId = thumbnailDoc.id
                }
              }
            }
          }
        } catch (mediaError) {
          console.error('📱 Error processing media:', mediaError)
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
      content: validatedData.content.trim(),
      author: user.id,
      type: videoId ? 'video' : validatedData.type,
      status: 'published',
      visibility: 'public',
    }

    // Add optional fields
    if (validatedData.title?.trim()) {
      postData.title = validatedData.title.trim()
    }

    if (validatedData.type === 'review' && validatedData.rating) {
      postData.rating = validatedData.rating
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
      tagsCount: validatedData.tags?.length || 0
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
      content: newPost.content,
      author: {
        id: user.id,
        name: user.name,
        profileImage: user.profileImage ? {
          url: typeof user.profileImage === 'object' ? user.profileImage.url : user.profileImage
        } : null
      },
      media: validatedData.media || [],
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