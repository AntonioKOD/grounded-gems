/**
 * Image optimization utilities for better performance
 */

export interface ImageOptimizationOptions {
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

/**
 * Generate optimized image URL with query parameters
 */
export function getOptimizedImageUrl(
  url: string, 
  options: ImageOptimizationOptions = {}
): string {
  if (!url || url === '/placeholder.svg') {
    return url
  }

  const {
    quality = 85,
    format = 'webp',
    width,
    height,
    fit = 'cover'
  } = options

  // For external URLs, return as-is (they should handle their own optimization)
  if (url.startsWith('http') && !url.includes(process.env.NEXT_PUBLIC_SERVER_URL || '')) {
    return url
  }

  // Build query parameters for Next.js Image Optimization API
  const params = new URLSearchParams()
  
  if (quality !== 85) params.append('q', quality.toString())
  if (width) params.append('w', width.toString())
  if (height) params.append('h', height.toString())
  if (format !== 'webp') params.append('f', format)
  if (fit !== 'cover') params.append('fit', fit)

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

/**
 * Get responsive image sizes for different breakpoints
 */
export function getResponsiveImageSizes(type: 'feed' | 'profile' | 'thumbnail' | 'hero'): string {
  switch (type) {
    case 'feed':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
    case 'profile':
      return '(max-width: 768px) 100vw, 50vw'
    case 'thumbnail':
      return '(max-width: 768px) 50vw, 25vw'
    case 'hero':
      return '100vw'
    default:
      return '100vw'
  }
}

/**
 * Get optimal image dimensions for different use cases
 */
export function getOptimalDimensions(type: 'feed' | 'profile' | 'thumbnail' | 'avatar'): { width: number; height: number } {
  switch (type) {
    case 'feed':
      return { width: 800, height: 500 }
    case 'profile':
      return { width: 400, height: 400 }
    case 'thumbnail':
      return { width: 200, height: 200 }
    case 'avatar':
      return { width: 100, height: 100 }
    default:
      return { width: 800, height: 500 }
  }
}

/**
 * Compress image on client-side before upload
 */
export function compressImage(
  file: File, 
  options: { quality?: number; maxWidth?: number; maxHeight?: number } = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const { quality = 0.8, maxWidth = 1920, maxHeight = 1080 } = options

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            reject(new Error('Canvas to Blob conversion failed'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convert HEIC images to JPEG (for iOS compatibility)
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  // This would require a HEIC decoder library like 'heic2any'
  // For now, return the original file
  // TODO: Implement HEIC conversion when needed
  return file
}

/**
 * Generate blur data URL for placeholder
 */
export function generateBlurDataUrl(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = width
  canvas.height = height
  
  if (ctx) {
    // Create a simple gradient blur effect
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * Lazy load images with Intersection Observer
 */
export function createImageLazyLoader() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null
  }

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.dataset.src
          
          if (src) {
            img.src = src
            img.removeAttribute('data-src')
          }
        }
      })
    },
    {
      rootMargin: '50px 0px',
      threshold: 0.1
    }
  )
}

/**
 * Get image format support
 */
export function getImageFormatSupport(): {
  webp: boolean
  avif: boolean
} {
  if (typeof window === 'undefined') {
    return { webp: true, avif: false } // Assume WebP support on server
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1

  return {
    webp: canvas.toDataURL('image/webp').indexOf('image/webp') === 5,
    avif: canvas.toDataURL('image/avif').indexOf('image/avif') === 5
  }
}

/**
 * Calculate image file size reduction
 */
export function calculateSizeReduction(originalSize: number, optimizedSize: number): {
  reduction: number
  percentage: string
} {
  const reduction = originalSize - optimizedSize
  const percentage = ((reduction / originalSize) * 100).toFixed(1)
  
  return { reduction, percentage }
} 