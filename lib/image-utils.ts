/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Simplified image utilities for PayloadCMS media
 * Directly uses URLs from PayloadCMS media objects
 */

/**
 * Image utilities for handling various image sources and optimization
 * Enhanced for mobile compatibility and server-side rendering
 */

// Environment check
const isDevelopment = process.env.NODE_ENV === 'development'
const isServer = typeof window === 'undefined'

// Safely import Capacitor utilities only on client-side
let getApiBaseUrlFromCapacitor: (() => string) | null = null

if (!isServer) {
  // Dynamic import for client-side only
  import('./capacitor-utils').then((module) => {
    getApiBaseUrlFromCapacitor = module.getApiBaseUrl
  }).catch(() => {
    // Fallback if capacitor-utils fails to load
    getApiBaseUrlFromCapacitor = null
  })
}

/**
 * Get base URL safely for both server and client
 */
function getBaseUrlSafely(): string {
  // Server-side logic
  if (isServer) {
    return process.env.NODE_ENV === 'production' 
      ? 'https://groundedgems.com' 
      : 'http://localhost:3000'
  }

  // Client-side logic
  if (getApiBaseUrlFromCapacitor) {
    return getApiBaseUrlFromCapacitor()
  }

  // Fallback for client-side
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'groundedgems.com') {
      return 'https://groundedgems.com'
    }
    return window.location.origin
  }

  // Final fallback
  return process.env.NODE_ENV === 'production' 
    ? 'https://groundedgems.com' 
    : 'http://localhost:3000'
}

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
    let url = image.trim()
    
    // In development, transform API media URLs to blob URLs
    url = transformToBlobUrl(url)
    
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
    let url = image.url || 
              image.sizes?.card?.url || 
              image.sizes?.thumbnail?.url || 
              image.thumbnailURL ||
              "/placeholder.svg"
    
    // In development, transform API media URLs to blob URLs
    url = transformToBlobUrl(url)
                
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
    let url = video.trim()
    
    // In development, transform API media URLs to blob URLs
    url = transformToBlobUrl(url)
    
    return url
  }
  
  // Handle PayloadCMS media objects
  if (typeof video === "object" && video !== null && video.url) {
    let url = video.url
    
    // In development, transform API media URLs to blob URLs
    url = transformToBlobUrl(url)
    
    return url
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

/**
 * Transform API media URLs to direct blob URLs in development
 */
function transformToBlobUrl(url: string): string {
  if (!isDevelopment || !url.includes('/api/media/file/')) {
    return url
  }
  
  // Only transform if we have blob storage configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return url
  }
  
  try {
    const filename = url.split('/api/media/file/')[1]
    if (filename) {
      // Use the blob hostname configured in next.config.ts
      const blobHostname = 'lkmjfsdfkqqgxv8z.public.blob.vercel-storage.com'
      const blobUrl = `https://${blobHostname}/${filename}`
      
      if (isDevelopment) {
        console.log('📸 Transformed API URL to blob URL:', { original: url, blob: blobUrl })
      }
      
      return blobUrl
    }
  } catch (error) {
    console.error('Error transforming blob URL:', error)
  }
  
  return url
}

/**
 * Get the correct image URL for Payload CMS images
 * Handles both relative and absolute URLs for mobile compatibility
 */
export function getPayloadImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) {
    return '/placeholder-image.svg'
  }

  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // If it's a relative URL from Payload, construct the full URL
  if (imageUrl.startsWith('/api/media/') || imageUrl.startsWith('/media/')) {
    const baseUrl = getBaseUrlSafely()
    return `${baseUrl}${imageUrl}`
  }

  // If it starts with just a filename or path, assume it's from Payload media
  if (!imageUrl.startsWith('/')) {
    const baseUrl = getBaseUrlSafely()
    return `${baseUrl}/api/media/${imageUrl}`
  }

  // For any other relative path, use the base URL
  const baseUrl = getBaseUrlSafely()
  return `${baseUrl}${imageUrl}`
}

/**
 * Get the correct URL for Payload CMS media regardless of how it's stored
 * Handles Vercel Blob Storage, local media, and other storage providers
 */
export function getPayloadMediaUrl(media: any): string {
  if (!media) {
    return '/placeholder-image.svg'
  }

  // Handle different Payload media object structures
  let imageUrl: string | undefined

  // Direct string URL
  if (typeof media === 'string') {
    imageUrl = media
  }
  // Media object with url property
  else if (media.url) {
    imageUrl = media.url
  }
  // Media object with filename
  else if (media.filename) {
    imageUrl = `/api/media/${media.filename}`
  }
  // Nested media object
  else if (media.featuredImage) {
    return getPayloadMediaUrl(media.featuredImage)
  }

  return getPayloadImageUrl(imageUrl)
}

/**
 * Extract image sizes from Payload media object
 */
export function getPayloadImageSizes(media: any): { [key: string]: string } {
  const sizes: { [key: string]: string } = {}
  
  if (!media || !media.sizes) {
    return sizes
  }

  Object.entries(media.sizes).forEach(([sizeName, sizeData]: [string, any]) => {
    if (sizeData && sizeData.url) {
      sizes[sizeName] = getPayloadImageUrl(sizeData.url)
    } else if (sizeData && sizeData.filename) {
      sizes[sizeName] = getPayloadImageUrl(`/api/media/${sizeData.filename}`)
    }
  })

  return sizes
}
  