"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import FeedContainer from "./feed-container"
import MobileFeedContainer from "./mobile-feed-container"
import FeedSkeleton from "./feed-skeleton"
import MobileFeedSkeleton from "./mobile-feed-skeleton"
import FeedErrorState from "./feed-error-state"
import ErrorBoundary from "@/components/error-boundary"

interface ResponsiveFeedProps {
  initialPosts: any[]
  feedType?: "personalized" | "all" | "user"
  userId?: string
  sortBy?: "recent" | "popular" | "trending"
  showPostForm?: boolean
}

export default function ResponsiveFeed({
  initialPosts,
  feedType = "all",
  userId,
  sortBy = "recent",
  showPostForm = true,
}: ResponsiveFeedProps) {
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()

  // Memoize the resize handler
  const handleResize = useCallback(() => {
    if (!isMounted) return
    setIsMobile(window.innerWidth < 768)
  }, [isMounted])

  useEffect(() => {
    // Mark component as mounted
    setIsMounted(true)
    
    // Set initial value
    handleResize()

    // Add event listener with debounce
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(handleResize, 100)
    }

    window.addEventListener("resize", debouncedResize)

    // Clean up
    return () => {
      window.removeEventListener("resize", debouncedResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      setIsMounted(false)
    }
  }, [handleResize])

  // During hydration, always show desktop version to avoid mismatch
  // Then switch to mobile if needed once mounted
  const shouldUseMobile = isMounted && isMobile

  return (
    <ErrorBoundary>
      <div className="w-full">
        {shouldUseMobile ? (
          <MobileFeedContainer 
            initialPosts={initialPosts}
            feedType={feedType}
            sortBy={sortBy}
            userId={userId}
            showPostForm={showPostForm}
          />
        ) : (
          <FeedContainer
            initialPosts={initialPosts}
            feedType={feedType}
            sortBy={sortBy}
            userId={userId}
            showPostForm={showPostForm}
          />
        )}
      </div>
    </ErrorBoundary>
  )
} 