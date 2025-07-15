import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await request.json()
    
    // Get current user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if already following
    const existingFollow = await payload.find({
      collection: 'user-follows',
      where: {
        and: [
          { follower: { equals: user.id } },
          { following: { equals: userId } }
        ]
      }
    })

    if (existingFollow.docs.length > 0) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 400 }
      )
    }

    // Create follow relationship
    await payload.create({
      collection: 'user-follows',
      data: {
        follower: user.id,
        following: userId,
        createdAt: new Date().toISOString()
      }
    })

    // Update follower/following counts (if you have these fields)
    // This is optional and depends on your user schema
    try {
      // Update follower count for the user being followed
      const followedUser = await payload.findByID({
        collection: 'users',
        id: userId
      })

      if (followedUser) {
        await payload.update({
          collection: 'users',
          id: userId,
          data: {
            followersCount: (followedUser.followersCount || 0) + 1
          }
        })
      }

      // Update following count for current user
      const currentUser = await payload.findByID({
        collection: 'users',
        id: user.id
      })

      if (currentUser) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            followingCount: (currentUser.followingCount || 0) + 1
          }
        })
      }
    } catch (error) {
      console.log('Could not update follow counts:', error)
      // Continue anyway - the follow relationship was created
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully followed user'
    })

  } catch (error) {
    console.error('Error following user:', error)
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
    
    // Get current user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Find and delete follow relationship
    const existingFollow = await payload.find({
      collection: 'user-follows',
      where: {
        and: [
          { follower: { equals: user.id } },
          { following: { equals: userId } }
        ]
      }
    })

    if (existingFollow.docs.length === 0) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      )
    }

    await payload.delete({
      collection: 'user-follows',
      id: existingFollow.docs[0]?.id as string
    })

    // Update follower/following counts (if you have these fields)
    try {
      // Update follower count for the user being unfollowed
      const unfollowedUser = await payload.findByID({
        collection: 'users',
        id: userId
      })

      if (unfollowedUser) {
        await payload.update({
          collection: 'users',
          id: userId,
          data: {
            followersCount: Math.max(0, (unfollowedUser.followersCount || 0) - 1)
          }
        })
      }

      // Update following count for current user
      const currentUser = await payload.findByID({
        collection: 'users',
        id: user.id
      })

      if (currentUser) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            followingCount: Math.max(0, (currentUser.followingCount || 0) - 1)
          }
        })
      }
    } catch (error) {
      console.log('Could not update follow counts:', error)
      // Continue anyway - the unfollow was successful
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully unfollowed user'
    })

  } catch (error) {
    console.error('Error unfollowing user:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    )
  }
} 