'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl, getResponsiveImageSizes, generateBlurDataUrl } from '@/lib/image-optimization'

interface MediaItem {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  alt?: string
}

interface MediaCarouselProps {
  items: MediaItem[]
  className?: string
  aspectRatio?: string
  autoPlay?: boolean
  autoPlayInterval?: number
  showControls?: boolean
  showDots?: boolean
  showCounter?: boolean
  onItemChange?: (index: number) => void
  priority?: boolean
}

export default function MediaCarousel({
  items,
  className = '',
  aspectRatio = '16/10',
  autoPlay = false,
  autoPlayInterval = 5000,
  showControls = true,
  showDots = true,
  showCounter = true,
  onItemChange,
  priority = false
}: MediaCarouselProps) {
  // Debug: Log media items (only in development)
  if (process.env.NODE_ENV === 'development' && items.some(item => item.type === 'video')) {
    console.log('🎬 MediaCarousel received video items:', items.filter(item => item.type === 'video'))
  }
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [direction, setDirection] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Define currentItem early to avoid initialization errors
  const currentItem = items[currentIndex]



  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || items.length <= 1) return

    const interval = setInterval(() => {
      if (!isDragging) {
        handleNext()
      }
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, isDragging, items.length])

  // Intersection Observer for video autoplay/pause
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting)
        })
      },
      { 
        threshold: 0.3, // Play when 30% visible
        rootMargin: '20px'
      }
    )

    observer.observe(container)
    
    // Check initial visibility
    const rect = container.getBoundingClientRect()
    const isInitiallyVisible = rect.top < window.innerHeight && rect.bottom > 0
    setIsVisible(isInitiallyVisible)
    
    return () => observer.disconnect()
  }, [])

  // Auto-play/pause videos based on visibility (simplified)
  useEffect(() => {
    const video = videoRef.current
    if (!video || currentItem?.type !== 'video') return

    if (isVisible && video.paused) {
      video.play().catch((error) => {
        console.log('🎬 Video autoplay prevented:', error.message)
      })
    } else if (!isVisible && !video.paused) {
      video.pause()
    }
  }, [isVisible, currentItem?.type])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === ' ' && currentItem?.type === 'video') {
        e.preventDefault()
        togglePlayPause()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setDirection(1)
      setCurrentIndex(prev => prev + 1)
      onItemChange?.(currentIndex + 1)
    }
  }, [currentIndex, items.length, onItemChange])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(prev => prev - 1)
      onItemChange?.(currentIndex - 1)
    }
  }, [currentIndex, onItemChange])

  const handleDotClick = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
    onItemChange?.(index)
  }, [currentIndex, onItemChange])

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Handle swipe gestures
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false)
    const threshold = 50
    
    if (info.offset.x > threshold && currentIndex > 0) {
      handlePrevious()
    } else if (info.offset.x < -threshold && currentIndex < items.length - 1) {
      handleNext()
    }
  }, [currentIndex, items.length, handleNext, handlePrevious])

  // Single item - no carousel needed
  if (items.length <= 1) {
    return (
      <div className={cn('relative overflow-hidden rounded-xl', className)} style={{ aspectRatio }}>
        {currentItem?.type === 'image' ? (
          <Image
            src={getOptimizedImageUrl(currentItem.url, { quality: 85, format: 'webp' })}
            alt={currentItem.alt || 'Media'}
            fill
            className="object-cover"
            priority={priority}
            sizes={getResponsiveImageSizes('feed')}
            placeholder="blur"
            blurDataURL={generateBlurDataUrl()}
            quality={85}
          />
                ) : currentItem?.type === 'video' ? (
          <div className="relative w-full h-full">
            <video
              ref={(ref) => {
                if (ref) {
                  videoRef.current = ref
                  // Try to play when video is ready
                  const handleCanPlay = () => {
                    ref.play().catch(() => {
                      // Autoplay blocked - user will need to click
                    })
                  }
                  ref.removeEventListener('canplay', handleCanPlay)
                  ref.addEventListener('canplay', handleCanPlay)
                }
              }}
              src={currentItem.url}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
              preload="auto"
              autoPlay
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={(e) => {
                console.error('🎬 Video error:', currentItem.url, e.currentTarget.error)
              }}
            />
            {/* Tap to toggle sound or play video */}
            <div className="absolute inset-0" onClick={(e) => {
              e.stopPropagation()
              const video = videoRef.current
              if (video) {
                if (video.paused) {
                  console.log('🎬 User clicked - trying to play video')
                  video.play().catch((error) => {
                    console.error('🎬 Failed to play video on click:', error)
                  })
                } else {
                  toggleMute()
                }
              }
            }}>
              {/* Sound indicator - subtle */}
              <div className="absolute top-3 right-3 text-white/70 transition-opacity">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </div>
              {/* Show play button if video is paused */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-xl group', className)} 
      style={{ aspectRatio }}
    >
      {/* Main carousel container */}
      <motion.div
        className="relative w-full h-full"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0"
          >
            {currentItem?.type === 'image' ? (
              <Image
                src={getOptimizedImageUrl(currentItem.url, { quality: 85, format: 'webp' })}
                alt={currentItem.alt || `Image ${currentIndex + 1}`}
                fill
                className="object-cover"
                priority={priority && currentIndex === 0}
                sizes={getResponsiveImageSizes('feed')}
                quality={85}
                placeholder="blur"
                blurDataURL={generateBlurDataUrl()}
              />
                        ) : currentItem?.type === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  ref={(ref) => {
                    if (ref) {
                      videoRef.current = ref
                      // Try to play when video is ready
                      const handleCanPlay = () => {
                        ref.play().catch(() => {
                          // Autoplay blocked - user will need to click
                        })
                      }
                      ref.removeEventListener('canplay', handleCanPlay)
                      ref.addEventListener('canplay', handleCanPlay)
                    }
                  }}
                  src={currentItem.url}
                  className="w-full h-full object-cover"
                  muted={isMuted}
                  loop
                  playsInline
                  preload="auto"
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={(e) => {
                    console.error('🎬 Video error:', currentItem.url, e.currentTarget.error)
                  }}
                />
                
                {/* Tap to toggle sound or play video */}
                <div className="absolute inset-0" onClick={(e) => {
                  e.stopPropagation()
                  const video = videoRef.current
                  if (video) {
                    if (video.paused) {
                      console.log('🎬 User clicked carousel - trying to play video')
                      video.play().catch((error) => {
                        console.error('🎬 Failed to play carousel video on click:', error)
                      })
                    } else {
                      toggleMute()
                    }
                  }
                }}>
                  {/* Sound indicator - subtle */}
                  <div className="absolute top-3 right-3 text-white/70 transition-opacity">
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </div>
                  {/* Show play button if video is paused */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                        <Play className="h-8 w-8 text-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation arrows */}
      {showControls && items.length > 1 && (
        <>
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          {currentIndex < items.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </>
      )}

      {/* Counter */}
      {showCounter && items.length > 1 && (
        <Badge 
          variant="secondary" 
          className="absolute top-3 right-3 bg-black/70 text-white border-none z-10"
        >
          {currentIndex + 1} / {items.length}
        </Badge>
      )}

      {/* Dots indicator */}
      {showDots && items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar for auto-play */}
      {autoPlay && items.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 z-10">
          <motion.div
            className="h-full bg-white"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: autoPlayInterval / 1000, ease: "linear" }}
            key={currentIndex}
          />
        </div>
      )}
    </div>
  )
} 