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

    // Validate media IDs if provided
    const validMediaItems: Array<{ type: 'image' | 'video', id: string, alt?: string }> = []
    if (validatedData.media && validatedData.media.length > 0) {
      console.log('📱 Validating media items:', validatedData.media.length)
      
      for (const mediaItem of validatedData.media) {
        try {
          // Validate that the media ID exists in the database
          const existingMedia = await payload.findByID({
            collection: 'media',
            id: mediaItem.id,
            depth: 0,
          })

          if (existingMedia) {
            validMediaItems.push({
              type: mediaItem.type,
              id: mediaItem.id,
              alt: mediaItem.alt
            })
            console.log(`📱 Validated ${mediaItem.type} media:`, mediaItem.id)
          } else {
            console.warn('📱 Media not found:', mediaItem.id)
          }
        } catch (mediaError) {
          console.error('📱 Error validating media:', mediaError)
          // Continue with other media items
        }
      }
    }

    // Prepare post data
    const postData: any = {
      content: validatedData.caption.trim(), // Use 'content' to match Post collection
      author: user.id,
      type: validatedData.type, // Use the type from request, don't override based on video
      status: 'published',
      visibility: 'public',
    }

    // Add rating for reviews
    if (validatedData.type === 'review' && validatedData.rating) {
      postData.rating = validatedData.rating
    }

    // Handle media assignment based on Post collection structure
    // First image goes to 'image' field, additional images go to 'photos'
    // First video goes to 'video' field
    if (validMediaItems.length > 0) {
      const images = validMediaItems.filter(m => m.type === 'image')
      const videos = validMediaItems.filter(m => m.type === 'video')

      // Set main image (first image)
      if (images.length > 0) {
        postData.image = images[0].id
        console.log('📱 Setting main image:', images[0].id)
      }

      // Set additional images to photos array (if more than 1 image)
      if (images.length > 1) {
        postData.photos = images.slice(1).map(img => img.id)
        console.log('📱 Setting additional photos:', postData.photos)
      } else if (images.length === 1) {
        // If only one image, also add it to photos array for consistency
        postData.photos = [images[0].id]
        console.log('📱 Setting single photo to photos array:', [images[0].id])
      }

      // Set main video (first video)
      if (videos.length > 0) {
        postData.video = videos[0].id
        console.log('📱 Setting main video:', videos[0].id)
        
        // Handle video thumbnail if provided
        if (videos[0].thumbnail) {
          console.log('📱 Video thumbnail provided:', videos[0].thumbnail)
          // Note: thumbnail handling could be enhanced to create media record
        }
      }
    }

    if (locationId) {
      postData.location = locationId
    }

    // Add tags - ensure proper format for Post collection
    if (validatedData.tags && validatedData.tags.length > 0) {
      postData.tags = validatedData.tags.filter(tag => tag.trim().length > 0).map(tag => ({ tag: tag.trim() }))
    }

    console.log('📱 Creating post with data:', {
      ...postData,
      author: user.id,
      contentLength: postData.content.length,
      type: postData.type,
      rating: postData.rating || 'Not set',
      image: postData.image ? 'Set' : 'Not set',
      video: postData.video ? 'Set' : 'Not set',
      photos: postData.photos ? `${postData.photos.length} photos` : 'Not set',
      location: locationId ? 'Set' : 'Not set',
      tagsCount: postData.tags?.length || 0,
      mediaProcessed: {
        totalMediaItems: validatedData.media?.length || 0,
        imagesCount: validatedData.media?.filter(m => m.type === 'image').length || 0,
        videosCount: validatedData.media?.filter(m => m.type === 'video').length || 0
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
      media: validMediaItems.map(m => {
        // Try to get the actual URL from the created post's media fields
        let mediaUrl = '';
        
        if (m.type === 'image') {
          if (newPost.image && typeof newPost.image === 'object' && newPost.image.url) {
            mediaUrl = newPost.image.url;
          } else if (newPost.photos && Array.isArray(newPost.photos)) {
            const photo = newPost.photos.find((p: any) => p.id === m.id || p === m.id);
            if (photo && typeof photo === 'object' && photo.url) {
              mediaUrl = photo.url;
            }
          }
        } else if (m.type === 'video') {
          if (newPost.video && typeof newPost.video === 'object' && newPost.video.url) {
            mediaUrl = newPost.video.url;
          }
        }
        
        return {
          type: m.type,
          id: m.id,
          url: mediaUrl,
          alt: m.alt
        };
      }),
      location: locationId && newPost.location ? {
        id: typeof newPost.location === 'object' ? newPost.location.id : newPost.location,
        name: typeof newPost.location === 'object' ? newPost.location.name : 'Unknown Location'
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