import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  console.log('--- [ME] /api/users/me handler START ---')
  try {
    // Log request headers
    const headersObj = Object.fromEntries(request.headers.entries())
    console.log('[ME] Request headers:', headersObj)

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    console.log('[ME] payload-token from cookie:', payloadToken)
    if (!payloadToken) {
      console.warn('[ME] No payload-token found in cookies')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const payload = await getPayload({ config })
    console.log('[ME] getPayload resolved')

    // Use Payload's built-in authentication to get current user
    let userAuthResult
    try {
      userAuthResult = await payload.auth({ headers: request.headers })
      console.log('[ME] payload.auth result:', userAuthResult)
    } catch (authError) {
      console.error('[ME] Error in payload.auth:', authError)
      return NextResponse.json({ error: 'Auth error', details: authError instanceof Error ? authError.message : authError }, { status: 500 })
    }
    const { user } = userAuthResult || {}

    if (!user) {
      console.warn('[ME] No user found after payload.auth')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    console.log('[ME] Fetching user with profile image relationship...')

    let fullUser
    try {
      fullUser = await payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 1, // Reduced from 3 to 1 to minimize data processing
      })
      console.log('[ME] fullUser found:', {
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      hasProfileImage: !!fullUser.profileImage,
      savedPostsCount: Array.isArray(fullUser.savedPosts) ? fullUser.savedPosts.length : 0,
      likedPostsCount: Array.isArray(fullUser.likedPosts) ? fullUser.likedPosts.length : 0
    })
    } catch (findError) {
      console.error('[ME] Error in payload.findByID:', findError)
      return NextResponse.json({ error: 'findByID error', details: findError instanceof Error ? findError.message : findError }, { status: 500 })
    }

    console.log('🖼️ [API] Profile image data structure:', {
      hasProfileImage: !!fullUser.profileImage,
      profileImageType: typeof fullUser.profileImage,
      profileImageKeys: fullUser.profileImage ? Object.keys(fullUser.profileImage) : null,
      profileImageUrl: fullUser.profileImage?.url,
      profileImageId: fullUser.profileImage?.id,
      profileImageFilename: fullUser.profileImage?.filename
    })

    // Extract post IDs from the relationships
    const savedPostIds = Array.isArray(fullUser.savedPosts) 
      ? fullUser.savedPosts.map((post: any) => typeof post === 'string' ? post : post.id || post)
      : []
    
    const likedPostIds = Array.isArray(fullUser.likedPosts) 
      ? fullUser.likedPosts.map((post: any) => typeof post === 'string' ? post : post.id || post)
      : []

    console.log('📊 [API] User interaction data:', { 
      savedPostsCount: savedPostIds.length,
      likedPostsCount: likedPostIds.length
    })

    // Prepare response with enhanced profile image handling
    const responseData = {
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      username: fullUser.username,
      bio: fullUser.bio,
      profileImage: fullUser.profileImage ? {
        id: fullUser.profileImage.id,
        url: fullUser.profileImage.url,
        filename: fullUser.profileImage.filename,
        alt: fullUser.profileImage.alt,
        // Include sizes if available
        sizes: fullUser.profileImage.sizes
      } : null,
      location: fullUser.location,
      interests: fullUser.interests,
      socialLinks: fullUser.socialLinks,
      savedPosts: savedPostIds,
      likedPosts: likedPostIds,
      role: fullUser.role,
      isCreator: fullUser.isCreator,
      creatorLevel: fullUser.creatorLevel,
      // Add any other fields you need
    }

    console.log('✅ [API] Sending user response with profile image:', {
      userId: responseData.id,
      hasProfileImage: !!responseData.profileImage,
      profileImageUrl: responseData.profileImage?.url,
      profileImageFilename: responseData.profileImage?.filename
    })

    const response = NextResponse.json({ 
      user: responseData
    })

    // Add headers to prevent caching issues in production
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')

    console.log('--- [ME] /api/users/me handler END ---')
    return response
  } catch (error) {
    console.error('❌ [API] Error fetching user:', error)
    // More specific error handling
    if (error instanceof Error) {
      // Check for specific Payload errors
      if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
        return NextResponse.json({ user: null }, { status: 401 })
      }
      // Check for database connection errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Database connection failed' },
          { status: 503 }
        )
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
} 