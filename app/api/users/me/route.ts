import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const payload = await getPayload({ config })

    // Use Payload's built-in authentication to get current user
    const { user } = await payload.auth({
      headers: request.headers,
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    console.log('🔍 [API] Fetching user with profile image relationship...')

    // Fetch the full user data with relationships - INCREASED DEPTH for profile images
    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 3, // Increased depth to ensure profileImage media relationship is populated
    })

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