"use client"

import { useState, useCallback, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Sparkles, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPayloadImageUrl } from '@/lib/image-utils'

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
  unoptimized?: boolean
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
  rounded = false,
  unoptimized = false
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  // Process the image URL using Payload utilities
  const actualSrc = useMemo(() => {
    // Use Payload image utilities to handle URL correctly
    const processedUrl = getPayloadImageUrl(src)
    
    // If it's still a problematic URL, use placeholder
    if (!processedUrl || processedUrl === '/placeholder.svg') {
      return '/placeholder.svg'
    }
    
    return processedUrl
  }, [src])

  // Check if URL is likely broken and set error state immediately
  const isKnownBrokenUrl = useMemo(() => {
    if (!src) return true
    // Known broken URL patterns - removed old domain since we're transforming them to blob URLs
    const brokenPatterns = [
      'localhost:3000/', // Development backend
      // Add patterns for known orphaned files
      'profile-21.jpg',
      'IMG_5220.jpeg',
      'video0-1.mp4',
      'image0-4.jpg',
      '471397050_17881949370194933_2073590004579394643_n-1.jpeg',
      'AFF2341B-BC13-4DE7-9C76-FE5DC521E2F7.jpeg',
      'profile-29.jpg',
      'IMG_3615.jpeg',
      // Add the specific media IDs that are orphaned
      '68ad13f116af4a7d031e5e9b',
      '6876f41cf2377412ccaa4277',
      '68c0283c97a2dbccf98e17c3',
      '68cb6eb2bd952f240f2b7286',
      '684518e59742d9d7b7441495',
      '6862ff259576f5428824b070',
      '68c4ea1aa33d2a172a7a4903',
      '6863017f514ad58f9bf7bcca'
    ]
    return brokenPatterns.some(pattern => src.includes(pattern))
  }, [src])

  // Set error state immediately for known broken URLs
  useEffect(() => {
    if (isKnownBrokenUrl) {
      console.warn('OptimizedImage: Known broken URL detected, using fallback:', src)
      setHasError(true)
      setIsLoading(false)
      return
    }
    
    // Reset states when src changes to a potentially valid URL
    setHasError(false)
    setIsLoading(true)
    
    // Debug logging for blob storage URLs
    if (src && (src.includes('.blob.vercel-storage.com') || src.includes('/api/media/'))) {
      console.log('🖼️ OptimizedImage: Loading image:', src)
    }
  }, [src, isKnownBrokenUrl])

  // Add timeout for stuck loading states
  useEffect(() => {
    if (!isLoading || hasError) return

    const timeout = setTimeout(() => {
      console.warn('OptimizedImage: Loading timeout, switching to fallback:', src)
      console.warn('💡 Development hint: If using PayloadCMS with Vercel Blob Storage, ensure BLOB_READ_WRITE_TOKEN is set in .env.local')
      setHasError(true)
      setIsLoading(false)
      onError?.()
    }, 5000) // Increased timeout to 5 seconds for better reliability

    return () => clearTimeout(timeout)
  }, [isLoading, hasError, src, onError])

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
    if (!hasError) { // Only set loading to false if we don't already have an error
      setIsLoading(false)
      onLoad?.()
    }
  }, [onLoad, hasError])

  // Handle image error with robust fallback
  const handleError = useCallback((event?: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn('OptimizedImage failed to load:', actualSrc)
    console.log('OptimizedImage error details:', {
      src: actualSrc,
      originalSrc: src,
      error: event?.type,
      timestamp: new Date().toISOString()
    })
    setHasError(true)
    setIsLoading(false)
    
    // If this isn't already the fallback, try switching to fallback
    if (actualSrc !== '/placeholder.svg') {
      console.log('OptimizedImage: Switching to fallback image')
    }
    
    onError?.()
  }, [onError, actualSrc, src])

  // Check if URL is potentially problematic (for future debugging)
  const isPotentiallyBrokenUrl = useMemo(() => {
    // Currently no known patterns, but keeping for future debugging
    return false
  }, [src])

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

  // Check if we should use unoptimized based on the URL
  const shouldUseUnoptimized = useMemo(() => {
    // Use unoptimized only for broken URLs or when explicitly set
    return unoptimized || isKnownBrokenUrl
  }, [src, unoptimized, isKnownBrokenUrl])

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

  return (
    <div className={containerClasses}>
      {/* Error state with improved UI */}
      {hasError && actualSrc === '/placeholder-image.svg' ? (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center">
          <div className="text-center text-gray-600 p-4">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-medium">Image unavailable</p>
          </div>
        </div>
      ) : (
        <>
          {/* Loading state */}
          {isLoading && showLoadingAnimation && (
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500 mt-2">Loading...</p>
              </div>
            </div>
          )}

          {/* Main Image */}
          {fill ? (
            <Image
              src={actualSrc}
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
              objectFit="cover"
              unoptimized={shouldUseUnoptimized}
            />
          ) : (
            <Image
              src={actualSrc}
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
              objectFit="cover"
              unoptimized={shouldUseUnoptimized}
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