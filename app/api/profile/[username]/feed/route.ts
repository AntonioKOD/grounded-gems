import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Force dynamic rendering to avoid route caching
export const dynamic = 'force-dynamic'

/**
 * Profile Feed API Route
 * 
 * Returns a normalized feed for a specific user with cover images/thumbnails
 * Supports pagination and proper media URL handling
 * 
 * Usage:
 * GET /api/profile/[username]/feed?page=1&limit=20
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50) // Max 50 per page
    const offset = (page - 1) * limit
    
    console.log(`📱 [ProfileFeed] Loading feed for user: ${username}, page: ${page}, limit: ${limit}`)
    
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
    
    console.log(`📱 [ProfileFeed] Found user: ${user.name} (${user.id})`)
    
    // Get user's posts with pagination
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        user: { equals: user.id }
      },
      sort: '-createdAt',
      limit,
      page,
      depth: 2, // Include related media and user data
    })
    
    console.log(`📱 [ProfileFeed] Found ${postsResult.docs.length} posts for user`)
    
    // Normalize posts for feed display
    const normalizedPosts = postsResult.docs.map(post => {
      const cover = getPostCover(post)
      
      return {
        id: post.id,
        title: post.title || null,
        content: post.content || '',
        type: post.type || 'post',
        cover: cover,
        hasVideo: hasVideoContent(post),
        likeCount: post.likeCount || 0,
        commentCount: post.commentCount || 0,
        saveCount: post.saveCount || 0,
        shareCount: post.shareCount || 0,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage?.url || null,
          isVerified: user.isVerified || false,
          isCreator: user.isCreator || false,
        },
        location: post.location ? {
          id: post.location.id,
          name: post.location.name,
          address: post.location.address,
          city: post.location.city,
          state: post.location.state,
          country: post.location.country,
        } : null,
        tags: post.tags || [],
        media: {
          images: getPostImages(post),
          videos: getPostVideos(post),
          totalCount: getTotalMediaCount(post)
        }
      }
    })
    
    // Get total count for pagination
    const totalResult = await payload.count({
      collection: 'posts',
      where: {
        user: { equals: user.id }
      }
    })
    
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          profileImage: user.profileImage?.url || null,
          bio: user.bio || null,
          isVerified: user.isVerified || false,
          isCreator: user.isCreator || false,
          stats: {
            postsCount: totalResult.totalDocs,
            followersCount: user.followers?.length || 0,
            followingCount: user.following?.length || 0,
          }
        },
        posts: normalizedPosts,
        pagination: {
          page,
          limit,
          total: totalResult.totalDocs,
          totalPages: Math.ceil(totalResult.totalDocs / limit),
          hasNext: page < Math.ceil(totalResult.totalDocs / limit),
          hasPrev: page > 1
        }
      }
    }
    
    console.log(`📱 [ProfileFeed] Returning ${normalizedPosts.length} posts with pagination info`)
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutes cache
      }
    })
    
  } catch (error) {
    console.error('📱 [ProfileFeed] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get the cover image/thumbnail for a post
 * Priority: featuredImage > first image > video thumbnail > placeholder
 */
function getPostCover(post: any): string | null {
  // 1. Featured image (highest priority)
  if (post.featuredImage?.url) {
    return absoluteMediaURL(post.featuredImage.url)
  }
  
  // 2. First image from images array
  if (post.images && post.images.length > 0) {
    const firstImage = post.images[0]
    if (typeof firstImage === 'string') {
      return absoluteMediaURL(firstImage)
    } else if (firstImage?.url) {
      return absoluteMediaURL(firstImage.url)
    }
  }
  
  // 3. First image from media array
  if (post.media && post.media.length > 0) {
    for (const mediaItem of post.media) {
      if (typeof mediaItem === 'string') {
        if (isImageFile(mediaItem)) {
          return absoluteMediaURL(mediaItem)
        }
      } else if (mediaItem?.url && isImageFile(mediaItem.url)) {
        return absoluteMediaURL(mediaItem.url)
      }
    }
  }
  
  // 4. Video thumbnail
  if (post.videoThumbnail?.url) {
    return absoluteMediaURL(post.videoThumbnail.url)
  }
  
  // 5. First video thumbnail from videos array
  if (post.videos && post.videos.length > 0) {
    for (const video of post.videos) {
      if (typeof video === 'string') {
        // Try to find thumbnail for this video
        const thumbnailUrl = getVideoThumbnailUrl(video)
        if (thumbnailUrl) return thumbnailUrl
      } else if (video?.videoThumbnail?.url) {
        return absoluteMediaURL(video.videoThumbnail.url)
      }
    }
  }
  
  // 6. Single video thumbnail
  if (post.video) {
    const thumbnailUrl = getVideoThumbnailUrl(post.video)
    if (thumbnailUrl) return thumbnailUrl
  }
  
  return null
}

/**
 * Get video thumbnail URL
 */
function getVideoThumbnailUrl(videoUrl: string): string | null {
  if (!videoUrl) return null
  
  // If it's a media ID, we'd need to look it up
  // For now, return null and let the client handle it
  return null
}

/**
 * Check if a file is an image based on extension or MIME type
 */
function isImageFile(filename: string): boolean {
  if (!filename) return false
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.heic', '.heif']
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  
  return imageExtensions.includes(extension)
}

/**
 * Check if post has video content
 */
function hasVideoContent(post: any): boolean {
  // Check for video field
  if (post.video) return true
  
  // Check videos array
  if (post.videos && post.videos.length > 0) return true
  
  // Check media array for video files
  if (post.media && post.media.length > 0) {
    return post.media.some((media: any) => {
      const url = typeof media === 'string' ? media : media?.url
      return url && isVideoFile(url)
    })
  }
  
  return false
}

/**
 * Check if a file is a video based on extension
 */
function isVideoFile(filename: string): boolean {
  if (!filename) return false
  
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m4v', '.3gp', '.3g2']
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  
  return videoExtensions.includes(extension)
}

/**
 * Get all images from a post
 */
function getPostImages(post: any): string[] {
  const images: string[] = []
  
  // Featured image
  if (post.featuredImage?.url) {
    images.push(absoluteMediaURL(post.featuredImage.url))
  }
  
  // Images array
  if (post.images && post.images.length > 0) {
    post.images.forEach((image: any) => {
      if (typeof image === 'string') {
        images.push(absoluteMediaURL(image))
      } else if (image?.url) {
        images.push(absoluteMediaURL(image.url))
      }
    })
  }
  
  // Media array (images only)
  if (post.media && post.media.length > 0) {
    post.media.forEach((media: any) => {
      const url = typeof media === 'string' ? media : media?.url
      if (url && isImageFile(url)) {
        images.push(absoluteMediaURL(url))
      }
    })
  }
  
  return images
}

/**
 * Get all videos from a post
 */
function getPostVideos(post: any): string[] {
  const videos: string[] = []
  
  // Single video
  if (post.video) {
    videos.push(absoluteMediaURL(post.video))
  }
  
  // Videos array
  if (post.videos && post.videos.length > 0) {
    post.videos.forEach((video: any) => {
      if (typeof video === 'string') {
        videos.push(absoluteMediaURL(video))
      } else if (video?.url) {
        videos.push(absoluteMediaURL(video.url))
      }
    })
  }
  
  // Media array (videos only)
  if (post.media && post.media.length > 0) {
    post.media.forEach((media: any) => {
      const url = typeof media === 'string' ? media : media?.url
      if (url && isVideoFile(url)) {
        videos.push(absoluteMediaURL(url))
      }
    })
  }
  
  return videos
}

/**
 * Get total media count for a post
 */
function getTotalMediaCount(post: any): number {
  let count = 0
  
  // Featured image
  if (post.featuredImage?.url) count++
  
  // Images array
  if (post.images) count += post.images.length
  
  // Videos array
  if (post.videos) count += post.videos.length
  
  // Single video
  if (post.video) count++
  
  // Media array
  if (post.media) count += post.media.length
  
  return count
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return new URL(url, baseUrl).toString()
}
