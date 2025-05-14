/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FeedPost from "./feed-post"
import { Button } from "@/components/ui/button"
import { RefreshCw, Filter } from "lucide-react"
import { getPersonalizedFeed, getFeedPosts, isLiked } from "@/app/actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import type { Post } from "@/types/feed"
import EmptyFeed from "./empty-feed"

export default function FeedContainer() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("for-you")
  const [sortBy, setSortBy] = useState("recent")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [user, setUser] = useState<{ id: string | number } | null>(null)

  const { ref, inView } = useInView()

  // Fetch user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          console.error("Failed to fetch user:", response.status)
          return null
        }

        const data = await response.json()
        return data.user
      } catch (error) {
        console.error("Error fetching user:", error)
        return null
      }
    }

    fetchUser().then((userData) => {
      setUser(userData)
      console.log("User data fetched:", userData)
    })
  }, [])

  // Load posts when tab, sort, or user changes
  useEffect(() => {
    loadPosts()
  }, [activeTab, sortBy, user])

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMorePosts()
    }
  }, [inView, hasMore])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      let newPosts: Post[] = []

      if (activeTab === "for-you") {
        if (user?.id) {
          console.log("Fetching personalized feed for user:", user.id)
          const rawPosts = await getPersonalizedFeed(String(user.id), 10)
          console.log("Raw personalized posts:", rawPosts)

          if (Array.isArray(rawPosts) && rawPosts.length > 0) {
            newPosts = await Promise.all(
              rawPosts.map(async (rawPost) => {
                // Check if the post is liked by the current user
                const postIsLiked = user?.id ? await isLiked(rawPost.id, String(user.id)) : false

                // Ensure the post has all required fields for FeedPost component
                return {
                  id: String(rawPost.id),
                  author:
                    typeof rawPost.author === "object"
                      ? rawPost.author
                      : {
                          id: typeof rawPost.author === "string" ? rawPost.author : "unknown",
                          name: typeof rawPost.author === "object" && rawPost.author && (rawPost.author as { name: string }).name ? (rawPost.author as { name: string }).name : "Unknown User",
                          avatar: typeof rawPost.author === "object" ? rawPost.author && (rawPost.author as {avatar: string}).avatar ? (rawPost.author as {avatar: string}).avatar : undefined : undefined,
                        },
                  content: rawPost.content || "",
                  createdAt: rawPost.createdAt || new Date().toISOString(),
                  type: rawPost.type || "post",
                  title: rawPost.title,
                  image: rawPost.image,
                  likeCount: rawPost.likeCount || 0,
                  commentCount: rawPost.commentCount || 0,
                  isLiked: postIsLiked,
                  rating: rawPost.rating,
                  location: rawPost.location,
                }
              }),
            )
          }
        } else {
          console.log("No user found for personalized feed")
        }
      } else {
        // For "all" tab - use the new implementation
        console.log("Fetching all posts with sort:", sortBy)
        const fetchedPosts = await getFeedPosts("all", sortBy, 1)

        // Check if each post is liked by the current user
        if (user?.id) {
          newPosts = await Promise.all(
            fetchedPosts.map(async (post) => {
              const postIsLiked = await isLiked(post.id, String(user.id))
              return {
                ...post,
                isLiked: postIsLiked,
              }
            }),
          )
        } else {
          newPosts = fetchedPosts
        }

        console.log("Fetched all posts:", newPosts.length)
      }

      console.log("Processed posts:", newPosts)
      setPosts(newPosts)
      setPage(1)
      setHasMore(newPosts.length === 10) // Assuming 10 posts per page
    } catch (error) {
      console.error("Error loading posts:", error)
      toast.error("Failed to load posts")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMorePosts = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const nextPage = page + 1
      let newPosts: Post[] = []

      if (activeTab === "for-you" && user?.id) {
        const offset = page * 10 // 10 posts per page
        const rawPosts = await getPersonalizedFeed(String(user.id), 10, offset)

        if (Array.isArray(rawPosts) && rawPosts.length > 0) {
          newPosts = await Promise.all(
            rawPosts.map(async (rawPost) => {
              // Check if the post is liked by the current user
              const postIsLiked = await isLiked(rawPost.id, String(user.id))

              return {
                id: String(rawPost.id),
                author:
                  typeof rawPost.author === "object"
                    ? rawPost.author
                    : {
                        id: typeof rawPost.author === "string" ? rawPost.author : "unknown",
                        name: typeof rawPost.author === "object" && (rawPost.author as { name: string }).name ? (rawPost.author as { name: string }).name : "Unknown User",
                        avatar: typeof rawPost.author === "object" && rawPost.author !== null && "avatar" in rawPost.author ? (rawPost.author as { avatar: string }).avatar : undefined,
                      },
                content: rawPost.content || "",
                createdAt: rawPost.createdAt || new Date().toISOString(),
                type: rawPost.type || "post",
                title: rawPost.title,
                image: rawPost.image,
                likeCount: rawPost.likeCount || 0,
                commentCount: rawPost.commentCount || 0,
                isLiked: postIsLiked,
                rating: rawPost.rating,
                location: rawPost.location,
              }
            }),
          )
        }
      } else {
        // For "all" tab - use the new implementation
        const fetchedPosts = await getFeedPosts("all", sortBy, nextPage)

        // Check if each post is liked by the current user
        if (user?.id) {
          newPosts = await Promise.all(
            fetchedPosts.map(async (post) => {
              const postIsLiked = await isLiked(post.id, String(user.id))
              return {
                ...post,
                isLiked: postIsLiked,
              }
            }),
          )
        } else {
          newPosts = fetchedPosts
        }
      }

      if (newPosts.length > 0) {
        setPosts((prev) => [...prev, ...newPosts])
        setPage(nextPage)
        setHasMore(newPosts.length === 10) // Assuming 10 posts per page
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error loading more posts:", error)
      toast.error("Failed to load more posts")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshFeed = async () => {
    setIsRefreshing(true)
    try {
      await loadPosts()
      toast.success("Feed refreshed")
    } catch (error) {
      console.error("Error refreshing feed:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const renderForYouContent = () => {
    if (!user) {
      return (
        <div className="p-6 bg-gray-50 rounded-lg text-center">
          <h3 className="text-lg font-medium mb-2">Sign in for personalized content</h3>
          <p className="text-gray-500 mb-4">
            Log in to see posts from people you follow and content tailored to your interests.
          </p>
          <Button asChild>
            <a href="/login">Sign In</a>
          </Button>
        </div>
      )
    }

    if (isLoading && posts.length === 0) {
      return (
        <div className="py-8 flex justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
        </div>
      )
    }

    if (posts.length === 0 && !isLoading) {
      return <EmptyFeed type="personalized" />
    }

    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    )
  }

  const renderAllContent = () => {
    if (isLoading && posts.length === 0) {
      return (
        <div className="py-8 flex justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
        </div>
      )
    }

    if (posts.length === 0 && !isLoading) {
      return <EmptyFeed type="all" />
    }

    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    )
  }

  const handlePostLikeUpdate = (postId: string, isLiked: boolean, likeCount: number) => {
    setPosts((prevPosts) => prevPosts.map((post) => (post.id === postId ? { ...post, isLiked, likeCount } : post)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between w-full">
            <TabsList>
              <TabsTrigger value="for-you">For You</TabsTrigger>
              <TabsTrigger value="all">All Posts</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshFeed}
                disabled={isRefreshing}
                className={isRefreshing ? "animate-spin" : ""}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort Posts</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                    <DropdownMenuRadioItem value="recent">Most Recent</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="popular">Most Popular</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="trending">Trending</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <TabsContent value="for-you" className="mt-4">
            {renderForYouContent()}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            {renderAllContent()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Loading indicator for infinite scroll */}
      {hasMore && (
        <div ref={ref} className="py-4 flex justify-center">
          {isLoading && (
            <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
          )}
        </div>
      )}
    </div>
  )
}
