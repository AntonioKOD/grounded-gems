'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface MediaItem {
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  durationSec?: number
}

interface Cover {
  type: 'IMAGE' | 'VIDEO'
  url: string
}

interface ProfileFeedItem {
  id: string
  caption?: string
  createdAt: string
  cover: Cover | null
  media: MediaItem[]
}

interface ProfileFeedViewerProps {
  username: string
  initialItems: ProfileFeedItem[]
  initialCursor?: string | null
  isOpen: boolean
  onClose: () => void
  initialPostId?: string
}

export default function ProfileFeedViewer({
  username,
  initialItems,
  initialCursor,
  isOpen,
  onClose,
  initialPostId
}: ProfileFeedViewerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ProfileFeedItem[]>(initialItems)
  const [cursor, setCursor] = useState<string | null>(initialCursor || null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})
  const startX = useRef<number>(0)
  const startY = useRef<number>(0)
  const isDragging = useRef<boolean>(false)

  // Find initial post index
  const initialIndex = useMemo(() => {
    if (!initialPostId) return 0
    const index = items.findIndex(item => item.id === initialPostId)
    return index >= 0 ? index : 0
  }, [initialPostId, items])

  // Set initial active index
  useEffect(() => {
    if (isOpen && initialIndex !== activeIndex) {
      setActiveIndex(initialIndex)
    }
  }, [isOpen, initialIndex, activeIndex])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
    return undefined
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeIndex, items.length])

  // Handle video autoplay/pause
  useEffect(() => {
    if (!isOpen) return undefined

    // Pause all videos
    Object.values(videoRefs.current).forEach(video => {
      if (video) {
        video.pause()
      }
    })

    // Play current video if it exists
    const currentItem = items[activeIndex]
    if (currentItem?.cover?.type === 'VIDEO') {
      const video = videoRefs.current[currentItem.id]
      if (video) {
        video.play().catch(console.error)
      }
    }
    
    return undefined
  }, [activeIndex, items, isOpen])

  // Load more items when needed
  const loadMoreItems = useCallback(async () => {
    if (isLoading || !cursor || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/profile/${username}/feed?take=24&cursor=${cursor}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load more posts')
      }

      const data = await response.json()
      
      setItems(prev => [...prev, ...data.items])
      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }, [username, cursor, isLoading, hasMore])

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1)
    }
  }, [activeIndex])

  const handleNext = useCallback(async () => {
    if (activeIndex < items.length - 1) {
      setActiveIndex(activeIndex + 1)
    } else if (hasMore && !isLoading) {
      // Load more items and then navigate
      await loadMoreItems()
      // The activeIndex will be updated after items are loaded
      setTimeout(() => {
        setActiveIndex(prev => prev + 1)
      }, 100)
    }
  }, [activeIndex, items.length, hasMore, isLoading, loadMoreItems])

  // Update URL when active index changes
  useEffect(() => {
    if (!isOpen || !items[activeIndex]) return undefined

    const currentItem = items[activeIndex]
    const newUrl = `/u/${username}/p/${currentItem.id}`
    
    // Use shallow routing to update URL without page reload
    window.history.replaceState(null, '', newUrl)
    
    return undefined
  }, [activeIndex, items, username, isOpen])

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0 && e.touches[0]) {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
      isDragging.current = false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX.current || !startY.current || e.touches.length === 0 || !e.touches[0]) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = startX.current - currentX
    const diffY = startY.current - currentY

    // Only consider it a swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isDragging.current = true
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || !startX.current || e.changedTouches.length === 0 || !e.changedTouches[0]) return

    const endX = e.changedTouches[0].clientX
    const diffX = startX.current - endX
    const threshold = 50

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        handleNext()
      } else {
        handlePrevious()
      }
    }

    isDragging.current = false
    startX.current = 0
    startY.current = 0
  }

  // Handle close with URL update
  const handleClose = useCallback(() => {
    // Update URL to profile page without post ID
    window.history.replaceState(null, '', `/u/${username}`)
    onClose()
  }, [username, onClose])

  if (!isOpen) return null

  const currentItem = items[activeIndex]

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-viewer-title"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-300 transition-colors"
          aria-label="Close viewer"
        >
          <X size={24} />
        </button>
        <h1 id="profile-viewer-title" className="text-white font-semibold">
          @{username}
        </h1>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Navigation Arrows */}
      {activeIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors"
          aria-label="Previous post"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {activeIndex < items.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors"
          aria-label="Next post"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Main Content */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center max-w-4xl mx-auto px-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentItem ? (
          <div className="w-full max-w-2xl">
            {/* Media */}
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-4">
              {currentItem.cover ? (
                currentItem.cover.type === 'IMAGE' ? (
                  <Image
                    src={currentItem.cover.url}
                    alt={currentItem.caption || 'Post image'}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <video
                    ref={el => {
                      if (el) videoRefs.current[currentItem.id] = el
                    }}
                    src={currentItem.cover.url}
                    poster={currentItem.media[0]?.thumbnailUrl}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    loop
                    controls
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p>No media available</p>
                </div>
              )}
            </div>

            {/* Post Info */}
            <div className="text-white space-y-3">
              {currentItem.caption && (
                <p className="text-sm leading-relaxed">{currentItem.caption}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {new Date(currentItem.createdAt).toLocaleDateString()}
                </span>
                <span>
                  {activeIndex + 1} of {items.length}
                  {hasMore && '+'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-white">
            <p className="text-lg mb-2">Post unavailable</p>
            <p className="text-sm text-gray-400">
              This post may have been deleted or is no longer available.
            </p>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-sm">
          Loading more posts...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
