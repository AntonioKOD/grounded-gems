/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, RefreshCw, Filter } from 'lucide-react'

import { PostCard } from "@/components/post/post-card"
import CollapsiblePostForm from "@/components/post/collapsible-post-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getFeedPosts, getPersonalizedFeed, getFeedPostsByUser } from "@/app/actions"
import type { Post } from "@/types/feed"
import { useAuth } from "@/hooks/use-auth"

interface FeedContainerProps {
  userId?: string
  initialPosts?: Post[]
  showPostForm?: boolean
  className?: string
  feedType?: "personalized" | "all" | "user"
  sortBy?: "recent" | "popular" | "trending"
}

export default function FeedContainer({
  userId,
  initialPosts = [],
  showPostForm = true,
  className = "",
  feedType = "all",
  sortBy = "recent",
}: FeedContainerProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState<boolean>(initialPosts.length === 0)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(initialPosts.length >= 10)
  const [page, setPage] = useState<number>(1)
  const [usedMockData, setUsedMockData] = useState<boolean>(false)
  const isMounted = useRef<boolean>(true)
  const initialLoadComplete = useRef<boolean>(initialPosts.length > 0)
  const lastFetchTimestamp = useRef<number>(0)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get user data from auth context
  const { user, isLoading: isUserLoading, isAuthenticated } = useAuth()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
        fetchTimeoutRef.current = null
      }
    }
  }, [])

  // Fetch posts based on feed type with debounce
  const fetchPosts = useCallback(async () => {
    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
      fetchTimeoutRef.current = null
    }

    // Debounce check - only allow fetches every 5 seconds
    const now = Date.now()
    const timeSinceLastFetch = now - lastFetchTimestamp.current
    if (timeSinceLastFetch < 5000) {
      // Schedule next fetch attempt
      fetchTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          void fetchPosts()
        }
      }, 5000 - timeSinceLastFetch)
      return
    }

    // Update last fetch timestamp before the fetch
    lastFetchTimestamp.current = now

    if (!isMounted.current) return

    setLoading(true)
    setPage(1)
    setUsedMockData(false)
  
    try {
      let fetchedPosts: Post[] = []
  
      if (feedType === "personalized") {
        if (isAuthenticated && user) {
          fetchedPosts = (await getPersonalizedFeed(user.id, 10, 0)) ?? []
        } else {
          fetchedPosts = await getFeedPosts("all", sortBy, 1)
        }
      } else if (feedType === "user" && userId) {
        fetchedPosts = (await getFeedPostsByUser(userId)) as Post[]
      } else {
        fetchedPosts = await getFeedPosts(feedType, sortBy, 1)
      }
  
      if (isMounted.current) {
        setPosts(fetchedPosts)
        setHasMore(fetchedPosts?.length >= 10)
      }
    } catch (err) {
      console.error("Error fetching posts:", err)
      if (isMounted.current) {
        toast.error("Error loading posts")
        setPosts([])
        setHasMore(false)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [feedType, sortBy, isAuthenticated, user, userId])

  // Initial data loading - only fetch if we don't have initial posts
  useEffect(() => {
    // Skip if component is not mounted or we're still loading user data
    if (!isMounted.current || isUserLoading) return

    // If we already have initial posts, don't fetch again
    if (initialPosts.length > 0) {
      initialLoadComplete.current = true
      return
    }

    // If this is the first load and we have no initial posts, fetch posts
    if (!initialLoadComplete.current) {
      void fetchPosts()
      initialLoadComplete.current = true
    }
  }, [isUserLoading, fetchPosts, initialPosts.length])

  // Refresh posts
  const refreshPosts = async () => {
    setRefreshing(true)
    try {
      await fetchPosts()
      toast.success("Feed refreshed")
    } catch (error) {
      console.error("Error refreshing posts:", error)
    } finally {
      if (isMounted.current) {
        setRefreshing(false)
      }
    }
  }

  // Load more posts
  const loadMorePosts = async () => {
    setLoadingMore(true)
    const nextPage = page + 1
  
    try {
      let morePosts: Post[] = []
  
      if (feedType === "personalized" && user) {
        morePosts = (await getPersonalizedFeed(user.id, 10, nextPage * 10)) ?? []
      } else if (feedType === "user" && userId) {
        morePosts = (await getFeedPostsByUser(userId)) as Post[] // Cast the response to Post[]
      } else {
        morePosts = await getFeedPosts(feedType, sortBy, nextPage)
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

  // Handle comment action
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleComment = (postId: string) => {
    // Scroll to comments or open comment form
    toast.info("Comment feature coming soon")
  }

  // Handle post update
  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)))
  }


  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
    

      {/* Feed Header with Refresh Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {feedType === "personalized" ? "For You" : feedType === "user" ? "User Posts" : "All Posts"}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPosts}
            disabled={refreshing || loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Post Form - only if showPostForm is true and user is logged in */}
      {showPostForm && user && user.name && (
        <>
          <CollapsiblePostForm
            user={{
              id: user.id,
              name: user.name,
              avatar: user.profileImage?.url || user.avatar,
            }}
            className="mb-6"
          />
          <Separator className="my-6" />
        </>
      )}

      {/* Mock Data Notice */}
      {usedMockData && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          <p>Showing example posts. Connect your API to see real posts.</p>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-6">
        {loading ? (
          <Card className="p-8 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
          </Card>
        ) : posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  commentCount: post.commentCount || 0, // Ensure commentCount is always defined
                }}
                user={{
                  id: user?.id || "",
                  name: user?.name || "",
                  avatar: user?.profileImage?.url || user?.avatar
                }}
                onComment={handleComment}
                onPostUpdated={handlePostUpdate}
                className="transition-all duration-300 hover:shadow-md"
              />
            ))}

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-8">
                <Button
                  variant="outline"
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="min-w-[150px] border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="mb-4 text-lg font-medium">No posts found</p>
              {userId ? (
                <p className="text-muted-foreground">This user hasn&apos;t posted anything yet.</p>
              ) : feedType === "personalized" ? (
                <p className="text-muted-foreground">Follow some users to see personalized posts!</p>
              ) : (
                <p className="text-muted-foreground">Be the first to share a post!</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
