"use client"

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Sparkles, ImageIcon } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  aspectRatio?: 'square' | '4/5' | '16/9' | '3/4' | 'auto'
  className?: string
  priority?: boolean
  sizes?: string
  fill?: boolean
  width?: number
  height?: number
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  showLoadingAnimation?: boolean
  enableHoverEffect?: boolean
  rounded?: boolean
}

export default function OptimizedImage({
  src,
  alt,
  aspectRatio = 'auto',
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  width,
  height,
  objectFit = 'cover',
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  showLoadingAnimation = true,
  enableHoverEffect = false,
  rounded = false
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageUrl, setImageUrl] = useState(src)

  // Get aspect ratio classes
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square'
      case '4/5':
        return 'aspect-[4/5]'
      case '16/9':
        return 'aspect-video'
      case '3/4':
        return 'aspect-[3/4]'
      default:
        return ''
    }
  }

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false)
    onLoad?.()
  }, [onLoad])

  // Handle image error with fallback
  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoading(false)
    onError?.()
    
    // Try fallback URL or placeholder
    if (!imageUrl.includes('placeholder')) {
      setImageUrl('/api/placeholder/400/400')
    }
  }, [onError, imageUrl])

  // Generate optimized image URL for different services
  const getOptimizedImageUrl = useCallback((url: string, targetWidth?: number, targetHeight?: number) => {
    // If it's already an optimized URL, return as is
    if (url.includes('w_') || url.includes('h_') || url.includes('f_auto')) {
      return url
    }

    // For Cloudinary URLs
    if (url.includes('cloudinary.com')) {
      const baseUrl = url.split('/image/upload/')[0] + '/image/upload/'
      const imagePath = url.split('/image/upload/')[1]
      
      let transformations = 'f_auto,q_auto'
      if (targetWidth) transformations += `,w_${targetWidth}`
      if (targetHeight) transformations += `,h_${targetHeight}`
      if (objectFit === 'cover') transformations += ',c_fill'
      
      return `${baseUrl}${transformations}/${imagePath}`
    }

    // For other services or local images, return as is
    return url
  }, [objectFit])

  // Container classes
  const containerClasses = [
    'relative overflow-hidden',
    getAspectRatioClass(),
    rounded ? 'rounded-lg' : '',
    enableHoverEffect ? 'group cursor-pointer' : '',
    className
  ].filter(Boolean).join(' ')

  // Image classes
  const imageClasses = [
    'transition-all duration-300',
    objectFit === 'cover' ? 'object-cover' : 
    objectFit === 'contain' ? 'object-contain' :
    objectFit === 'fill' ? 'object-fill' :
    objectFit === 'none' ? 'object-none' : 'object-scale-down',
    enableHoverEffect ? 'group-hover:scale-105' : '',
    isLoading ? 'opacity-0' : 'opacity-100'
  ].filter(Boolean).join(' ')

  // Calculate optimal dimensions based on aspect ratio
  const getDimensions = () => {
    if (width && height) return { width, height }
    
    switch (aspectRatio) {
      case 'square':
        return { width: 400, height: 400 }
      case '4/5':
        return { width: 400, height: 500 }
      case '16/9':
        return { width: 400, height: 225 }
      case '3/4':
        return { width: 400, height: 300 }
      default:
        return { width: width || 400, height: height || 300 }
    }
  }

  const dimensions = getDimensions()
  const optimizedUrl = getOptimizedImageUrl(imageUrl, dimensions.width, dimensions.height)

  return (
    <div className={containerClasses}>
      {/* Error state */}
      {hasError ? (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      ) : (
        <>
          {/* Loading state */}
          {isLoading && showLoadingAnimation && (
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="relative"
              >
                <Sparkles className="h-6 w-6 text-gray-400" />
              </motion.div>
            </div>
          )}

          {/* Main Image */}
          {fill ? (
            <Image
              src={optimizedUrl}
              alt={alt}
              fill
              className={imageClasses}
              priority={priority}
              sizes={sizes}
              quality={quality}
              placeholder={placeholder}
              blurDataURL={blurDataURL}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <Image
              src={optimizedUrl}
              alt={alt}
              width={dimensions.width}
              height={dimensions.height}
              className={imageClasses}
              priority={priority}
              sizes={sizes}
              quality={quality}
              placeholder={placeholder}
              blurDataURL={blurDataURL}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}

          {/* Hover overlay effect */}
          {enableHoverEffect && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
          )}
        </>
      )}
    </div>
  )
}

// Utility function to generate blur data URL for placeholders
export function generateBlurDataURL(width: number = 8, height: number = 8): string {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null
  if (!canvas) return ''
  
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  
  // Create a simple gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL()
}

// Predefined aspect ratios for Instagram-style posts
export const ASPECT_RATIOS = {
  SQUARE: 'square' as const,
  PORTRAIT: '4/5' as const,
  LANDSCAPE: '16/9' as const,
  CLASSIC: '3/4' as const,
  AUTO: 'auto' as const
}

// Utility function to detect optimal aspect ratio from image dimensions
export function detectOptimalAspectRatio(width: number, height: number): typeof ASPECT_RATIOS[keyof typeof ASPECT_RATIOS] {
  const ratio = width / height
  
  if (ratio >= 0.9 && ratio <= 1.1) return ASPECT_RATIOS.SQUARE
  if (ratio < 0.9) return ASPECT_RATIOS.PORTRAIT
  if (ratio > 1.5) return ASPECT_RATIOS.LANDSCAPE
  return ASPECT_RATIOS.CLASSIC
} 