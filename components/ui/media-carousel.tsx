'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause, VolumeX, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { generateBlurDataUrl, getResponsiveImageSizes } from '@/lib/image-utils'

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
  // Guard: Return null if media is undefined or empty
  if (!media || media.length === 0) {
    return null
  }

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedStates, setLoadedStates] = useState<Record<number, boolean>>({})
  const [videoStates, setVideoStates] = useState<Record<number, { isPlaying: boolean; isMuted: boolean; isHovered: boolean }>>({})
  const [direction, setDirection] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
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
                [currentIndex]: { ...prev[currentIndex], isPlaying: true }
              }))
            } else {
              currentVideo.pause()
              setVideoStates(prev => ({
                ...prev,
                [currentIndex]: { ...prev[currentIndex], isPlaying: false }
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
  }, [currentIndex, media])

  // Debug: Log media items (only in development)
  if (process.env.NODE_ENV === 'development' && media && media.some(item => item.type === 'video')) {
    console.log('🎬 MediaCarousel received video items:', media.filter(item => item.type === 'video'))
  }

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

  // Video preview functionality
  const handleVideoHover = useCallback((index: number, isHovered: boolean) => {
    if (!enableVideoPreview) return
    
    setVideoStates(prev => ({
      ...prev,
      [index]: { ...prev[index], isHovered }
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
          [index]: { ...prev[index], isPlaying: newIsPlaying }
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
          [index]: { ...prev[index], isMuted: newIsMuted }
        }))
        video.muted = newIsMuted
      }
    }
  }, [enableVideoPreview, videoPreviewMode, videoStates])

  // Single item - no carousel needed
  if (media.length <= 1) {
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
        {item.type === 'image' ? (
          <Image
              src={item.url}
              alt={item.alt || 'Media'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              quality={85}
              unoptimized={item.url.includes('/api/media/file/')}
              onClick={() => onMediaClick?.(item, 0)}
              onError={(e) => {
                console.error('🖼️ MediaCarousel image error:', {
                  url: item.url,
                  alt: item.alt,
                  src: e.currentTarget.src,
                  error: e
                })
              }}
              onLoad={(e) => {
                console.log('🖼️ MediaCarousel image loaded successfully:', {
                  url: item.url,
                  src: e.currentTarget.src,
                  naturalWidth: e.currentTarget.naturalWidth,
                  naturalHeight: e.currentTarget.naturalHeight
                })
              }}
                        />
        ) : (
          <div 
            className="relative w-full h-full group"
            onMouseEnter={() => handleVideoHover(0, true)}
            onMouseLeave={() => handleVideoHover(0, false)}
          >
            <video
              ref={(el) => { videoRefs.current[0] = el }}
              src={item.url}
              poster={item.thumbnail}
              className="w-full h-full object-cover"
              muted={videoStates[0]?.isMuted !== false}
              loop
              playsInline
              preload="metadata"
              onClick={(e) => handleVideoClick(0, e)}
            />
            
            {/* Video overlay indicators - Always show sound control in feed */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Play/Pause indicator */}
              {videoPreviewMode === 'click' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {videoStates[0]?.isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </div>
                </div>
              )}
              
              {/* Sound control - Always visible for feed videos */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const video = videoRefs.current[0]
                  if (video) {
                    const newIsMuted = !videoStates[0]?.isMuted
                    setVideoStates(prev => ({
                      ...prev,
                      [0]: { ...prev[0], isMuted: newIsMuted }
                    }))
                    video.muted = newIsMuted
                  }
                }}
                className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
              >
                {videoStates[0]?.isMuted !== false ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              
              {/* Tap to unmute indicator - Instagram style */}
              {videoStates[0]?.isMuted !== false && (
                <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                  <VolumeX className="w-3 h-3" />
                  <span>Tap 🔊 for sound</span>
                </div>
              )}
                
                {/* Duration indicator */}
                {item.duration && (
                  <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                    {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

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
    >
      {/* Main carousel container */}
      <div className="relative w-full h-full">
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
            {media[currentIndex]?.type === 'image' ? (
              <Image
                  src={media[currentIndex].url}
                  alt={media[currentIndex].alt || `Image ${currentIndex + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={85}
                  unoptimized={media[currentIndex].url.includes('/api/media/file/')}
                  onClick={() => onMediaClick?.(media[currentIndex], currentIndex)}
                  onError={(e) => {
                    console.error('🖼️ MediaCarousel carousel image error:', {
                      url: media[currentIndex].url,
                      alt: media[currentIndex].alt,
                      currentIndex,
                      src: e.currentTarget.src,
                      error: e
                    })
                  }}
                  onLoad={(e) => {
                    console.log('🖼️ MediaCarousel carousel image loaded successfully:', {
                      url: media[currentIndex].url,
                      currentIndex,
                      naturalWidth: e.currentTarget.naturalWidth,
                      naturalHeight: e.currentTarget.naturalHeight
                    })
                  }}
                                />
            ) : media[currentIndex]?.type === 'video' ? (
              <div 
                className="relative w-full h-full group"
                onMouseEnter={() => handleVideoHover(currentIndex, true)}
                onMouseLeave={() => handleVideoHover(currentIndex, false)}
              >
                <video
                  ref={(el) => { videoRefs.current[currentIndex] = el }}
                  src={media[currentIndex].url}
                  poster={media[currentIndex].thumbnail}
                  className="w-full h-full object-cover"
                  muted={videoStates[currentIndex]?.isMuted !== false}
                  loop
                  playsInline
                  preload="metadata"
                  onClick={(e) => handleVideoClick(currentIndex, e)}
                />
                
                {/* Video overlay indicators - Always show sound control in feed */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Play/Pause indicator */}
                  {videoPreviewMode === 'click' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {videoStates[currentIndex]?.isPlaying ? (
                          <Pause className="w-8 h-8 text-white" />
                        ) : (
                          <Play className="w-8 h-8 text-white ml-1" />
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Sound control - Always visible for feed videos */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const video = videoRefs.current[currentIndex]
                      if (video) {
                        const newIsMuted = !videoStates[currentIndex]?.isMuted
                        setVideoStates(prev => ({
                          ...prev,
                          [currentIndex]: { ...prev[currentIndex], isMuted: newIsMuted }
                        }))
                        video.muted = newIsMuted
                      }
                    }}
                    className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
                  >
                    {videoStates[currentIndex]?.isMuted !== false ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  
                  {/* Tap to unmute indicator - Instagram style */}
                  {videoStates[currentIndex]?.isMuted !== false && (
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      <VolumeX className="w-3 h-3" />
                      <span>Tap 🔊 for sound</span>
                    </div>
                  )}
                    
                    {/* Duration indicator */}
                    {media[currentIndex].duration && (
                      <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                        {Math.floor(media[currentIndex].duration / 60)}:{(media[currentIndex].duration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation arrows */}
      {showControls && media.length > 1 && (
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
          
          {currentIndex < media.length - 1 && (
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
      {media.length > 1 && (
        <Badge 
          variant="secondary" 
          className="absolute top-3 right-3 bg-black/70 text-white border-none z-10"
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
    </div>
  )
} 