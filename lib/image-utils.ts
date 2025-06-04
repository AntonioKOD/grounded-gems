/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Simplified image utilities for feed display
 * Based on the profile approach that works correctly
 */

/**
 * Simple function to get image URL from various formats
 * This matches the profile approach that works correctly
 */
export function getImageUrl(image: any): string {
  if (!image) return "/placeholder.svg"

  // Handle string URLs - use directly
  if (typeof image === "string" && image.trim() !== "") {
    return image.trim()
  }

  // Handle PayloadCMS media objects - extract URL
  if (typeof image === "object" && image !== null) {
    // Try main URL first
    if (image.url && typeof image.url === "string") {
      return image.url
    }
    
    // Try sizes for better quality
    if (image.sizes?.card?.url) {
      return image.sizes.card.url
    }
    if (image.sizes?.thumbnail?.url) {
      return image.sizes.thumbnail.url
    }
    
    // Fallback to thumbnailURL
    if (image.thumbnailURL) {
      return image.thumbnailURL
    }
  }

  return "/placeholder.svg"
}

/**
 * Simple function to get video URL
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
 * Simplified media normalization - matches profile approach
 */
export function normalizePostMedia(post: any) {
  return {
    image: getImageUrl(post.image || post.featuredImage),
    video: getVideoUrl(post.video),
    photos: Array.isArray(post.photos) 
      ? post.photos.map(photo => getImageUrl(photo)).filter(url => url !== "/placeholder.svg")
      : [],
    videoThumbnail: getImageUrl(post.videoThumbnail || post.image || post.featuredImage)
  }
}

/**
 * Debug function - simplified
 */
export function debugMediaProcessing(post: any, normalizedMedia: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 Post ${post.id} media:`, {
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
  