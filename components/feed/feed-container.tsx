/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, RefreshCw, Filter } from 'lucide-react'

import FeedPost from "@/components/feed/feed-post"
import CollapsiblePostForm from "@/components/post/collapsible-post-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { Post } from "@/types/feed"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { fetchFeedPosts, loadMorePosts, setFeedType, setSortBy, setCategory, setUserId, updatePost } from "@/lib/features/feed/feedSlice"
import { fetchUser } from "@/lib/features/user/userSlice"
import { initializeLikedPosts, initializeSavedPosts, initializeLikedComments } from "@/lib/features/posts/postsSlice"

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
  
  const isMounted = useRef<boolean>(true)
  const initialLoadComplete = useRef<boolean>(false)

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

  // Note: User data is already initialized in StoreProvider from server-side data
  // No need to fetch user data on mount as it causes unnecessary refetching

  // Initialize posts slice with user's liked and saved posts
  useEffect(() => {
    if (user?.id) {
      // Initialize with user's actual liked and saved posts
      const likedPostIds = Array.isArray(user.likedPosts) ? user.likedPosts : []
      const savedPostIds = Array.isArray(user.savedPosts) ? user.savedPosts : []
      // For now, initialize liked comments as empty array - will be populated from server
      const likedCommentIds: string[] = []
      
      console.log('FeedContainer: Initializing posts state with:', { 
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
      console.log("FeedContainer: User update detected, refreshing posts immediately");
      if (event.detail && isMounted.current) {
        // Refresh posts with new user context
        dispatch(fetchFeedPosts({ 
          feedType, 
          sortBy, 
          currentUserId: event.detail.id,
          force: true 
        }))
      }
    };

    const handleUserLogin = async (event: CustomEvent) => {
      console.log("FeedContainer: User login detected, refreshing posts immediately");
      if (event.detail && isMounted.current) {
        // Refresh posts with new user context
        dispatch(fetchFeedPosts({ 
          feedType, 
          sortBy, 
          currentUserId: event.detail.id,
          force: true 
        }))
      }
    };

    window.addEventListener("user-updated", handleUserUpdate as any);
    window.addEventListener("user-login", handleUserLogin as any);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate as any);
      window.removeEventListener("user-login", handleUserLogin as any);
    };
  }, [dispatch, feedType, sortBy]);

  // Initial data loading
  useEffect(() => {
    if (!isUserLoading && !initialLoadComplete.current) {
      console.log("FeedContainer: Initial load, fetching posts")
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

  // Refresh posts
  const refreshPosts = async () => {
    try {
      await dispatch(fetchFeedPosts({ 
        feedType, 
        sortBy, 
        userId,
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


  return (
    <div className={`max-w-5xl mx-auto ${className}`}>
      {/* Feed Header with Refresh Button */}
      <div className="flex justify-between items-center mb-10 sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-6 px-8 -mx-8 border-b border-gray-100 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-[#FF6B6B] bg-clip-text text-transparent">
          {feedType === "personalized" ? "For You" : feedType === "user" ? "User Posts" : "Discover"}
        </h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPosts}
            disabled={refreshing || loading}
            className="flex items-center gap-2 hover:bg-gray-50 border-gray-200 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-gray-50 border-gray-200 shadow-sm">
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
            className="mb-8"
          />
          <Separator className="my-8" />
        </>
      )}

      {/* Error Notice */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <p>Error loading posts: {error}</p>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-10">
        {loading ? (
          <Card className="p-16 flex justify-center items-center bg-gradient-to-br from-gray-50 to-white border-0 shadow-lg">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-[#FF6B6B]" />
                <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-[#FF6B6B]/20"></div>
              </div>
              <p className="text-base text-gray-600 font-medium">Loading amazing posts...</p>
            </div>
          </Card>
        ) : posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <FeedPost
                key={post.id}
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
                className="feed-post"
              />
            ))}

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center pt-8 pb-16">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="min-w-[200px] border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5 font-semibold py-3 px-8 rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    "Load More Posts"
                  )}
                </Button>
              </div>
            )}

            {/* End of feed indicator */}
            {!hasMore && posts.length > 0 && (
              <div className="py-16 text-center">
                <Separator className="mb-10" />
                <div className="space-y-4">
                  <p className="text-lg text-gray-600 font-medium">🎉 You've reached the end!</p>
                  <p className="text-gray-500">You've seen all the latest posts</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm rounded-full px-6"
                  >
                    Back to top
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-20 text-center bg-gradient-to-br from-gray-50 to-white">
              <div className="max-w-lg mx-auto space-y-6">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No posts found</h3>
                {userId ? (
                  <p className="text-gray-600 text-lg">This user hasn&apos;t posted anything yet.</p>
                ) : feedType === "personalized" ? (
                  <div className="space-y-3">
                    <p className="text-gray-600 text-lg">Follow some users to see personalized posts!</p>
                    <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white rounded-full px-8 py-3">
                      Discover People
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-600 text-lg">Be the first to share a post!</p>
                    <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white rounded-full px-8 py-3">
                      Create Post
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
