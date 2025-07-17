'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause, VolumeX, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface MediaItem {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  alt?: string
  duration?: number
}

interface MediaCarouselProps {
  media: MediaItem[]
  aspectRatio?: 'square' | 'video' | 'auto'
  className?: string
  showThumbnails?: boolean
  enableVideoPreview?: boolean
  videoPreviewMode?: 'hover' | 'click' | 'always'
  onMediaClick?: (media: MediaItem, index: number) => void
  showControls?: boolean
  showDots?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
}

export default function MediaCarousel({ 
  media, 
  aspectRatio = 'auto', 
  className = '', 
  showThumbnails = true,
  enableVideoPreview = true,
  videoPreviewMode = 'hover',
  onMediaClick,
  showControls = true,
  showDots = true,
  autoPlay = false,
  autoPlayInterval = 5000
}: MediaCarouselProps) {
  // All hooks must be called at the top level, before any conditional returns
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedStates, setLoadedStates] = useState<Record<number, boolean>>({})
  const [videoStates, setVideoStates] = useState<Record<number, { isPlaying: boolean; isMuted: boolean; isHovered: boolean }>>({})
  const [direction, setDirection] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})

  // Auto-play videos when they come into view (Instagram/TikTok style)
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex]
    if (currentVideo && media[currentIndex]?.type === 'video') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              currentVideo.play().catch((error) => {
                console.log('Auto-play prevented:', error)
              })
              setVideoStates(prev => ({
                ...prev,
                [currentIndex]: { isPlaying: true, isMuted: prev[currentIndex]?.isMuted ?? true, isHovered: prev[currentIndex]?.isHovered ?? false }
              }))
            } else {
              currentVideo.pause()
              setVideoStates(prev => ({
                ...prev,
                [currentIndex]: { isPlaying: false, isMuted: prev[currentIndex]?.isMuted ?? true, isHovered: prev[currentIndex]?.isHovered ?? false }
              }))
            }
          })
        },
        { threshold: [0.5] }
      )

      const carouselElement = carouselRef.current
      if (carouselElement) {
        observer.observe(carouselElement)
      }

      return () => {
        observer.disconnect()
      }
    }
    return undefined
  }, [currentIndex, media])

  const handleLoad = useCallback((index: number) => {
    setLoadedStates(prev => ({ ...prev, [index]: true }))
    if (index === currentIndex) {
      setIsLoading(false)
    }
  }, [currentIndex])

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || media.length <= 1) return

    const interval = setInterval(() => {
      setDirection(1)
      setCurrentIndex(prev => (prev + 1) % media.length)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, media.length])

  const handleNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      setDirection(1)
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, media.length])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const handleDotClick = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }, [currentIndex])

  // Touch/Swipe functionality
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragStart(e.touches[0]?.clientX ?? 0)
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const currentX = e.touches[0]?.clientX ?? 0
    const offset = currentX - dragStart
    setDragOffset(offset)
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    const threshold = 50 // Minimum swipe distance
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && currentIndex > 0) {
        handlePrevious()
      } else if (dragOffset < 0 && currentIndex < media.length - 1) {
        handleNext()
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
  }, [isDragging, dragOffset, currentIndex, media.length, handlePrevious, handleNext])

  // Video preview functionality
  const handleVideoHover = useCallback((index: number, isHovered: boolean) => {
    if (!enableVideoPreview) return
    
    setVideoStates(prev => ({
      ...prev,
      [index]: { 
        isPlaying: prev[index]?.isPlaying ?? false,
        isMuted: prev[index]?.isMuted ?? true,
        isHovered
      }
    }))
    
    const video = videoRefs.current[index]
    if (video && videoPreviewMode === 'hover') {
      if (isHovered) {
        video.play().catch(console.error)
      } else {
        video.pause()
      }
    }
  }, [enableVideoPreview, videoPreviewMode])

  const handleVideoClick = useCallback((index: number, event: React.MouseEvent) => {
    if (!enableVideoPreview) return
    
    const video = videoRefs.current[index]
    if (video) {
      if (videoPreviewMode === 'click') {
        event.stopPropagation()
        const newIsPlaying = !videoStates[index]?.isPlaying
        setVideoStates(prev => ({
          ...prev,
          [index]: { 
            isPlaying: newIsPlaying,
            isMuted: prev[index]?.isMuted ?? true,
            isHovered: prev[index]?.isHovered ?? false
          }
        }))
        
        if (newIsPlaying) {
          video.play().catch(console.error)
        } else {
          video.pause()
        }
      } else {
        // Toggle mute on click
        event.stopPropagation()
        const newIsMuted = !videoStates[index]?.isMuted
        setVideoStates(prev => ({
          ...prev,
          [index]: {
            isPlaying: prev[index]?.isPlaying ?? false,
            isMuted: newIsMuted,
            isHovered: prev[index]?.isHovered ?? false
          }
        }))
        video.muted = newIsMuted
      }
    }
  }, [enableVideoPreview, videoPreviewMode, videoStates])

  // Now we can have conditional returns after all hooks are called
  // Guard: Return null if media is undefined or empty
  if (!media || media.length === 0) {
    return null
  }

  // Render single media item (no carousel needed)
  const renderSingleMedia = (item: MediaItem, index: number) => {
    if (item.type === 'image') {
      return (
        <Image
          src={item.url}
          alt={item.alt || `Image ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          quality={85}
          unoptimized={item.url.includes('/api/media/file/')}
          onClick={() => onMediaClick?.(item, index)}
          onError={(e) => {
            console.error('🖼️ MediaCarousel image error:', {
              url: item.url,
              alt: item.alt,
              src: e.currentTarget.src,
              error: e
            })
          }}
          onLoad={() => handleLoad(index)}
        />
      )
    }
    
    if (item.type === 'video') {
      return (
        <div 
          className="relative w-full h-full group"
          onMouseEnter={() => handleVideoHover(index, true)}
          onMouseLeave={() => handleVideoHover(index, false)}
        >
          <video
            ref={(el) => { videoRefs.current[index] = el }}
            src={item.url}
            poster={item.thumbnail || item.url} // Use video URL as poster if no thumbnail
            className="w-full h-full object-cover"
            muted={videoStates[index]?.isMuted !== false}
            loop
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            onClick={(e) => handleVideoClick(index, e)}
            onError={(e) => {
              console.error('🎬 MediaCarousel video error:', {
                url: item.url,
                alt: item.alt,
                src: e.currentTarget.src,
                error: e
              })
              
              // Check if it's a CORS error and try to fix it
              const videoElement = e.currentTarget as HTMLVideoElement
              if (videoElement.error && videoElement.error.code === MediaError.MEDIA_ERR_NETWORK) {
                console.error('🎬 CORS or network error detected')
                // Try to fix CORS by updating the src
                if (videoElement.src && videoElement.src.includes('www.sacavia.com')) {
                  const fixedSrc = videoElement.src.replace('www.sacavia.com', 'sacavia.com')
                  console.log('🎬 Attempting to fix CORS by updating src to:', fixedSrc)
                  videoElement.src = fixedSrc
                  videoElement.load()
                  return
                }
              }
            }}
            onLoadStart={() => {
              console.log('🎬 Video loading started:', item.url)
            }}
            onLoadedData={() => {
              console.log('🎬 Video loaded successfully:', item.url)
              handleLoad(index)
            }}
          />
          
          {/* Video controls overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Play/Pause indicator */}
            {videoPreviewMode === 'click' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {videoStates[index]?.isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </div>
              </div>
            )}
            
            {/* Sound control */}
            <div className="absolute top-4 right-4">
              <button
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation()
                  const video = videoRefs.current[index]
                  if (video) {
                    const newIsMuted = !videoStates[index]?.isMuted
                    setVideoStates(prev => ({
                      ...prev,
                      [index]: {
                        isPlaying: prev[index]?.isPlaying ?? false,
                        isMuted: newIsMuted,
                        isHovered: prev[index]?.isHovered ?? false
                      }
                    }))
                    video.muted = newIsMuted
                  }
                }}
              >
                {videoStates[index]?.isMuted !== false ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  // Single item - no carousel needed
  if (media.length === 1) {
    const item = media[0]
    if (!item) return null

    return (
      <div className={cn(
        'relative overflow-hidden rounded-xl',
        aspectRatio === 'auto' && 'min-h-[300px] h-[400px]',
        aspectRatio === 'square' && 'aspect-square',
        aspectRatio === 'video' && 'aspect-video',
        className
      )}>
        {renderSingleMedia(item, 0)}
      </div>
    )
  }

  // Multi-item carousel
  return (
    <div 
      ref={carouselRef}
      className={cn(
        'relative overflow-hidden rounded-xl group',
        aspectRatio === 'auto' && 'min-h-[300px] h-[400px]',
        aspectRatio === 'square' && 'aspect-square',
        aspectRatio === 'video' && 'aspect-video',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main carousel container */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ 
              x: direction > 0 ? '100%' : '-100%', 
              opacity: 0,
              scale: 0.95
            }}
            animate={{ 
              x: 0, 
              opacity: 1,
              scale: 1
            }}
            exit={{ 
              x: direction > 0 ? '-100%' : '100%', 
              opacity: 0,
              scale: 0.95
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
            className="absolute inset-0"
            style={{
              transform: isDragging ? `translateX(${dragOffset}px)` : undefined
            }}
          >
            {renderSingleMedia(media[currentIndex]!, currentIndex)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {showControls && (
        <>
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          
          {currentIndex < media.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </>
      )}

      {/* Counter */}
      {media.length > 1 && (
        <Badge 
          variant="secondary" 
          className="absolute top-3 left-3 bg-black/70 text-white border-none z-10"
        >
          {currentIndex + 1} / {media.length}
        </Badge>
      )}

      {/* Dots indicator */}
      {showDots && media.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200",
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Swipe indicator (mobile) */}
      {media.length > 1 && (
        <div className="absolute bottom-3 left-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          ← Swipe →
        </div>
      )}
    </div>
  )
} 