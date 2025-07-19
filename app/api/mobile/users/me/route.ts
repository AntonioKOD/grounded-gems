import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  console.log('--- [MOBILE ME] /api/mobile/users/me handler START ---')
  try {
    // Log request headers
    const headersObj = Object.fromEntries(request.headers.entries())
    console.log('[MOBILE ME] Request headers:', headersObj)

    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    console.log('[MOBILE ME] Authorization header:', authorization)

    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.warn('[MOBILE ME] No Bearer token found in Authorization header')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const token = authorization.replace('Bearer ', '')
    console.log('[MOBILE ME] Extracted token:', token.substring(0, 20) + '...')

    const payload = await getPayload({ config })
    console.log('[MOBILE ME] getPayload resolved')

    // Use Payload's built-in authentication with Bearer token
    let userAuthResult
    try {
      // Create headers object with the Bearer token
      const authHeaders = new Headers()
      authHeaders.set('Authorization', `Bearer ${token}`)
      
      userAuthResult = await payload.auth({ headers: authHeaders })
      console.log('[MOBILE ME] payload.auth result:', userAuthResult)
    } catch (authError) {
      console.error('[MOBILE ME] Error in payload.auth:', authError)
      return NextResponse.json({ error: 'Auth error', details: authError instanceof Error ? authError.message : authError }, { status: 500 })
    }
    const { user } = userAuthResult || {}

    if (!user) {
      console.warn('[MOBILE ME] No user found after payload.auth')
      return NextResponse.json({ user: null }, { status: 401 })
    }

    console.log('[MOBILE ME] Fetching user with profile image relationship...')

    let fullUser
    try {
      fullUser = await payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 3,
      })
      console.log('[MOBILE ME] fullUser found:', fullUser)
    } catch (findError) {
      console.error('[MOBILE ME] Error in payload.findByID:', findError)
      return NextResponse.json({ error: 'findByID error', details: findError instanceof Error ? findError.message : findError }, { status: 500 })
    }

    console.log('🖼️ [MOBILE API] Profile image data structure:', {
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

    console.log('📊 [MOBILE API] User interaction data:', { 
      rawSavedPosts: fullUser.savedPosts, 
      extractedSavedPostIds: savedPostIds,
      rawLikedPosts: fullUser.likedPosts,
      extractedLikedPostIds: likedPostIds
    })

    // Prepare response with enhanced profile image handling
    const responseData = {
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      profileImage: fullUser.profileImage ? {
        id: fullUser.profileImage.id,
        url: fullUser.profileImage.url,
        filename: fullUser.profileImage.filename,
        alt: fullUser.profileImage.alt,
        // Include sizes if available
        sizes: fullUser.profileImage.sizes
      } : null,
      location: fullUser.location,
      savedPosts: savedPostIds,
      likedPosts: likedPostIds,
      role: fullUser.role,
      // Add any other fields you need
    }

    console.log('✅ [MOBILE API] Sending user response with profile image:', {
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

    console.log('--- [MOBILE ME] /api/mobile/users/me handler END ---')
    return response
  } catch (error) {
    console.error('❌ [MOBILE API] Error fetching user:', error)
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

// Handle preflight requests for CORS
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