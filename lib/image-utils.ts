/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility functions to get the correct image/video URLs for different storage types
 * Handles different formats from Payload CMS, direct URLs, and media objects
 */

// Type definitions for Payload media objects
interface PayloadMediaObject {
  id: string;
  url?: string;
  thumbnailURL?: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
  alt?: string;
  sizes?: {
    thumbnail?: {
      url?: string;
      width?: number;
      height?: number;
    };
    card?: {
      url?: string;
      width?: number;
      height?: number;
    };
    [key: string]: any;
  };
}

/**
 * Get the correct image URL from various formats
 */
export function getImageUrl(image: any): string {
  if (!image) return "/placeholder.svg"

  // Handle string URLs
  if (typeof image === "string") {
    if (image.trim() === '') return "/placeholder.svg"
    
    // Fix broken groundedgems.com URLs (check this BEFORE the general https check)
    if (image.includes('groundedgems.com/api/media/file/')) {
      const filename = image.split('/').pop()
      if (filename) {
        console.log(`🔧 Fixed broken image URL: ${image} -> /api/media/${filename}`)
        return `/api/media/${decodeURIComponent(filename)}`
      }
    }
    
    // Fix broken localhost URLs (check this BEFORE the general https check)
    if (image.includes('localhost:3001/')) {
      const filename = image.split('/').pop()
      if (filename) {
        console.log(`🔧 Fixed broken localhost URL: ${image} -> /api/media/${filename}`)
        return `/api/media/${decodeURIComponent(filename)}`
      }
    }
    
    // If it's already a full URL (http/https) and not broken, use it directly
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image
    }

    // If it's a relative path that already starts with /, use it as is
    if (image.startsWith("/")) {
      return image
    }

    // If it's just an ID (24 character hex string), construct API path
    if (image.match(/^[a-f0-9]{24}$/i)) {
      return `/api/media/${image}`
    }

    // If it contains /media/ already, use as is
    if (image.includes('/media/')) {
      return image
    }

    // Default: assume it's a filename and construct API path
    return `/api/media/${image}`
  }

  // Handle Payload media objects
  if (typeof image === "object" && image !== null) {
    const mediaObj = image as PayloadMediaObject
    
    // Try different size variants in order of preference
    if (mediaObj.sizes?.card?.url) {
      return getImageUrl(mediaObj.sizes.card.url)
    }
    if (mediaObj.sizes?.thumbnail?.url) {
      return getImageUrl(mediaObj.sizes.thumbnail.url)
    }
    if (mediaObj.url) {
      return getImageUrl(mediaObj.url)
    }
    if (mediaObj.filename) {
      return `/api/media/${mediaObj.filename}`
    }
    if (mediaObj.id) {
      return `/api/media/${mediaObj.id}`
    }
  }

  // Handle boolean (shouldn't happen, but fallback)
  if (typeof image === "boolean") {
    return "/placeholder.svg"
  }

  // Final fallback
  return "/placeholder.svg"
}

/**
 * Get the correct video URL from various formats
 */
export function getVideoUrl(video: any): string | null {
  if (!video) return null

  // Handle string URLs
  if (typeof video === "string") {
    if (video.trim() === '') return null
    
    // Fix broken groundedgems.com URLs (check this BEFORE the general https check)
    if (video.includes('groundedgems.com/api/media/file/')) {
      const filename = video.split('/').pop()
      if (filename) {
        console.log(`🔧 Fixed broken video URL: ${video} -> /api/media/${filename}`)
        return `/api/media/${decodeURIComponent(filename)}`
      }
    }
    
    // Fix broken localhost URLs (check this BEFORE the general https check)
    if (video.includes('localhost:3001/')) {
      const filename = video.split('/').pop()
      if (filename) {
        console.log(`🔧 Fixed broken localhost URL: ${video} -> /api/media/${filename}`)
        return `/api/media/${decodeURIComponent(filename)}`
      }
    }
    
    // If it's already a full URL (http/https) and not broken, use it directly
    if (video.startsWith("http://") || video.startsWith("https://")) {
      return video
    }

    // If it's a relative path that already starts with /, use it as is
    if (video.startsWith("/")) {
      return video
    }

    // If it's just an ID (24 character hex string), construct API path
    if (video.match(/^[a-f0-9]{24}$/i)) {
      return `/api/media/${video}`
    }

    // If it contains /media/ already, use as is
    if (video.includes('/media/')) {
      return video
    }

    // Default: assume it's a filename and construct API path
    return `/api/media/${video}`
  }

  // Handle Payload media objects
  if (typeof video === "object" && video !== null) {
    const mediaObj = video as PayloadMediaObject
    
    if (mediaObj.url) {
      return getVideoUrl(mediaObj.url)
    }
    if (mediaObj.filename) {
      return `/api/media/${mediaObj.filename}`
    }
    if (mediaObj.id) {
      return `/api/media/${mediaObj.id}`
    }
  }

  return null
}

/**
 * Process an array of photos/images
 */
export function getPhotosUrls(photos: any[]): string[] {
  if (!Array.isArray(photos)) return []
  
  return photos
    .map(photo => getImageUrl(photo))
    .filter(url => url !== "/placeholder.svg")
}

/**
 * Normalize a post's media fields for consistent rendering
 */
export function normalizePostMedia(post: any) {
  const result = {
    image: null as string | null,
    video: null as string | null,
    photos: [] as string[],
    videoThumbnail: null as string | null,
  }

  // Process main image
  if (post.image) {
    const imageUrl = getImageUrl(post.image)
    result.image = imageUrl !== "/placeholder.svg" ? imageUrl : null
  }

  // Process main video
  if (post.video) {
    result.video = getVideoUrl(post.video)
  }

  // Process photos array
  if (post.photos && Array.isArray(post.photos)) {
    result.photos = getPhotosUrls(post.photos)
  }

  // Process video thumbnail
  if (post.videoThumbnail) {
    const thumbnailUrl = getImageUrl(post.videoThumbnail)
    result.videoThumbnail = thumbnailUrl !== "/placeholder.svg" ? thumbnailUrl : null
  } else if (result.video && result.image) {
    // Use main image as video thumbnail if no explicit thumbnail
    result.videoThumbnail = result.image
  }

  // Fallback logic: check rawData if present
  if (!result.image && !result.video && !result.photos.length && post.rawData) {
    if (post.rawData.image) {
      result.image = getImageUrl(post.rawData.image)
    }
    if (post.rawData.video) {
      result.video = getVideoUrl(post.rawData.video)
    }
    if (post.rawData.photos && Array.isArray(post.rawData.photos)) {
      result.photos = getPhotosUrls(post.rawData.photos)
    }
  }

  return result
}

/**
 * Check if a media URL is likely to be working
 */
export function isValidMediaUrl(url: string | null): boolean {
  if (!url) return false
  
  // Known broken patterns
  const brokenPatterns = [
    'groundedgems.com/api/media/file/',
    'localhost:3001/',
    'undefined',
    'null',
  ]
  
  return !brokenPatterns.some(pattern => url.includes(pattern))
}

/**
 * Get a placeholder URL for broken/missing images
 */
export function getPlaceholderUrl(type: 'image' | 'video' = 'image'): string {
  return type === 'video' ? "/placeholder-video.svg" : "/placeholder.svg"
}

/**
 * Debug function to log media processing
 */
export function debugMediaProcessing(post: any, normalizedMedia: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎯 Media processing for post ${post.id}:`)
    
    // Debug original structure
    if (post.image && typeof post.image === 'object') {
      console.log('  📷 Original image object:', {
        url: post.image.url,
        thumbnailURL: post.image.thumbnailURL,
        filename: post.image.filename,
        sizes: post.image.sizes ? {
          thumbnail: post.image.sizes.thumbnail?.url,
          card: post.image.sizes.card?.url,
        } : undefined
      })
    } else if (post.image) {
      console.log('  📷 Original image:', post.image)
    }
    
    if (post.video && typeof post.video === 'object') {
      console.log('  🎥 Original video object:', {
        url: post.video.url,
        filename: post.video.filename,
      })
    } else if (post.video) {
      console.log('  🎥 Original video:', post.video)
    }
    
    if (post.photos && Array.isArray(post.photos)) {
      console.log('  📸 Original photos:', post.photos.map(photo => 
        typeof photo === 'object' ? { url: photo.url, filename: photo.filename } : photo
      ))
    }
    
    // Debug normalized results
    console.log('  ✅ Normalized results:', normalizedMedia)
  }
}

/**
 * Utility function to get the correct avatar URL
 */
export function getAvatarUrl(avatar: any): string {
  const url = getImageUrl(avatar)
  return url || "/diverse-avatars.png"
}
  