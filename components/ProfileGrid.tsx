'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Types for the normalized profile feed API
interface MediaItem {
  id: string
  type: 'IMAGE' | 'VIDEO'
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  durationSec?: number
}

interface CoverImage {
  type: 'IMAGE' | 'VIDEO'
  url: string
}

interface ProfileFeedItem {
  id: string
  caption: string
  createdAt: string
  cover: CoverImage | null
  media: MediaItem[]
}

interface ProfileFeedResponse {
  items: ProfileFeedItem[]
  nextCursor: string | null
}

interface ProfileGridProps {
  username: string
  className?: string
}

// Loading placeholder component
const GridPlaceholder = () => (
  <div className="aspect-square bg-gray-200 animate-pulse rounded-lg">
    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg" />
  </div>
)

// Video overlay badge component
const VideoBadge = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="bg-black/60 rounded-full p-2 backdrop-blur-sm">
      <svg 
        className="w-6 h-6 text-white" 
        fill="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  </div>
)

// Individual grid tile component
const GridTile = ({ item, username }: { item: ProfileFeedItem; username: string }) => {
  if (!item.cover) {
    return (
      <Link 
        href={`/u/${username}/p/${item.id}`}
        className="group block aspect-square bg-gray-100 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200 ease-out"
      >
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <span className="text-gray-400 text-sm">No media</span>
        </div>
      </Link>
    )
  }

  return (
    <Link 
      href={`/u/${username}/p/${item.id}`}
      className="group block aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200 ease-out relative"
    >
      <Image
        src={item.cover.url}
        alt="" // Empty alt text for decorative tiles as specified
        fill
        className="object-cover"
        sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        priority={false}
      />
      
      {/* Video overlay badge */}
      {item.cover.type === 'VIDEO' && <VideoBadge />}
      
      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
    </Link>
  )
}

// Main ProfileGrid component
export default function ProfileGrid({ username, className = '' }: ProfileGridProps) {
  const [items, setItems] = useState<ProfileFeedItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Fetch profile feed data
  const fetchFeed = useCallback(async (cursor: string | null = null, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      const params = new URLSearchParams({
        take: '24',
        ...(cursor && { cursor })
      })

      const response = await fetch(`/api/profile/${username}/feed?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`)
      }

      const data: ProfileFeedResponse = await response.json()
      
      if (isLoadMore) {
        setItems(prev => [...prev, ...data.items])
      } else {
        setItems(data.items)
      }
      
      setNextCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
      
    } catch (err) {
      console.error('Error fetching profile feed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [username])

  // Initial load
  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor) {
          fetchFeed(nextCursor, true)
        }
      },
      {
        rootMargin: '100px', // Start loading when 100px away from bottom
        threshold: 0.1
      }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadingMore, nextCursor, fetchFeed])

  // Loading state
  if (loading) {
    return (
      <div className={`grid grid-cols-3 gap-2 ${className}`}>
        {Array.from({ length: 12 }).map((_, index) => (
          <GridPlaceholder key={index} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 mb-4">Failed to load posts</p>
          <button
            onClick={() => fetchFeed()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <p className="text-gray-500">No posts found</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Main grid */}
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <GridTile key={item.id} item={item} username={username} />
        ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <span>Loading more posts...</span>
          </div>
        </div>
      )}

      {/* Intersection observer target */}
      {hasMore && !loadingMore && (
        <div ref={loadMoreRef} className="h-4" />
      )}

      {/* End of feed indicator */}
      {!hasMore && items.length > 0 && (
        <div className="flex justify-center py-8">
          <p className="text-gray-400 text-sm">You've reached the end</p>
        </div>
      )}
    </div>
  )
}

// Export types for use in other components
export type { ProfileFeedItem, ProfileFeedResponse, MediaItem, CoverImage }
