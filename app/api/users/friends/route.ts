import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Get user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify the requesting user can access this data
    if (user.id !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the user's following list (people they follow)
    const userDoc = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0 // Don't populate relationships to get just IDs
    })

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the users that this user follows
    const followingIds = userDoc.following || []
    
    console.log('Raw followingIds:', followingIds)
    console.log('FollowingIds type:', typeof followingIds)
    console.log('FollowingIds length:', followingIds.length)
    
    if (followingIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        friends: [],
        total: 0,
        message: 'No friends found. Follow some users to see them here.'
      })
    }

    // Extract just the IDs from the following array
    // Handle both string IDs and object references
    const cleanFollowingIds = followingIds.map((item: any) => {
      console.log('Processing item:', item, 'Type:', typeof item)
      if (typeof item === 'string') {
        // Validate that it's a proper ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(item)) {
          return item
        }
      } else if (item && typeof item === 'object' && item.id) {
        if (typeof item.id === 'string' && /^[0-9a-fA-F]{24}$/.test(item.id)) {
          return item.id
        }
      } else if (item && typeof item === 'object' && item._id) {
        if (typeof item._id === 'string' && /^[0-9a-fA-F]{24}$/.test(item._id)) {
          return item._id
        }
      }
      return null
    }).filter(Boolean) // Remove any null values

    console.log('Clean following IDs:', cleanFollowingIds)

    if (cleanFollowingIds.length === 0) {
      return NextResponse.json({ 
        success: true,
        friends: [],
        total: 0,
        message: 'No valid friends found in following list.'
      })
    }

    // Fetch the actual user documents for the following list
    const friends = await payload.find({
      collection: 'users',
      where: {
        id: { in: cleanFollowingIds }
      },
      limit: 100,
      depth: 0
    })

    // Format the response
    const formattedFriends = friends.docs.map((friend: any) => ({
      id: friend.id,
      name: friend.name || 'Anonymous User',
      username: friend.username || friend.name?.toLowerCase().replace(/\s+/g, ''),
      profileImage: friend.profileImage,
      avatar: friend.avatar,
      bio: friend.bio,
      verified: friend._verified || false
    }))

    return NextResponse.json({
      success: true,
      friends: formattedFriends,
      total: formattedFriends.length
    })

  } catch (error) {
    console.error('Error fetching friends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    )
  }
} 