/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Loader2, RefreshCw, Filter } from "lucide-react"

import { PostCard } from "@/components/post/post-card"
import CollapsiblePostForm from "@/components/post/collapsible-post-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getFeedPosts, getPersonalizedFeed, likePost, isLiked, sharePost, getFeedPostsByUser } from "@/app/actions"
import type { Post } from "@/types/feed"

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
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [page, setPage] = useState<number>(1)
  const [user, setUser] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [usedMockData, setUsedMockData] = useState<boolean>(false)

  // Fetch the current user (for post form and personalized feed)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/users/me")
        if (!response.ok) throw new Error("Failed to fetch user")
        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error("Error fetching user:", error)
        // Don't show toast - they might not be logged in
      }
    }

    fetchUser()
  }, [])

  // Fetch posts based on feed type
  useEffect(() => {
    fetchPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedType, sortBy, user, userId])

  // Fetch posts using server actions
  const fetchPosts = async () => {
    try {
      setLoading(true)
      setPage(1)
      setUsedMockData(false)

      let fetchedPosts: Post[] = []

      if (feedType === "personalized" && user) {
        // Fetch personalized feed if user is logged in
        fetchedPosts = (await getPersonalizedFeed(user.id, 10, 0)) || []
        console.log("Fetched personalized posts:", fetchedPosts.length)
      } else if (feedType === "user" && userId) {
        // Use the server action directly instead of fetch API
        console.log(`Fetching posts for user ID: ${userId}`)
        fetchedPosts = ((await getFeedPostsByUser(userId)) || []).map((post: any) => ({
          id: post.id,
          author: {
            id: post.author?.id || userId,
            name: post.author?.name || "User",
            avatar: post.author?.avatar || "/diverse-avatars.png",
          },
          title: post.title || "",
          content: post.content || "",
          createdAt: post.createdAt || new Date().toISOString(),
          image: post.image?.url || post.featuredImage?.url || post.image || null,
          likeCount: post.likes?.length || post.likeCount || 0,
          commentCount: post.comments?.length || post.commentCount || 0,
          shareCount: post.shareCount || 0,
          isLiked: false,
          type: post.type || "post",
          rating: post.rating || null,
          location: post.location || (post.locationName ? { id: "loc_1", name: post.locationName } : undefined),
          status: post.status || "published",
        }))
        console.log("Fetched user posts:", fetchedPosts.length)

        // Map the posts to match the expected format for PostCard if needed
        if (fetchedPosts.length > 0) {
          fetchedPosts = fetchedPosts.map((post: any) => {
            return {
              id: post.id,
              author: {
                id: post.author?.id || userId,
                name: post.author?.name || "User",
                avatar: post.author?.avatar || "/diverse-avatars.png",
              },
              title: post.title || "",
              content: post.content || "",
              createdAt: post.createdAt || new Date().toISOString(),
              image: post.image?.url || post.featuredImage?.url || post.image || null,
              likeCount: post.likes?.length || post.likeCount || 0,
              commentCount: post.comments?.length || post.commentCount || 0,
              shareCount: post.shareCount || 0,
              isLiked: false,
              type: post.type || "post",
              rating: post.rating || null,
              location: post.location || (post.locationName ? { id: "loc_1", name: post.locationName } : undefined),
              status: post.status || "published",
            }
          })
        }
      } else {
        // Fetch all posts with sorting
        fetchedPosts = (await getFeedPosts(feedType, sortBy, 1)) || []
        console.log("Fetched all posts:", fetchedPosts.length)
      }

      // If no posts were fetched, use mock data
      if (!fetchedPosts || fetchedPosts.length === 0) {
        console.log("No posts found, using mock data")
        setUsedMockData(true)
      }

      // Check if each post is liked by the current user
      if (user && fetchedPosts.length > 0) {
        const postsWithLikeStatus = await Promise.all(
          fetchedPosts.map(async (post) => {
            try {
              const liked = await isLiked(post.id, user.id)
              return { ...post, isLiked: liked }
            } catch (error) {
              console.error(`Error checking like status for post ${post.id}:`, error)
              return post
            }
          }),
        )
        fetchedPosts = postsWithLikeStatus
      }

      if (fetchedPosts.length > 0) {
        setPosts(fetchedPosts)
        setHasMore(fetchedPosts.length >= 10 && !usedMockData) // Only show "load more" for real data
      } else {
        setPosts([])
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
      toast.error("Error loading posts. Please try again.")

      // Use mock data if API fails
      setUsedMockData(true)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  // Generate mock posts if needed
  

  // Refresh posts
  const refreshPosts = async () => {
    setRefreshing(true)
    try {
      await fetchPosts()
      toast.success("Feed refreshed")
    } catch (error) {
      console.error("Error refreshing posts:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Load more posts
  const loadMorePosts = async () => {
    try {
      setLoadingMore(true)
      const nextPage = page + 1

      let morePosts: Post[] = []

      if (feedType === "personalized" && user) {
        morePosts = (await getPersonalizedFeed(user.id, 10, page * 10)) || []
      } else if (feedType === "user" && userId) {
        // For user posts, we don't have pagination yet, so just return empty
        morePosts = []
      } else {
        morePosts = (await getFeedPosts(feedType, sortBy, nextPage)) || []
      }

      // Check if each post is liked by the current user
      if (user && morePosts.length > 0) {
        const postsWithLikeStatus = await Promise.all(
          morePosts.map(async (post) => {
            try {
              const liked = await isLiked(post.id, user.id)
              return { ...post, isLiked: liked }
            } catch (error) {
              console.error(`Error checking like status for post ${post.id}:`, error)
              return post
            }
          }),
        )
        morePosts = postsWithLikeStatus
      }

      if (morePosts.length > 0) {
        setPosts([...posts, ...morePosts])
        setPage(nextPage)
        setHasMore(morePosts.length >= 10)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more posts:", error)
      toast.error("Error loading more posts. Please try again.")
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle like action using server action
  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please log in to like posts")
      return
    }

    try {
      // Find the post
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      // Optimistic update
      const isCurrentlyLiked = post.isLiked || false
      const newLikeCount = isCurrentlyLiked ? (post.likeCount || 0) - 1 : (post.likeCount || 0) + 1

      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              isLiked: !isCurrentlyLiked,
              likeCount: newLikeCount,
            }
          }
          return p
        }),
      )

      // Call server action
      await likePost(postId, !isCurrentlyLiked, user.id)
    } catch (error) {
      console.error("Error liking post:", error)
      toast.error("Failed to like post. Please try again.")

      // Revert optimistic update on error
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            const isCurrentlyLiked = p.isLiked || false
            return {
              ...p,
              isLiked: isCurrentlyLiked,
              likeCount: isCurrentlyLiked ? p.likeCount : (p.likeCount || 1) - 1,
            }
          }
          return p
        }),
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleComment = (postId: string) => {
    // Scroll to comments or open comment form
    toast.info("Comment feature coming soon")
  }

  const handleShare = async (postId: string) => {
    try {
      // Find the post
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      // Copy link to clipboard
      const postUrl = `${window.location.origin}/posts/${postId}`
      await navigator.clipboard.writeText(postUrl)

      // Optimistic update
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              shareCount: (p.shareCount || 0) + 1,
            }
          }
          return p
        }),
      )

      // Call server action if user is logged in
      if (user) {
        await sharePost(postId, user.id)
      }

      toast.success("Link copied to clipboard")
    } catch (error) {
      console.error("Error sharing post:", error)
      toast.error("Failed to share post")

      // Revert optimistic update
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              shareCount: Math.max(0, (p.shareCount || 1) - 1),
            }
          }
          return p
        }),
      )
    }
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
      {showPostForm && user && (
        <>
          <CollapsiblePostForm user={user} className="mb-6" />
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
                post={post}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
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
