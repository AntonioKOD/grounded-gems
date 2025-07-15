"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { RefreshCw, Filter, BookmarkIcon, Clock, Flame, Sparkles, LayoutList, ChevronDown, TrendingUp, Users, Zap, Search, Plus, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"


import MobileFeedPost from "./mobile-feed-post"
import { Button } from "@/components/ui/button"
import type { Post } from "@/types/feed"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { fetchFeedPosts, loadMorePosts, setCategory, updatePost, setFeedType, setSortBy, setUserId } from "@/lib/features/feed/feedSlice"
import { initializeLikedPosts, initializeSavedPosts, initializeLikedComments } from "@/lib/features/posts/postsSlice"
import { fetchUser } from "@/lib/features/user/userSlice"
import MobileFeedSkeleton from "./mobile-feed-skeleton"
import FeedErrorState from "./feed-error-state"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import TopicFilters from "./topic-filters"
import FeedTransition from "./feed-transition"
import CollapsiblePostForm from "../post/collapsible-post-form"
import { getImageUrl, getVideoUrl } from "@/lib/image-utils"
import { useMobile } from "@/hooks/use-mobile"
import { useThrottledScroll, useInfiniteScroll, useMemoryManagement } from "@/hooks/use-performance"

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

  // Mobile integration
  const { isMobile, platform, features, getActions } = useMobile()

  // Local state
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [isPullingToRefresh, setIsPullingToRefresh] = useState<boolean>(false)
  const [pullToRefreshDelta, setPullToRefreshDelta] = useState<number>(0)

  // Refs for better performance
  const initialLoadComplete = useRef<boolean>(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  
  // Memory management
  const { addCleanup } = useMemoryManagement()

  // Load more posts function with optimized dependencies
  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore && isMounted) {
      dispatch(loadMorePosts({
        currentUserId: user?.id
      }))
    }
  }, [dispatch, loading, loadingMore, hasMore, isMounted, userId, activeCategory, user?.id])

  // Optimized scroll handling with throttling
  const handleScroll = useThrottledScroll(
    useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
      // Auto-trigger load more when approaching bottom (backup to intersection observer)
      if (scrollTop + clientHeight >= scrollHeight - 100 && !loadingMore && hasMore && !loading) {
        // This provides additional load triggering besides intersection observer
        handleLoadMore()
      }
    }, [loadingMore, hasMore, loading, handleLoadMore]),
    100 // Throttle to every 100ms for better performance
  )

  // Add scroll cleanup on mount
  useEffect(() => {
    const currentFeedRef = feedRef.current
    // Add cleanup for scroll event listeners
    if (currentFeedRef) {
      addCleanup(() => {
        // Clean up any remaining event listeners
        console.log('Cleaning up mobile feed scroll listeners')
      })
    }
    return () => {
      // Additional cleanup on unmount
      if (currentFeedRef) {
        currentFeedRef.removeEventListener('scroll', handleScroll as any)
      }
    }
  }, [addCleanup, handleScroll])

  // Normalize post data to ensure consistent media URLs and interaction states using proper image utilities
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
        post.photos.forEach((photo: any, index: number) => {
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
    const normalizedImage = getImageUrl(post.image || post.featuredImage)
    const normalizedVideo = getVideoUrl(post.video)
    const normalizedPhotos = Array.isArray(post.photos) 
      ? post.photos.map((photo: any) => {
          const photoUrl = getImageUrl(photo)
          return photoUrl !== "/placeholder.svg" ? photoUrl : null
        }).filter(Boolean)
      : []

    const normalizedVideoThumbnail = (() => {
      if (post.videoThumbnail) {
        const thumbnailUrl = getImageUrl(post.videoThumbnail)
        return thumbnailUrl !== "/placeholder.svg" ? thumbnailUrl : null
      }
      if (normalizedVideo && normalizedImage !== "/placeholder.svg") return normalizedImage
      return null
    })()

    return {
      ...post,
      // Prioritize media array from API
      media: normalizedMedia,
      // Keep legacy fields for backward compatibility
      image: normalizedImage !== "/placeholder.svg" ? normalizedImage : null,
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

    // Add cleanup
    addCleanup(() => {
      window.removeEventListener("user-updated", handleUserUpdate as any);
      window.removeEventListener("user-login", handleUserLogin as any);
      window.removeEventListener("postCreated", handlePostCreated as any);
    });

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate as any);
      window.removeEventListener("user-login", handleUserLogin as any);
      window.removeEventListener("postCreated", handlePostCreated as any);
    };
  }, [dispatch, feedType, sortBy, activeCategory, isMounted, loading, addCleanup]);

  // Categories for feed filtering
  const categories = useMemo(() => [
    { id: "all", name: "All", emoji: "🌟" },
    { id: "discover", name: "Discover", emoji: "🗺️" },
    { id: "food", name: "Food", emoji: "🍽️" },
    { id: "nature", name: "Nature", emoji: "🌲" },
    { id: "culture", name: "Culture", emoji: "🎭" },
    { id: "sports", name: "Sports", emoji: "⚽" },
    { id: "nightlife", name: "Nightlife", emoji: "🌙" },
  ], [])

  // Initialize feed settings
  useEffect(() => {
    dispatch(setFeedType(feedType))
    dispatch(setSortBy(sortBy))
    if (userId) dispatch(setUserId(userId))
  }, [dispatch, feedType, sortBy, userId])

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
        category: activeCategory !== "all" ? activeCategory : undefined,
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
    }
  }, [dispatch, userId, activeCategory, user?.id, isUserLoading])

  // Optimized infinite scroll with better threshold
  const lastPostElementRef = useInfiniteScroll(
    handleLoadMore,
    hasMore,
    loading || loadingMore,
    300 // Load when 300px from bottom
  )

  // Refresh posts function
  const refreshPosts = useCallback(() => {
    dispatch(fetchFeedPosts({ 
      feedType, 
      sortBy, 
      userId,
      category: activeCategory !== "all" ? activeCategory : undefined,
      currentUserId: user?.id,
      force: true 
    }))
  }, [dispatch, feedType, sortBy, userId, activeCategory, user?.id])

  // Handle category change with haptic feedback
  const handleCategoryChange = useCallback((category: string) => {
    if (!isMounted || category === activeCategory || loading) return
    
    setActiveCategory(category)
    
    // Reset scroll position
    if (feedRef.current) {
      feedRef.current.scrollTop = 0
    }
    
    // Update Redux state and fetch posts
    dispatch(setCategory(category !== "all" ? category : undefined))
    dispatch(fetchFeedPosts({ 
      feedType, 
      sortBy, 
      userId,
      category: category !== "all" ? category : undefined,
      currentUserId: user?.id,
      force: true 
    }))
    
    // Haptic feedback
    if (isMobile && features.haptics) {
      getActions().then(actions => {
        if (actions.vibrate) {
          actions.vibrate()
        }
      }).catch(() => {
        if (isMounted && navigator.vibrate) {
          navigator.vibrate(30)
        }
      })
    } else if (isMounted && navigator.vibrate) {
      navigator.vibrate(30)
    }
  }, [isMounted, activeCategory, loading, feedRef, dispatch, feedType, sortBy, userId, user?.id, isMobile, features.haptics])

  // Post update handler
  const handlePostUpdate = useCallback((updatedPost: Post) => {
    // Post updates are handled by Redux automatically
    console.log('Post updated:', updatedPost.id)
  }, [])

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
    <div className={`w-full h-full flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Header with category filters */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        {/* Category Pills */}
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${activeCategory === category.id
                  ? 'bg-[#FF6B6B] text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              <span className="mr-1">{category.emoji}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Post form */}
        {showPostForm && user && user.name && (
          <div className="px-4 pb-3">
            <CollapsiblePostForm 
              user={{
                id: user.id,
                name: user.name || '',
                avatar: user.avatar,
                profileImage: user.profileImage
              }}
            />
          </div>
        )}
      </div>

      {/* Pull to refresh indicator */}
      {isPullingToRefresh && (
        <div 
          className="absolute top-16 left-0 right-0 flex justify-center z-30 pointer-events-none"
          style={{ transform: `translateY(${Math.min(pullToRefreshDelta - 20, 50)}px)` }}
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
        </div>
      )}

      {/* Feed content */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={feedRef}
          className="h-full overflow-y-auto mobile-scroll pb-20"
          onTouchStart={(e) => {
            if (!isMounted || loading || refreshing) return
            if (!e.touches || e.touches.length === 0) return
            const feed = feedRef.current
            if (feed && feed.scrollTop === 0) {
              const touch = e.touches && e.touches.length > 0 ? e.touches[0] : undefined;
              if (touch) touchStartY.current = touch.clientY;
            }
          }}
          onTouchMove={(e) => {
            if (!isMounted || loading || refreshing) return
            if (!e.touches || e.touches.length === 0) return
            const feed = feedRef.current
            if (feed && feed.scrollTop === 0 && touchStartY.current > 0) {
              const touch = e.touches && e.touches.length > 0 ? e.touches[0] : undefined;
              if (!touch) return;
              const currentY = touch.clientY;
              const delta = currentY - touchStartY.current;
              if (delta > 0 && delta < 150) {
                setPullToRefreshDelta(delta)
                setIsPullingToRefresh(true)
              }
            }
          }}
          onTouchEnd={() => {
            if (!isMounted || loading || refreshing) return
            
            if (isPullingToRefresh && pullToRefreshDelta > 80) {
              refreshPosts()
            }
            
            setPullToRefreshDelta(0)
            setIsPullingToRefresh(false)
            touchStartY.current = 0
          }}
          onScroll={(e) => handleScroll(
            e.currentTarget.scrollTop,
            e.currentTarget.scrollHeight,
            e.currentTarget.clientHeight
          )}
          style={{
            height: 'calc(100vh - 140px)', // Account for header and mobile nav
          }}
        >
          {loading && reduxPosts.length === 0 ? (
            <MobileFeedSkeleton />
          ) : (
            <>
              {reduxPosts.length === 0 ? (
                <FeedErrorState
                  message={error || "No posts found. Try a different category or check back later."}
                  onRetry={refreshPosts}
                />
              ) : (
                <div className="space-y-1">
                  {reduxPosts.map((post, index) => (
                    <div
                      key={post.id}
                      ref={index === reduxPosts.length - 1 ? lastPostElementRef : undefined}
                    >
                      <MobileFeedPost
                        post={post}
                        user={user && user.name ? {
                          id: user.id,
                          name: user.name || '',
                          avatar: user.avatar,
                          profileImage: user.profileImage
                        } : undefined}
                        onPostUpdated={handlePostUpdate}
                        className="mb-1"
                      />
                    </div>
                  ))}

                  {/* Loading more indicator */}
                  {loadingMore && (
                    <div className="flex justify-center py-8">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading more posts...</span>
                      </div>
                    </div>
                  )}

                  {/* No more posts message */}
                  {!hasMore && reduxPosts.length > 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>You've seen all the latest posts!</p>
                      <Button 
                        onClick={refreshPosts}
                        variant="ghost" 
                        className="mt-2 text-[#FF6B6B] hover:text-[#FF6B6B]"
                      >
                        Refresh for more
                      </Button>
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