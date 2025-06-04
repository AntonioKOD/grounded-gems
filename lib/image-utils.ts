/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Enhanced image utilities with PayloadCMS + Vercel Blob Storage support
 * Handles PayloadCMS media objects and converts problematic URLs to working ones
 */

/**
 * Check if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Extract filename from a PayloadCMS media URL
 */
function extractFilenameFromPayloadUrl(url: string): string | null {
  if (!url) return null
  
  // Handle groundedgems.com URLs - extract filename
  if (url.includes('groundedgems.com/api/media/file/')) {
    const parts = url.split('/api/media/file/')
    if (parts.length > 1) {
      return parts[1]
    }
  }
  
  // Handle direct filenames or other formats
  const filename = url.split('/').pop()
  return filename || null
}

/**
 * Convert PayloadCMS media URL to working URL
 * Priority: Local API > Vercel Blob > Development Proxy > Placeholder
 */
function convertToWorkingMediaUrl(url: string): string {
  if (!url) return "/placeholder.svg"
  
  // If it's already a working local or blob URL, return as-is
  if (url.startsWith('/api/media/') || 
      url.startsWith('/media/') || 
      url.includes('vercel-storage.com') ||
      url.includes('blob.store')) {
    return url
  }
  
  // If it's a groundedgems.com URL, we need to fix it
  if (url.includes('groundedgems.com')) {
    const filename = extractFilenameFromPayloadUrl(url)
    if (filename) {
      console.log(`🔧 Converting PayloadCMS URL: ${url} → /api/media/${filename}`)
      
      // In development, use development proxy for these problematic URLs
      if (isDevelopment) {
        const proxyUrl = `/api/dev-media-proxy?url=${encodeURIComponent(url)}&width=400&height=300&type=image`
        console.log(`🔧 Using development proxy: ${proxyUrl}`)
        return proxyUrl
      }
      
      // In production, try the local API route
      return `/api/media/${filename}`
    }
  }
  
  // For other external URLs, return as-is (they might be valid)
  return url
}

/**
 * Enhanced function to get image URL with comprehensive PayloadCMS support
 */
export function getImageUrl(image: any): string {
  if (!image) return "/placeholder.svg"

  let primaryUrl: string | null = null

  // Handle string URLs - use directly
  if (typeof image === "string" && image.trim() !== "") {
    primaryUrl = image.trim()
  }
  // Handle PayloadCMS media objects - extract URL with preference for working URLs
  else if (typeof image === "object" && image !== null) {
    // Try different URL sources in order of preference
    // Prefer Vercel Blob URLs if available
    primaryUrl = image.url || 
                 image.sizes?.card?.url || 
                 image.sizes?.thumbnail?.url || 
                 image.thumbnailURL ||
                 null
  }

  // If we have a URL, convert it to working format
  if (primaryUrl) {
    const workingUrl = convertToWorkingMediaUrl(primaryUrl)
    return workingUrl
  }

  return "/placeholder.svg"
}

/**
 * Enhanced function to get video URL with comprehensive PayloadCMS support
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

  // If we have a URL, convert it to working format
  if (primaryUrl) {
    const workingUrl = convertToWorkingMediaUrl(primaryUrl)
    
    // For videos, if we still have a problematic URL, use the proxy
    if (isDevelopment && workingUrl.includes('groundedgems.com')) {
      const proxyUrl = `/api/dev-media-proxy?url=${encodeURIComponent(workingUrl)}&width=400&height=300&type=video`
      console.log(`🔧 Using development proxy for video: ${proxyUrl}`)
      return proxyUrl
    }
    
    return workingUrl
  }

  return null
}

/**
 * Simplified media normalization with comprehensive PayloadCMS support
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
 * Debug function - enhanced with comprehensive URL conversion info
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
      urlIssuesDetected: {
        image: post.image?.url?.includes?.('groundedgems.com') || false,
        video: post.video?.url?.includes?.('groundedgems.com') || false,
        photos: Array.isArray(post.photos) && post.photos.some((p: any) => p?.url?.includes?.('groundedgems.com'))
      }
    })
  }
}

/**
 * Get avatar URL with comprehensive PayloadCMS support
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
  