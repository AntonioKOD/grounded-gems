"use client"

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface VideoPlayerProps {
  src: string
  thumbnail?: string
  aspectRatio?: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onError?: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onViewStart?: () => void
  onViewComplete?: () => void
  className?: string
  controls?: boolean
  showProgress?: boolean
  showPlayButton?: boolean
  preload?: "none" | "metadata" | "auto"
  enableAutoplay?: boolean
  enableVoice?: boolean
  isVisible?: boolean
}

export default function VideoPlayer({
  src,
  thumbnail,
  aspectRatio = "16/9",
  autoPlay = false,
  muted = true,
  loop = true,
  onPlay,
  onPause,
  onEnded,
  onError,
  onTimeUpdate,
  onViewStart,
  onViewComplete,
  className,
  controls = true,
  showProgress = true,
  showPlayButton = true,
  preload = "metadata",
  enableAutoplay = true,
  enableVoice = true,
  isVisible = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [viewStartTime, setViewStartTime] = useState<number | null>(null)
  const [viewCompleteTime, setViewCompleteTime] = useState<number | null>(null)
  const [isInView, setIsInView] = useState(false)

  // Process video URL to ensure it's correct
  const processedVideoUrl = useMemo(() => {
    if (!src) return ''
    
    let url = src
    
    // Fix CORS issues by ensuring URLs use the same domain as the current site
    if (url.startsWith('/') && !url.startsWith('http')) {
      // For relative URLs, ensure they're properly formatted
      if (!url.startsWith('/api/media/')) {
        url = `/api/media/file/${url.replace(/^\/+/, '')}`
      }
    } else if (url.startsWith('http')) {
      // Fix cross-origin issues by replacing www.sacavia.com with sacavia.com
      // or vice versa to match the current domain
      try {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'sacavia.com'
        const urlObj = new URL(url)
        
        if (urlObj.hostname === 'www.sacavia.com' && currentDomain === 'sacavia.com') {
          urlObj.hostname = 'sacavia.com'
          url = urlObj.toString()
        } else if (urlObj.hostname === 'sacavia.com' && currentDomain === 'www.sacavia.com') {
          urlObj.hostname = 'www.sacavia.com'
          url = urlObj.toString()
        }
      } catch (error) {
        console.warn('Error processing video URL:', error)
      }
    }
    
    return url
  }, [src])

  // Intersection Observer for TikTok-style autoplay
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !enableAutoplay) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        const isIntersecting = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.5)
        
        setIsInView(isIntersecting)
        
        if (isIntersecting) {
          // Video is in view - autoplay with voice if enabled
          const shouldMute = !enableVoice
          videoElement.muted = shouldMute
          setIsMuted(Boolean(shouldMute))
          
          videoElement.play().catch((error) => {
            console.log('🎬 Autoplay prevented:', error)
            // If autoplay fails, try with muted
            if (!shouldMute) {
              videoElement.muted = true
              setIsMuted(true)
              videoElement.play().catch((mutedError) => {
                console.log('🎬 Muted autoplay also failed:', mutedError)
              })
            }
          })
        } else {
          // Video is out of view - pause
          videoElement.pause()
        }
      },
      { 
        threshold: [0.5],
        rootMargin: '0px 0px -10% 0px' // Start autoplay slightly before fully in view
      }
    )

    observer.observe(videoElement)
    return () => observer.disconnect()
  }, [enableAutoplay, enableVoice])

  // Handle visibility prop changes
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (isVisible && enableAutoplay) {
      const shouldMute = !enableVoice
      videoElement.muted = shouldMute
      setIsMuted(Boolean(shouldMute))
      
      videoElement.play().catch((error) => {
        console.log('🎬 Visibility-based autoplay prevented:', error)
        if (!shouldMute) {
          videoElement.muted = true
          setIsMuted(true)
          videoElement.play().catch((mutedError) => {
            console.log('🎬 Muted visibility autoplay also failed:', mutedError)
          })
        }
      })
    } else if (!isVisible) {
      videoElement.pause()
    }
  }, [isVisible, enableAutoplay, enableVoice])

  // Optimize thumbnail generation - only generate once and cache
  const generateThumbnail = useCallback(() => {
    const videoElement = videoRef.current
    const canvasElement = canvasRef.current
    if (!videoElement || !canvasElement || thumbnailGenerated) return

    try {
      // Only generate thumbnail if video has loaded metadata
      if (videoElement.readyState >= 1) {
        const ctx = canvasElement.getContext('2d')
        if (!ctx) return

        // Set canvas size to match video dimensions
        canvasElement.width = videoElement.videoWidth || 640
        canvasElement.height = videoElement.videoHeight || 360
        
        // Seek to 0.5 seconds to avoid black frames
        videoElement.currentTime = 0.5
        
        // Wait for seek to complete
        const handleSeeked = () => {
          if (videoElement.videoWidth > 0) {
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)
            const thumbnailUrl = canvasElement.toDataURL('image/jpeg', 0.7)
            videoElement.poster = thumbnailUrl
            setThumbnailGenerated(true)
            console.log('🎬 Generated thumbnail for video:', processedVideoUrl)
          }
          videoElement.removeEventListener('seeked', handleSeeked)
        }
        
        videoElement.addEventListener('seeked', handleSeeked)
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error)
    }
  }, [processedVideoUrl, thumbnailGenerated])

  // Handle video loading
  const handleLoadedMetadata = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    
    const videoElement = videoRef.current
    if (videoElement) {
      setDuration(videoElement.duration || 0)
      
      // Generate thumbnail if not already done
      if (!thumbnailGenerated && !thumbnail) {
        generateThumbnail()
      }
    }
  }, [generateThumbnail, thumbnail, thumbnailGenerated])

  // Handle video errors
  const handleError = useCallback((error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('🎬 Video error:', error)
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }, [onError])

  // Handle play/pause
  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    setShowControls(false)
    onPlay?.()
    
    // Track view start
    if (!viewStartTime) {
      setViewStartTime(Date.now())
      onViewStart?.()
    }
  }, [onPlay, onViewStart, viewStartTime])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    onPause?.()
  }, [onPause])

  // Handle time updates
  const handleTimeUpdate = useCallback(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      setCurrentTime(videoElement.currentTime)
      onTimeUpdate?.(videoElement.currentTime, videoElement.duration)
      
      // Track view completion (90% of video watched)
      if (videoElement.currentTime / videoElement.duration > 0.9 && !viewCompleteTime) {
        setViewCompleteTime(Date.now())
        onViewComplete?.()
      }
    }
  }, [onTimeUpdate, onViewComplete, viewCompleteTime])

  // Handle video end
  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    onEnded?.()
  }, [onEnded])

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (isPlaying) {
      videoElement.pause()
    } else {
      // When manually playing, respect voice settings
      const shouldMute = !enableVoice
      videoElement.muted = shouldMute
      setIsMuted(Boolean(shouldMute))
      
      videoElement.play().catch(error => {
        console.error('Error playing video:', error)
        setHasError(true)
      })
    }
  }, [isPlaying, enableVoice])

  // Toggle mute
  const toggleMute = useCallback(() => {
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (!isFullscreen) {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }, [isFullscreen])

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * videoElement.duration
    videoElement.currentTime = newTime
  }, [])

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (isPlaying && !isHovered) {
      timeout = setTimeout(() => setShowControls(false), 2000)
    }
    return () => clearTimeout(timeout)
  }, [isPlaying, isHovered])

  // Calculate aspect ratio styles
  const aspectRatioStyles = useMemo(() => {
    const [width, height] = aspectRatio.split('/').map(Number)
    return {
      aspectRatio: `${width}/${height}`,
      width: '100%',
      height: 'auto'
    }
  }, [aspectRatio])

  // Show play button only when video is not playing and not loading
  const shouldShowPlayButton = showPlayButton && !isPlaying && !isLoading && !hasError

  return (
    <div 
      className={cn(
        "relative group bg-black rounded-lg overflow-hidden",
        className
      )}
      style={aspectRatioStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden canvas for thumbnail generation */}
      <canvas 
        ref={canvasRef} 
        className="hidden" 
        style={{ display: 'none' }}
      />
      
      {/* Video element */}
      <video
        ref={videoRef}
        src={processedVideoUrl}
        poster={thumbnail}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        preload={preload}
        playsInline
        className="w-full h-full object-cover"
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-sm">Failed to load video</p>
            <Button 
              size="sm" 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Play button overlay - only show when not playing */}
      {shouldShowPlayButton && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <Button
            onClick={togglePlay}
            size="lg"
            className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border-2 border-white/30"
          >
            <Play className="h-8 w-8 text-white ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Controls overlay */}
      {(showControls || isHovered) && controls && !isLoading && !hasError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
        >
          {/* Top controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 w-8 p-0 bg-black/30 hover:bg-black/50 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 bg-black/30 hover:bg-black/50 text-white"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>

          {/* Center play/pause button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              onClick={togglePlay}
              size="lg"
              className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white ml-1" />
              )}
            </Button>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-4 left-4 right-4">
            {/* Progress bar */}
            {showProgress && (
              <div 
                className="w-full h-2 bg-white/30 rounded-full cursor-pointer mb-2"
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-white rounded-full transition-all duration-150"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            )}

            {/* Time display */}
            <div className="flex items-center justify-between text-white text-sm">
              <span>
                {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
              </span>
              <span>
                {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Click to play overlay */}
      {!isPlaying && !isLoading && !hasError && !shouldShowPlayButton && (
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={togglePlay}
        />
      )}
    </div>
  )
} 