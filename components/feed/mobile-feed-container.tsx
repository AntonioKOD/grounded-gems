"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Filter, BookmarkIcon, Clock, Flame, Sparkles, LayoutList } from 'lucide-react'
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

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
  feedType?: string
  sortBy?: string
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
  
  // Get state from Redux store
  const { 
    posts, 
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
  const observer = useRef<IntersectionObserver>()
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // Fetch user data on mount
  useEffect(() => {
    if (!user && !isUserLoading) {
      dispatch(fetchUser())
    }
  }, [dispatch, user, isUserLoading])

  // Initialize posts slice with user's liked and saved posts
  useEffect(() => {
    if (user?.id) {
      // Initialize with user's actual liked and saved posts
      const likedPostIds = Array.isArray(user.likedPosts) ? user.likedPosts : []
      const savedPostIds = Array.isArray(user.savedPosts) ? user.savedPosts : []
      // For now, initialize liked comments as empty array - will be populated from server
      const likedCommentIds: string[] = []
      
      console.log('MobileFeedContainer: Initializing posts state with:', { 
        likedPostIds: likedPostIds.length, 
        savedPostIds: savedPostIds.length,
        likedCommentIds: likedCommentIds.length,
        likedPosts: likedPostIds,
        savedPosts: savedPostIds,
        likedComments: likedCommentIds
      })
      dispatch(initializeLikedPosts(likedPostIds))
      dispatch(initializeSavedPosts(savedPostIds))
      dispatch(initializeLikedComments(likedCommentIds))
    }
  }, [dispatch, user?.id, user?.savedPosts, user?.likedPosts])

  // Listen for user updates to refresh posts with correct like/save states
  useEffect(() => {
    const handleUserUpdate = async (event: CustomEvent) => {
      console.log("MobileFeedContainer: User update detected, refreshing posts immediately");
      if (event.detail && isMounted) {
        // Refresh posts with new user context
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
      console.log("MobileFeedContainer: User login detected, refreshing posts immediately");
      if (event.detail && isMounted) {
        // Refresh posts with new user context
        dispatch(fetchFeedPosts({ 
          feedType: "all", 
          sortBy: "recent", 
          category: activeCategory,
          currentUserId: event.detail.id,
          force: true 
        }))
      }
    };

    window.addEventListener("user-updated", handleUserUpdate as EventListener);
    window.addEventListener("user-login", handleUserLogin as EventListener);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate as EventListener);
      window.removeEventListener("user-login", handleUserLogin as EventListener);
    };
  }, [dispatch, feedType, sortBy, activeCategory, isMounted]);

  // Categories for feed filtering
  const categories = [
    { id: "discover", name: "Discover", icon: Sparkles },
    { id: "trending", name: "Popular", icon: Flame },
    { id: "recent", name: "Latest", icon: Clock },
    { id: "bookmarks", name: "Saved", icon: BookmarkIcon },
  ]

  // Set mounted state to prevent hydration errors
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  // Initial data loading
  useEffect(() => {
    if (isMounted && !isUserLoading && !initialLoadComplete.current) {
      console.log("MobileFeedContainer: Initial load, fetching posts")
      dispatch(fetchFeedPosts({ 
        feedType: "all", 
        sortBy: "recent", 
        userId,
        category: activeCategory,
        currentUserId: user?.id,
        force: true 
      }))
      initialLoadComplete.current = true
    }
  }, [dispatch, feedType, sortBy, userId, activeCategory, user?.id, isMounted, isUserLoading])

  // Refresh posts
  const refreshPosts = async () => {
    // Only use vibration on client-side after hydration
    if (isMounted && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
    
    try {
      await dispatch(fetchFeedPosts({ 
        feedType, 
        sortBy, 
        userId,
        category: activeCategory !== "all" ? activeCategory : undefined,
        currentUserId: user?.id,
        force: true 
      })).unwrap()
      toast.success("Feed refreshed")
    } catch (error) {
      console.error("Error refreshing posts:", error)
      toast.error("Error refreshing posts")
    }
  }

  // Load more posts
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    
    try {
      await dispatch(loadMorePosts({ currentUserId: user?.id })).unwrap()
    } catch (error) {
      console.error("Error loading more posts:", error)
      toast.error("Error loading more posts")
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
        if (scrollTop + clientHeight >= scrollHeight - 300 && !loadingMore && hasMore) {
          handleLoadMore()
        }
      }, 100) // 100ms debounce
    }
    
    container?.addEventListener('scroll', handleScroll)
    return () => {
      container?.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [loadingMore, hasMore, isMounted])
  
  // Pull-to-refresh implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMounted) return
    
    if (scrollPosition.current === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMounted) return
    
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
    if (!isMounted) return
    
    if (isPullingToRefresh && pullToRefreshDelta > 80) {
      refreshPosts()
    }
    
    setPullToRefreshDelta(0)
    setIsPullingToRefresh(false)
    touchStartY.current = 0
  }
  
  // Handle category change
  const handleCategoryChange = (category: string) => {
    if (!isMounted || category === activeCategory) return
    
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
      if (entries[0].isIntersecting && hasMore) {
        handleLoadMore()
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, loadingMore, hasMore])

  // Don't render anything before hydration completes
  if (!isMounted) {
    // Return a consistent skeleton that matches what will be rendered
    return <MobileFeedSkeleton />
  }

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
        >
          {loading ? (
            <MobileFeedSkeleton />
          ) : (
            <>
              {posts.length === 0 ? (
                <FeedErrorState
                  message={error || "No posts found. Try a different category or check back later."}
                  onRetry={() => refreshPosts()}
                />
              ) : (
                <div className="space-y-0 pb-16">
                  {posts.map((post, index) => (
                    <div
                      key={post.id}
                      ref={index === posts.length - 1 ? lastPostElementRef : null}
                      className="snap-start h-[85dvh] w-full flex items-center justify-center relative"
                    >
                      <MobileFeedPost
                        post={post}
                        user={user}
                        onPostUpdated={handlePostUpdate}
                        className="w-full h-full"
                      />
                    </div>
                  ))}
                  
                  {/* Load more indicator */}
                  {loadingMore && (
                    <div className="absolute bottom-16 left-0 right-0 py-4 flex justify-center bg-black/80 backdrop-blur-sm">
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