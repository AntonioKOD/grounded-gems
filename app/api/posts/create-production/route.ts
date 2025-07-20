import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

// Production-optimized configuration
export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Production post creation API called')
    
    // Check request size with higher limit for production
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / 1024 / 1024
      console.log(`📊 Production request size: ${sizeMB.toFixed(2)}MB`)
      
      // Higher limit for production (50MB instead of 4.5MB)
      if (sizeMB > 50) {
        console.error(`📝 Production request too large: ${sizeMB.toFixed(2)}MB`)
        return NextResponse.json(
          { success: false, message: `Request too large (${sizeMB.toFixed(2)}MB). Please use separate file upload.` },
          { status: 413 }
        )
      }
    }
    
    const payload = await getPayload({ config: payloadConfig })
    
    // Extract user ID from headers
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Find the user
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Parse JSON data (production expects JSON with media IDs)
    const jsonData = await request.json()
    
    const { content, title, type = 'post', rating, locationId, livePhotos = [], photos = [], videos = [] } = jsonData

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Content is required' },
        { status: 400 }
      )
    }

    console.log(`🚀 Production media breakdown: ${livePhotos.length} live photos, ${photos.length} photos, ${videos.length} videos`)

    // Create post data
    const postData: any = {
      content: content.trim(),
      type: type === 'post' ? 'post' : 'review',
      author: userId,
    }

    // Add optional fields
    if (title) postData.title = title.trim()
    if (rating) postData.rating = parseInt(rating)
    if (locationId) postData.location = locationId

    // Add media IDs
    const allMediaIds = [...livePhotos, ...photos, ...videos]
    if (allMediaIds.length > 0) {
      if (livePhotos.length > 0) {
        postData.livePhotos = livePhotos
      }
      if (photos.length > 0) {
        postData.photos = photos
      }
      if (videos.length > 0) {
        postData.videos = videos
      }
    }

    console.log('🚀 Creating post with data:', {
      contentLength: content.length,
      mediaCount: allMediaIds.length,
      hasLocation: !!locationId
    })

    // Create the post
    const post = await payload.create({
      collection: 'posts',
      data: postData,
    })

    console.log('🚀 Post created successfully:', post.id)

    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      post: {
        id: post.id,
        content: post.content,
        type: post.type,
        createdAt: post.createdAt,
        mediaCount: allMediaIds.length
      }
    })

  } catch (error) {
    console.error('🚀 Production post creation error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
        return NextResponse.json(
          { success: false, message: 'Request too large. Please upload files separately first.' },
          { status: 413 }
        )
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { success: false, message: 'Request timed out. Please try again with smaller files.' },
          { status: 408 }
        )
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create post' },
      { status: 500 }
    )
  }
} 