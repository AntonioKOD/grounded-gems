"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Clock, Bookmark, Sparkles, MapPin, Grid3X3, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAppDispatch } from '@/lib/hooks'
import { initializeLikedPosts, initializeSavedPosts } from '@/lib/features/posts/postsSlice'
import { getImageUrl, getVideoUrl } from '@/lib/image-utils'

// Components
import SocialMediaPost from './instagram-style-post'
import FeedSkeleton from './feed-skeleton'
import EmptyFeed from './empty-feed'

// Post interface
interface Post {
  id: string
  content: string
  title?: string
  author: {
    id: string
    name: string
    avatar?: string
    profileImage?: {
      url: string
    }
  }
  image?: string
  video?: string
  videoThumbnail?: string
  photos?: string[]
  location?: {
    id: string
    name: string
  }
  type: string
  rating?: number
  tags: string[]
  likeCount: number
  commentCount: number
  shareCount: number
  saveCount: number
  isLiked: boolean
  isSaved: boolean
  createdAt: string
  updatedAt: string
}

interface ModernDiscoveryFeedProps {
  initialPosts?: Post[]
  userId?: string
  feedType?: 'all' | 'personalized' | 'user'
  sortBy?: 'recent' | 'popular' | 'trending'
  className?: string
  variant?: 'mobile' | 'desktop'
  showHeader?: boolean
}

export default function ModernDiscoveryFeed({
  initialPosts = [],
  userId,
  feedType = 'all',
  sortBy = 'recent',
  className = '',
  variant = 'mobile',
  showHeader = true
}: ModernDiscoveryFeedProps) {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Redux dispatch
  const dispatch = useAppDispatch()

  // Helper function to normalize post data using proper image utilities
  const normalizePost = useCallback((post: any): Post => {
    // Preserve the media array from the API if it exists (preferred for video display)
    let normalizedMedia = post.media

    // If no media array, create one from individual fields for backward compatibility
    if (!Array.isArray(post.media) || post.media.length === 0) {
      const mediaItems = []
      
      const normalizedVideo = getVideoUrl(post.video)
      const normalizedImage = getImageUrl(post.image || post.featuredImage)
      
      // Prioritize video
      if (normalizedVideo) {
        mediaItems.push({
          type: 'video',
          url: normalizedVideo,
          thumbnail: normalizedImage !== "/placeholder.svg" ? normalizedImage : post.videoThumbnail,
          alt: 'Post video'
        })
      }
      
      // Add main image only if no video
      if (normalizedImage !== "/placeholder.svg" && !normalizedVideo) {
        mediaItems.push({
          type: 'image',
          url: normalizedImage,
          alt: 'Post image'
        })
      }
      
      // Add photos
      if (Array.isArray(post.photos)) {
        post.photos.forEach((photo, index) => {
          const photoUrl = getImageUrl(photo)
          if (photoUrl !== "/placeholder.svg" && photoUrl !== normalizedImage) {
            mediaItems.push({
              type: 'image',
              url: photoUrl,
              alt: `Photo ${index + 1}`
            })
          }
        })
      }
      
      normalizedMedia = mediaItems
    }

    // Legacy field normalization for backward compatibility
    const normalizedImage = (() => {
      const imageUrl = getImageUrl(post.image || post.featuredImage)
      return imageUrl !== "/placeholder.svg" ? imageUrl : null
    })()

    const normalizedVideo = (() => {
      return getVideoUrl(post.video)
    })()

    const normalizedPhotos = (() => {
      if (!Array.isArray(post.photos)) return []
      return post.photos
        .map((photo: any) => {
          const photoUrl = getImageUrl(photo)
          return photoUrl !== "/placeholder.svg" ? photoUrl : null
        })
        .filter(Boolean)
    })()

    const normalizedVideoThumbnail = (() => {
      if (post.videoThumbnail) {
        const thumbnailUrl = getImageUrl(post.videoThumbnail)
        return thumbnailUrl !== "/placeholder.svg" ? thumbnailUrl : null
      }
      if (normalizedVideo && normalizedImage) return normalizedImage
      return null
    })()

    return {
      ...post,
      // Prioritize media array from API
      media: normalizedMedia,
      // Keep legacy fields for backward compatibility
      image: normalizedImage,
      video: normalizedVideo,
      photos: normalizedPhotos,
      videoThumbnail: normalizedVideoThumbnail,
      // Ensure required fields are present
      likeCount: post.likeCount || post.likes?.length || 0,
      commentCount: post.commentCount || post.comments?.length || 0,
      shareCount: post.shareCount || 0,
      saveCount: post.saveCount || 0,
      isLiked: post.isLiked || false,
      isSaved: post.isSaved || false,
    }
  }, [])

  // Initialize with normalized posts
  useEffect(() => {
    if (initialPosts.length > 0) {
      const normalizedInitialPosts = initialPosts.map(post => normalizePost(post))
      setPosts(normalizedInitialPosts)
    }
  }, [initialPosts, normalizePost])

  // Categories - removed trending and improved styling
  const categories = [
    { id: 'all', name: 'Local Buzz', icon: Sparkles },
    { id: 'recent', name: 'Latest', icon: Clock },
    { id: 'nearby', name: 'Near Me', icon: MapPin },
  ]

  // Fetch current user and initialize Redux state
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        console.log('Fetching current user for feed...')
        const response = await fetch('/api/users/me', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
        const data = await response.json()
        
        console.log('User API response:', data)
        
        if (data?.user) {
          setCurrentUser(data.user)
          
          // Initialize Redux state with user's interaction data
          if (data.user.likedPosts && Array.isArray(data.user.likedPosts)) {
            const likedPostIds = data.user.likedPosts.map((post: any) => 
              typeof post === 'string' ? post : post.id || post._id
            ).filter(Boolean)
            dispatch(initializeLikedPosts(likedPostIds))
            console.log('Initialized liked posts in Redux:', likedPostIds)
          }
          
          if (data.user.savedPosts && Array.isArray(data.user.savedPosts)) {
            const savedPostIds = data.user.savedPosts.map((post: any) => 
              typeof post === 'string' ? post : post.id || post._id
            ).filter(Boolean)
            dispatch(initializeSavedPosts(savedPostIds))
            console.log('Initialized saved posts in Redux:', savedPostIds)
          }
        } else {
          console.log('No user data found or user not authenticated')
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }

    fetchCurrentUser()
  }, [dispatch])

  // Load posts from API
  const loadPosts = useCallback(async (pageNum = 1, category = selectedCategory, isRefresh = false) => {
    if (isLoading) return

    setIsLoading(true)
    if (isRefresh) setIsRefreshing(true)

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        feedType,
        sortBy,
        ...(currentUser?.id && { currentUserId: currentUser.id }),
        ...(category !== 'all' && { category })
      })

      const response = await fetch(`/api/feed?${params}`)
      const data = await response.json()

      if (data.success && Array.isArray(data.posts)) {
        const newPosts = data.posts.map((post: any) => normalizePost(post))

        if (isRefresh || pageNum === 1) {
          setPosts(newPosts)
          setPage(2)
        } else {
          // Proper deduplication: only add posts that don't already exist
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id))
            const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id))
            return [...prev, ...uniqueNewPosts]
          })
          setPage(pageNum + 1)
        }

        setHasMore(data.pagination?.hasMore ?? newPosts.length >= 10)
      } else {
        console.error('Invalid response format:', data)
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      setHasMore(false)
      toast.error('Failed to load posts')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [feedType, sortBy, currentUser?.id, selectedCategory, isLoading])

  // Initial load and reload when user is established
  useEffect(() => {
    // Load posts initially if none exist
    if (posts.length === 0) {
      loadPosts(1, selectedCategory, true)
    }
    // Reload posts when user is established to get proper like/save states
    else if (currentUser?.id && posts.some(p => p.isLiked === undefined || p.isSaved === undefined)) {
      console.log('Reloading posts with user context:', currentUser.id)
      loadPosts(1, selectedCategory, true)
    }
  }, [loadPosts, selectedCategory, currentUser?.id])

  // Handle post updates
  const handlePostUpdate = useCallback((updatedPost: Post) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    )
  }, [])

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setPage(1)
    setPosts([])
    setHasMore(true)
  }

  // Load more posts for infinite scroll
  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = page + 1
      const params = new URLSearchParams({
        page: nextPage.toString(),
        feedType,
        sortBy,
        ...(currentUser?.id && { currentUserId: currentUser.id }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      })
      
      const response = await fetch(`/api/feed?${params}`)
      
      if (!response.ok) throw new Error('Failed to fetch posts')
      
      const data = await response.json()
      
      if (data.posts && Array.isArray(data.posts)) {
        // Normalize posts before processing
        const normalizedPosts = data.posts.map((post: any) => normalizePost(post))
        
        // Deduplicate posts
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const uniqueNewPosts = normalizedPosts.filter((post: Post) => !existingIds.has(post.id))
          return [...prev, ...uniqueNewPosts]
        })
        
        setPage(nextPage)
        setHasMore(data.hasMore ?? false)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more posts:', error)
      toast.error('Failed to load more posts')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, feedType, sortBy, selectedCategory, currentUser?.id, normalizePost])

  // Refresh posts
  const refreshPosts = async () => {
    setIsRefreshing(true)
    setPosts([])
    setPage(1)
    setHasMore(true)
    
    try {
      const params = new URLSearchParams({
        page: '1',
        feedType,
        sortBy,
        ...(currentUser?.id && { currentUserId: currentUser.id }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      })
      
      const response = await fetch(`/api/feed?${params}`)
      
      if (!response.ok) throw new Error('Failed to refresh posts')
      
      const data = await response.json()
      
      if (data.posts && Array.isArray(data.posts)) {
        // Normalize posts before setting them
        const normalizedPosts = data.posts.map((post: any) => normalizePost(post))
        setPosts(normalizedPosts)
        setHasMore(data.hasMore ?? false)
      }
    } catch (error) {
      console.error('Error refreshing posts:', error)
      toast.error('Failed to refresh posts')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Refresh posts when category changes
  useEffect(() => {
    if (selectedCategory !== 'all') {
      refreshPosts()
    }
  }, [selectedCategory])

  // Handle infinite scroll for TikTok-style feed
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isLoading || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const threshold = 100 // Load more when 100px from bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMorePosts()
    }
  }, [isLoading, hasMore])

  // Throttle scroll handler
  const throttledHandleScroll = useCallback(
    throttle(handleScroll, 200),
    [handleScroll]
  )

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', throttledHandleScroll)
      return () => container.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [throttledHandleScroll])

  // Simple throttle utility
  function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }) as T
  }

  // Get container height for different variants
  const getContainerHeight = () => {
    if (variant === 'mobile') {
      return 'h-screen' // Full screen for mobile for better experience
    } else {
      return 'h-auto min-h-[500px]' // Auto height for desktop/grid
    }
  }

  if (isLoading && posts.length === 0) {
    return <FeedSkeleton />
  }

  return (
    <div className={cn("w-full h-screen flex flex-col bg-black overflow-hidden relative", className)}>
      {/* Floating Category Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 p-3 md:p-4 safe-area-top">
        <div className="flex items-center justify-center">
          {/* Category Navigation */}
          <div className="flex items-center gap-1 md:gap-2 bg-black/60 backdrop-blur-xl rounded-full px-4 py-3 border border-white/20 shadow-2xl">
            {categories.map((category) => {
              const isActive = selectedCategory === category.id
              const Icon = category.icon
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedCategory(category.id)
                    handleCategoryChange(category.id)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-sm md:text-base font-semibold transition-all duration-300 whitespace-nowrap border",
                    isActive
                      ? "bg-white text-black border-white shadow-lg scale-105"
                      : "text-white/90 hover:text-white hover:bg-white/20 border-transparent hover:border-white/30"
                  )}
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  <span>{category.name}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Posts Container - TikTok/Reels Style Snap Scrolling */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide bg-black mobile-scroll"
        style={{ scrollBehavior: 'smooth' }}
        onScroll={handleScroll}
      >
        {posts.length > 0 ? (
          <div className="h-full">
            <AnimatePresence mode="popLayout">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.02,
                    ease: "easeOut"
                  }}
                  className="w-full h-screen snap-start snap-always flex-shrink-0"
                >
                  <SocialMediaPost
                    post={post}
                    user={currentUser}
                    onPostUpdated={handlePostUpdate}
                    variant="mobile"
                    className="h-full w-full"
                    isActive={index === 0} // Only first post is active by default
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Load More Trigger (invisible, at bottom) */}
            {hasMore && (
              <div className="h-screen flex items-center justify-center snap-start">
                {isLoading ? (
                  <div className="flex items-center gap-3 text-white/60 bg-white/5 rounded-full px-4 md:px-6 py-2 md:py-3">
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <span className="text-xs md:text-sm">Loading more...</span>
                  </div>
                ) : (
                  <div className="opacity-0 h-1" /> // Invisible trigger for infinite scroll
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyFeed type={feedType} />
          </div>
        )}
      </div>

      {/* Refresh Indicator */}
      {isRefreshing && (
        <div className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-sm text-white px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg">
          <div className="flex items-center gap-2 md:gap-3">
            <RefreshCw className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
            <span className="text-xs md:text-sm font-medium">Refreshing your feed...</span>
          </div>
        </div>
      )}
    </div>
  )
} 