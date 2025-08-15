import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const blockedQuerySchema = z.object({
  limit: z.string().optional().transform(val => parseInt(val || '50')),
  page: z.string().optional().transform(val => parseInt(val || '1')),
})

interface BlockedUser {
  id: string
  name: string
  username?: string
  email?: string
  profileImage?: {
    url: string
  } | null
  bio?: string
  blockedAt: string
  reason?: string
}

interface MobileBlockedUsersResponse {
  success: boolean
  message: string
  data?: {
    blockedUsers: string[] // Just the user IDs for the iOS app
    blockedUsersDetails?: BlockedUser[] // Full details for future use
    pagination?: {
      page: number
      limit: number
      totalDocs: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  }
  error?: string
  code?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileBlockedUsersResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = blockedQuerySchema.safeParse(Object.fromEntries(searchParams))
    
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          error: 'Invalid query parameters',
          code: 'INVALID_PARAMS'
        },
        { status: 400 }
      )
    }
    
    const { limit, page } = queryValidation.data
    
    // Authenticate user
    let currentUser = null
    
    try {
      const authResult = await payload.auth({ headers: request.headers })
      currentUser = authResult.user
      console.log('🔐 [Blocked Users API] Direct Payload authentication successful')
    } catch (authError) {
      console.log('❌ [Blocked Users API] Direct Payload authentication failed:', authError instanceof Error ? authError.message : String(authError))
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
    
    console.log('🔍 [Blocked Users API] Fetching blocked users for user:', currentUser.id)
    
    // Get blocked users
    const query = {
      blocker: { equals: currentUser.id }
    }
    console.log('🔍 [Blocked Users API] Query:', JSON.stringify(query, null, 2))
    
    const blockedUsersResult = await payload.find({
      collection: 'userBlocks',
      where: query,
      sort: 'createdAt-desc',
      limit,
      page,
      depth: 2
    })
    
    console.log('🔍 [Blocked Users API] Found blocked users:', blockedUsersResult.docs.length)
    console.log('🔍 [Blocked Users API] Raw blocked users data:', blockedUsersResult.docs.map(block => ({
      id: block.id,
      blocker: block.blocker,
      blockedUser: block.blockedUser,
      blockedUserType: typeof block.blockedUser,
      createdAt: block.createdAt,
      reason: block.reason
    })))
    
    // Process blocked users
    const blockedUsersResults = await Promise.all(
      blockedUsersResult.docs.map(async (block: any) => {
        try {
          // Extract the blocked user ID (handle both string and object)
          let blockedUserId: string
          if (typeof block.blockedUser === 'string') {
            blockedUserId = block.blockedUser
          } else if (block.blockedUser && typeof block.blockedUser === 'object') {
            blockedUserId = block.blockedUser.id || block.blockedUser._id
          } else {
            console.warn('Invalid blockedUser format:', block.blockedUser)
            return null
          }
          
          console.log('🔍 [Blocked Users API] Processing blocked user ID:', blockedUserId)
          
          // Get the blocked user's details
          const blockedUser = await payload.findByID({
            collection: 'users',
            id: blockedUserId,
            depth: 1
          })
          
          return {
            id: blockedUser.id,
            name: blockedUser.name || '',
            username: blockedUser.username,
            email: blockedUser.email,
            profileImage: blockedUser.profileImage ? {
              url: typeof blockedUser.profileImage === 'object' && blockedUser.profileImage.url
                ? blockedUser.profileImage.url 
                : typeof blockedUser.profileImage === 'string'
                ? blockedUser.profileImage
                : ''
            } : null,
            bio: blockedUser.bio,
            blockedAt: block.createdAt,
            reason: block.reason
          }
        } catch (error) {
          console.warn(`Failed to fetch blocked user ${block.blockedUser}:`, error)
          return null
        }
      })
    )
    
    // Filter out null values
    const validBlockedUsers = blockedUsersResults.filter((user) => user !== null) as BlockedUser[]
    
    console.log('🔍 [Blocked Users API] Processed blocked users:', validBlockedUsers.length)
    
    const response: MobileBlockedUsersResponse = {
      success: true,
      message: 'Blocked users retrieved successfully',
      data: {
        blockedUsers: validBlockedUsers.map(user => user.id),
        blockedUsersDetails: validBlockedUsers,
        pagination: {
          page: blockedUsersResult.page || 1,
          limit: blockedUsersResult.limit || 10,
          totalDocs: blockedUsersResult.totalDocs || 0,
          totalPages: blockedUsersResult.totalPages || 0,
          hasNextPage: blockedUsersResult.hasNextPage || false,
          hasPrevPage: blockedUsersResult.hasPrevPage || false
        }
      }
    }
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Authorization'
      }
    })
    
  } catch (error) {
    console.error('Mobile blocked users error:', error)
    console.error('Mobile blocked users error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Blocked users service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}
