'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProfileFeedViewer from '@/components/ProfileFeedViewer'

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
  cover: Cover
  media: MediaItem[]
}

interface ProfileFeedResponse {
  items: ProfileFeedItem[]
  nextCursor: string | null
}

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const postId = params.postId as string

  const [items, setItems] = useState<ProfileFeedItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  // Fetch initial feed data
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/profile/${username}/feed?take=24`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch feed: ${response.status}`)
        }

        const data: ProfileFeedResponse = await response.json()
        
        setItems(data.items)
        setCursor(data.nextCursor)
        
        // Check if the requested post exists in the initial data
        const postExists = data.items.some(item => item.id === postId)
        if (postExists) {
          setIsViewerOpen(true)
        } else {
          // If post not found in initial data, try to find it by loading more pages
          await findPostInFeed(data.nextCursor, postId)
        }
        
      } catch (err) {
        console.error('Error fetching profile feed:', err)
        setError(err instanceof Error ? err.message : 'Failed to load feed')
      } finally {
        setLoading(false)
      }
    }

    const findPostInFeed = async (nextCursor: string | null, targetPostId: string) => {
      let currentCursor = nextCursor
      let found = false
      let attempts = 0
      const maxAttempts = 10 // Prevent infinite loops

      while (currentCursor && !found && attempts < maxAttempts) {
        try {
          const response = await fetch(
            `/api/profile/${username}/feed?take=24&cursor=${currentCursor}`
          )
          
          if (!response.ok) {
            throw new Error(`Failed to fetch more posts: ${response.status}`)
          }

          const data: ProfileFeedResponse = await response.json()
          
          setItems(prev => [...prev, ...data.items])
          setCursor(data.nextCursor)
          currentCursor = data.nextCursor
          
          found = data.items.some(item => item.id === targetPostId)
          attempts++
          
          if (found) {
            setIsViewerOpen(true)
            break
          }
        } catch (err) {
          console.error('Error loading more posts:', err)
          break
        }
      }

      if (!found) {
        setError('Post not found or may have been deleted')
      }
    }

    if (username && postId) {
      fetchFeed()
    }
  }, [username, postId])

  // Handle viewer close
  const handleViewerClose = () => {
    setIsViewerOpen(false)
    // Navigate back to profile page
    router.push(`/u/${username}`)
  }

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (isViewerOpen) {
        setIsViewerOpen(false)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isViewerOpen])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading post...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <p className="text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push(`/u/${username}`)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    )
  }

  // Main content with viewer
  return (
    <div className="min-h-screen bg-black">
      {isViewerOpen && (
        <ProfileFeedViewer
          username={username}
          initialItems={items}
          initialCursor={cursor || undefined}
          isOpen={isViewerOpen}
          onClose={handleViewerClose}
          initialPostId={postId}
        />
      )}
    </div>
  )
}