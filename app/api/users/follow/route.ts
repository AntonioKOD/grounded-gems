import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isUserBlocked } from '@/lib/blocked-users-helper'
import { notificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await request.json()
    
    console.log('🔍 Follow API called with userId:', userId)
    
    // Enhanced authentication that supports both Bearer tokens and cookies
    let user = null
    
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
      console.log('🔐 Direct Payload authentication successful, user:', user?.id)
    } catch (authError) {
      console.error('❌ Direct Payload authentication error:', authError)
    }
    
    if (!user) {
      console.log('❌ No authenticated user found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔍 Current user:', user.id, user.name)

    if (!userId) {
      console.log('❌ No userId provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Prevent self-following
    if (user.id === userId) {
      console.log('❌ User trying to follow themselves')
      return NextResponse.json(
        { error: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if user to follow exists
    const userToFollow = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0
    })

    if (!userToFollow) {
      console.log('❌ User to follow not found:', userId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('🔍 User to follow found:', userToFollow.name)

    // Check if user is blocked
    const isBlocked = await isUserBlocked(String(user.id), userId)
    if (isBlocked) {
      console.log('❌ Cannot follow blocked user:', userId)
      return NextResponse.json(
        { error: 'Cannot follow this user' },
        { status: 400 }
      )
    }

    // Check if user has blocked me
    const hasBlockedMe = await isUserBlocked(userId, String(user.id))
    if (hasBlockedMe) {
      console.log('❌ Cannot follow user who has blocked me:', userId)
      return NextResponse.json(
        { error: 'Cannot follow this user' },
        { status: 400 }
      )
    }

    // Get current user's following list
    const currentUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 0
    })

    if (!currentUser) {
      console.log('❌ Current user not found in database')
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      )
    }

    // Helper function to normalize IDs
    const normalizeId = (val: any): string => {
      if (typeof val === 'string') return val
      if (val?.id) return val.id
      if (val?._id) return val._id
      throw new Error(`Unable to normalize ID from value: ${JSON.stringify(val)}`)
    }

    // Get current following list and deduplicate it
    const currentFollowing = Array.isArray(currentUser.following) ? currentUser.following : []
    const uniqueFollowing = [...new Set(currentFollowing.map(normalizeId))]
    
    console.log('🔍 Current following list:', uniqueFollowing)
    
    // Check if already following
    if (uniqueFollowing.includes(userId)) {
      console.log('❌ Already following this user')
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 400 }
      )
    }

    // Add to following list (ensuring no duplicates)
    const updatedFollowing = [...uniqueFollowing, userId]
    
    console.log('🔍 Updated following list:', updatedFollowing)
    
    // Update current user's following list
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        following: updatedFollowing,
      },
      overrideAccess: true
    })

    // Add current user to target user's followers list
    const targetUserFollowers = Array.isArray(userToFollow.followers) ? userToFollow.followers : []
    const uniqueFollowers = [...new Set(targetUserFollowers.map(normalizeId))]
    const updatedTargetFollowers = [...uniqueFollowers, user.id]
    
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        followers: updatedTargetFollowers,
      },
      overrideAccess: true
    })

    // Calculate new followers count for target user
    const followersResult = await payload.find({
      collection: 'users',
      where: {
        following: { contains: userId }
      },
      limit: 0,
    })

    // Create follow notification and send push notification using the service
    try {
      const notificationResult = await notificationService.notifyNewFollower(
        userId,
        String(user.id),
        user.name || 'Someone',
        user.profileImage ? 
          (typeof user.profileImage === 'object' && user.profileImage.url
            ? user.profileImage.url 
            : typeof user.profileImage === 'string'
            ? user.profileImage
            : null) : null
      )

      if (notificationResult.success) {
        console.log(`✅ [Follow API] Follow notification created and sent successfully for ${userId} from ${user.id}`)
      } else {
        console.log(`⚠️ [Follow API] Follow notification failed: ${notificationResult.error}`)
      }
    } catch (notificationError) {
      console.warn('Failed to create follow notification:', notificationError)
      // Don't fail the follow operation if notification fails
    }

    const response = {
      success: true,
      message: 'User followed successfully',
      data: {
        isFollowing: true,
        followersCount: followersResult.totalDocs,
        userId: userId,
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
    console.error('Follow error:', error)
    
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

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await request.json()
    
    console.log('🔍 Unfollow API called with userId:', userId)
    
    // Enhanced authentication that supports both Bearer tokens and cookies
    let user = null
    
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
      console.log('🔐 Direct Payload authentication successful (DELETE), user:', user?.id)
    } catch (authError) {
      console.error('❌ Direct Payload authentication error (DELETE):', authError)
    }
    
    if (!user) {
      console.log('❌ No authenticated user found for unfollow')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔍 Current user for unfollow:', user.id, user.name)

    if (!userId) {
      console.log('❌ No userId provided for unfollow')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Helper function to normalize IDs
    const normalizeId = (val: any): string => {
      if (typeof val === 'string') return val
      if (val?.id) return val.id
      if (val?._id) return val._id
      throw new Error(`Unable to normalize ID from value: ${JSON.stringify(val)}`)
    }

    // Get current user's following list
    const currentUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 0
    })

    if (!currentUser) {
      console.log('❌ Current user not found in database for unfollow')
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      )
    }

    // Get current following list and deduplicate it
    const currentFollowing = Array.isArray(currentUser.following) ? currentUser.following : []
    const uniqueFollowing = [...new Set(currentFollowing.map(normalizeId))]
    
    console.log('🔍 Current following list for unfollow:', uniqueFollowing)
    console.log('🔍 Looking for userId in following list:', userId)
    console.log('🔍 Is userId in following list?', uniqueFollowing.includes(userId))
    
    // Check if currently following
    if (!uniqueFollowing.includes(userId)) {
      console.log('❌ Not following this user:', userId)
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      )
    }

    console.log('✅ User is in following list, proceeding with unfollow')

    // Remove from following list
    const updatedFollowing = uniqueFollowing.filter(id => id !== userId)
    
    console.log('🔍 Updated following list after unfollow:', updatedFollowing)
    
    // Update current user's following list
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        following: updatedFollowing
      },
      overrideAccess: true // Skip access control for this update
    })

    console.log('✅ Updated current user following list')

    // Remove current user from the other user's followers list
    const userToUnfollow = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0
    })

    let updatedFollowers: string[] = []

    if (userToUnfollow) {
      const userToUnfollowFollowers = Array.isArray(userToUnfollow.followers) ? userToUnfollow.followers : []
      const uniqueFollowers = [...new Set(userToUnfollowFollowers.map(normalizeId))]
      updatedFollowers = uniqueFollowers.filter(id => id !== user.id)
      
      console.log('🔍 Updated followers list for target user after unfollow:', updatedFollowers)
      
      // Update target user's followers list
      await payload.update({
        collection: 'users',
        id: userId,
        data: {
          followers: updatedFollowers
        },
        overrideAccess: true // Skip access control for this update
      })

      console.log('✅ Updated target user followers list')
    } else {
      console.log('⚠️ User to unfollow not found:', userId)
    }

    // Return updated counts for immediate UI update
    return NextResponse.json({ 
      success: true,
      message: 'Successfully unfollowed user',
      data: {
        currentUserFollowingCount: updatedFollowing.length,
        targetUserFollowersCount: updatedFollowers.length
      }
    })

  } catch (error) {
    console.error('❌ Error unfollowing user:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    )
  }
} 