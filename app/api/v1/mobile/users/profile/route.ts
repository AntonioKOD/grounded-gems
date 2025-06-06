import { NextRequest, NextResponse } from 'next/server'
import { getUserbyId, getFeedPostsByUser } from '@/app/actions'
import { updateUserProfile, updateCreatorStatus, updateProfileImage, type ProfileUpdateData } from '@/app/(frontend)/profile/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/v1/mobile/users/profile?userId=... - Get user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeStats = searchParams.get('includeStats') === 'true'
    const includePosts = searchParams.get('includePosts') === 'true'
    const postsLimit = parseInt(searchParams.get('postsLimit') || '10')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get current user for context
    const currentUser = await getServerSideUser()
    const currentUserId = currentUser?.id

    console.log(`Mobile API: Getting profile for user ${userId}`)

    const user = await getUserbyId(userId)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      )
    }

    // Format user profile for mobile
    const profileData: any = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profileImage: user.profileImage?.url,
      coverImage: user.coverImage?.url,
      location: user.location,
      interests: user.interests || [],
      socialLinks: user.socialLinks || [],
      isCreator: user.isCreator || false,
      creatorLevel: user.creatorLevel,
      stats: {
        followerCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        postCount: 0, // Will be populated if includeStats is true
        locationsCount: 0
      },
      preferences: {
        primaryUseCase: user.onboardingData?.primaryUseCase,
        budgetPreference: user.onboardingData?.budgetPreference,
        travelRadius: user.onboardingData?.travelRadius
      },
      joinedAt: user.createdAt,
      isFollowing: false // Will be populated if currentUserId is provided
    }

    // Check if current user is following this user
    if (currentUserId && currentUserId !== userId) {
      const { isFollowing } = await import('@/app/actions')
      profileData.isFollowing = await isFollowing(userId, currentUserId)
    }

    // Include posts if requested
    if (includePosts) {
      const posts = await getFeedPostsByUser(userId, undefined, currentUserId)
      profileData.posts = posts.slice(0, postsLimit)
      profileData.stats.postCount = posts.length
    }

    // Include additional stats if requested
    if (includeStats) {
      // Get user's created locations count
      const { getPayload } = await import('payload')
      const config = (await import('@payload-config')).default
      const payload = await getPayload({ config })
      
      const locationsResult = await payload.find({
        collection: 'locations',
        where: {
          createdBy: { equals: userId }
        },
        limit: 0 // Just count
      })
      
      profileData.stats.locationsCount = locationsResult.totalDocs
    }

    return NextResponse.json({
      success: true,
      data: { user: profileData }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching user profile:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/mobile/users/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const updateData: ProfileUpdateData = body

    console.log(`Mobile API: Updating profile for user ${user.id}`)

    const result = await updateUserProfile(user.id, updateData)

    if (result.success) {
      // Get updated user data
      const updatedUser = await getUserbyId(user.id)
      
      return NextResponse.json({
        success: true,
        message: result.message,
        data: { user: updatedUser }
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message
        },
        { status: 400 }
      )
    }
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