import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const userQuerySchema = z.object({
  id: z.string().optional(), // User ID to fetch, defaults to current user
})

interface MobileUserProfileResponse {
  success: boolean
  message: string
  data?: {
    user: {
      id: string
      name: string
      email: string
      profileImage?: {
        url: string
      } | null
      bio?: string
      location?: {
        coordinates?: {
          latitude: number
          longitude: number
        }
        address?: string
        city?: string
        state?: string
        country?: string
      }
      role: string
      isCreator: boolean
      creatorLevel?: string
      preferences: {
        categories: string[]
        notifications: boolean
        radius: number
      }
      stats: {
        postsCount: number
        followersCount: number
        followingCount: number
        savedPostsCount: number
        likedPostsCount: number
        locationsCount: number
      }
      socialLinks?: Array<{
        platform: string
        url: string
      }>
      deviceInfo?: {
        platform?: string
        appVersion?: string
        lastSeen?: string
      }
      isFollowing?: boolean // Only included if viewing another user's profile
      isFollowedBy?: boolean // Only included if viewing another user's profile
      joinedAt: string
      lastLogin?: string
      isVerified: boolean
    }
    recentPosts?: Array<{
      id: string
      title?: string
      content: string
      featuredImage?: {
        url: string
      } | null
      likeCount: number
      commentCount: number
      createdAt: string
    }>
  }
  error?: string
  code?: string
}

// GET /api/mobile/users - Get users for invite functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''

    // Get current user for authentication
    const currentUser = await getAuthenticatedUser(request)
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await getPayload({ config })

    // Build query to find users
    const where: any = {
      // Exclude the current user from results
      id: { not_equals: currentUser.id }
    }

    // Add search filter if provided
    if (search) {
      where.or = [
        { name: { contains: search } },
        { email: { contains: search } }
      ]
    }

    const result = await payload.find({
      collection: 'users',
      where,
      sort: 'name',
      limit,
      page,
      depth: 1
    })

    // Format user data for mobile app
    const users = result.docs.map((user: any) => ({
      id: user.id,
      name: user.name || 'Unknown User',
      email: user.email,
      avatar: user.profileImage?.url || null
    }))

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching users:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
} 