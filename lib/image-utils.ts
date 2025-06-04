/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Enhanced image utilities with fallback handling for broken URLs
 * Handles development vs production environment differences
 */

/**
 * Check if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Test if a URL is accessible (for development debugging)
 */
async function testImageUrl(url: string): Promise<boolean> {
  if (!isDevelopment) return true // Skip testing in production
  
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Enhanced function to get image URL with fallback handling
 */
export function getImageUrl(image: any): string {
  if (!image) return "/placeholder.svg"

  let primaryUrl: string | null = null

  // Handle string URLs - use directly
  if (typeof image === "string" && image.trim() !== "") {
    primaryUrl = image.trim()
  }
  // Handle PayloadCMS media objects - extract URL
  else if (typeof image === "object" && image !== null) {
    // Try different URL sources in order of preference
    primaryUrl = image.url || 
                 image.sizes?.card?.url || 
                 image.sizes?.thumbnail?.url || 
                 image.thumbnailURL ||
                 null
  }

  // If we have a URL, validate it
  if (primaryUrl) {
    // In development, check if external URLs are accessible
    if (isDevelopment && primaryUrl.includes('groundedgems.com')) {
      console.warn(`🚨 External URL detected in development: ${primaryUrl}`)
      console.warn(`💡 Using development media proxy`)
      
      // Use development media proxy for broken external URLs
      const proxyUrl = `/api/dev-media-proxy?url=${encodeURIComponent(primaryUrl)}&width=400&height=300&type=image`
      return proxyUrl
    }
    
    return primaryUrl
  }

  return "/placeholder.svg"
}

/**
 * Enhanced function to get video URL with fallback handling
 */
export function getVideoUrl(video: any): string | null {
  if (!video) return null

  let primaryUrl: string | null = null

  // Handle string URLs
  if (typeof video === "string" && video.trim() !== "") {
    primaryUrl = video.trim()
  }
  // Handle PayloadCMS media objects
  else if (typeof video === "object" && video !== null && video.url) {
    primaryUrl = video.url
  }

  // If we have a URL, validate it
  if (primaryUrl) {
    // In development, check if external URLs are accessible
    if (isDevelopment && primaryUrl.includes('groundedgems.com')) {
      console.warn(`🚨 External video URL detected in development: ${primaryUrl}`)
      console.warn(`💡 Using development media proxy for video`)
      
      // Use development media proxy for broken external URLs
      const proxyUrl = `/api/dev-media-proxy?url=${encodeURIComponent(primaryUrl)}&width=400&height=300&type=video`
      return proxyUrl
    }
    
    return primaryUrl
  }

  return null
}

/**
 * Simplified media normalization with enhanced fallback handling
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

  return {
    image: image !== "/placeholder.svg" ? image : null,
    video,
    photos,
    videoThumbnail: getImageUrl(post.videoThumbnail || post.image || post.featuredImage)
  }
}

/**
 * Debug function - enhanced with URL validation info
 */
export function debugMediaProcessing(post: any, normalizedMedia: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 Post ${post.id} media processing:`, {
      original: {
        image: post.image,
        video: post.video,
        photos: post.photos
      },
      normalized: normalizedMedia,
      environment: isDevelopment ? 'development' : 'production',
      externalUrlsDetected: {
        image: post.image?.url?.includes?.('groundedgems.com') || false,
        video: post.video?.url?.includes?.('groundedgems.com') || false,
        photos: Array.isArray(post.photos) && post.photos.some((p: any) => p?.url?.includes?.('groundedgems.com'))
      }
    })
  }
}

/**
 * Get avatar URL with enhanced fallback
 */
export function getAvatarUrl(avatar: any): string {
  const url = getImageUrl(avatar)
  return url !== "/placeholder.svg" ? url : "/diverse-avatars.png"
}

/**
 * Create a development-friendly placeholder URL
 */
export function createPlaceholderUrl(width: number = 400, height: number = 300): string {
  return `https://via.placeholder.com/${width}x${height}/f0f0f0/999999?text=Image+Not+Available`
}
  