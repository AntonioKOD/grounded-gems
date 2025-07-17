
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
let getApiBaseUrlFromCapacitor: (() => Promise<string>) | null = null

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
      ? 'https://www.sacavia.com' 
      : 'http://localhost:3000'
  }

  // Client-side logic
  // NOTE: getApiBaseUrlFromCapacitor is async, but getBaseUrlSafely is sync. For now, skip using it here.
  // If you need to support async, refactor getBaseUrlSafely to be async and handle accordingly.

  // Fallback for client-side
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'www.sacavia.com') {
      return 'https://www.sacavia.com'
    }
    return window.location.origin
  }

  // Final fallback
  return process.env.NODE_ENV === 'production' 
    ? 'https://www.sacavia.com' 
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
    
    // Transform API media URLs for local development
    url = transformToBlobUrl(url)
    
    // Ensure the URL is properly formatted for serving
    if (url.startsWith('/') && !url.startsWith('http')) {
      const baseUrl = getBaseUrlSafely()
      url = `${baseUrl}${url}`
    }
    
    if (isDevelopment) {
      console.log('📸 getImageUrl: String URL processed:', {
        original: image,
        processed: url
      })
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
        id: image.id,
        url: image.url,
        filename: image.filename,
        thumbnailURL: image.thumbnailURL,
        sizes: image.sizes ? Object.keys(image.sizes) : null,
        hasCardSize: image.sizes?.card?.url,
        hasThumbnailSize: image.sizes?.thumbnail?.url
      })
    }
    
    // Try different URL sources in order of preference for Payload CMS
    let url = null
    
    // 1. Direct URL from media object (most common)
    if (image.url) {
      url = image.url
    }
    // 2. Try card size for better quality
    else if (image.sizes?.card?.url) {
      url = image.sizes.card.url
    }
    // 3. Try thumbnail size as fallback
    else if (image.sizes?.thumbnail?.url) {
      url = image.sizes.thumbnail.url
    }
    // 4. Legacy thumbnailURL field
    else if (image.thumbnailURL) {
      url = image.thumbnailURL
    }
    // 5. Construct URL from filename if available
    else if (image.filename) {
      url = `/api/media/file/${image.filename}`
    }
    // 6. Try to use ID-based URL if available
    else if (image.id) {
      url = `/api/media/file/${image.id}`
    }
    // 7. Fallback to placeholder
    else {
      url = "/placeholder.svg"
    }
    
    // Transform API media URLs for local development
    if (url !== "/placeholder.svg") {
      url = transformToBlobUrl(url)
      
      // Ensure the URL is properly formatted for serving
      if (url.startsWith('/') && !url.startsWith('http')) {
        const baseUrl = getBaseUrlSafely()
        url = `${baseUrl}${url}`
      }
    }
                
    if (isDevelopment) {
      console.log('📸 getImageUrl: Media object processed:', {
        hasDirectUrl: !!image.url,
        hasCardUrl: !!image.sizes?.card?.url,
        hasThumbnailUrl: !!image.sizes?.thumbnail?.url,
        hasThumbnailURL: !!image.thumbnailURL,
        hasFilename: !!image.filename,
        hasId: !!image.id,
        selectedUrl: url,
        finalUrl: url,
        isPlaceholder: url === "/placeholder.svg"
      })
    }
    
    return url
  }

  if (isDevelopment) {
    console.log('📸 getImageUrl: No valid image found, returning placeholder. Input was:', {
      type: typeof image,
      value: image
    })
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
    
    // Ensure URL is properly formatted for production
    if (url.startsWith('/') && !url.startsWith('http')) {
      const baseUrl = getBaseUrlSafely()
      url = `${baseUrl}${url}`
    }
    
    return url
  }
  
  // Handle PayloadCMS media objects
  if (typeof video === "object" && video !== null) {
    let url: string | null = null
    
    // Try different URL sources in order of preference
    if (video.url) {
      url = video.url
    } else if (video.filename) {
      url = `/api/media/file/${video.filename}`
    } else if (video.id) {
      url = `/api/media/file/${video.id}`
    }
    
    if (!url) return null
    
    // Ensure URL is properly formatted for production
    if (url.startsWith('/') && !url.startsWith('http')) {
      const baseUrl = getBaseUrlSafely()
      url = `${baseUrl}${url}`
    }
    
    return url
  }

  return null
}

/**
 * Generate a video thumbnail URL from the beginning of the video
 * This creates a thumbnail by seeking to 0.1 seconds into the video
 */
export function getVideoThumbnailUrl(video: any): string | null {
  if (!video) return null
  
  const videoUrl = getVideoUrl(video)
  if (!videoUrl) return null
  
  // For now, return the video URL itself - the video element will use it as poster
  // In a production environment, you might want to generate actual thumbnail images
  // and store them separately, but for now this will work
  return videoUrl
}

/**
 * Create a video thumbnail by seeking to the beginning of the video
 * This is a client-side function that can be used to generate thumbnails
 */
export function createVideoThumbnail(videoElement: HTMLVideoElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }
    
    // Set canvas size
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 360
    
    // Seek to beginning of video
    videoElement.currentTime = 0.1
    
    const handleSeeked = () => {
      try {
        // Draw the video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
        
        // Convert to data URL
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(thumbnailUrl)
        
        // Clean up
        videoElement.removeEventListener('seeked', handleSeeked)
      } catch (error) {
        reject(error)
      }
    }
    
    videoElement.addEventListener('seeked', handleSeeked)
    
    // Handle errors
    videoElement.addEventListener('error', () => {
      reject(new Error('Video error occurred'))
    })
  })
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
      .map((photo: any) => getImageUrl(photo))
      .filter((url: string) => url !== "/placeholder.svg")
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
  // Don't transform if not in development or if it's not an API media URL
  if (!isDevelopment || !url.includes('/api/media/file/')) {
    return url
  }
  
  // For now, just return the original URL since we're using local file serving
  // The /api/media/file/[filename] route handles video serving properly
  if (isDevelopment) {
    console.log('📸 Keeping API URL for local serving:', url)
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

export function getImageBaseUrl(): string {
  // Server-side
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_MEDIA_URL || 
           process.env.NEXT_PUBLIC_BASE_URL || 
           'https://www.sacavia.com'
  }

  // Client-side
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3000'
  }
  
  if (window.location.hostname === 'www.sacavia.com') {
    return 'https://www.sacavia.com'
  }

  return window.location.origin
}

export function getMediaUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_MEDIA_URL || 
           'https://www.sacavia.com'
  }

  return getImageBaseUrl()
}

/**
 * Image utilities for consistent primary image handling across Sacavia
 * Ensures the first/primary image is always displayed consistently
 */

interface MediaItem {
  id: string
  url: string
  alt?: string
  filename?: string
  width?: number
  height?: number
}

export interface GalleryItem {
  image: string | MediaItem | ImageSource
  caption?: string
  isPrimary?: boolean
  order?: number
  altText?: string
  tags?: Array<{ tag: string }>
}

interface LocationWithImages {
  id: string
  name: string
  featuredImage?: MediaItem | string
  gallery?: GalleryItem[]
  imageUrl?: string // Legacy field for backward compatibility
}

/**
 * Enhanced image utilities for handling various image sources and formats
 */

export interface ImageSource {
  url?: string
  filename?: string
  alt?: string
  width?: number
  height?: number
}
export interface GalleryItem {
  image: string | MediaItem | ImageSource
  caption?: string
  isPrimary?: boolean
  order?: number
  altText?: string
}

/**
 * Get the primary image URL for a location with comprehensive fallback handling
 */
export function getPrimaryImageUrl(location: any): string {
  // 1. Check featuredImage first (highest priority)
  if (location.featuredImage) {
    const featuredUrl = extractImageUrl(location.featuredImage)
    if (featuredUrl) return featuredUrl
  }

  // 2. Check gallery for primary image
  if (location.gallery && Array.isArray(location.gallery)) {
    // Sort by order and find primary
    const sortedGallery = [...location.gallery].sort((a, b) => (a.order || 0) - (b.order || 0))
    
    // Look for explicitly marked primary image
    const primaryImage = sortedGallery.find(item => item.isPrimary)
    if (primaryImage) {
      const primaryUrl = extractImageUrl(primaryImage.image)
      if (primaryUrl) return primaryUrl
    }
    
    // Fallback to first gallery image
    if (sortedGallery.length > 0) {
      const firstUrl = extractImageUrl(sortedGallery[0].image)
      if (firstUrl) return firstUrl
    }
  }

  // 3. Check legacy imageUrl field
  if (location.imageUrl) {
    return location.imageUrl
  }

  // 4. Check if there are any image-like fields from Foursquare imports
  if (location.photos && Array.isArray(location.photos) && location.photos.length > 0) {
    const firstPhoto = location.photos[0]
    if (typeof firstPhoto === 'string') return firstPhoto
    if (firstPhoto?.url) return firstPhoto.url
    if (firstPhoto?.highResUrl) return firstPhoto.highResUrl
    if (firstPhoto?.thumbnailUrl) return firstPhoto.thumbnailUrl
  }

  // 5. Final fallback to placeholder
  return "/placeholder.svg"
}

/**
 * Extract image URL from various image object formats
 */
function extractImageUrl(imageSource: any): string | null {
  if (!imageSource) return null

  // Direct string URL
  if (typeof imageSource === 'string') {
    return imageSource
  }

  // Standard Payload media object
  if (imageSource.url) {
    return imageSource.url
  }

  // Foursquare photo formats
  if (imageSource.highResUrl) {
    return imageSource.highResUrl
  }

  if (imageSource.thumbnailUrl) {
    return imageSource.thumbnailUrl
  }

  // Media object with filename (construct URL)
  if (imageSource.filename) {
    return `/api/media/${imageSource.filename}`
  }

  // Nested media object
  if (imageSource.media?.url) {
    return imageSource.media.url
  }

  if (imageSource.media?.filename) {
    return `/api/media/${imageSource.media.filename}`
  }

  return null
}

/**
 * Get all available images for a location (for galleries, previews, etc.)
 */
export function getAllLocationImages(location: any): string[] {
  const images: string[] = []

  // Add featured image
  const featuredUrl = extractImageUrl(location.featuredImage)
  if (featuredUrl) {
    images.push(featuredUrl)
  }

  // Add gallery images
  if (location.gallery && Array.isArray(location.gallery)) {
    (location.gallery as GalleryItem[])
      .sort((a: GalleryItem, b: GalleryItem) => (a.order || 0) - (b.order || 0))
      .forEach((item: GalleryItem) => {
        const url = extractImageUrl(item.image)
        if (url && !images.includes(url)) {
          images.push(url)
        }
      })
  }

  // Add legacy imageUrl if not already included
  if (location.imageUrl && !images.includes(location.imageUrl)) {
    images.push(location.imageUrl)
  }

  // Add Foursquare photos if available
  if (location.photos && Array.isArray(location.photos)) {
    location.photos.forEach((photo: any) => {
      const url = extractImageUrl(photo)
      if (url && !images.includes(url)) {
        images.push(url)
      }
    })
  }

  return images.length > 0 ? images : ["/placeholder.svg"]
}

/**
 * Optimize image URL with size parameters if supported
 */
export function optimizeImageUrl(url: string, width?: number, height?: number, quality?: number): string {
  if (!url || url === "/placeholder.svg") return url

  // If it's already a Payload media URL, add optimization parameters
  if (url.includes('/api/media/')) {
    const params = new URLSearchParams()
    if (width) params.append('width', width.toString())
    if (height) params.append('height', height.toString())
    if (quality) params.append('quality', quality.toString())
    
    const separator = url.includes('?') ? '&' : '?'
    return params.toString() ? `${url}${separator}${params.toString()}` : url
  }

  // For external URLs (like Foursquare), return as-is
  return url
}

/**
 * Check if an image URL is valid and accessible
 */
export function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || url === "/placeholder.svg") {
      resolve(false)
      return
    }

    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

/**
 * Generate responsive image sizes
 */
export function getResponsiveImageSizes(baseUrl: string) {
  return {
    thumbnail: optimizeImageUrl(baseUrl, 150, 150, 80),
    small: optimizeImageUrl(baseUrl, 300, 200, 85),
    medium: optimizeImageUrl(baseUrl, 600, 400, 90),
    large: optimizeImageUrl(baseUrl, 1200, 800, 95),
    original: baseUrl
  }
}

/**
 * Legacy function for backward compatibility
 */
export function getLocationImageUrl(location: any): string {
  return getPrimaryImageUrl(location)
}

/**
 * Get all images for a location in proper order
 */
export function getLocationImages(location: LocationWithImages): Array<{
  url: string
  caption?: string
  altText?: string
  isPrimary: boolean
  order: number
  tags?: string[]
}> {
  const images: Array<{
    url: string
    caption?: string
    altText?: string
    isPrimary: boolean
    order: number
    tags?: string[]
  }> = []

  // Add featured image if it exists and isn't already in gallery
  if (location.featuredImage) {
    const featuredUrl = typeof location.featuredImage === 'string' 
      ? location.featuredImage 
      : location.featuredImage.url

    if (featuredUrl) {
      const isInGallery = location.gallery?.some(item => {
        const galleryUrl = typeof item.image === 'string' ? item.image : item.image.url
        return galleryUrl === featuredUrl
      })

      if (!isInGallery) {
        images.push({
          url: featuredUrl,
          altText: typeof location.featuredImage === 'object' ? location.featuredImage.alt : undefined,
          isPrimary: true,
          order: -1, // Featured image always comes first
          tags: []
        })
      }
    }
  }

  // Add gallery images
  if (location.gallery && location.gallery.length > 0) {
    const sortedGallery = [...location.gallery].sort((a, b) => (a.order || 0) - (b.order || 0))
    
    sortedGallery.forEach((item, index) => {
      const imageUrl = typeof item.image === 'string' ? item.image : item.image.url
      if (imageUrl) {
        images.push({
          url: imageUrl,
          caption: item.caption,
          altText: item.altText || (typeof item.image === 'object' ? item.image.alt : undefined),
          isPrimary: item.isPrimary || false,
          order: item.order !== undefined ? item.order : index,
          tags: item.tags?.map(t => t.tag) || []
        })
      }
    })
  }

  // Sort by order (featured image will be first due to order: -1)
  return images.sort((a, b) => a.order - b.order)
}

/**
 * Get optimized image URL with size parameters for different use cases
 */
export function getOptimizedImageUrl(
  imageUrl: string, 
  size: 'thumbnail' | 'card' | 'hero' | 'full' = 'card'
): string {
  if (!imageUrl) return '/images/location-placeholder.jpg'

  // If it's already a full URL, return as is for now
  // In production, you might want to add Vercel Image Optimization or similar
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }

  // Size parameters for different use cases
  const sizeParams = {
    thumbnail: '?w=150&h=150&fit=crop&q=80',
    card: '?w=400&h=300&fit=crop&q=85',
    hero: '?w=1200&h=600&fit=crop&q=90',
    full: '?q=95'
  }

  return `${imageUrl}${sizeParams[size]}`
}

/**
 * Generate alt text for location images
 */
export function generateImageAltText(
  location: LocationWithImages, 
  imageIndex: number = 0,
  customAltText?: string
): string {
  if (customAltText) return customAltText

  const baseAltText = `${location.name} - Image ${imageIndex + 1}`
  
  if (imageIndex === 0) {
    return `${location.name} - Main view`
  }
  
  return baseAltText
}

/**
 * Validate and sanitize image data
 */
export function validateLocationImages(location: LocationWithImages): {
  isValid: boolean
  errors: string[]
  hasPrimaryImage: boolean
  imageCount: number
} {
  const errors: string[] = []
  let hasPrimaryImage = false
  let imageCount = 0

  // Check featured image
  if (location.featuredImage) {
    const featuredUrl = typeof location.featuredImage === 'string' 
      ? location.featuredImage 
      : location.featuredImage.url
    
    if (featuredUrl) {
      hasPrimaryImage = true
      imageCount++
    } else {
      errors.push('Featured image URL is missing')
    }
  }

  // Check gallery images
  if (location.gallery && location.gallery.length > 0) {
    location.gallery.forEach((item, index) => {
      const imageUrl = typeof item.image === 'string' ? item.image : item.image?.url
      
      if (!imageUrl) {
        errors.push(`Gallery image ${index + 1} is missing URL`)
      } else {
        imageCount++
        if (item.isPrimary) {
          hasPrimaryImage = true
        }
      }
    })
  }

  // If no featured image but gallery exists, first gallery image should be primary
  if (!location.featuredImage && location.gallery && location.gallery.length > 0) {
    const firstGalleryImage = location.gallery[0]
    if (firstGalleryImage && !firstGalleryImage.isPrimary) {
      errors.push('First gallery image should be marked as primary when no featured image exists')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasPrimaryImage,
    imageCount
  }
}

/**
 * Helper function to ensure consistent image handling in components
 */
export function useLocationImage(location: LocationWithImages) {
  const primaryImage = getPrimaryImageUrl(location)
  const allImages = getLocationImages(location)
  const validation = validateLocationImages(location)

  return {
    primaryImage,
    allImages,
    validation,
    getOptimized: (size: 'thumbnail' | 'card' | 'hero' | 'full' = 'card') => 
      getOptimizedImageUrl(primaryImage, size),
    getAltText: (index: number = 0, customAlt?: string) => 
      generateImageAltText(location, index, customAlt)
  }
}

// Export default placeholder image
export const DEFAULT_LOCATION_PLACEHOLDER = '/images/location-placeholder.jpg'

// Export common image sizes
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 150, height: 150 },
  CARD: { width: 400, height: 300 },
  HERO: { width: 1200, height: 600 },
  MOBILE_CARD: { width: 300, height: 225 }
} as const
  