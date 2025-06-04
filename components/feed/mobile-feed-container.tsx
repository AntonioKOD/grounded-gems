"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Filter, BookmarkIcon, Clock, Flame, Sparkles, LayoutList } from 'lucide-react'
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

import MobileFeedPost from "./mobile-feed-post"
import { Button } from "@/components/ui/button"
import type { Post } from "@/types/feed"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { fetchFeedPosts, loadMorePosts, setCategory, updatePost } from "@/lib/features/feed/feedSlice"
import { fetchUser } from "@/lib/features/user/userSlice"
import { initializeLikedPosts, initializeSavedPosts, initializeLikedComments } from "@/lib/features/posts/postsSlice"
import MobileFeedSkeleton from "./mobile-feed-skeleton"
import FeedErrorState from "./feed-error-state"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface MobileFeedContainerProps {
  userId?: string
  initialPosts?: Post[]
  showPostForm?: boolean
  className?: string
  feedType?: "all" | "personalized" | "user"
  sortBy?: "recent" | "popular" | "trending"
}

export default function MobileFeedContainer({
  userId,
  initialPosts = [],
  showPostForm = true,
  className = "",
  feedType = "all",
  sortBy = "recent",
}: MobileFeedContainerProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  
  // Get state from Redux store
  const { 
    posts: reduxPosts, 
    isLoading: loading, 
    isLoadingMore: loadingMore, 
    isRefreshing: refreshing, 
    hasMore, 
    error,
    category: currentCategory 
  } = useAppSelector((state) => state.feed)
  
  const { user, isLoading: isUserLoading, isAuthenticated } = useAppSelector((state) => state.user)

  const [pullToRefreshDelta, setPullToRefreshDelta] = useState<number>(0)
  const [isPullingToRefresh, setIsPullingToRefresh] = useState<boolean>(false)
  const [activeCategory, setActiveCategory] = useState<string>("discover")
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const initialLoadComplete = useRef(false)
  const touchStartY = useRef<number>(0)
  const scrollPosition = useRef<number>(0)
  const observer = useRef<IntersectionObserver | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Helper function to normalize post data - convert complex media objects to simple URLs
  const normalizePost = useCallback((post: any): Post => {
    // Helper function to check if URL is broken and provide fallback
    const getWorkingImageUrl = (url: string | null): string | null => {
      if (!url) return null
      
      // Check if URL is from known broken sources
      const brokenPatterns = [
        'groundedgems.com/api/media/file/',
        'localhost:3001/',
      ]
      
      const isBroken = brokenPatterns.some(pattern => url.includes(pattern))
      
      if (isBroken) {
        console.log('📱 Replacing broken image URL with placeholder:', url)
        return '/placeholder-image.svg'
      }
      
      return url
    }

    const getWorkingVideoUrl = (url: string | null): string | null => {
      if (!url) return null
      
      // Check if URL is from known broken sources
      const brokenPatterns = [
        'groundedgems.com/api/media/file/',
        'localhost:3001/',
      ]
      
      const isBroken = brokenPatterns.some(pattern => url.includes(pattern))
      
      if (isBroken) {
        console.log('📱 Detected broken video URL, will show error state:', url)
        return url // Let the VideoPlayer handle the error state
      }
      
      return url
    }

    // Handle image field - can be string, object, or boolean
    const normalizedImage = (() => {
      if (!post.image) return null
      if (typeof post.image === 'string' && post.image.trim() !== '') {
        return getWorkingImageUrl(post.image.trim())
      }
      if (typeof post.image === 'object' && post.image !== null) {
        // Handle PayloadMediaObject
        if (post.image.sizes?.card?.url) return getWorkingImageUrl(post.image.sizes.card.url)
        if (post.image.url) return getWorkingImageUrl(post.image.url)
      }
      if (post.image === true && post.rawData?.image) {
        return getWorkingImageUrl(post.rawData.image)
      }
      // Fallback to other image fields
      const fallbackUrl = post.featuredImage?.url || post.image?.url || null
      return getWorkingImageUrl(fallbackUrl)
    })()

    // Handle video field - can be string, object, or boolean  
    const normalizedVideo = (() => {
      if (!post.video) return null
      if (typeof post.video === 'string' && post.video.trim() !== '') {
        return getWorkingVideoUrl(post.video.trim())
      }
      if (typeof post.video === 'object' && post.video !== null) {
        // Handle PayloadMediaObject
        if (post.video.url) return getWorkingVideoUrl(post.video.url)
      }
      if (post.video === true && post.rawData?.video) {
        return getWorkingVideoUrl(post.rawData.video)
      }
      return null
    })()

    // Handle photos array
    const normalizedPhotos = (() => {
      if (!Array.isArray(post.photos)) return []
      return post.photos
        .map((photo: any) => {
          if (typeof photo === 'string' && photo.trim() !== '') return getWorkingImageUrl(photo.trim())
          if (typeof photo === 'object' && photo !== null) {
            if (photo.sizes?.card?.url) return getWorkingImageUrl(photo.sizes.card.url)
            if (photo.url) return getWorkingImageUrl(photo.url)
          }
          return null
        })
        .filter(Boolean)
    })()

    // Handle video thumbnail
    const normalizedVideoThumbnail = (() => {
      if (post.videoThumbnail) {
        if (typeof post.videoThumbnail === 'string') return getWorkingImageUrl(post.videoThumbnail)
        if (typeof post.videoThumbnail === 'object' && post.videoThumbnail?.url) {
          return getWorkingImageUrl(post.videoThumbnail.url)
        }
      }
      // Fallback to image if video exists
      if (normalizedVideo && normalizedImage) return normalizedImage
      return null
    })()

    return {
      ...post,
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
  const [normalizedPosts, setNormalizedPosts] = useState<Post[]>([])
  useEffect(() => {
    if (initialPosts.length > 0) {
      const normalizedInitialPosts = initialPosts.map(post => normalizePost(post))
      setNormalizedPosts(normalizedInitialPosts)
    }
  }, [initialPosts, normalizePost])

  // Note: User data is already initialized in StoreProvider from server-side data
  // No need to fetch user data on mount as it causes unnecessary refetching

  // Initialize posts slice with user's liked and saved posts
  useEffect(() => {
    if (user?.id && !initialLoadComplete.current) {
      try {
        const likedPostIds = Array.isArray(user.likedPosts) ? user.likedPosts : []
        const savedPostIds = Array.isArray(user.savedPosts) ? user.savedPosts : []
        const likedCommentIds: string[] = []
        
        console.log('Initializing Redux with user data:', {
          userId: user.id,
          likedPosts: likedPostIds,
          savedPosts: savedPostIds
        })
        
        dispatch(initializeLikedPosts(likedPostIds))
        dispatch(initializeSavedPosts(savedPostIds))
        dispatch(initializeLikedComments(likedCommentIds))
        
        console.log('Redux state initialized successfully')
      } catch (error) {
        console.error('Error initializing Redux state:', error)
        toast.error("Error initializing user preferences")
      }
    }
  }, [dispatch, user?.id, user?.savedPosts, user?.likedPosts])

  // Listen for user updates and post creation events
  useEffect(() => {
    const handleUserUpdate = async (event: CustomEvent) => {
      if (event.detail && isMounted && !loading) {
        dispatch(fetchFeedPosts({ 
          feedType: "all", 
          sortBy: "recent", 
          category: activeCategory,
          currentUserId: event.detail.id,
          force: true 
        }))
      }
    };

    const handleUserLogin = async (event: CustomEvent) => {
      if (event.detail && isMounted && !loading) {
        dispatch(fetchFeedPosts({ 
          feedType: "all", 
          sortBy: "recent", 
          category: activeCategory,
          currentUserId: event.detail.id,
          force: true 
        }))
      }
    };

    const handlePostCreated = async () => {
      if (isMounted && !loading) {
        await refreshPosts()
      }
    };

    window.addEventListener("user-updated", handleUserUpdate as any);
    window.addEventListener("user-login", handleUserLogin as any);
    window.addEventListener("postCreated", handlePostCreated as any);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate as any);
      window.removeEventListener("user-login", handleUserLogin as any);
      window.removeEventListener("postCreated", handlePostCreated as any);
    };
  }, [dispatch, feedType, sortBy, activeCategory, isMounted, loading]);

  // Categories for feed filtering
  const categories = [
    { id: "discover", name: "Discover", icon: Sparkles },
    { id: "trending", name: "Popular", icon: Flame },
    { id: "recent", name: "Latest", icon: Clock },
  ]

  // Set mounted state and load initial data
  useEffect(() => {
    setIsMounted(true)
    
    // Load initial data only once
    if (!initialLoadComplete.current && !isUserLoading) {
      console.log('Loading initial feed data:', {
        feedType: "all",
        sortBy: "recent",
        userId,
        activeCategory,
        currentUserId: user?.id
      })
      
      dispatch(fetchFeedPosts({ 
        feedType: "all", 
        sortBy: "recent", 
        userId,
        category: activeCategory,
        currentUserId: user?.id,
        force: false // Don't force on initial load
      }))
      .unwrap()
      .then((result) => {
        console.log('Feed data loaded successfully:', result)
        initialLoadComplete.current = true
      })
      .catch((error) => {
        console.error('Error loading initial feed data:', error)
        toast.error("Error loading posts")
      })
    }

    return () => {
      setIsMounted(false)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [dispatch, feedType, sortBy, userId, activeCategory, user?.id, isUserLoading])

  // Refresh posts with pull-to-refresh
  const refreshPosts = async () => {
    try {
      setIsRefreshing(true)
      console.log('Refreshing posts...')
      
      const response = await dispatch(
        fetchFeedPosts({
          feedType,
          sortBy,
          page: 1,
          category: activeCategory !== 'all' ? activeCategory : undefined
        })
      ).unwrap()

      // Normalize posts before setting them
      if (response.posts) {
        const normalizedPosts = response.posts.map((post: any) => normalizePost(post))
        setNormalizedPosts(normalizedPosts)
      }

      console.log('Posts refreshed successfully')
      toast.success('Feed refreshed!')
    } catch (error) {
      console.error('Error refreshing posts:', error)
      toast.error('Failed to refresh feed')
    } finally {
      setIsRefreshing(false)
      setLastRefresh(Date.now())
    }
  }

  // Load more posts for infinite scroll  
  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) return

    try {
      const response = await dispatch(loadMorePosts({ currentUserId: user?.id })).unwrap()
      
      // Normalize new posts before adding them
      if (response.posts) {
        const normalizedNewPosts = response.posts.map((post: any) => normalizePost(post))
        setNormalizedPosts(prev => [...prev, ...normalizedNewPosts])
      }
    } catch (error) {
      console.error('Error loading more posts:', error)
      toast.error('Failed to load more posts')
    }
  }

  // Handle post update
  const handlePostUpdate = (updatedPost: Post) => {
    dispatch(updatePost(updatedPost))
  }
  
  // Handle scroll events with debounce
  useEffect(() => {
    if (!isMounted) return
    
    const container = feedRef.current

    const handleScroll = () => {
      if (!container) return
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Set new timeout for scroll handling
      scrollTimeoutRef.current = setTimeout(() => {
        if (!isMounted) return
        
        // Record scroll position
        scrollPosition.current = container.scrollTop
        
        // Load more posts when reaching the bottom
        const { scrollTop, scrollHeight, clientHeight } = container
        if (scrollTop + clientHeight >= scrollHeight - 300 && !loadingMore && hasMore && !loading) {
          handleLoadMore()
        }
      }, 150) // Increased debounce to reduce excessive calls
    }
    
    container?.addEventListener('scroll', handleScroll)
    return () => {
      container?.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [loadingMore, hasMore, isMounted, loading])
  
  // Pull-to-refresh implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMounted || loading || refreshing) return
    
    if (scrollPosition.current === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMounted || loading || refreshing) return
    
    if (scrollPosition.current === 0 && touchStartY.current > 0) {
      const currentY = e.touches[0].clientY
      const delta = currentY - touchStartY.current
      
      if (delta > 0 && delta < 150) {
        setPullToRefreshDelta(delta)
        setIsPullingToRefresh(true)
      }
    }
  }
  
  const handleTouchEnd = () => {
    if (!isMounted || loading || refreshing) return
    
    if (isPullingToRefresh && pullToRefreshDelta > 80) {
      refreshPosts()
    }
    
    setPullToRefreshDelta(0)
    setIsPullingToRefresh(false)
    touchStartY.current = 0
  }
  
  // Handle category change
  const handleCategoryChange = (category: string) => {
    if (!isMounted || category === activeCategory || loading) return
    
    setActiveCategory(category)
    
    // Reset scroll position
    if (feedRef.current) {
      feedRef.current.scrollTop = 0
    }
    
    // Update Redux state and fetch posts with the new category
    dispatch(setCategory(category !== "all" ? category : undefined))
    dispatch(fetchFeedPosts({ 
      feedType, 
      sortBy, 
      userId,
      category: category !== "all" ? category : undefined,
      currentUserId: user?.id,
      force: true 
    }))
    
    if (isMounted && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30)
    }
  }
  
  // Create a ref callback for the last post element (infinite scrolling)
  const lastPostElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        handleLoadMore()
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, loadingMore, hasMore])

  // Don't render anything before hydration completes
  if (!isMounted) {
    return <MobileFeedSkeleton />
  }

  // Debug posts data
  console.log('MobileFeedContainer render:', {
    postsCount: reduxPosts.length,
    loading,
    error,
    hasMore,
    isAuthenticated,
    userId: user?.id,
    activeCategory
  })

  return (
    <div className={`max-w-2xl mx-auto relative ${className}`}>
      <div className="w-full relative">
        {/* Categories horizontal scroll */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black/80 to-transparent">
          <ScrollArea className="w-full">
            <div className="flex justify-center space-x-2 py-3">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? "default" : "ghost"}
                    size="sm"
                    className={`flex items-center gap-1.5 px-3 rounded-full flex-shrink-0 transition-all duration-300
                      ${activeCategory === category.id ? 
                        "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm" : 
                        "text-white/60 hover:text-white hover:bg-white/5"}`}
                    onClick={() => handleCategoryChange(category.id)}
                    disabled={loading}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
        </div>
        
        {/* Pull to refresh indicator */}
        <AnimatePresence>
          {pullToRefreshDelta > 0 && (
            <motion.div 
              className="absolute top-0 left-0 right-0 flex justify-center items-center z-20 pt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-sm">
                <RefreshCw 
                  className={`h-4 w-4 ${pullToRefreshDelta > 80 ? "text-[#FF6B6B]" : "text-gray-400"} ${
                    refreshing ? "animate-spin" : "transition-transform"
                  }`} 
                  style={{ 
                    transform: !refreshing ? `rotate(${(pullToRefreshDelta / 150) * 360}deg)` : 'none'
                  }}
                />
                <span className={pullToRefreshDelta > 80 ? "text-[#FF6B6B]" : "text-gray-500"}>
                  {pullToRefreshDelta > 80 ? "Release to refresh" : "Pull to refresh"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feed content */}
        <div 
          ref={feedRef}
          className="h-[100dvh] snap-y snap-mandatory overflow-y-auto overflow-x-hidden relative pb-20 mobile-scroll"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            height: 'calc(100vh - 70px)', // Full viewport height minus mobile nav height
            paddingBottom: 0
          }}
        >
          {loading && reduxPosts.length === 0 ? (
            <MobileFeedSkeleton />
          ) : (
            <>
              {reduxPosts.length === 0 ? (
                <FeedErrorState
                  message={error || "No posts found. Try a different category or check back later."}
                  onRetry={() => refreshPosts()}
                />
              ) : (
                <div className="space-y-0 pb-16">
                  {reduxPosts
                    // Deduplicate posts by ID to prevent duplicate keys
                    .filter((post, index, array) => {
                      const firstIndex = array.findIndex(p => p.id === post.id)
                      const isDuplicate = firstIndex !== index
                      if (isDuplicate) {
                        console.warn(`Duplicate post detected: ${post.id} at index ${index}, first seen at ${firstIndex}`)
                      }
                      return firstIndex === index
                    })
                    .map((post, index) => (
                    <div
                      key={`${post.id}-${index}`}
                      ref={index === reduxPosts.length - 1 ? lastPostElementRef : null}
                      className="snap-start w-full flex items-center justify-center relative"
                      style={{
                        height: 'calc(100vh - 70px)', // Full viewport height minus mobile nav height
                        minHeight: '400px'
                      }}
                    >
                      <MobileFeedPost
                        post={post}
                        user={user ? {
                          id: user.id,
                          name: user.name || '',
                          avatar: user.profileImage?.url || user.avatar
                        } : undefined}
                        onPostUpdated={handlePostUpdate}
                        className="w-full h-full"
                      />
                    </div>
                  ))}
                  
                  {/* Load more indicator */}
                  {loadingMore && (
                    <div className="absolute bottom-4 left-0 right-0 py-4 flex justify-center bg-black/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                        <span className="text-sm text-white/80">Loading more posts...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 