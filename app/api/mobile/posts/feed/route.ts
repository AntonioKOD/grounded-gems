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

        console.log(`📊 Post ${post.id} engagement state:`, {
          likeCount,
          commentCount,
          saveCount,
          isLiked,
          isSaved,
          currentUserId: currentUser?.id
        })

        // Enhanced media handling with better video support and proper URL processing
        let media: any[] = []
        
        // Helper function to process media URLs
        const processMediaUrl = (mediaItem: any): string | null => {
          if (!mediaItem) return null
          
          console.log('📹 processMediaUrl: Processing media item:', {
            type: typeof mediaItem,
            isString: typeof mediaItem === 'string',
            isObject: typeof mediaItem === 'object',
            mediaItem: mediaItem
          })
          
          let url: string | null = null
          
          // Handle string URLs
          if (typeof mediaItem === 'string' && mediaItem.trim() !== '') {
            url = mediaItem.trim()
            console.log('📹 processMediaUrl: String URL:', url)
          }
          // Handle PayloadCMS media objects
          else if (typeof mediaItem === 'object' && mediaItem !== null) {
            console.log('📹 processMediaUrl: Object keys:', Object.keys(mediaItem))
            
            // Try different URL sources in order of preference
            if (mediaItem.url) {
              url = mediaItem.url
              console.log('📹 processMediaUrl: Found URL in mediaItem.url:', url)
            } else if (mediaItem.filename) {
              url = `/api/media/file/${mediaItem.filename}`
              console.log('📹 processMediaUrl: Constructed URL from filename:', url)
            } else if (mediaItem.sizes?.card?.url) {
              url = mediaItem.sizes.card.url
              console.log('📹 processMediaUrl: Found URL in mediaItem.sizes.card.url:', url)
            } else if (mediaItem.sizes?.thumbnail?.url) {
              url = mediaItem.sizes.thumbnail.url
              console.log('📹 processMediaUrl: Found URL in mediaItem.sizes.thumbnail.url:', url)
            } else if (mediaItem.thumbnailURL) {
              url = mediaItem.thumbnailURL
              console.log('📹 processMediaUrl: Found URL in mediaItem.thumbnailURL:', url)
            } else if (mediaItem.id) {
              // If we have an ID but no URL, construct the URL
              url = `/api/media/file/${mediaItem.id}`
              console.log('📹 processMediaUrl: Constructed URL from ID:', url)
            }
          }
          
          if (!url) {
            console.log('📹 processMediaUrl: No URL found')
            return null
          }
          
          // Fix CORS issues by ensuring URLs use the same domain
          if (url.startsWith('/') && !url.startsWith('http')) {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
            url = `${baseUrl}${url}`
            console.log('📹 processMediaUrl: Added base URL:', url)
          } else if (url.startsWith('http')) {
            try {
              const currentDomain = 'sacavia.com' // Default domain
              const urlObj = new URL(url)
              
              if (urlObj.hostname === 'www.sacavia.com' && currentDomain === 'sacavia.com') {
                // Fix CORS issues by normalizing www/non-www between sacavia.com and www.sacavia.com
                // Always match the base domain (from NEXT_PUBLIC_SITE_URL if available)
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://sacavia.com';
                try {
                  const baseDomain = new URL(baseUrl).hostname.replace(/^www\./, '');
                  const urlDomain = urlObj.hostname.replace(/^www\./, '');
                  if (urlDomain === baseDomain) {
                    // Make sure www matches base
                    if (/^www\./.test(new URL(baseUrl).hostname)) {
                      urlObj.hostname = `www.${baseDomain}`;
                    } else {
                      urlObj.hostname = baseDomain;
                    }
                    url = urlObj.toString();
                  }
                } catch (e) {
                  // fallback: do nothing
                }
                console.log('📹 processMediaUrl: Fixed CORS URL:', url)
              }
            } catch (error) {
              console.warn('📹 processMediaUrl: Error processing media URL:', error)
            }
          }
          console.log('📹 processMediaUrl: Final URL:', url)
          return url
        }
        
        // Add main image
        let mainImageUrl: string | null = null
        if (post.image) {
          mainImageUrl = processMediaUrl(post.image)
          if (mainImageUrl) {
            media.push({
              type: 'image',
              url: mainImageUrl,
              alt: typeof post.image === 'object' ? post.image.alt : undefined
            })
            console.log(`📸 Added image to post ${post.id}:`, mainImageUrl)
          }
        }

        // Add video if exists - reels-style (no thumbnail)
        let videoItem = null
        if (post.video) {
          console.log(`📹 Processing video for post ${post.id}:`, {
            videoType: typeof post.video,
            videoKeys: typeof post.video === 'object' ? Object.keys(post.video) : 'N/A',
            video: post.video
          })
          
          const videoUrl = processMediaUrl(post.video)
          console.log(`📹 Video URL for post ${post.id}:`, videoUrl)
          
          if (videoUrl) {
            videoItem = {
              type: 'video',
              url: videoUrl,
              // Use video URL as thumbnail for now - the video element will generate its own poster
              thumbnail: videoUrl,
              duration: typeof post.video === 'object' ? post.video.duration : undefined,
              alt: 'Post video'
            }
            console.log(`📹 Added video to post ${post.id}:`, videoItem)
          } else {
            console.log(`📹 Failed to process video URL for post ${post.id}`)
          }
        } else {
          console.log(`📹 No video found for post ${post.id}`)
        }

        // Add photos array if exists, skipping duplicates
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
            .filter((photo: any) => photo !== null && photo.url !== mainImageUrl) // Only include photos with valid URLs and not the main image
          media.push(...validPhotos)
          console.log(`📸 Added ${validPhotos.length} photos to post ${post.id}`)
        }

        // Always put video first if it exists
        if (videoItem) {
          media.unshift(videoItem)
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

    // Fetch people suggestions (users) - Enhanced with Instagram/Facebook-like organization
    let people: any[] = []
    if (typesToFetch.includes('people_suggestion')) {
      try {
        // Get current user's location and following list for better suggestions
        const currentUserLocation = currentUser?.location?.coordinates
        const currentUserFollowing = currentUser?.following || []
        const currentUserFollowers = currentUser?.followers || []
        
        // Build query to exclude current user and get nearby users
        const whereConditions: any[] = [
          { id: { not_equals: currentUser?.id } } // Exclude current user
        ]
        
        // Get users with location data for nearby suggestions
        const usersResult = await payload.find({
          collection: 'users',
          where: {
            and: whereConditions
          },
          sort: '-createdAt',
          page,
          limit: limit * 3, // Get more to filter and organize
          depth: 2,
        })
        
        // Process and categorize users
        const processedUsers = usersResult.docs.map((user: any) => {
          // Calculate mutual followers
          const userFollowing = user.following || []
          const userFollowers = user.followers || []
          const mutualFollowers = currentUserFollowing.filter((id: string) => 
            userFollowers.includes(id)
          )
          
          // Calculate distance if both users have location
          let distance: number | null = null
          if (currentUserLocation && user.location?.coordinates) {
            const userLat = user.location.coordinates.latitude
            const userLng = user.location.coordinates.longitude
            if (userLat && userLng) {
              distance = calculateDistance(
                currentUserLocation.latitude,
                currentUserLocation.longitude,
                userLat,
                userLng
              )
            }
          }
          
          // Calculate suggestion score based on various factors
          let suggestionScore = 0
          
          // Mutual followers boost
          suggestionScore += mutualFollowers.length * 10
          
          // Nearby users boost (within 25 miles)
          if (distance && distance <= 25) {
            suggestionScore += Math.max(0, 25 - distance) * 2
          }
          
          // Active users boost (recent activity)
          if (user.lastLogin) {
            const daysSinceLastLogin = (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24)
            if (daysSinceLastLogin <= 7) suggestionScore += 5
            else if (daysSinceLastLogin <= 30) suggestionScore += 2
          }
          
          // Profile completeness boost
          if (user.profileImage) suggestionScore += 3
          if (user.bio) suggestionScore += 2
          if (user.username) suggestionScore += 1
          
          return {
            type: 'people_suggestion',
            id: user.id,
            name: user.name,
            username: user.username || null,
            bio: user.bio || '',
            profileImage: user.profileImage ? (typeof user.profileImage === 'object' ? user.profileImage.url : user.profileImage) : null,
            location: user.location?.coordinates ? {
              latitude: user.location.coordinates.latitude,
              longitude: user.location.coordinates.longitude
            } : null,
            distance: distance,
            mutualFollowers: mutualFollowers.length,
            mutualFollowersList: mutualFollowers.slice(0, 3), // Show first 3 mutual followers
            followersCount: userFollowers.length,
            followingCount: userFollowing.length,
            isFollowing: currentUserFollowing.includes(user.id),
            isFollowedBy: currentUserFollowers.includes(user.id),
            suggestionScore,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLogin: user.lastLogin
          }
        })
        
        // Sort by suggestion score and organize into categories
        const sortedUsers = processedUsers.sort((a, b) => b.suggestionScore - a.suggestionScore)
        
        // Organize into Instagram/Facebook-like categories
        const nearbyUsers = sortedUsers.filter(user => user.distance && user.distance <= 25)
        const mutualConnectionUsers = sortedUsers.filter(user => user.mutualFollowers > 0 && (!user.distance || user.distance > 25))
        const otherUsers = sortedUsers.filter(user => user.mutualFollowers === 0 && (!user.distance || user.distance > 25))
        
        // Create categorized people suggestions
        people = []
        
        // Add nearby users first (if any)
        if (nearbyUsers.length > 0) {
          people.push({
            type: 'people_suggestion',
            category: 'nearby',
            title: 'People Near You',
            subtitle: `${nearbyUsers.length} people nearby`,
            users: nearbyUsers.slice(0, 5)
          })
        }
        
        // Add mutual connection users
        if (mutualConnectionUsers.length > 0) {
          people.push({
            type: 'people_suggestion',
            category: 'mutual',
            title: 'People You May Know',
            subtitle: `${mutualConnectionUsers.length} people with mutual connections`,
            users: mutualConnectionUsers.slice(0, 5)
          })
        }
        
        // Add other users as individual suggestions
        const remainingUsers = otherUsers.slice(0, 3)
        remainingUsers.forEach(user => {
          people.push({
            type: 'people_suggestion',
            category: 'suggested',
            title: 'Suggested for You',
            subtitle: 'Based on your activity',
            users: [user]
          })
        })
        
        console.log(`📱 People suggestions organized: ${nearbyUsers.length} nearby, ${mutualConnectionUsers.length} mutual, ${remainingUsers.length} other`)
        
      } catch (error) {
        console.error('Error fetching people suggestions:', error)
        // Fallback to simple user list if enhanced suggestions fail
        const fallbackUsers = await payload.find({
          collection: 'users',
          where: { id: { not_equals: currentUser?.id } },
          limit: 3,
          depth: 1,
        })
        
        people = fallbackUsers.docs.map((user: any) => ({
          type: 'people_suggestion',
          category: 'suggested',
          title: 'Suggested for You',
          subtitle: 'People you might like',
          users: [{
            id: user.id,
            name: user.name,
            username: user.username || null,
            bio: user.bio || '',
            profileImage: user.profileImage ? (typeof user.profileImage === 'object' ? user.profileImage.url : user.profileImage) : null,
            mutualFollowers: 0,
            followersCount: 0,
            followingCount: 0,
            isFollowing: false,
            isFollowedBy: false,
            suggestionScore: 0,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }]
        }))
      }
    }
    
    // Helper function to calculate distance between two points
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 3959 // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      const distance = R * c
      // Round to 2 decimal places to avoid Swift JSON decoding issues
      return Math.round(distance * 100) / 100
    }

    // Filter out private posts (location.privacy === 'private')
    posts = posts.filter((post: any) => {
      if (post.location && post.location.privacy && post.location.privacy.toLowerCase() === 'private') {
        return false
      }
      return true
    })
    // Filter out private places (privacy === 'private')
    places = places.filter((place: any) => {
      if (place.privacy && place.privacy.toLowerCase() === 'private') {
        return false
      }
      return true
    })

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