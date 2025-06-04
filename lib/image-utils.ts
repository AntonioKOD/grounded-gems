/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Simplified image utilities for PayloadCMS media
 * Directly uses URLs from PayloadCMS media objects
 */

// Environment check
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Simple function to get image URL from PayloadCMS media object
 */
export function getImageUrl(image: any): string {
  if (!image) {
    if (isDevelopment) {
      console.log('📸 getImageUrl: No image provided')
    }
    return "/placeholder.svg"
  }

  // Handle string URLs - use directly
  if (typeof image === "string" && image.trim() !== "") {
    const url = image.trim()
    if (isDevelopment) {
      console.log('📸 getImageUrl: String URL found:', url)
    }
    return url
  }
  
  // Handle PayloadCMS media objects - extract URL
  if (typeof image === "object" && image !== null) {
    // Debug the object structure
    if (isDevelopment) {
      console.log('📸 getImageUrl: Media object received:', {
        type: typeof image,
        keys: Object.keys(image),
        url: image.url,
        thumbnailURL: image.thumbnailURL,
        sizes: image.sizes,
        filename: image.filename
      })
    }
    
    // Try different URL sources in order of preference
    const url = image.url || 
                image.sizes?.card?.url || 
                image.sizes?.thumbnail?.url || 
                image.thumbnailURL ||
                "/placeholder.svg"
                
    if (isDevelopment) {
      console.log('📸 getImageUrl: Media object processed:', {
        hasUrl: !!image.url,
        hasCardUrl: !!image.sizes?.card?.url,
        hasThumbnailUrl: !!image.sizes?.thumbnail?.url,
        hasThumbnailURL: !!image.thumbnailURL,
        finalUrl: url,
        isPlaceholder: url === "/placeholder.svg"
      })
    }
    
    return url
  }

  if (isDevelopment) {
    console.log('📸 getImageUrl: No valid image found, returning placeholder. Input was:', image)
  }
  return "/placeholder.svg"
}

/**
 * Simple function to get video URL from PayloadCMS media object
 */
export function getVideoUrl(video: any): string | null {
  if (!video) return null

  // Handle string URLs
  if (typeof video === "string" && video.trim() !== "") {
    return video.trim()
  }
  
  // Handle PayloadCMS media objects
  if (typeof video === "object" && video !== null && video.url) {
    return video.url
  }

  return null
}

/**
 * Simple media normalization with debugging
 */
export function normalizePostMedia(post: any) {
  const image = getImageUrl(post.image || post.featuredImage)
  const video = getVideoUrl(post.video)
  
  // Process photos array
  let photos: string[] = []
  if (Array.isArray(post.photos)) {
    photos = post.photos
      .map(photo => getImageUrl(photo))
      .filter(url => url !== "/placeholder.svg")
  }

  const result = {
    image: image !== "/placeholder.svg" ? image : null,
    video,
    photos,
    videoThumbnail: getImageUrl(post.videoThumbnail || post.image || post.featuredImage)
  }
  
  if (isDevelopment) {
    console.log(`📱 normalizePostMedia for post ${post.id}:`, {
      original: {
        image: post.image,
        video: post.video,
        photos: post.photos
      },
      normalized: result
    })
  }

  return result
}

/**
 * Debug function
 */
export function debugMediaProcessing(post: any, normalizedMedia: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 Post ${post.id} media processing:`, {
      original: {
        image: post.image,
        video: post.video,
        photos: post.photos
      },
      normalized: normalizedMedia
    })
  }
}

/**
 * Get avatar URL
 */
export function getAvatarUrl(avatar: any): string {
  const url = getImageUrl(avatar)
  return url !== "/placeholder.svg" ? url : "/diverse-avatars.png"
}

/**
 * Create a placeholder URL
 */
export function createPlaceholderUrl(width: number = 400, height: number = 300): string {
  return `https://via.placeholder.com/${width}x${height}/f0f0f0/999999?text=Image+Not+Available`
}

/**
 * Test if a local media file exists (for development debugging)
 */
export async function testLocalMediaFile(filename: string): Promise<boolean> {
  if (!isDevelopment) return true // Skip testing in production
  
  try {
    const response = await fetch(`/api/media/${filename}`, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Test if a media URL is accessible
 */
export async function testMediaUrl(url: string): Promise<boolean> {
  if (!isDevelopment) return true // Skip testing in production
  
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}
  