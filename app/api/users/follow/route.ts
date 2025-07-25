import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await request.json()
    
    console.log('🔍 Follow API called with userId:', userId)
    
    // Get current user from session
    const { user } = await payload.auth({ headers: request.headers })
    
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
      id: userId
    })

    if (!userToFollow) {
      console.log('❌ User to follow not found:', userId)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('🔍 User to follow found:', userToFollow.name)

    // Get current user's following list
    const currentUser = await payload.findByID({
      collection: 'users',
      id: user.id
    })

    if (!currentUser) {
      console.log('❌ Current user not found in database')
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      )
    }

    // Get current following list and deduplicate it
    const currentFollowing = Array.isArray(currentUser.following) ? currentUser.following : []
    const uniqueFollowing = [...new Set(currentFollowing.map(id => {
      if (typeof id === 'string') {
        return id
      } else if (id && typeof id === 'object' && id.id) {
        return id.id
      }
      return null
    }).filter(id => id !== null))]
    
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
    
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        following: updatedFollowing
      },
      overrideAccess: true // Skip access control for this update
    })

    console.log('✅ Updated current user following list')

    // Add current user to the other user's followers list
    const userToFollowFollowers = Array.isArray(userToFollow.followers) ? userToFollow.followers : []
    const uniqueFollowers = [...new Set(userToFollowFollowers.map(id => {
      if (typeof id === 'string') {
        return id
      } else if (id && typeof id === 'object' && id.id) {
        return id.id
      }
      return null
    }).filter(id => id !== null))]
    const updatedFollowers = [...uniqueFollowers, user.id]
    
    console.log('🔍 Updated followers list for target user:', updatedFollowers)
    
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        followers: updatedFollowers
      },
      overrideAccess: true // Skip access control for this update
    })

    console.log('✅ Updated target user followers list')

    return NextResponse.json({ 
      success: true,
      message: 'Successfully followed user'
    })

  } catch (error) {
    console.error('❌ Error following user:', error)
    return NextResponse.json(
      { error: 'Failed to follow user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await request.json()
    
    console.log('🔍 Unfollow API called with userId:', userId)
    
    // Get current user from session
    const { user } = await payload.auth({ headers: request.headers })
    
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

    // Get current user's following list
    const currentUser = await payload.findByID({
      collection: 'users',
      id: user.id
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
    const uniqueFollowing = [...new Set(currentFollowing.map(id => {
      if (typeof id === 'string') {
        return id
      } else if (id && typeof id === 'object' && id.id) {
        return id.id
      }
      return null
    }).filter(id => id !== null))]
    
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
      id: userId
    })

    if (userToUnfollow) {
      const userToUnfollowFollowers = Array.isArray(userToUnfollow.followers) ? userToUnfollow.followers : []
      const uniqueFollowers = [...new Set(userToUnfollowFollowers.map(id => {
        if (typeof id === 'string') {
          return id
        } else if (id && typeof id === 'object' && id.id) {
          return id.id
        }
        return null
      }).filter(id => id !== null))]
      const updatedFollowers = uniqueFollowers.filter(id => id !== user.id)
      
      console.log('🔍 Updated followers list for target user after unfollow:', updatedFollowers)
      
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

    return NextResponse.json({ 
      success: true,
      message: 'Successfully unfollowed user'
    })

  } catch (error) {
    console.error('❌ Error unfollowing user:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    )
  }
} 