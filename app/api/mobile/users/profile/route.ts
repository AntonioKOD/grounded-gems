import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Helper function to convert interest IDs to names
async function getInterestNames(interestIds: string[], payload: any): Promise<string[]> {
  if (!interestIds || interestIds.length === 0) {
    return []
  }
  
  try {
    // Fetch categories by IDs
    const categoriesResult = await payload.find({
      collection: 'categories',
      where: {
        id: { in: interestIds }
      },
      limit: 100,
      depth: 0
    })
    
    // Extract category names
    return categoriesResult.docs.map((category: any) => category.name || category.title || 'Unknown')
  } catch (error) {
    console.warn('Failed to fetch interest names:', error)
    // Return the IDs as fallback
    return interestIds
  }
}

// Query parameters validation
const profileQuerySchema = z.object({
  userId: z.string().optional(), // User ID to fetch, defaults to current user
  includeStats: z.string().optional().transform(val => val === 'true'),
  includePosts: z.string().optional().transform(val => val === 'true'),
  postsLimit: z.string().optional().transform(val => parseInt(val || '10')),
  includeFollowers: z.string().optional().transform(val => val === 'true'),
  includeFollowing: z.string().optional().transform(val => val === 'true'),
  includeFullData: z.string().optional().transform(val => val === 'true'), // Include all data for complete web app parity
})

interface MobileProfileResponse {
  success: boolean
  message: string
  data?: {
    user: {
      id: string
      name: string
      email: string
      username?: string
      profileImage?: {
        url: string
      } | null
      coverImage?: {
        url: string
      } | null
      bio?: string
      location?: {
        coordinates?: {
          latitude: number
          longitude: number
        }
        address?: string
        city?: string
        state?: string
        country?: string
      }
      role: string
      isCreator: boolean
      creatorLevel?: string
      isVerified: boolean
      preferences: {
        categories: string[]
        notifications: boolean
        radius: number
        primaryUseCase?: string
        budgetPreference?: string
        travelRadius?: number
      }
      stats: {
        postsCount: number
        followersCount: number
        followingCount: number
        savedPostsCount: number
        likedPostsCount: number
        locationsCount: number
        reviewCount: number
        recommendationCount: number
        averageRating?: number
      }
      socialLinks?: Array<{
        platform: string
        url: string
      }>
      interests?: string[]
      deviceInfo?: {
        platform?: string
        appVersion?: string
        lastSeen?: string
      }
      isFollowing?: boolean // Only included if viewing another user's profile
      isFollowedBy?: boolean // Only included if viewing another user's profile
      joinedAt: string
      lastLogin?: string
      website?: string
      // Additional fields for complete web app parity
      following?: string[] // Array of user IDs
      followers?: string[] // Array of user IDs
    }
    recentPosts?: Array<{
      id: string
      title?: string
      content: string
      caption?: string
      featuredImage?: {
        url: string
      } | null
      image?: any
      video?: any
      videoThumbnail?: any
      photos?: any[]
      videos?: any[]
      media?: any[]
      likeCount: number
      commentCount: number
      shareCount: number
      saveCount: number
      rating?: number
      tags?: string[]
      location?: {
        id: string
        name: string
      }
      createdAt: string
      updatedAt: string
      type?: string
      mimeType?: string
    }>
    followers?: Array<{
      id: string
      name: string
      username?: string
      email: string
      profileImage?: {
        url: string
      } | null
      bio?: string
      location?: string
      isVerified: boolean
      followerCount?: number
    }>
    following?: Array<{
      id: string
      name: string
      username?: string
      email: string
      profileImage?: {
        url: string
      } | null
      bio?: string
      location?: string
      isVerified: boolean
      followerCount?: number
    }>
  }
  error?: string
  code?: string
}

// GET /api/v1/mobile/users/profile - Get user profile
export async function GET(request: NextRequest): Promise<NextResponse<MobileProfileResponse>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = profileQuerySchema.safeParse(Object.fromEntries(searchParams))
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

    const { 
      userId: requestedUserId, 
      includeStats = true, 
      includePosts = false, 
      postsLimit = 10,
      includeFollowers = false,
      includeFollowing = false,
      includeFullData = false
    } = queryValidation.data

    // Get current authenticated user
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      const cookieHeader = request.headers.get('Cookie')
      
      // Check for Bearer token in Authorization header
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('🔐 [Profile API] Authenticated user via Bearer token:', user?.id)
      }
      // Check for payload-token in Cookie header (fallback for mobile apps)
      else if (cookieHeader?.includes('payload-token=')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('🔐 [Profile API] Authenticated user via cookie:', user?.id)
      }
    } catch (authError) {
      console.log('🔐 [Profile API] Auth error:', authError)
      // If no user ID provided, authentication is required
      if (!requestedUserId) {
        console.log('🔐 [Profile API] No user ID provided and no auth token')
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
    }

    // Determine which user profile to fetch
    const targetUserId = requestedUserId || currentUser?.id
    const isOwnProfile = currentUser?.id === targetUserId

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'No user ID provided and no authenticated user',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    console.log('🔍 [Profile API] Fetching profile for user:', targetUserId)
    console.log('🔍 [Profile API] Is own profile:', isOwnProfile)

    // Get detailed user information with full depth
    const targetUser = await payload.findByID({
      collection: 'users',
      id: targetUserId,
      depth: 3, // Increased depth to get all related data
    })

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'User account does not exist',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    console.log('🔍 [Profile API] User found:', targetUser.name)
    console.log('🔍 [Profile API] User interests:', targetUser.interests)
    console.log('🔍 [Profile API] User social links:', targetUser.socialLinks)

    // Get user statistics
    let stats = {
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      savedPostsCount: 0,
      likedPostsCount: 0,
      locationsCount: 0,
      reviewCount: 0,
      recommendationCount: 0,
      averageRating: undefined as number | undefined,
    }

    if (includeStats) {
      try {
        // Get posts count for this specific user
        const postsResult = await payload.find({
          collection: 'posts',
          where: {
            author: { equals: targetUserId },
            status: { equals: 'published' }
          },
          limit: 0, // Just get the count
        })
        
        stats.postsCount = postsResult.totalDocs
        console.log('🔍 [Profile API] Posts count:', stats.postsCount)

        // Get locations count (if user has created locations)
        const locationsResult = await payload.find({
          collection: 'locations',
          where: {
            createdBy: { equals: targetUserId }
          },
          limit: 0,
        })
        stats.locationsCount = locationsResult.totalDocs

        // Get reviews count
        const reviewsResult = await payload.find({
          collection: 'reviews',
          where: {
            author: { equals: targetUserId }
          },
          limit: 0,
        })
        stats.reviewCount = reviewsResult.totalDocs

        // Get saved posts count
        const savedPostsResult = await payload.find({
          collection: 'posts',
          where: {
            'savedBy': { contains: targetUserId }
          },
          limit: 0,
        })
        stats.savedPostsCount = savedPostsResult.totalDocs

        // Get liked posts count
        const likedPostsResult = await payload.find({
          collection: 'posts',
          where: {
            'likes': { contains: targetUserId }
          },
          limit: 0,
        })
        stats.likedPostsCount = likedPostsResult.totalDocs

        // Get followers count - use the user's followers array if available
        if (targetUser.followers && Array.isArray(targetUser.followers)) {
          stats.followersCount = targetUser.followers.length
        } else {
          // Fallback to querying all users
          const followersResult = await payload.find({
            collection: 'users',
            where: {
              following: { contains: targetUserId }
            },
            limit: 0,
          })
          stats.followersCount = followersResult.totalDocs
        }

        // Get following count
        if (targetUser.following && Array.isArray(targetUser.following)) {
          stats.followingCount = targetUser.following.length
        }

        // Calculate average rating from reviews
        if (stats.reviewCount > 0) {
          const reviewsWithRatings = await payload.find({
            collection: 'reviews',
            where: {
              author: { equals: targetUserId },
              rating: { exists: true }
            },
            limit: 100,
          })
          
          const totalRating = reviewsWithRatings.docs.reduce((sum: number, review: any) => {
            return sum + (review.rating || 0)
          }, 0)
          
          if (reviewsWithRatings.docs.length > 0) {
            stats.averageRating = totalRating / reviewsWithRatings.docs.length
          }
        }

        console.log('🔍 [Profile API] Stats calculated:', stats)

      } catch (statsError) {
        console.warn('Failed to fetch user stats:', statsError)
      }
    }

    // Check follow relationship if viewing another user's profile
    let isFollowing = false
    let isFollowedBy = false

    if (currentUser && !isOwnProfile) {
      try {
        // Check if current user follows target user
        if (currentUser.following && Array.isArray(currentUser.following)) {
          isFollowing = currentUser.following.some((item: any) => {
            if (typeof item === 'string') {
              return item === targetUserId
            } else if (item && typeof item === 'object' && item.id) {
              return item.id === targetUserId
            }
            return false
          })
        }

        // Check if target user follows current user
        if (targetUser.following && Array.isArray(targetUser.following)) {
          isFollowedBy = targetUser.following.some((item: any) => {
            if (typeof item === 'string') {
              return item === currentUser.id
            } else if (item && typeof item === 'object' && item.id) {
              return item.id === currentUser.id
            }
            return false
          })
        }
      } catch (followError) {
        console.warn('Failed to check follow relationship:', followError)
      }
    }

    // Get recent posts if requested
    let recentPosts: any[] = []
    if (includePosts || includeFullData) {
      try {
        console.log('🔍 [Profile API] Fetching posts for user:', targetUserId)
        console.log('🔍 [Profile API] includePosts:', includePosts, 'includeFullData:', includeFullData)
        
        const postsResult = await payload.find({
          collection: 'posts',
          where: {
            author: { equals: targetUserId },
            status: { equals: 'published' }
          },
          sort: 'createdAt-desc',
          limit: postsLimit,
          depth: 2
        })

        console.log('🔍 [Profile API] Found posts:', postsResult.docs.length)
        console.log('🔍 [Profile API] Posts query result:', {
          totalDocs: postsResult.totalDocs,
          limit: postsLimit,
          hasNextPage: postsResult.hasNextPage,
          hasPrevPage: postsResult.hasPrevPage
        })

        // Debug each post
        postsResult.docs.forEach((post: any, index: number) => {
          console.log(`🔍 [Profile API] Post ${index + 1}:`, {
            id: post.id,
            title: post.title,
            content: post.content?.substring(0, 100) + '...',
            type: post.type,
            status: post.status,
            author: post.author,
            featuredImage: post.featuredImage,
            media: post.media?.length || 0,
            video: post.video,
            videoThumbnail: post.videoThumbnail,
            videos: post.videos,
            mimeType: post.mimeType,
            createdAt: post.createdAt
          })
        })

        recentPosts = postsResult.docs.map((post: any) => {
          // Process featured image
          let featuredImageUrl = null
          if (post.featuredImage) {
            if (typeof post.featuredImage === 'object' && post.featuredImage.url) {
              featuredImageUrl = post.featuredImage.url
            } else if (typeof post.featuredImage === 'string') {
              featuredImageUrl = post.featuredImage
            }
          }

          // Process media array
          let mediaArray = []
          if (post.media && Array.isArray(post.media)) {
            mediaArray = post.media.map((mediaItem: any) => {
              if (typeof mediaItem === 'object' && mediaItem.url) {
                return mediaItem.url
              } else if (typeof mediaItem === 'string') {
                return mediaItem
              }
              return null
            }).filter(Boolean)
          }

          // Process photos array - convert complex objects to simple URLs
          let photosArray = []
          if (post.photos && Array.isArray(post.photos)) {
            photosArray = post.photos.map((photoItem: any) => {
              if (typeof photoItem === 'object' && photoItem.url) {
                return photoItem.url
              } else if (typeof photoItem === 'string') {
                return photoItem
              }
              return null
            }).filter(Boolean)
          }

          // Process video field - convert complex objects to simple URLs
          let videoUrl = null
          if (post.video) {
            if (typeof post.video === 'object' && post.video.url) {
              videoUrl = post.video.url
            } else if (typeof post.video === 'string') {
              videoUrl = post.video
            }
          }

          // Process videoThumbnail field
          let videoThumbnailUrl = null
          if (post.videoThumbnail) {
            if (typeof post.videoThumbnail === 'object' && post.videoThumbnail.url) {
              videoThumbnailUrl = post.videoThumbnail.url
            } else if (typeof post.videoThumbnail === 'string') {
              videoThumbnailUrl = post.videoThumbnail
            }
          }

          // Process videos array - convert complex objects to simple URLs
          let videosArray = []
          if (post.videos && Array.isArray(post.videos)) {
            videosArray = post.videos.map((videoItem: any) => {
              if (typeof videoItem === 'object' && videoItem.url) {
                return videoItem.url
              } else if (typeof videoItem === 'string') {
                return videoItem
              }
              return null
            }).filter(Boolean)
          }

          // Debug video processing
          console.log(`🔍 [Profile API] Video processing for post ${post.id}:`, {
            originalVideo: post.video,
            processedVideo: videoUrl,
            originalVideoThumbnail: post.videoThumbnail,
            processedVideoThumbnail: videoThumbnailUrl,
            originalVideos: post.videos,
            processedVideos: videosArray,
            type: post.type,
            mimeType: post.mimeType
          })

          const processedPost = {
            id: post.id,
            title: post.title,
            content: post.content?.length > 150 
              ? post.content.substring(0, 150) + '...' 
              : post.content,
            caption: post.caption || post.content,
            featuredImage: featuredImageUrl ? { url: featuredImageUrl } : null,
            image: post.image,
            video: videoUrl,
            videoThumbnail: videoThumbnailUrl,
            photos: photosArray.length > 0 ? photosArray : undefined,
            videos: videosArray.length > 0 ? videosArray : undefined,
            media: mediaArray.length > 0 ? mediaArray : undefined,
            likeCount: post.likeCount || (Array.isArray(post.likes) ? post.likes.length : 0),
            commentCount: post.commentCount || (Array.isArray(post.comments) ? post.comments.length : 0),
            shareCount: post.shareCount || 0,
            saveCount: post.saveCount || 0,
            rating: post.rating,
            tags: post.tags || [],
            location: post.location ? {
              id: typeof post.location === 'object' ? post.location.id : post.location,
              name: typeof post.location === 'object' ? post.location.name : 'Unknown Location'
            } : undefined,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            type: post.type || 'post',
            mimeType: post.mimeType
          }



          console.log(`🔍 [Profile API] Processed post ${post.id}:`, {
            id: processedPost.id,
            content: processedPost.content?.substring(0, 50) + '...',
            featuredImage: processedPost.featuredImage?.url,
            video: processedPost.video,
            videoThumbnail: processedPost.videoThumbnail,
            videos: processedPost.videos,
            type: processedPost.type,
            mimeType: processedPost.mimeType,
            likeCount: processedPost.likeCount,
            commentCount: processedPost.commentCount
          })

          return processedPost
        })

        console.log('🔍 [Profile API] Processed posts:', recentPosts.length)
        console.log('🔍 [Profile API] Final posts array:', recentPosts.map(p => ({ 
          id: p.id, 
          type: p.type, 
          content: p.content?.substring(0, 30),
          video: p.video,
          videos: p.videos,
          mimeType: p.mimeType
        })))

      } catch (postsError) {
        console.error('🔍 [Profile API] Failed to fetch user posts:', postsError)
        console.error('🔍 [Profile API] Posts error stack:', postsError instanceof Error ? postsError.stack : 'No stack trace')
      }
    } else {
      console.log('🔍 [Profile API] Skipping posts fetch - includePosts:', includePosts, 'includeFullData:', includeFullData)
    }

    // Get followers list if requested
    let followers: any[] = []
    if (includeFollowers || includeFullData) {
      try {
        console.log('🔍 [Profile API] Fetching followers for user:', targetUserId)
        const followersResult = await payload.find({
          collection: 'users',
          where: {
            following: { contains: targetUserId }
          },
          limit: 50,
          depth: 1
        })

        console.log('🔍 [Profile API] Found followers:', followersResult.docs.length)

        followers = followersResult.docs.map((user: any) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email || '', // Add email field for iOS compatibility
          profileImage: user.profileImage ? {
            url: typeof user.profileImage === 'object' && user.profileImage.url
              ? user.profileImage.url 
              : typeof user.profileImage === 'string'
              ? user.profileImage
              : ''
          } : null,
          bio: user.bio,
          location: user.location ? 
            [user.location.city, user.location.state, user.location.country].filter(Boolean).join(', ') 
            : undefined,
          isVerified: user.isVerified || false,
          followerCount: user.followerCount || 0 // Add followerCount for iOS compatibility
        }))
      } catch (followersError) {
        console.warn('Failed to fetch followers:', followersError)
      }
    }

    // Get following list if requested
    let following: any[] = []
    if ((includeFollowing || includeFullData) && targetUser.following && Array.isArray(targetUser.following)) {
      try {
        console.log('🔍 [Profile API] Fetching following for user:', targetUserId)
        console.log('🔍 [Profile API] Following array:', targetUser.following)
        
        // Extract user IDs from the following array, handling both string IDs and full user objects
        const followingIds = targetUser.following.slice(0, 50).map((item: any) => {
          if (typeof item === 'string') {
            return item
          } else if (item && typeof item === 'object' && item.id) {
            return item.id
          } else {
            console.warn('Invalid following item:', item)
            return null
          }
        }).filter(Boolean) // Remove null values
        
        console.log('🔍 [Profile API] Following IDs:', followingIds)
        
        const followingUsers = await Promise.all(
          followingIds.map(async (followingId: string) => {
            try {
              const user = await payload.findByID({
                collection: 'users',
                id: followingId,
                depth: 1
              })
              return {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email || '', // Add email field for iOS compatibility
                profileImage: user.profileImage ? {
                  url: typeof user.profileImage === 'object' && user.profileImage.url
                    ? user.profileImage.url 
                    : typeof user.profileImage === 'string'
                    ? user.profileImage
                    : ''
                } : null,
                bio: user.bio,
                location: user.location ? 
                  [user.location.city, user.location.state, user.location.country].filter(Boolean).join(', ') 
                  : undefined,
                isVerified: user.isVerified || false,
                followerCount: user.followerCount || 0 // Add followerCount for iOS compatibility
              }
            } catch (error) {
              console.warn(`Failed to fetch following user ${followingId}:`, error)
              return null
            }
          })
        )
        following = followingUsers.filter(user => user !== null)
        console.log('🔍 [Profile API] Processed following users:', following.length)
      } catch (followingError) {
        console.warn('Failed to fetch following:', followingError)
      }
    }

    // Get interest names for better display
    const interestNames = await getInterestNames(targetUser.interests || [], payload)
    console.log('🔍 [Profile API] Interest names:', interestNames)
    console.log('🔍 [Profile API] Raw interests from user:', targetUser.interests)

    // Debug social links
    console.log('🔍 [Profile API] Raw social links from user:', targetUser.socialLinks)
    console.log('🔍 [Profile API] Social links type:', typeof targetUser.socialLinks)
    console.log('🔍 [Profile API] Social links is array:', Array.isArray(targetUser.socialLinks))

    // Prepare mobile-optimized response
    const response: MobileProfileResponse = {
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: {
          id: String(targetUser.id),
          name: targetUser.name || '',
          email: isOwnProfile ? targetUser.email : '', // Only show email for own profile
          username: targetUser.username,
          profileImage: targetUser.profileImage ? {
            url: typeof targetUser.profileImage === 'object' && targetUser.profileImage.url
              ? targetUser.profileImage.url 
              : typeof targetUser.profileImage === 'string'
              ? targetUser.profileImage
              : ''
          } : null,
          coverImage: targetUser.coverImage ? {
            url: typeof targetUser.coverImage === 'object' && targetUser.coverImage.url
              ? targetUser.coverImage.url 
              : typeof targetUser.coverImage === 'string'
              ? targetUser.coverImage
              : ''
          } : null,
          bio: targetUser.bio,
          location: targetUser.location && targetUser.location.coordinates && typeof targetUser.location.coordinates.latitude === 'number' && typeof targetUser.location.coordinates.longitude === 'number'
            ? {
                coordinates: {
                  latitude: targetUser.location.coordinates.latitude,
                  longitude: targetUser.location.coordinates.longitude
                },
                address: targetUser.location.address,
                city: targetUser.location.city,
                state: targetUser.location.state,
                country: targetUser.location.country,
              }
            : targetUser.location && (targetUser.location.address || targetUser.location.city || targetUser.location.state || targetUser.location.country)
            ? {
                address: targetUser.location.address,
                city: targetUser.location.city,
                state: targetUser.location.state,
                country: targetUser.location.country,
              }
            : undefined,
          role: targetUser.role || 'user',
          isCreator: targetUser.isCreator || false,
          creatorLevel: targetUser.creatorProfile?.creatorLevel || targetUser.creatorLevel,
          isVerified: targetUser.isVerified || targetUser.creatorProfile?.verification?.isVerified || false,
          preferences: {
            categories: targetUser.interests || [],
            notifications: targetUser.notificationSettings?.enabled ?? true,
            radius: targetUser.searchRadius || 25,
            primaryUseCase: targetUser.onboardingData?.primaryUseCase,
            budgetPreference: targetUser.onboardingData?.budgetPreference,
            travelRadius: targetUser.onboardingData?.travelRadius
          },
          stats,
          socialLinks: targetUser.socialLinks || [],
          interests: interestNames,
          deviceInfo: isOwnProfile ? (targetUser.deviceInfo ? {
            platform: targetUser.deviceInfo.platform,
            appVersion: targetUser.deviceInfo.appVersion,
            lastSeen: targetUser.deviceInfo.lastSeen,
          } : undefined) : undefined, // Only show device info for own profile
          isFollowing: !isOwnProfile ? isFollowing : undefined,
          isFollowedBy: !isOwnProfile ? isFollowedBy : undefined,
          joinedAt: targetUser.createdAt,
          lastLogin: isOwnProfile ? targetUser.lastLogin : undefined, // Only show last login for own profile
          website: targetUser.website || targetUser.creatorProfile?.website,
          // Add following and followers arrays for complete web app parity
          following: Array.isArray(targetUser.following) ? targetUser.following.map((item: any) => {
            if (typeof item === 'string') {
              return item
            } else if (item && typeof item === 'object' && item.id) {
              return item.id
            } else {
              console.warn('Invalid following item in response mapping:', item)
              return null
            }
          }).filter(Boolean) : [],
          followers: Array.isArray(targetUser.followers) ? targetUser.followers.map((item: any) => {
            if (typeof item === 'string') {
              return item
            } else if (item && typeof item === 'object' && item.id) {
              return item.id
            } else {
              console.warn('Invalid follower item in response mapping:', item)
              return null
            }
          }).filter(Boolean) : [],
        },
        recentPosts: recentPosts.length > 0 ? recentPosts : undefined,
        followers: followers.length > 0 ? followers : undefined,
        following: following.length > 0 ? following : undefined,
      },
    }

    console.log('🔍 [Profile API] Response prepared successfully')
    console.log('🔍 [Profile API] User data included:', {
      name: response.data?.user.name,
      postsCount: response.data?.user.stats.postsCount,
      interestsCount: response.data?.user.interests?.length,
      socialLinksCount: response.data?.user.socialLinks?.length,
      recentPostsCount: response.data?.recentPosts?.length
    })
    
    // Debug the final response structure
    console.log('🔍 [Profile API] Final response structure:', {
      success: response.success,
      hasUser: !!response.data?.user,
      hasPosts: !!response.data?.recentPosts,
      postsLength: response.data?.recentPosts?.length || 0,
      userInterests: response.data?.user.interests,
      userSocialLinks: response.data?.user.socialLinks,
      userBio: response.data?.user.bio,
      userStats: response.data?.user.stats
    })

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': isOwnProfile 
          ? 'private, max-age=300' // 5 minutes for own profile
          : 'public, max-age=600', // 10 minutes for other profiles
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Authorization'
      }
    })

  } catch (error) {
    console.error('Mobile profile error:', error)
    console.error('Mobile profile error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Profile service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/mobile/users/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get current authenticated user
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
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

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authenticated user found',
          code: 'NO_USER'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log(`Mobile API: Updating profile for user ${currentUser.id}`)

    // Validate update data
    const updateData: any = {}
    
    // Basic profile fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.username !== undefined) updateData.username = body.username
    if (body.bio !== undefined) updateData.bio = body.bio
    if (body.email !== undefined) updateData.email = body.email
    if (body.website !== undefined) updateData.website = body.website
    
    // Location data
    if (body.location !== undefined) updateData.location = body.location
    
    // Preferences
    if (body.interests !== undefined) updateData.interests = body.interests
    if (body.searchRadius !== undefined) updateData.searchRadius = body.searchRadius
    if (body.notificationSettings !== undefined) updateData.notificationSettings = body.notificationSettings
    
    // Social links
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks
    
    // Device info
    if (body.deviceInfo !== undefined) updateData.deviceInfo = body.deviceInfo

    // Update the user
    const updatedUser = await payload.update({
      collection: 'users',
      id: currentUser.id,
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    })
  } catch (error) {
    console.error('Mobile API: Error updating user profile:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user profile',
        message: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 