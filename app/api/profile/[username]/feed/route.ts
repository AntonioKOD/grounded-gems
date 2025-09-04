import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Force dynamic rendering to avoid route caching
export const dynamic = 'force-dynamic'

/**
 * Normalized Profile Feed API Route
 * 
 * Returns a user's posts in reverse chronological order with normalized shape:
 * - items[]: { id, caption, createdAt, cover: { type: "IMAGE"|"VIDEO", url }, media[]: [{ id, type, url, thumbnailUrl, width, height, durationSec }] }
 * - nextCursor: for pagination
 * 
 * Usage:
 * GET /api/profile/[username]/feed?take=24&cursor=postId
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const take = Math.min(parseInt(searchParams.get('take') || '24', 10), 50) // Max 50 per request
    const cursor = searchParams.get('cursor') || null
    
    console.log(`📱 [NormalizedProfileFeed] Loading feed for user: ${username}, take: ${take}, cursor: ${cursor}`)
    
    const payload = await getPayload({ config })
    
    // Find user by username
    const userResult = await payload.find({
      collection: 'users',
      where: {
        username: { equals: username }
      },
      limit: 1
    })
    
    if (userResult.docs.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const user = userResult.docs[0]
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    console.log(`📱 [NormalizedProfileFeed] Found user: ${user.name} (${user.id})`)
    
    // Build query for posts
    let whereClause: any = {
      author: { equals: user.id }
    }
    
    // Add cursor-based pagination
    if (cursor) {
      try {
        // Get the cursor post to find its createdAt timestamp
        const cursorPost = await payload.findByID({
          collection: 'posts',
          id: cursor
        })
        
        if (cursorPost) {
          whereClause.createdAt = { less_than: cursorPost.createdAt }
        }
      } catch (error) {
        console.warn(`📱 [NormalizedProfileFeed] Invalid cursor: ${cursor}`, error)
        // Continue without cursor if invalid
      }
    }
    
    // Query posts with depth to populate media relations
    const postsResult = await payload.find({
      collection: 'posts',
      where: whereClause,
      sort: '-createdAt',
      limit: take + 1, // Get one extra to determine if there's a next page
      depth: 2, // Populate media relations
    })
    
    console.log(`📱 [NormalizedProfileFeed] Found ${postsResult.docs.length} posts for user`)
    
    // Check if there are more posts (pagination)
    const hasMore = postsResult.docs.length > take
    const posts = hasMore ? postsResult.docs.slice(0, take) : postsResult.docs
    const nextCursor = hasMore ? posts[posts.length - 1]?.id : null
    
    // Normalize posts for feed display
    const items = posts.map(post => {
      try {
        const normalizedMedia = normalizePostMedia(post)
        const cover = getPostCover(normalizedMedia)
        
        return {
          id: post.id,
          caption: post.content || '',
          createdAt: post.createdAt,
          cover: cover,
          media: normalizedMedia
        }
      } catch (error) {
        console.error(`📱 [NormalizedProfileFeed] Error processing post ${post.id}:`, error)
        // Return a minimal version if there's an error
        return {
          id: post.id,
          caption: post.content || '',
          createdAt: post.createdAt,
          cover: null,
          media: []
        }
      }
    })
    
    const response = {
      items,
      nextCursor
    }
    
    console.log(`📱 [NormalizedProfileFeed] Returning ${items.length} items, nextCursor: ${nextCursor}`)
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutes cache
      }
    })
    
  } catch (error) {
    console.error('📱 [NormalizedProfileFeed] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Normalize all media from a post into a unified array
 * Handles multiple possible media fields: featuredImage, image, photos[], media[], video, videos[]
 */
function normalizePostMedia(post: any): Array<{
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  durationSec?: number
}> {
  const media: Array<{
    id: string
    type: 'IMAGE' | 'VIDEO'
    url: string
    thumbnailUrl?: string
    width?: number
    height?: number
    durationSec?: number
  }> = []
  
  // Helper function to add media item
  const addMediaItem = (item: any, type: 'IMAGE' | 'VIDEO') => {
    if (!item) return
    
    let mediaItem: any = {
      id: typeof item === 'string' ? item : item.id,
      type,
      url: absoluteMediaURL(typeof item === 'string' ? item : item.url)
    }
    
    // Add additional properties if available
    if (typeof item === 'object' && item !== null) {
      if (item.thumbnailUrl) {
        mediaItem.thumbnailUrl = absoluteMediaURL(item.thumbnailUrl)
      }
      if (item.width) mediaItem.width = item.width
      if (item.height) mediaItem.height = item.height
      if (item.durationSec) mediaItem.durationSec = item.durationSec
    }
    
    media.push(mediaItem)
  }
  
  // 1. Single image field
  if (post.image) {
    addMediaItem(post.image, 'IMAGE')
  }
  
  // 2. Photos array
  if (post.photos && Array.isArray(post.photos)) {
    post.photos.forEach((photo: any) => {
      addMediaItem(photo, 'IMAGE')
    })
  }
  
  // 3. Single video field
  if (post.video) {
    addMediaItem(post.video, 'VIDEO')
  }
  
  // 4. Videos array (if it exists)
  if (post.videos && Array.isArray(post.videos)) {
    post.videos.forEach((video: any) => {
      addMediaItem(video, 'VIDEO')
    })
  }
  
  // 5. Generic media array (if it exists)
  if (post.media && Array.isArray(post.media)) {
    post.media.forEach((item: any) => {
      const type = isVideoFile(item.url || item) ? 'VIDEO' : 'IMAGE'
      addMediaItem(item, type)
    })
  }
  
  // 6. Featured image (if it exists)
  if (post.featuredImage) {
    addMediaItem(post.featuredImage, 'IMAGE')
  }
  
  return media
}

/**
 * Get the cover image/thumbnail for a post with priority:
 * 1) first IMAGE
 * 2) first VIDEO thumbnailUrl
 * 3) video url if no thumbnail
 * 4) null if no media
 */
function getPostCover(media: Array<{
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  durationSec?: number
}>): { type: 'IMAGE' | 'VIDEO', url: string } | null {
  if (!media || media.length === 0) {
    return null
  }
  
  // 1. First IMAGE
  const firstImage = media.find(item => item.type === 'IMAGE')
  if (firstImage) {
    return {
      type: 'IMAGE',
      url: firstImage.url
    }
  }
  
  // 2. First VIDEO with thumbnailUrl
  const firstVideoWithThumbnail = media.find(item => 
    item.type === 'VIDEO' && item.thumbnailUrl
  )
  if (firstVideoWithThumbnail) {
    return {
      type: 'VIDEO',
      url: firstVideoWithThumbnail.thumbnailUrl!
    }
  }
  
  // 3. First VIDEO url if no thumbnail
  const firstVideo = media.find(item => item.type === 'VIDEO')
  if (firstVideo) {
    return {
      type: 'VIDEO',
      url: firstVideo.url
    }
  }
  
  return null
}

/**
 * Check if a file is a video based on extension or MIME type
 */
function isVideoFile(filename: string): boolean {
  if (!filename) return false
  
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m4v', '.3gp', '.3g2', '.ts', '.mts', '.m2ts']
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  
  return videoExtensions.includes(extension)
}

/**
 * Convert relative media URL to absolute URL
 */
function absoluteMediaURL(url: string): string {
  if (!url) return ''
  
  // If already absolute, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Convert relative URL to absolute
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.SERVER_URL || 'http://localhost:3000'
  return new URL(url, baseUrl).toString()
}