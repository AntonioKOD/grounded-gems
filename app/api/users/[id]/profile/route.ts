import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || id.trim() === '') {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const cleanId = id.trim()
    // MongoDB ObjectIds are 24 characters, but let's be more lenient for edge cases
    if (cleanId.length < 8) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
    }

    const payload = await getPayload({ config })
    
    // Get current user from authentication
    let currentUserId: string | undefined
    try {
      // Debug: Log all headers to see what's being sent
      console.log(`🔍 Request headers:`, {
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        authorization: request.headers.get('authorization') ? 'present' : 'missing',
        'user-agent': request.headers.get('user-agent')?.substring(0, 50) + '...'
      })
      
      // Use Payload's built-in authentication (same as /api/users/me)
      const { user } = await payload.auth({ headers: request.headers })
      if (user?.id) {
        currentUserId = String(user.id)
        console.log(`🔍 Found authenticated user: ${currentUserId}`)
      } else {
        console.log(`⚠️ No authenticated user found in payload.auth`)
        
        // Fallback: Try to get user from cookies directly
        const cookieStore = await import('next/headers').then(m => m.cookies())
        const payloadToken = cookieStore.get('payload-token')?.value
        console.log(`🔍 Fallback: payload-token from cookie:`, payloadToken ? 'present' : 'missing')
        
        if (payloadToken) {
          // Try to decode the token to get user ID
          try {
            const tokenData = JSON.parse(Buffer.from(payloadToken.split('.')[1] || '', 'base64').toString())
            if (tokenData.id) {
              currentUserId = String(tokenData.id)
              console.log(`🔍 Found user ID from token: ${currentUserId}`)
            }
          } catch (tokenError) {
            console.log(`⚠️ Could not decode token: ${tokenError}`)
          }
        }
      }
    } catch (authError) {
      console.log(`⚠️ Authentication error: ${authError}`)
      // No authenticated user, continue as guest
    }

    // Get detailed user information
    const targetUser = await payload.findByID({
      collection: "users",
      id: cleanId,
      depth: 1,
      overrideAccess: true,
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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

    // Use existing data from targetUser when possible
    if (targetUser.followers) {
      stats.followersCount = Array.isArray(targetUser.followers) ? targetUser.followers.length : 0
    }
    if (targetUser.following) {
      stats.followingCount = Array.isArray(targetUser.following) ? targetUser.following.length : 0
    }

    // Get additional stats
    try {
      // Get posts count
      const postsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: cleanId },
          status: { equals: 'published' }
        },
        limit: 1,
        depth: 0
      })
      stats.postsCount = postsResult.totalDocs

      // Get saved posts count
      const savedPostsResult = await payload.find({
        collection: 'posts',
        where: {
          'savedBy': { contains: cleanId }
        },
        limit: 1,
        depth: 0
      })
      stats.savedPostsCount = savedPostsResult.totalDocs

      // Get liked posts count
      const likedPostsResult = await payload.find({
        collection: 'posts',
        where: {
          'likes': { contains: cleanId }
        },
        limit: 1,
        depth: 0
      })
      stats.likedPostsCount = likedPostsResult.totalDocs

      // Get locations count
      const locationsResult = await payload.find({
        collection: 'locations',
        where: {
          createdBy: { equals: cleanId }
        },
        limit: 1,
        depth: 0
      })
      stats.locationsCount = locationsResult.totalDocs

      // Get reviews count
      const reviewsResult = await payload.find({
        collection: 'reviews',
        where: {
          author: { equals: cleanId }
        },
        limit: 1,
        depth: 0
      })
      stats.reviewCount = reviewsResult.totalDocs

    } catch (statsError) {
      console.warn("Error fetching user stats:", statsError)
    }

    // Check if current user is following this user
    let isFollowing = false
    let isFollowedBy = false
    
    if (currentUserId && currentUserId !== cleanId) {
      console.log(`🔍 Checking follow status: currentUserId=${currentUserId}, targetUserId=${cleanId}`)
      try {
        // Helper function to check if an array contains a user ID (handles both strings and objects)
        const containsUserId = (array: any[], userId: string) => {
          const normalizedUserId = String(userId)
          const result = Array.isArray(array) && array.some((item: any) => {
            const itemId = typeof item === 'string' ? String(item) : String(item?.id || item)
            const matches = itemId === normalizedUserId
            if (matches) {
              console.log(`✅ Found match: ${itemId} === ${normalizedUserId}`)
            }
            return matches
          })
          console.log(`🔍 containsUserId check: array length=${array?.length || 0}, userId=${normalizedUserId}, result=${result}`)
          return result
        }
        
        console.log(`📊 Target user following array:`, targetUser.following)
        console.log(`📊 Target user followers array:`, targetUser.followers)
        
        // First check: is current user in target user's followers list?
        isFollowedBy = containsUserId(targetUser.followers, currentUserId)
        console.log(`🔍 isFollowedBy (current user in target's followers): ${isFollowedBy}`)
        
        // Second check: is target user in current user's following list?
        const currentUser = await payload.findByID({
          collection: 'users',
          id: currentUserId,
          depth: 0
        })
        
        if (currentUser) {
          console.log(`📊 Current user following array:`, currentUser.following)
          isFollowing = containsUserId(currentUser.following, cleanId)
          console.log(`🔍 isFollowing (target user in current's following): ${isFollowing}`)
        } else {
          console.log(`⚠️ Could not fetch current user data`)
        }
        
        // Final result should be true if either check is true
        const finalIsFollowing = isFollowing || isFollowedBy
        console.log(`🔍 Final isFollowing result: ${finalIsFollowing} (isFollowing: ${isFollowing}, isFollowedBy: ${isFollowedBy})`)
        isFollowing = finalIsFollowing
        
      } catch (followError) {
        console.warn("Error checking follow status:", followError)
      }
    } else {
      console.log(`⚠️ Skipping follow check: currentUserId=${currentUserId}, cleanId=${cleanId}`)
    }

    // Get recent posts
    let recentPosts: any[] = []
    try {
      const postsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: cleanId },
          status: { equals: 'published' }
        },
        sort: '-createdAt',
        limit: 3,
        depth: 1
      })
      
      recentPosts = postsResult.docs.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        image: post.image,
        video: post.video,
        videoThumbnail: post.videoThumbnail,
        photos: post.photos,
        videos: post.videos,
        media: post.media,
        featuredImage: post.featuredImage ? {
          url: typeof post.featuredImage === 'object' ? post.featuredImage.url : post.featuredImage
        } : null,
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
        createdAt: post.createdAt,
        type: post.type,
        rating: post.rating,
        location: post.location,
        mimeType: post.mimeType
      }))
    } catch (postsError) {
      console.warn("Error fetching recent posts:", postsError)
    }

    // Format the response
    const isOwnProfile = currentUserId === cleanId
    
    const profileData = {
      id: String(targetUser.id),
      name: targetUser.name || '',
      email: isOwnProfile ? targetUser.email : '',
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
      location: targetUser.location ? {
        coordinates: targetUser.location.coordinates,
        address: targetUser.location.address,
        city: targetUser.location.city,
        state: targetUser.location.state,
        country: targetUser.location.country,
      } : undefined,
      role: targetUser.role || 'user',
      isCreator: targetUser.isCreator || false,
      creatorLevel: targetUser.creatorLevel,
      isVerified: targetUser.isVerified || false,
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
      interests: targetUser.interests || [],
      deviceInfo: isOwnProfile ? (targetUser.deviceInfo ? {
        platform: targetUser.deviceInfo.platform,
        appVersion: targetUser.deviceInfo.appVersion,
        lastSeen: targetUser.deviceInfo.lastSeen,
      } : undefined) : undefined,
      isFollowing: !isOwnProfile ? isFollowing : undefined,
      isFollowedBy: !isOwnProfile ? isFollowedBy : undefined,
      joinedAt: targetUser.createdAt,
      lastLogin: isOwnProfile ? targetUser.lastLogin : undefined,
      website: targetUser.website,
      recentPosts: recentPosts.length > 0 ? recentPosts : undefined,
      // Add following and followers arrays - extract just the IDs
      following: Array.isArray(targetUser.following) ? targetUser.following.map((item: any) => 
        typeof item === 'string' ? item : item.id
      ) : [],
      followers: Array.isArray(targetUser.followers) ? targetUser.followers.map((item: any) => 
        typeof item === 'string' ? item : item.id
      ) : [],
    }

    console.log(`📤 Returning profile data:`, {
      id: profileData.id,
      isFollowing: profileData.isFollowing,
      isFollowedBy: profileData.isFollowedBy,
      followersCount: profileData.stats.followersCount,
      followers: profileData.followers
    })
    
    return NextResponse.json({ 
      success: true,
      user: profileData 
    })

  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 