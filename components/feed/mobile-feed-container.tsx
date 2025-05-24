"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowUp, RefreshCw, Filter, BookmarkIcon, Clock, Flame, Sparkles, LayoutList } from 'lucide-react'
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import MobileFeedPost from "./mobile-feed-post"
import { Button } from "@/components/ui/button"
import { getFeedPosts, getPersonalizedFeed, getFeedPostsByUser } from "@/app/actions"
import type { Post } from "@/types/feed"
import { useAuth } from "@/hooks/use-auth"
import MobileFeedSkeleton from "./mobile-feed-skeleton"
import MobileCreatePostButton from "./mobile-create-post-button"
import FeedErrorState from "./feed-error-state"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface MobileFeedContainerProps {
  userId?: string
  initialPosts?: Post[]
  showPostForm?: boolean
  className?: string
  feedType?: "personalized" | "all" | "user"
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
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState<boolean>(initialPosts.length === 0)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [page, setPage] = useState<number>(1)
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [pullToRefreshDelta, setPullToRefreshDelta] = useState<number>(0)
  const [isPullingToRefresh, setIsPullingToRefresh] = useState<boolean>(false)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const initialLoadComplete = useRef(false)
  const touchStartY = useRef<number>(0)
  const scrollPosition = useRef<number>(0)
  const observer = useRef<IntersectionObserver>()
  const lastFetchTimestamp = useRef<number>(0)
  const fetchTimeoutRef = useRef<NodeJS.Timeout>()
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // Get user data from auth context
  const { user, isLoading: isUserLoading, isAuthenticated } = useAuth()

  // Categories for feed filtering
  const categories = [
    { id: "all", name: "All", icon: LayoutList },
    { id: "recommendations", name: "For You", icon: Sparkles },
    { id: "trending", name: "Trending", icon: Flame },
    { id: "recent", name: "Recent", icon: Clock },
  ]

  // Set mounted state to prevent hydration errors
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  // Fetch posts based on feed type with debounce
  const fetchPosts = useCallback(async (category?: string) => {
    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    // Debounce check - only allow fetches every 5 seconds
    const now = Date.now()
    if (now - lastFetchTimestamp.current < 5000) {
      // Schedule next fetch attempt
      fetchTimeoutRef.current = setTimeout(() => {
        if (isMounted) {
          fetchPosts(category)
        }
      }, 5000 - (now - lastFetchTimestamp.current))
      return
    }
    lastFetchTimestamp.current = now

    if (!isMounted) return

    setLoading(true)
    setError(null)
    setPage(1)
  
    try {
      let fetchedPosts: Post[] = []
      const categoryFilter = category && category !== "all" ? category : undefined
  
      if (feedType === "personalized") {
        if (isAuthenticated && user) {
          fetchedPosts = (await getPersonalizedFeed(user.id, 10, 0, categoryFilter)) ?? []
        } else {
          fetchedPosts = await getFeedPosts("all", sortBy, 1, categoryFilter)
        }
      } else if (feedType === "user" && userId) {
        fetchedPosts = (await getFeedPostsByUser(userId, categoryFilter)) as Post[]
      } else {
        fetchedPosts = await getFeedPosts(feedType, sortBy, 1, categoryFilter)
      }
  
      setPosts(fetchedPosts)
      setHasMore(fetchedPosts.length >= 10)
      
      if (fetchedPosts.length === 0) {
        setError("No posts found matching your criteria")
      }
    } catch (err) {
      console.error("Error fetching posts:", err)
      toast.error("Error loading posts")
      setPosts([])
      setHasMore(false)
      setError("Error loading posts. Please try again later.")
    } finally {
      setLoading(false)
    }
  }, [feedType, sortBy, isAuthenticated, user, userId, isMounted])

  // Initial data loading
  useEffect(() => {
    // Skip if component is not mounted or we're still loading user data
    if (!isMounted || isUserLoading) return

    // If we already have initial posts, don't fetch again
    if (initialPosts.length > 0) {
      initialLoadComplete.current = true
      return
    }

    // If this is the first load and we have no initial posts, fetch posts
    if (!initialLoadComplete.current) {
      fetchPosts()
      initialLoadComplete.current = true
    }
  }, [isMounted, isUserLoading, fetchPosts, initialPosts.length])

  // Refresh posts
  const refreshPosts = async () => {
    setRefreshing(true)
    
    // Only use vibration on client-side after hydration
    if (isMounted && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
    
    try {
      await fetchPosts(activeCategory !== "all" ? activeCategory : undefined)
      toast.success("Feed refreshed")
    } catch (error) {
      console.error("Error refreshing posts:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Load more posts
  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    const nextPage = page + 1
  
    try {
      let morePosts: Post[] = []
      const categoryFilter = activeCategory !== "all" ? activeCategory : undefined
  
      if (feedType === "personalized" && user) {
        morePosts = (await getPersonalizedFeed(user.id, 10, nextPage * 10, categoryFilter)) ?? []
      } else if (feedType === "user" && userId) {
        morePosts = (await getFeedPostsByUser(userId, categoryFilter)) as Post[]
      } else {
        morePosts = await getFeedPosts(feedType, sortBy, nextPage, categoryFilter)
      }
  
      if (morePosts.length) {
        setPosts((prev) => [...prev, ...morePosts])
        setPage(nextPage)
        setHasMore(morePosts.length >= 10)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error("Error loading more posts:", err)
      toast.error("Error loading more posts")
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle post update
  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)))
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

        // Show/hide scroll to top button
        setShowScrollTop(container.scrollTop > 500)
        
        // Record scroll position
        scrollPosition.current = container.scrollTop
        
        // Load more posts when reaching the bottom
        const { scrollTop, scrollHeight, clientHeight } = container
        if (scrollTop + clientHeight >= scrollHeight - 300 && !loadingMore && hasMore) {
          loadMorePosts()
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
  
  // Scroll to top function
  const scrollToTop = () => {
    if (!isMounted || !feedRef.current) return
    
    feedRef.current.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
    
    // Only use vibration on client-side after hydration
    if (isMounted && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
  }
  
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
    setLoading(true)
    
    // Reset scroll position
    if (feedRef.current) {
      feedRef.current.scrollTop = 0
    }
    
    // Fetch posts with the new category
    fetchPosts(category !== "all" ? category : undefined)
    
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
        loadMorePosts()
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, loadingMore, hasMore])

  // Handle scroll position for scroll-to-top button
  useEffect(() => {
    if (!isMounted) return

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMounted])

  // Don't render anything before hydration completes
  if (!isMounted) {
    // Return a consistent skeleton that matches what will be rendered
    return <MobileFeedSkeleton />
  }

  return (
    <div className={`max-w-2xl mx-auto relative ${className}`}>
      {/* Categories horizontal scroll */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pb-3 border-b">
        <ScrollArea className="w-full pb-2">
          <div className="flex space-x-2 py-3 px-1">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={`flex items-center gap-1.5 px-3 rounded-full flex-shrink-0
                    ${activeCategory === category.id ? 
                      "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white" : 
                      "hover:bg-gray-100 text-gray-700"}`}
                  onClick={() => handleCategoryChange(category.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{category.name}</span>
                </Button>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
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
        className="h-[calc(100vh-11rem)] overflow-y-auto overflow-x-hidden px-2 relative pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile-specific loading state */}
        {loading ? (
          <MobileFeedSkeleton />
        ) : (
          <>
            {posts.length === 0 ? (
              <FeedErrorState
                message={error || "No posts found. Try a different category or check back later."}
                onRetry={() => fetchPosts()}
              />
            ) : (
              <div className="space-y-4 pt-4">
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    ref={index === posts.length - 1 ? lastPostElementRef : null}
                    className="p-4"
                  >
                    <MobileFeedPost
                      post={post}
                      user={user}
                      onPostUpdated={handlePostUpdate}
                    />
                  </div>
                ))}
                
                {/* Load more indicator */}
                {loadingMore && (
                  <div className="py-4 flex justify-center">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-[#FF6B6B] animate-spin"></div>
                      <span className="text-sm text-gray-500">Loading more posts...</span>
                    </div>
                  </div>
                )}
                
                {/* End of feed indicator */}
                {!hasMore && posts.length > 0 && (
                  <div className="py-8 text-center">
                    <Separator className="mb-6" />
                    <p className="text-sm text-gray-500">You've reached the end of your feed</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={scrollToTop}
                    >
                      Back to top
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Floating Create Post Button */}
      {showPostForm && user && isMounted && (
        <MobileCreatePostButton user={user} onPostCreated={(newPost) => setPosts([newPost, ...posts])} />
      )}
      
      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-4 z-50"
          >
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-white shadow-lg border"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-5 w-5 text-gray-700" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 