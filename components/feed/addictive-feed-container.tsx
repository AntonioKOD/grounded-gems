"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, RefreshCw, Sparkles, TrendingUp, Clock } from 'lucide-react'
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import EnhancedFeedPost from "./enhanced-feed-post"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Post } from "@/types/feed"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { fetchFeedPosts, loadMorePosts, setFeedType, setSortBy, setCategory, setUserId, updatePost } from "@/lib/features/feed/feedSlice"
import { initializeLikedPosts, initializeSavedPosts, initializeLikedComments } from "@/lib/features/posts/postsSlice"

interface AddictiveFeedContainerProps {
  userId?: string
  initialPosts?: Post[]
  showPostForm?: boolean
  className?: string
  feedType?: "personalized" | "all" | "user"
  sortBy?: "recent" | "popular" | "trending"
}

export default function AddictiveFeedContainer({
  userId,
  initialPosts = [],
  showPostForm = false, // Disabled for TikTok-style experience
  className = "",
  feedType = "all",
  sortBy = "recent",
}: AddictiveFeedContainerProps) {
  const dispatch = useAppDispatch()
  
  // Get state from Redux store
  const { 
    posts, 
    isLoading: loading, 
    isLoadingMore: loadingMore, 
    isRefreshing: refreshing, 
    hasMore, 
    error 
  } = useAppSelector((state) => state.feed)
  
  const { user, isLoading: isUserLoading, isAuthenticated } = useAppSelector((state) => state.user)
  
  const [activeCategory, setActiveCategory] = useState("discover")
  const [pullToRefreshDelta, setPullToRefreshDelta] = useState(0)
  const [isPullingToRefresh, setIsPullingToRefresh] = useState(false)
  
  const isMounted = useRef<boolean>(true)
  const initialLoadComplete = useRef<boolean>(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)

  // Check if user is on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Categories for quick switching (minimal, floating)
  const categories = [
    { id: "discover", name: "Discover", icon: Sparkles },
    { id: "trending", name: "Trending", icon: TrendingUp },
    { id: "recent", name: "Latest", icon: Clock },
  ]

  // Initialize feed settings
  useEffect(() => {
    if (feedType) dispatch(setFeedType(feedType))
    if (sortBy) dispatch(setSortBy(sortBy))
    if (userId) dispatch(setUserId(userId))
  }, [dispatch, feedType, sortBy, userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Initialize posts slice with user's data
  useEffect(() => {
    if (user?.id) {
      const likedPostIds = Array.isArray(user.likedPosts) ? user.likedPosts : []
      const savedPostIds = Array.isArray(user.savedPosts) ? user.savedPosts : []
      const likedCommentIds: string[] = []
      
      dispatch(initializeLikedPosts(likedPostIds))
      dispatch(initializeSavedPosts(savedPostIds))
      dispatch(initializeLikedComments(likedCommentIds))
    }
  }, [dispatch, user?.id, user?.savedPosts, user?.likedPosts])

  // Listen for user updates
  useEffect(() => {
    const handleUserUpdate = async (event: CustomEvent) => {
      if (event.detail && isMounted.current) {
        dispatch(fetchFeedPosts({ 
          feedType, 
          sortBy, 
          currentUserId: event.detail.id,
          force: true 
        }))
      }
    }

    const handleUserLogin = async (event: CustomEvent) => {
      if (event.detail && isMounted.current) {
        dispatch(fetchFeedPosts({ 
          feedType, 
          sortBy, 
          currentUserId: event.detail.id,
          force: true 
        }))
      }
    }

    window.addEventListener("user-updated", handleUserUpdate as any)
    window.addEventListener("user-login", handleUserLogin as any)

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate as any)
      window.removeEventListener("user-login", handleUserLogin as any)
    }
  }, [dispatch, feedType, sortBy])

  // Initial data loading
  useEffect(() => {
    if (!isUserLoading && !initialLoadComplete.current) {
      dispatch(fetchFeedPosts({ 
        feedType, 
        sortBy, 
        userId,
        currentUserId: user?.id,
        force: true 
      }))
      initialLoadComplete.current = true
    }
  }, [dispatch, feedType, sortBy, userId, user?.id, isUserLoading])

  // Optimized scroll handling for infinite scroll with throttling
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!scrollRef.current || ticking) return
      
      ticking = true;
      requestAnimationFrame(() => {
        if (!scrollRef.current) {
          ticking = false;
          return;
        }
        
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        
        // Auto-load more when near bottom
        if (scrollTop + clientHeight >= scrollHeight - 100 && !loadingMore && hasMore && !loading) {
          handleLoadMore()
        }
        
        ticking = false;
      });
    }

    const scrollElement = scrollRef.current
    scrollElement?.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollElement?.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore, loading, handleLoadMore])

  // Pull to refresh implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMounted.current || loading || refreshing) return
    
    const scrollTop = scrollRef.current?.scrollTop || 0
    if (scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMounted.current || loading || refreshing) return
    
    const scrollTop = scrollRef.current?.scrollTop || 0
    if (scrollTop === 0 && touchStartY.current > 0) {
      const currentY = e.touches[0].clientY
      const delta = currentY - touchStartY.current
      
      if (delta > 0 && delta < 150) {
        setPullToRefreshDelta(delta)
        setIsPullingToRefresh(true)
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isMounted.current || loading || refreshing) return
    
    if (isPullingToRefresh && pullToRefreshDelta > 80) {
      refreshPosts()
    }
    
    setPullToRefreshDelta(0)
    setIsPullingToRefresh(false)
    touchStartY.current = 0
  }

  // Refresh posts with haptic feedback
  const refreshPosts = async () => {
    try {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 10, 50])
      }
      
      await dispatch(fetchFeedPosts({ 
        feedType, 
        sortBy, 
        userId,
        currentUserId: user?.id,
        force: true 
      })).unwrap()
      
      toast.success("Fresh content loaded! 🔥")
    } catch (error) {
      console.error("Error refreshing posts:", error)
      toast.error("Error refreshing posts")
    }
  }

  // Load more posts
  const handleLoadMore = async () => {
    try {
      await dispatch(loadMorePosts({ currentUserId: user?.id })).unwrap()
    } catch (error) {
      console.error("Error loading more posts:", error)
      toast.error("Error loading more posts")
    }
  }

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
    
    dispatch(setCategory(category !== "all" ? category : undefined))
    dispatch(fetchFeedPosts({ 
      feedType: "all", 
      sortBy: category === "trending" ? "popular" : "recent", 
      userId,
      category: category !== "all" ? category : undefined,
      currentUserId: user?.id,
      force: true 
    }))
  }

  // Handle post update
  const handlePostUpdate = (updatedPost: Post) => {
    dispatch(updatePost(updatedPost))
  }

  return (
    <div className={`w-full h-screen overflow-hidden relative bg-black ${className}`}
         style={{
           height: 'calc(100vh - 70px)', // Full viewport height minus mobile nav
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: '70px' // Leave space for mobile nav
         }}
    >
      {/* Floating category selector - minimal design */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex gap-2 bg-black/20 backdrop-blur-md rounded-full p-2">
          {categories.map((category) => {
            const Icon = category.icon
            const isActive = activeCategory === category.id
            
            return (
              <motion.button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                disabled={loading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? "bg-white/20 text-white" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{category.name}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {pullToRefreshDelta > 0 && (
          <motion.div 
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-30 pt-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-white">
              <RefreshCw 
                className={`h-4 w-4 ${pullToRefreshDelta > 80 ? "text-green-400" : "text-white/60"} ${
                  refreshing ? "animate-spin" : ""
                }`} 
                style={{ 
                  transform: !refreshing ? `rotate(${(pullToRefreshDelta / 150) * 360}deg)` : 'none'
                }}
              />
              <span className={`text-sm ${pullToRefreshDelta > 80 ? "text-green-400" : "text-white/60"}`}>
                {pullToRefreshDelta > 80 ? "Release to refresh" : "Pull to refresh"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TikTok-style scroll container with smaller posts */}
      <div 
        ref={scrollRef}
        className="h-screen w-screen overflow-y-auto snap-y snap-mandatory fixed inset-0 snap-scroll-container"
        style={{ 
          scrollSnapType: 'y mandatory',
          height: 'calc(100vh - 70px)', // Match parent container height
          top: 0,
          bottom: '70px'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading && posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen w-screen flex items-center justify-center bg-black"
          >
            <div className="flex flex-col items-center gap-4 text-white">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-white/20"></div>
              </div>
              <p className="text-lg font-medium">Loading amazing content...</p>
            </div>
          </motion.div>
        ) : posts.length > 0 ? (
          <>
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                className="w-screen snap-start snap-always relative overflow-hidden"
                style={{ 
                  scrollSnapAlign: 'start',
                  height: 'calc(100vh - 70px)', // Full viewport height minus mobile nav height
                  width: '100vw',
                  minHeight: '400px'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <EnhancedFeedPost
                  post={{
                    ...post,
                    commentCount: post.commentCount || 0,
                  }}
                  user={{
                    id: user?.id || "",
                    name: user?.name || "",
                    avatar: user?.profileImage?.url || user?.avatar
                  }}
                  onPostUpdated={handlePostUpdate}
                  priority={index}
                  className="h-full w-full border-0 rounded-none bg-black flex flex-col absolute inset-0"
                />
              </motion.div>
            ))}

            {/* Loading trigger for infinite scroll - smaller */}
            {hasMore && (
              <div className="w-screen flex items-center justify-center bg-black" 
                   style={{ height: '100px', minHeight: '100px' }}>
                {loadingMore && (
                  <div className="flex items-center gap-2 text-white/60">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of feed - smaller */}
            {!hasMore && posts.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-screen flex items-center justify-center bg-black snap-start"
                style={{ height: 'calc(100vh - 70px)', minHeight: '200px' }}
              >
                <div className="text-center text-white">
                  <div className="text-3xl mb-3">🎉</div>
                  <h3 className="text-lg font-bold mb-2">You've seen it all!</h3>
                  <p className="text-white/60 mb-3 text-sm">Pull down to refresh for more content</p>
                  <Button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full text-sm px-4 py-2"
                  >
                    Back to top
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen w-screen flex items-center justify-center bg-black snap-start"
            style={{ height: 'calc(100vh - 70px)' }}
          >
            <Card className="bg-black/50 border-white/10 text-white mx-4">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">🌟</div>
                <h3 className="text-xl font-bold mb-2">No content found</h3>
                <p className="text-white/60 mb-4">Try a different category or pull to refresh</p>
                <Button 
                  onClick={() => handleCategoryChange("discover")}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full"
                >
                  Explore Discover
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
} 