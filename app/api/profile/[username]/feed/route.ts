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
    console.log(`📱 [ProfileFeed] Querying posts for user ID: ${user.id}`)
    const postsResult = await payload.find({
      collection: 'posts',
      where: {
        author: { equals: user.id }
      },
      sort: '-createdAt',
      limit,
      page,
      depth: 1, // Load relationships but not too deep
    })
    
    console.log(`📱 [ProfileFeed] Found ${postsResult.docs.length} posts for user`)
    
    // Normalize posts for feed display
    const normalizedPosts = postsResult.docs.map(post => {
      try {
        console.log(`📱 [ProfileFeed] Processing post ${post.id}:`, {
          hasImage: !!post.image,
          hasVideo: !!post.video,
          hasPhotos: !!post.photos,
          hasVideoThumbnail: !!post.videoThumbnail,
          imageType: typeof post.image,
          videoType: typeof post.video
        })
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
      } catch (error) {
        console.error(`📱 [ProfileFeed] Error processing post ${post.id}:`, error)
        // Return a simplified version if there's an error
        return {
          id: post.id,
          title: post.title || null,
          content: post.content || '',
          type: post.type || 'post',
          cover: null,
          hasVideo: false,
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
          location: null,
          tags: [],
          media: {
            images: [],
            videos: [],
            totalCount: 0
          }
        }
      }
    })
    
    // Get total count for pagination
    const totalResult = await payload.count({
      collection: 'posts',
      where: {
        author: { equals: user.id }
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
 * Priority: single image > first photo > video thumbnail > single video
 */
function getPostCover(post: any): string | null {
  // 1. Single image (highest priority)
  if (post.image?.url) {
    return absoluteMediaURL(post.image.url)
  }
  
  // 2. First photo from photos array
  if (post.photos && post.photos.length > 0) {
    const firstPhoto = post.photos[0]
    if (typeof firstPhoto === 'string') {
      return absoluteMediaURL(firstPhoto)
    } else if (firstPhoto?.url) {
      return absoluteMediaURL(firstPhoto.url)
    }
  }
  
  // 3. Video thumbnail
  if (post.videoThumbnail?.url) {
    return absoluteMediaURL(post.videoThumbnail.url)
  }
  
  // 4. Single video (as fallback)
  if (post.video?.url) {
    return absoluteMediaURL(post.video.url)
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
  if (post.video?.url) return true
  
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
  
  // Single image
  if (post.image?.url) {
    images.push(absoluteMediaURL(post.image.url))
  }
  
  // Photos array
  if (post.photos && post.photos.length > 0) {
    post.photos.forEach((photo: any) => {
      if (typeof photo === 'string') {
        images.push(absoluteMediaURL(photo))
      } else if (photo?.url) {
        images.push(absoluteMediaURL(photo.url))
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
  if (post.video?.url) {
    videos.push(absoluteMediaURL(post.video.url))
  }
  
  return videos
}

/**
 * Get total media count for a post
 */
function getTotalMediaCount(post: any): number {
  let count = 0
  
  // Single image
  if (post.image?.url) count++
  
  // Photos array
  if (post.photos) count += post.photos.length
  
  // Single video
  if (post.video?.url) count++
  
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
