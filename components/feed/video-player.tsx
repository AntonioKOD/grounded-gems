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
}

export default function VideoPlayer({
  src,
  thumbnail,
  aspectRatio = "16/9",
  autoPlay = true,
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
  preload = "metadata"
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false)
  const [viewCompleted, setViewCompleted] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Intersection Observer for autoplay when in view
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setIsInView(entry.isIntersecting)
        
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          if (autoPlay && !hasStartedPlaying) {
            video.play().catch(console.error)
          }
        } else {
          if (isPlaying) {
            video.pause()
          }
        }
      },
      {
        threshold: [0.5, 0.75], // Play when 50% visible, track engagement at 75%
        rootMargin: "0px"
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current)
      }
    }
  }, [autoPlay, hasStartedPlaying, isPlaying])

  // Handle video events
  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
  }, [])

  const handleLoadedData = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    if (!hasStartedPlaying) {
      setHasStartedPlaying(true)
      onViewStart?.()
    }
    onPlay?.()
  }, [hasStartedPlaying, onPlay, onViewStart])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    onPause?.()
  }, [onPause])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (!viewCompleted) {
      setViewCompleted(true)
      onViewComplete?.()
    }
    onEnded?.()
  }, [viewCompleted, onEnded, onViewComplete])

  const handleError = useCallback(() => {
    console.warn('VideoPlayer failed to load:', src)
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }, [onError, src])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const currentTime = video.currentTime
    const duration = video.duration
    const newProgress = (currentTime / duration) * 100

    setProgress(newProgress)
    onTimeUpdate?.(currentTime, duration)

    // Track view completion at 80%
    if (newProgress >= 80 && !viewCompleted) {
      setViewCompleted(true)
      onViewComplete?.()
    }
  }, [onTimeUpdate, onViewComplete, viewCompleted])

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(console.error)
    }
  }, [isPlaying])

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
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

  // Show/hide controls
  const handleMouseEnter = useCallback(() => {
    setShowControls(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setShowControls(false)
  }, [])

  // Check if video URL is likely broken and set error state immediately
  const isKnownBrokenUrl = useMemo(() => {
    if (!src) return true
    // Known broken URL patterns
    const brokenPatterns = [
      'sacavia.com/api/media/file/',
              'localhost:', // Development backend that might be down
        '127.0.0.1:', // Local development
        '192.168.', // Local network development
    ]
    return brokenPatterns.some(pattern => src.includes(pattern))
  }, [src])

  // Set error state immediately for known broken URLs
  useEffect(() => {
    if (isKnownBrokenUrl) {
      console.warn('VideoPlayer: Known broken URL detected:', src)
      setHasError(true)
      setIsLoading(false)
      return
    }
    
    // Reset states when src changes to a potentially valid URL
    setHasError(false)
    setIsLoading(true)
  }, [src, isKnownBrokenUrl])

  // Add timeout for stuck loading states
  useEffect(() => {
    if (!isLoading || hasError) return

    const timeout = setTimeout(() => {
      console.warn('VideoPlayer: Loading timeout, setting error state:', src)
      setHasError(true)
      setIsLoading(false)
      onError?.()
    }, 8000) // 8 second timeout for videos

    return () => clearTimeout(timeout)
  }, [isLoading, hasError, src, onError])

  // Reset states when src changes
  useEffect(() => {
    setHasError(false)
    setIsLoading(true)
    setIsPlaying(false)
    setViewCompleted(false)
    setHasStartedPlaying(false)
  }, [src])

  return (
    <div
      ref={containerRef}
      className={cn("relative group overflow-hidden bg-black", className)}
      style={{ aspectRatio }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        muted={isMuted}
        loop={loop}
        playsInline
        preload={preload}
        className="w-full h-full object-cover"
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-600 via-purple-600 to-pink-600">
          <div className="text-center text-white p-6">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-lg font-medium">Video not available</p>
            <p className="text-sm opacity-75 mt-1">Content shows below</p>
          </div>
        </div>
      )}

      {/* Play button overlay - only show when paused */}
      {showPlayButton && !isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all duration-300 flex items-center justify-center"
            onClick={togglePlay}
          >
            <Play className="h-8 w-8 ml-1" />
          </motion.button>
        </div>
      )}

      {/* Minimal controls overlay - TikTok style */}
      {controls && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Mute button - top right */}
          <div className="absolute top-4 right-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all flex items-center justify-center"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </motion.button>
          </div>

          {/* Progress bar - bottom */}
          {showProgress && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile tap area for play/pause */}
      <div
        className="absolute inset-0 md:hidden"
        onClick={togglePlay}
      />
    </div>
  )
} 