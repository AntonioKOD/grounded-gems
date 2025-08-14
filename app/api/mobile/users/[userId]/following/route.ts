import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMobileUser } from '@/lib/auth-server'

interface MobileFollowingResponse {
  success: boolean
  message: string
  data?: {
    following: Array<{
      id: string
      name: string
      username?: string
      email: string
      profileImage?: string
      bio?: string
      isVerified?: boolean
      followerCount?: number
    }>
    totalCount: number
  }
  error?: string
  code?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<MobileFollowingResponse>> {
  try {
    const { userId } = await params
    const payload = await getPayload({ config })

    // Extract Bearer token and authenticate directly
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('Cookie')
    
    // Debug logging
    console.log('🔍 [Following API] Authorization header:', authHeader)
    console.log('🔍 [Following API] Cookie header:', cookieHeader)
    console.log('🔍 [Following API] Cookie includes payload-token:', cookieHeader?.includes('payload-token='))
    
    let currentUser = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      
      try {
        // Call mobile users/me directly for authentication
        const meResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/mobile/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (meResponse.ok) {
          const meData = await meResponse.json()
          currentUser = meData.user
        }
      } catch (authError) {
        console.error('Mobile following - Authentication error:', authError)
      }
    }
    // Check for payload-token in Cookie header (fallback for mobile apps)
    else if (cookieHeader?.includes('payload-token=')) {
      try {
        // Call mobile users/me directly for authentication with cookie
        const meResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/mobile/users/me`, {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'Content-Type': 'application/json',
          },
        })
        
        if (meResponse.ok) {
          const meData = await meResponse.json()
          currentUser = meData.user
        }
      } catch (authError) {
        console.error('Mobile following - Cookie authentication error:', authError)
      }
    }
    
    if (!currentUser) {
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

    // Validate user ID
    if (!userId || typeof userId !== 'string') {
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
      id: userId,
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

    // Get the following list from the target user
    const followingData = Array.isArray(targetUser.following) ? targetUser.following : []
    
    console.log(`🔍 [Following API] Raw following data: ${JSON.stringify(followingData)}`)
    
    // Extract user IDs from the following data (handle both string IDs and full objects)
    const followingIds = followingData.map((item: any) => {
      if (typeof item === 'string') {
        return item
      } else if (item && typeof item === 'object' && item.id) {
        return item.id
      }
      return null
    }).filter((id: string | null) => id !== null)
    
    // Deduplicate the following IDs to prevent duplicates
    const uniqueFollowingIds = [...new Set(followingIds)]
    
    console.log(`🔍 [Following API] Following IDs before deduplication: ${JSON.stringify(followingIds)}`)
    console.log(`🔍 [Following API] Following IDs after deduplication: ${JSON.stringify(uniqueFollowingIds)}`)
    console.log(`🔍 [Following API] Removed ${followingIds.length - uniqueFollowingIds.length} duplicate entries`)
    
    if (uniqueFollowingIds.length === 0) {
      const response: MobileFollowingResponse = {
        success: true,
        message: 'Following list retrieved successfully',
        data: {
          following: [],
          totalCount: 0
        }
      }
      return NextResponse.json(response, { status: 200 })
    }

    // Get the actual user objects for the following IDs
    const followingUsers = await Promise.all(
      uniqueFollowingIds.slice(0, 100).map(async (followingId: string) => {
        try {
          const user = await payload.findByID({
            collection: 'users',
            id: followingId,
            depth: 1
          })
          
          // Only return valid users
          if (user && user.id) {
            return {
              id: user.id,
              name: user.name || 'Unknown User',
              username: user.username,
              email: user.email || '',
              profileImage: typeof user.profileImage === 'string' ? user.profileImage : user.profileImage?.url,
              bio: user.bio,
              isVerified: user.isVerified || false,
              followerCount: user.followers?.length || 0
            }
          }
          return null
        } catch (error) {
          console.warn(`Failed to fetch user ${followingId}:`, error)
          return null
        }
      })
    )

    const validFollowingUsers = followingUsers.filter(user => user !== null).map(user => ({
      ...user,
      id: String(user.id) // Ensure id is always a string
    }))

    const response: MobileFollowingResponse = {
      success: true,
      message: 'Following list retrieved successfully',
      data: {
        following: validFollowingUsers,
        totalCount: validFollowingUsers.length // Use actual count of valid users
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile following error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Following service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
} 