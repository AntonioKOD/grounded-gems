import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get current authenticated user
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      const cookieHeader = request.headers.get('Cookie')
      
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      } else if (cookieHeader?.includes('payload-token=')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
      console.log('Test profile auth error:', authError)
    }

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'No authenticated user found',
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }

    // Get user with full depth
    const user = await payload.findByID({
      collection: 'users',
      id: currentUser.id,
      depth: 3,
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'User account does not exist'
        },
        { status: 404 }
      )
    }

    // Get user posts
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        author: { equals: currentUser.id },
        status: { equals: 'published' }
      },
      sort: 'createdAt-desc',
      limit: 5,
      depth: 2
    })

    // Get categories for interests
    const categoriesResult = await payload.find({
      collection: 'categories',
      where: {
        id: { in: user.interests || [] }
      },
      limit: 100,
      depth: 0
    })

    const interestNames = categoriesResult.docs.map((category: any) => category.name || category.title || 'Unknown')

    // Prepare test response
    const response = {
      success: true,
      message: 'Test profile data retrieved successfully',
      data: {
        user: {
          id: String(user.id),
          name: user.name || '',
          email: user.email,
          username: user.username,
          profileImage: user.profileImage ? {
            url: typeof user.profileImage === 'object' && user.profileImage.url
              ? user.profileImage.url 
              : typeof user.profileImage === 'string'
              ? user.profileImage
              : ''
          } : null,
          bio: user.bio,
          location: user.location,
          role: user.role || 'user',
          isCreator: user.isCreator || false,
          creatorLevel: user.creatorProfile?.creatorLevel || user.creatorLevel,
          isVerified: user.isVerified || user.creatorProfile?.verification?.isVerified || false,
          interests: interestNames,
          socialLinks: user.socialLinks || [],
          website: user.website || user.creatorProfile?.website,
          joinedAt: user.createdAt,
          stats: {
            postsCount: postsResult.totalDocs,
            followersCount: user.followers?.length || 0,
            followingCount: user.following?.length || 0,
            savedPostsCount: 0,
            likedPostsCount: 0,
            locationsCount: 0,
            reviewCount: 0,
            recommendationCount: 0,
            averageRating: undefined,
          }
        },
        recentPosts: postsResult.docs.map((post: any) => ({
          id: post.id,
          title: post.title,
          content: post.content?.length > 150 
            ? post.content.substring(0, 150) + '...' 
            : post.content,
          caption: post.caption || post.content,
          featuredImage: post.featuredImage ? {
            url: typeof post.featuredImage === 'object' && post.featuredImage.url
              ? post.featuredImage.url 
              : typeof post.featuredImage === 'string'
              ? post.featuredImage
              : ''
          } : null,
          likeCount: post.likeCount || (Array.isArray(post.likes) ? post.likes.length : 0),
          commentCount: post.commentCount || (Array.isArray(post.comments) ? post.comments.length : 0),
          createdAt: post.createdAt,
          type: post.type || 'post',
        })),
        debug: {
          rawUser: {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            bio: user.bio,
            role: user.role,
            isCreator: user.isCreator,
            interests: user.interests,
            socialLinks: user.socialLinks,
            location: user.location,
            creatorProfile: user.creatorProfile,
            followers: user.followers?.length,
            following: user.following?.length,
          },
          postsFound: postsResult.docs.length,
          categoriesFound: categoriesResult.docs.length,
          interestNames: interestNames,
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Test profile error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Test profile service unavailable'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 