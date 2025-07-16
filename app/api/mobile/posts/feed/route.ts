import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const feedQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  feedType: z.enum(['personalized', 'discover', 'popular', 'latest', 'following']).default('personalized'),
  category: z.string().optional(),
  sortBy: z.enum(['createdAt', 'popularity', 'trending']).default('createdAt'),
  lastSeen: z.string().optional(), // For cursor-based pagination
})

interface MobileFeedResponse {
  success: boolean
  message: string
  data?: {
    posts: Array<{
      id: string
      caption: string
      author: {
        id: string
        name: string
        profileImage?: {
          url: string
        } | null
      }
      location?: {
        id: string
        name: string
        coordinates?: {
          latitude: number
          longitude: number
        }
      }
      media?: Array<{
        type: 'image' | 'video'
        url: string
        thumbnail?: string
        duration?: number
        alt?: string
      }>
      engagement: {
        likeCount: number
        commentCount: number
        shareCount: number
        saveCount: number
        isLiked: boolean
        isSaved: boolean
      }
      categories: string[]
      tags: string[]
      createdAt: string
      updatedAt: string
      rating?: number
      isPromoted?: boolean
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
      feedType: string
      appliedFilters: {
        category?: string
        sortBy: string
      }
      recommendations?: string[]
    }
  }
  error?: string
  code?: string
}

const SUPPORTED_FEED_TYPES = ['post', 'place_recommendation', 'people_suggestion']

export async function GET(request: NextRequest): Promise<NextResponse<MobileFeedResponse>> {
  try {
    console.log('🚀 Mobile feed endpoint called - ENHANCED VERSION')
    
    const payload = await getPayload({ config })
    console.log('✅ Payload instance created')
    
    const { searchParams } = new URL(request.url)
    console.log('📊 Raw search params:', Object.fromEntries(searchParams))
    
    // Validate query parameters
    const queryValidation = feedQuerySchema.safeParse(Object.fromEntries(searchParams))
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

    const { page, limit, feedType, category, sortBy } = queryValidation.data
    console.log('📊 Validated feed params:', { page, limit, feedType, category, sortBy })

    // Get current user (optional for personalization)
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('👤 Current user:', currentUser?.name || 'None')
      }
    } catch (authError) {
      console.log('No authenticated user for feed request')
    }

    // Build query - start with published posts
    let whereClause: any = {
      status: { equals: 'published' }
    }

    // Apply basic feed type filtering
    if (feedType === 'discover' && currentUser) {
      // Exclude current user's posts for discover feed
      whereClause.author = { not_equals: currentUser.id }
      console.log('🔍 Discover feed - excluding user posts')
    }

    // Apply category filter
    if (category && category !== 'all') {
      console.log('🏷️ Filtering by category:', category)
      whereClause.categories = { in: [category] }
    }

    console.log('🔧 Where clause:', JSON.stringify(whereClause))

    // Determine sort order (Payload expects string format)
    let sort: string = '-createdAt' // Default: newest first, ensure it's a string
    
    switch (sortBy) {
      case 'popularity':
        // We'll sort by engagement after fetching, but use date for DB query
        sort = '-createdAt'
        break
      case 'trending':
        // Recent posts that we'll sort by engagement after fetching
        sort = '-createdAt'
        break
      case 'createdAt':
      default:
        sort = '-createdAt'
        break
    }

    // Ensure sort is always a string (safety check)
    if (typeof sort !== 'string') {
      console.warn('⚠️ Sort parameter is not a string, converting:', sort)
      sort = '-createdAt'
    }

    // To fix pagination issues with duplicate posts when sorting by fields with common values,
    // we need to add a secondary sort by _id to ensure consistent ordering
    // Based on: https://github.com/payloadcms/payload/discussions/2409
    const compoundSort = `${sort},-id` // Always include ID as secondary sort (comma-separated string)

    console.log('📡 Starting database query with sort:', compoundSort, 'primary type:', typeof sort)
    
    const includeTypesParam = searchParams.get('includeTypes')
    const includeTypes = includeTypesParam ? includeTypesParam.split(',').filter(Boolean) : []
    const typesToFetch = includeTypes.length > 0 ? includeTypes : SUPPORTED_FEED_TYPES

    let feedItems: any[] = []

    // Fetch posts
    let posts: any[] = []
    if (typesToFetch.includes('post')) {
      const postsResult = await payload.find({
        collection: 'posts',
        where: whereClause,
        sort: compoundSort,
        page,
        limit: sortBy === 'popularity' || sortBy === 'trending' ? Math.min(limit * 2, 50) : limit,
        depth: 2,
      })
      posts = postsResult.docs.map((post: any) => {
        // Calculate engagement stats
        const likeCount = Array.isArray(post.likes) ? post.likes.length : 0
        const commentCount = Array.isArray(post.comments) ? post.comments.length : 0
        const saveCount = Array.isArray(post.savedBy) ? post.savedBy.length : 0

        // Check if current user liked/saved this post
        let isLiked = false
        let isSaved = false

        if (currentUser) {
          // Check likes using the existing relationship
          isLiked = Array.isArray(post.likes) && 
                   post.likes.some((like: any) => {
                     const likeId = typeof like === 'string' ? like : like.id
                     return likeId === currentUser.id
                   })

          // Check saves using the existing relationship
          isSaved = Array.isArray(post.savedBy) && 
                   post.savedBy.some((save: any) => {
                     const saveId = typeof save === 'string' ? save : save.id
                     return saveId === currentUser.id
                   })
        }

        // Enhanced media handling with better video support and proper URL processing
        let media: any[] = []
        
        // Helper function to process media URLs
        const processMediaUrl = (mediaItem: any): string | null => {
          if (!mediaItem) return null
          
          let url: string | null = null
          
          if (typeof mediaItem === 'string') {
            url = mediaItem
          } else if (typeof mediaItem === 'object') {
            // Try different URL sources in order of preference
            url = mediaItem.url || 
                  mediaItem.sizes?.card?.url || 
                  mediaItem.sizes?.thumbnail?.url || 
                  mediaItem.thumbnailURL ||
                  (mediaItem.filename ? `/api/media/file/${mediaItem.filename}` : null)
          }
          
          if (!url) return null
          
          // Ensure URL is properly formatted
          if (url.startsWith('/') && !url.startsWith('http')) {
            // For relative URLs, ensure they're properly formatted
            if (!url.startsWith('/api/media/')) {
              url = `/api/media/file/${url.replace(/^\/+/, '')}`
            }
          }
          
          return url
        }
        
        // Add main image
        if (post.image) {
          const imageUrl = processMediaUrl(post.image)
          if (imageUrl) {
            media.push({
              type: 'image',
              url: imageUrl,
              alt: typeof post.image === 'object' ? post.image.alt : undefined
            })
            console.log(`📸 Added image to post ${post.id}:`, imageUrl)
          }
        }

        // Add video if exists - reels-style (no thumbnail)
        if (post.video) {
          const videoUrl = processMediaUrl(post.video)
          if (videoUrl) {
            const videoItem = {
              type: 'video',
              url: videoUrl,
              // No thumbnail for reels-style autoplay
              duration: typeof post.video === 'object' ? post.video.duration : undefined,
              alt: 'Post video'
            }
            media.push(videoItem)
            console.log(`📹 Added video to post ${post.id}:`, videoItem)
          }
        }

        // Add photos array if exists
        if (post.photos && Array.isArray(post.photos)) {
          const validPhotos = post.photos
            .map((photo: any) => {
              const photoUrl = processMediaUrl(photo)
              return photoUrl ? {
                type: 'image',
                url: photoUrl,
                alt: typeof photo === 'object' ? photo.alt : undefined
              } : null
            })
            .filter((photo: null) => photo !== null) // Only include photos with valid URLs

          media = media.concat(validPhotos)
          console.log(`📸 Added ${validPhotos.length} photos to post ${post.id}`)
        }

        const formattedPost = {
          id: post.id,
          caption: post.content || '',
          author: {
            id: post.author?.id || 'unknown',
            name: post.author?.name || 'Anonymous',
            profileImage: post.author?.profileImage ? {
              url: typeof post.author.profileImage === 'object'
                ? post.author.profileImage.url
                : post.author.profileImage
            } : null
          },
          location: post.location ? {
            id: post.location.id,
            name: post.location.name,
            coordinates: post.location.coordinates
          } : undefined,
          media,
          engagement: {
            likeCount,
            commentCount,
            shareCount: 0, // Not implemented yet
            saveCount,
            isLiked,
            isSaved
          },
          categories: Array.isArray(post.categories) 
            ? post.categories.map((cat: any) => typeof cat === 'string' ? cat : cat.name || cat.slug)
            : [],
          tags: Array.isArray(post.tags) 
            ? post.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.tag)
            : [],
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          rating: post.rating,
          isPromoted: post.isSponsored || post.isFeatured || false,
          // Add engagement score for sorting
          _engagementScore: likeCount + commentCount * 2 + saveCount * 3
        }

        console.log(`📝 Final formatted post ${post.id}:`, {
          id: formattedPost.id,
          mediaCount: formattedPost.media.length,
          mediaTypes: formattedPost.media.map(m => m.type),
          hasVideo: formattedPost.media.some(m => m.type === 'video')
        })

        return {
          type: 'post',
          ...formattedPost
        }
      })
    }

    // Fetch place recommendations (locations)
    let places: any[] = []
    if (typesToFetch.includes('place_recommendation')) {
      const locationsResult = await payload.find({
        collection: 'locations',
        where: { status: { equals: 'published' } },
        sort: '-createdAt',
        page,
        limit,
        depth: 1,
      })
      places = locationsResult.docs.map((loc: any) => {
        // categories: always array of strings
        let categories: string[] = []
        if (Array.isArray(loc.categories)) {
          categories = loc.categories.map((cat: any) =>
            typeof cat === 'string' ? cat : cat?.name || cat?.slug || ''
          ).filter(Boolean)
        }
        // address: always a single string
        let address = ''
        if (typeof loc.address === 'string') {
          address = loc.address
        } else if (loc.address && typeof loc.address === 'object') {
          address = [loc.address.street, loc.address.city, loc.address.state, loc.address.zip, loc.address.country]
            .filter(Boolean)
            .join(', ')
        }
        // photo: featuredImage, or first gallery image, or null
        let photo = null
        if (loc.featuredImage) {
          photo = typeof loc.featuredImage === 'object' ? loc.featuredImage.url : loc.featuredImage
        } else if (Array.isArray(loc.gallery) && loc.gallery.length > 0) {
          const primary = loc.gallery.find((img: any) => img.isPrimary) || loc.gallery[0]
          photo = primary?.image?.url || primary?.image || null
        }
        return {
          type: 'place_recommendation',
          id: loc.id,
          name: loc.name,
          description: loc.description || '',
          photo, // main photo
          image: loc.image ? (typeof loc.image === 'object' ? loc.image.url : loc.image) : null,
          rating: loc.rating || null,
          categories,
          location: loc.coordinates ? { latitude: loc.coordinates.latitude, longitude: loc.coordinates.longitude } : null,
          address,
          createdAt: loc.createdAt,
          updatedAt: loc.updatedAt,
          isPromoted: loc.isFeatured || false
        }
      })
    }

    // Fetch people suggestions (users)
    let people: any[] = []
    if (typesToFetch.includes('people_suggestion')) {
      const usersResult = await payload.find({
        collection: 'users',
        // Removed invalid _status filter
        sort: '-createdAt',
        page,
        limit,
        depth: 1,
      })
      people = usersResult.docs.map((user: any) => ({
        type: 'people_suggestion',
        id: user.id,
        name: user.name,
        bio: user.bio || '',
        profileImage: user.profileImage ? (typeof user.profileImage === 'object' ? user.profileImage.url : user.profileImage) : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    }

    // Mixing algorithm: 2 posts, 1 place, 1 person, repeat
    let i = 0, j = 0, k = 0
    while (i < posts.length || j < places.length || k < people.length) {
      if (i < posts.length) feedItems.push(posts[i++])
      if (i < posts.length) feedItems.push(posts[i++])
      if (j < places.length) feedItems.push(places[j++])
      if (k < people.length) feedItems.push(people[k++])
    }

    // Sort all feed items by createdAt descending (if available)
    feedItems.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime()
      const bDate = new Date(b.createdAt || 0).getTime()
      return bDate - aDate
    })

    // Paginate after mixing
    const paginatedItems = feedItems.slice(0, limit)

    // Build response
    const response: MobileFeedResponse = {
      success: true,
      message: 'Feed retrieved successfully',
      data: {
        posts: paginatedItems, // Now polymorphic and mixed
        pagination: {
          page,
          limit,
          total: feedItems.length,
          totalPages: Math.ceil(feedItems.length / limit),
          hasNext: page * limit < feedItems.length,
          hasPrev: page > 1,
          nextCursor: paginatedItems.length > 0 ? paginatedItems[paginatedItems.length - 1]?.createdAt : undefined
        },
        meta: {
          feedType,
          appliedFilters: {
            category,
            sortBy
          }
        }
      }
    }

    console.log(`✅ Returning ${paginatedItems.length} posts successfully`)
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': feedType === 'personalized' || feedType === 'following'
          ? 'private, no-cache, no-store, must-revalidate'
          : sortBy === 'createdAt'
          ? 'public, max-age=30, must-revalidate'
          : 'public, max-age=120, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Authorization'
      }
    })

  } catch (error: unknown) {
    console.error('❌ Mobile feed error:', error)
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack)
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? `Feed service unavailable: ${error.message}` : 'Feed service unavailable',
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