import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'
import { createPost } from '@/app/actions'

// Input validation schema for mobile post creation
const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(500, 'Content cannot exceed 500 characters'),
  title: z.string().optional(),
  type: z.enum(['post', 'review', 'recommendation']).default('post'),
  rating: z.number().min(1).max(5).optional(),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
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

export async function GET(request: NextRequest): Promise<NextResponse<any>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    console.log('📱 Mobile posts feed request received')
    
    // Optional authentication for personalized feed
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('📱 Authenticated user:', user?.email)
      }
    } catch (authError) {
      console.log('📱 No authenticated user for posts feed request')
    }

    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const category = searchParams.get('category') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'

    console.log('📱 Query parameters:', { page, limit, category, sortBy })

    // Build query
    let whereClause: any = {
      status: { equals: 'published' }
    }

    if (category) {
      whereClause['tags.tag'] = { contains: category }
    }

    console.log('📱 Where clause:', whereClause)

    // Build sort string properly for Payload
    let sortString: string = '-createdAt' // Default: newest first
    if (sortBy === 'createdAt') {
      sortString = '-createdAt'
    } else if (sortBy === 'updatedAt') {
      sortString = '-updatedAt'
    } else {
      sortString = '-createdAt' // fallback
    }

    console.log('📱 Sort string:', sortString)

    // Fetch posts
    console.log('📱 Fetching posts from database...')
    const postsResult = await payload.find({
      collection: 'posts',
      where: whereClause,
      sort: sortString,
      page,
      limit,
      depth: 2,
    })

    console.log('📱 Posts found:', postsResult.totalDocs)

    // Format posts for mobile
    const formattedPosts = postsResult.docs.map((post: any) => {
      console.log('📱 Formatting post:', post.id)
      return {
        id: post.id,
        content: post.content,
        title: post.title,
        author: {
          id: post.author?.id || '',
          name: post.author?.name || 'Unknown User',
          profileImage: post.author?.profileImage ? {
            url: typeof post.author.profileImage === 'object' && post.author.profileImage.url
              ? post.author.profileImage.url
              : typeof post.author.profileImage === 'string'
              ? post.author.profileImage
              : ''
          } : null,
        },
        media: [
          // Images
          ...(post.image ? [{
            type: 'image' as const,
            url: typeof post.image === 'object' && post.image.url 
              ? post.image.url 
              : typeof post.image === 'string'
              ? post.image
              : '',
            alt: typeof post.image === 'object' ? post.image.alt : undefined
          }] : []),
          // Additional photos
          ...(Array.isArray(post.photos) ? post.photos.map((photo: any) => ({
            type: 'image' as const,
            url: typeof photo === 'object' && photo.url 
              ? photo.url 
              : typeof photo === 'string'
              ? photo
              : '',
            alt: typeof photo === 'object' ? photo.alt : undefined
          })) : []),
          // Videos
          ...(post.video ? [{
            type: 'video' as const,
            url: typeof post.video === 'object' && post.video.url 
              ? post.video.url 
              : typeof post.video === 'string'
              ? post.video
              : '',
            thumbnail: post.videoThumbnail && typeof post.videoThumbnail === 'object' && post.videoThumbnail.url
              ? post.videoThumbnail.url
              : undefined
          }] : [])
        ],
        location: post.location ? {
          id: typeof post.location === 'object' ? post.location.id : post.location,
          name: typeof post.location === 'object' ? post.location.name : 'Unknown Location'
        } : undefined,
        type: post.type,
        rating: post.rating,
        tags: Array.isArray(post.tags) 
          ? post.tags.map((tag: any) => typeof tag === 'object' ? tag.tag : tag)
          : [],
        engagement: {
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          shareCount: post.shareCount || 0,
          saveCount: post.saveCount || 0,
          isLiked: false, // TODO: Check if current user liked
          isSaved: false, // TODO: Check if current user saved
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      }
    })

    const totalPages = Math.ceil(postsResult.totalDocs / limit)

    console.log('📱 Sending response with', formattedPosts.length, 'posts')

    return NextResponse.json({
      success: true,
      message: 'Posts retrieved successfully',
      data: {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total: postsResult.totalDocs,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        meta: {
          feedType: category ? 'category' : 'all',
          appliedFilters: {
            category,
            sortBy,
          },
        },
      },
    }, {
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
    console.error('📱 Mobile posts feed error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: `Posts feed service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'SERVER_ERROR'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileCreatePostResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').replace('JWT ', '')

    if (!token) {
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

    console.log('📱 Mobile post creation - User authenticated:', user.email)

    // Parse form data for file uploads and post data
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('📱 Mobile post creation - FormData parsed successfully')
      
      // Debug: Log all FormData entries
      console.log('📱 Mobile post creation - FormData entries:')
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(name="${value.name}", size=${value.size}, type="${value.type}")`)
        } else {
          console.log(`  ${key}: ${value}`)
        }
      }
    } catch (error) {
      console.error('📱 Mobile post creation - Failed to parse FormData:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid form data',
          error: 'Failed to parse request data',
          code: 'INVALID_FORM_DATA'
        },
        { status: 400 }
      )
    }

    // Extract post data from FormData
    const postData = {
      content: formData.get('content') as string,
      title: formData.get('title') as string || undefined,
      type: (formData.get('type') as string) || 'post',
      rating: formData.get('rating') ? parseInt(formData.get('rating') as string, 10) : undefined,
      locationId: formData.get('locationId') as string || undefined,
      locationName: formData.get('locationName') as string || undefined,
      tags: formData.getAll('tags[]') as string[] || formData.getAll('tags') as string[] || [],
    }

    console.log('📱 Mobile post creation - Extracted post data:', {
      contentLength: postData.content?.length || 0,
      type: postData.type,
      hasTitle: !!postData.title,
      hasLocation: !!(postData.locationId || postData.locationName),
      tagsCount: postData.tags.length,
      hasRating: !!postData.rating
    })

    // Validate post data (excluding files for now)
    const validationResult = createPostSchema.safeParse(postData)
    if (!validationResult.success) {
      console.error('📱 Mobile post creation - Validation failed:', validationResult.error.errors)
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          error: validationResult.error.errors[0].message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Create new FormData for the createPost function
    const createPostFormData = new FormData()
    createPostFormData.append('userId', user.id)
    createPostFormData.append('content', validationResult.data.content)
    createPostFormData.append('type', validationResult.data.type)

    if (validationResult.data.title) {
      createPostFormData.append('title', validationResult.data.title)
    }

    if (validationResult.data.rating) {
      createPostFormData.append('rating', validationResult.data.rating.toString())
    }

    if (validationResult.data.locationId) {
      createPostFormData.append('locationId', validationResult.data.locationId)
    }

    if (validationResult.data.locationName) {
      createPostFormData.append('locationName', validationResult.data.locationName)
    }

    // Add tags
    validationResult.data.tags.forEach(tag => {
      createPostFormData.append('tags[]', tag)
    })

    // Handle media files - support both 'media' and 'image'/'video' field names
    const mediaFiles = formData.getAll('media') as File[]
    const imageFiles = formData.getAll('image') as File[]
    const videoFiles = formData.getAll('video') as File[]
    const allFiles = [...mediaFiles, ...imageFiles, ...videoFiles]

    console.log('📱 Mobile post creation - Media files detected:', {
      mediaFiles: mediaFiles.length,
      imageFiles: imageFiles.length,
      videoFiles: videoFiles.length,
      totalFiles: allFiles.length
    })

    // Add all media files to the createPost FormData
    allFiles.forEach(file => {
      if (file instanceof File && file.size > 0) {
        if (file.type.startsWith('image/')) {
          createPostFormData.append('media', file)
          console.log(`📱 Adding image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        } else if (file.type.startsWith('video/')) {
          createPostFormData.append('videos', file)
          console.log(`📱 Adding video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        }
      }
    })

    // Additional files from specific fields
    const specificImageFiles = formData.getAll('images') as File[]
    const specificVideoFiles = formData.getAll('videos') as File[]

    specificImageFiles.forEach(file => {
      if (file instanceof File && file.size > 0) {
        createPostFormData.append('media', file)
        console.log(`📱 Adding specific image: ${file.name}`)
      }
    })

    specificVideoFiles.forEach(file => {
      if (file instanceof File && file.size > 0) {
        createPostFormData.append('videos', file)
        console.log(`📱 Adding specific video: ${file.name}`)
      }
    })

    // Call our fixed createPost function
    console.log('📱 Mobile post creation - Calling createPost function...')
    const result = await createPost(createPostFormData)

    console.log('📱 Mobile post creation - createPost result:', {
      success: result.success,
      message: result.message,
      postId: result.postId
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.message,
          code: 'POST_CREATION_FAILED'
        },
        { status: 400 }
      )
    }

    // Fetch the created post with full details for mobile response
    let createdPost: any = null
    if (result.postId) {
      try {
        createdPost = await payload.findByID({
          collection: 'posts',
          id: result.postId,
          depth: 2,
        })
      } catch (fetchError) {
        console.warn('📱 Could not fetch created post details:', fetchError)
      }
    }

    // Format response for mobile consumption
    const response: MobileCreatePostResponse = {
      success: true,
      message: 'Post created successfully',
      data: createdPost ? {
        id: createdPost.id,
        content: createdPost.content,
        author: {
          id: createdPost.author?.id || user.id,
          name: createdPost.author?.name || user.name || 'Unknown User',
          profileImage: createdPost.author?.profileImage ? {
            url: typeof createdPost.author.profileImage === 'object' && createdPost.author.profileImage.url
              ? createdPost.author.profileImage.url
              : typeof createdPost.author.profileImage === 'string'
              ? createdPost.author.profileImage
              : '' // Fallback
          } : null,
        },
        media: [
          // Images
          ...(createdPost.image ? [{
            type: 'image' as const,
            url: typeof createdPost.image === 'object' && createdPost.image.url 
              ? createdPost.image.url 
              : typeof createdPost.image === 'string'
              ? createdPost.image
              : '',
            alt: typeof createdPost.image === 'object' ? createdPost.image.alt : undefined
          }] : []),
          // Additional photos
          ...(Array.isArray(createdPost.photos) ? createdPost.photos.map((photo: any) => ({
            type: 'image' as const,
            url: typeof photo === 'object' && photo.url 
              ? photo.url 
              : typeof photo === 'string'
              ? photo
              : '',
            alt: typeof photo === 'object' ? photo.alt : undefined
          })) : []),
          // Videos
          ...(createdPost.video ? [{
            type: 'video' as const,
            url: typeof createdPost.video === 'object' && createdPost.video.url 
              ? createdPost.video.url 
              : typeof createdPost.video === 'string'
              ? createdPost.video
              : '',
            thumbnail: createdPost.videoThumbnail && typeof createdPost.videoThumbnail === 'object' && createdPost.videoThumbnail.url
              ? createdPost.videoThumbnail.url
              : undefined
          }] : [])
        ],
        location: createdPost.location ? {
          id: typeof createdPost.location === 'object' ? createdPost.location.id : createdPost.location,
          name: typeof createdPost.location === 'object' ? createdPost.location.name : 'Unknown Location'
        } : undefined,
        type: createdPost.type,
        rating: createdPost.rating,
        tags: Array.isArray(createdPost.tags) 
          ? createdPost.tags.map((tag: any) => typeof tag === 'object' ? tag.tag : tag)
          : [],
        createdAt: createdPost.createdAt,
        updatedAt: createdPost.updatedAt,
      } : {
        id: result.postId || '',
        content: validationResult.data.content,
        author: {
          id: user.id,
          name: user.name || 'Unknown User',
          profileImage: user.profileImage ? {
            url: typeof user.profileImage === 'object' && user.profileImage.url
              ? user.profileImage.url
              : typeof user.profileImage === 'string'
              ? user.profileImage
              : ''
          } : null,
        },
        type: validationResult.data.type,
        rating: validationResult.data.rating,
        tags: validationResult.data.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 