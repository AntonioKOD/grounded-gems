import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileFollowResponse {
  success: boolean
  message: string
  data?: {
    isFollowing: boolean
    followersCount: number
    userId: string
  }
  error?: string
  code?: string
}

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MobileFollowResponse>> {
  try {
    const { userId: targetUserId } = await params
    const payload = await getPayload({ config })
    
    console.log(`🔗 [Follow API] Starting follow operation for target user: ${targetUserId}`)

    // Verify authentication - check both Authorization header and Cookie
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('Cookie')
    
    // Check for Bearer token in Authorization header
    const hasBearerToken = authHeader?.startsWith('Bearer ')
    
    // Check for payload-token in Cookie header
    const hasPayloadToken = cookieHeader?.includes('payload-token=')
    
    if (!hasBearerToken && !hasPayloadToken) {
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

    const { user: currentUser } = await payload.auth({ headers: request.headers })
    if (!currentUser) {
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

    // Validate target user ID
    if (!targetUserId || typeof targetUserId !== 'string') {
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

    // Prevent self-following
    if (currentUser.id === targetUserId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot follow yourself',
          error: 'Users cannot follow themselves',
          code: 'SELF_FOLLOW_ATTEMPT'
        },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await payload.findByID({
      collection: 'users',
      id: targetUserId,
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

    // Get current user's following list
    const currentUserData = await payload.findByID({
      collection: 'users',
      id: currentUser.id,
    })

    const currentFollowing = Array.isArray(currentUserData.following) 
      ? currentUserData.following 
      : []

    // Check if already following
    if (currentFollowing.includes(targetUserId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Already following user',
          error: 'You are already following this user',
          code: 'ALREADY_FOLLOWING'
        },
        { status: 409 }
      )
    }

    // Add to following list
    const updatedFollowing = [...currentFollowing, targetUserId]

    await payload.update({
      collection: 'users',
      id: currentUser.id,
      data: {
        following: updatedFollowing,
      },
    })

    // Add current user to target user's followers list
    const targetUserFollowers = Array.isArray(targetUser.followers) 
      ? targetUser.followers 
      : []
    
    const updatedTargetFollowers = [...targetUserFollowers, currentUser.id]
    
    console.log(`🔗 [Follow API] Adding ${currentUser.name} (${currentUser.id}) to ${targetUser.name}'s followers list`)
    console.log(`🔗 [Follow API] Target user followers before: ${targetUserFollowers.length}`)
    console.log(`🔗 [Follow API] Target user followers after: ${updatedTargetFollowers.length}`)
    
    await payload.update({
      collection: 'users',
      id: targetUserId,
      data: {
        followers: updatedTargetFollowers,
      },
    })

    // Calculate new followers count for target user
    const followersResult = await payload.find({
      collection: 'users',
      where: {
        following: { contains: targetUserId }
      },
      limit: 0,
    })

    // Create follow notification (optional)
    try {
      await payload.create({
        collection: 'notifications',
        data: {
          recipient: targetUserId,
          type: 'follow',
          title: 'New Follower',
          message: `${currentUser.name || 'Someone'} started following you`,
          metadata: {
            followerId: currentUser.id,
            followerName: currentUser.name,
            followerAvatar: currentUser.profileImage ? 
              (typeof currentUser.profileImage === 'object' && currentUser.profileImage.url
                ? currentUser.profileImage.url 
                : typeof currentUser.profileImage === 'string'
                ? currentUser.profileImage
                : null) : null
          },
          isRead: false,
          createdAt: new Date(),
        },
      })
    } catch (notificationError) {
      console.warn('Failed to create follow notification:', notificationError)
    }

    const response: MobileFollowResponse = {
      success: true,
      message: 'User followed successfully',
      data: {
        isFollowing: true,
        followersCount: followersResult.totalDocs,
        userId: targetUserId,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile follow error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Follow service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MobileFollowResponse>> {
  try {
    const { userId: targetUserId } = await params
    const payload = await getPayload({ config })
    
    console.log(`🔗 [Unfollow API] Starting unfollow operation for target user: ${targetUserId}`)
    console.log(`🔗 [Unfollow API] Current user ID: ${currentUser.id}`)
    console.log(`🔗 [Unfollow API] Current user name: ${currentUser.name}`)

    // Verify authentication - check both Authorization header and Cookie
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('Cookie')
    
    // Check for Bearer token in Authorization header
    const hasBearerToken = authHeader?.startsWith('Bearer ')
    
    // Check for payload-token in Cookie header
    const hasPayloadToken = cookieHeader?.includes('payload-token=')
    
    if (!hasBearerToken && !hasPayloadToken) {
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

    const { user: currentUser } = await payload.auth({ headers: request.headers })
    if (!currentUser) {
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

    // Validate target user ID
    if (!targetUserId || typeof targetUserId !== 'string') {
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
      id: targetUserId,
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

    // Get current user's following list - use a more reliable method
    const currentUserData = await payload.findByID({
      collection: 'users',
      id: currentUser.id,
    })

    const currentFollowing = Array.isArray(currentUserData.following) 
      ? currentUserData.following 
      : []

    console.log(`🔗 [Unfollow API] Current user following list: ${JSON.stringify(currentFollowing)}`)
    console.log(`🔗 [Unfollow API] Target user ID: ${targetUserId}`)
    console.log(`🔗 [Unfollow API] Is target user in following list? ${currentFollowing.includes(targetUserId)}`)

    // Also check if the target user has the current user in their followers list
    const targetUserData = await payload.findByID({
      collection: 'users',
      id: targetUserId,
    })

    const targetUserFollowers = Array.isArray(targetUserData.followers) 
      ? targetUserData.followers 
      : []

    console.log(`🔗 [Unfollow API] Target user followers list: ${JSON.stringify(targetUserFollowers)}`)
    console.log(`🔗 [Unfollow API] Is current user in target's followers? ${targetUserFollowers.includes(currentUser.id)}`)

    // Check if not following - be more lenient and check both sides
    const isFollowing = currentFollowing.includes(targetUserId)
    const isInFollowers = targetUserFollowers.includes(currentUser.id)
    
    console.log(`🔗 [Unfollow API] Following relationship check: following=${isFollowing}, inFollowers=${isInFollowers}`)

    if (!isFollowing && !isInFollowers) {
      console.log(`🔗 [Unfollow API] No following relationship found, returning 409`)
      return NextResponse.json(
        {
          success: false,
          message: 'Not following user',
          error: 'You are not following this user',
          code: 'NOT_FOLLOWING'
        },
        { status: 409 }
      )
    }

    // If there's an inconsistency, log it but proceed with the unfollow
    if (isFollowing !== isInFollowers) {
      console.log(`🔗 [Unfollow API] WARNING: Inconsistent following relationship detected!`)
      console.log(`🔗 [Unfollow API] Will proceed with unfollow to fix inconsistency`)
    }

    // Remove from following list
    const updatedFollowing = currentFollowing.filter((id: string) => id !== targetUserId)

    await payload.update({
      collection: 'users',
      id: currentUser.id,
      data: {
        following: updatedFollowing,
      },
    })

    // Remove current user from target user's followers list
    const updatedTargetFollowers = targetUserFollowers.filter((id: string) => id !== currentUser.id)
    
    console.log(`🔗 [Unfollow API] Removing ${currentUser.name} (${currentUser.id}) from ${targetUser.name}'s followers list`)
    console.log(`🔗 [Unfollow API] Target user followers before: ${targetUserFollowers.length}`)
    console.log(`🔗 [Unfollow API] Target user followers after: ${updatedTargetFollowers.length}`)
    
    await payload.update({
      collection: 'users',
      id: targetUserId,
      data: {
        followers: updatedTargetFollowers,
      },
    })

    // Calculate new followers count for target user
    const followersResult = await payload.find({
      collection: 'users',
      where: {
        following: { contains: targetUserId }
      },
      limit: 0,
    })

    const response: MobileFollowResponse = {
      success: true,
      message: 'User unfollowed successfully',
      data: {
        isFollowing: false,
        followersCount: followersResult.totalDocs,
        userId: targetUserId,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile unfollow error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Unfollow service unavailable',
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
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 