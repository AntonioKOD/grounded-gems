import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getMobileUser } from '@/lib/auth-server'

interface MobileFollowersResponse {
  success: boolean
  message: string
  data?: {
    followers: Array<{
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
): Promise<NextResponse<MobileFollowersResponse>> {
  try {
    const { userId } = await params
    const payload = await getPayload({ config })

    // Extract Bearer token and authenticate directly
    const authHeader = request.headers.get('authorization')
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
        console.error('Mobile followers - Authentication error:', authError)
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

    // Get users who follow the target user
    const followersResult = await payload.find({
      collection: 'users',
      where: {
        following: { contains: userId }
      },
      limit: 100, // Limit to 100 followers for mobile
      depth: 1,
      sort: '-createdAt'
    })

    const followers = followersResult.docs.map((follower: any) => ({
      id: follower.id,
      name: follower.name,
      username: follower.username,
      email: follower.email,
      profileImage: typeof follower.profileImage === 'string' ? follower.profileImage : follower.profileImage?.url,
      bio: follower.bio,
      isVerified: follower.isVerified || false,
      followerCount: follower.followers?.length || 0
    }))

    const response: MobileFollowersResponse = {
      success: true,
      message: 'Followers retrieved successfully',
      data: {
        followers,
        totalCount: followersResult.totalDocs
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
    console.error('Mobile followers error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Followers service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
} 