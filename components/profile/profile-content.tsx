/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { getFeedPostsByUser, likePost, isLiked, sharePost } from "@/app/actions"
import { toast } from "sonner"
import type { Post } from "@/types/feed"
import { Camera } from "lucide-react"
import CollapsiblePostForm from "@/components/post/collapsible-post-form"
import { PostCard } from "@/components/post/post-card"

interface ProfileContentProps {
  profileUser: any
  currentUser: any
  isCurrentUser: boolean
}

export default function ProfileContent({ profileUser, currentUser, isCurrentUser }: ProfileContentProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (profileUser?.id) {
      loadUserPosts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUser?.id, currentUser?.id])

  const loadUserPosts = async () => {
    if (!profileUser?.id) return

    setIsLoading(true)
    try {
      console.log(`Loading posts for user ID: ${profileUser.id}`)
      // Use the server action to fetch user posts
      const fetchedPosts = await getFeedPostsByUser(profileUser.id)
      console.log(`Fetched ${fetchedPosts.length} posts`)

      // Transform the fetched posts to match the Post type
      const transformedPosts: Post[] = fetchedPosts.map((post: any) => ({
        id: post.id,
        author: {
          id: post.author?.id || profileUser.id,
          name: post.author?.name || profileUser.name || "User",
          avatar: post.author?.avatar || profileUser.profileImage?.url || "/placeholder.svg",
        },
        title: post.title || "",
        content: post.content || "",
        createdAt: post.createdAt || new Date().toISOString(),
        image: post.image || post.featuredImage?.url || null,
        likeCount: post.likeCount || post.likes?.length || 0,
        commentCount: post.commentCount || post.comments?.length || 0,
        shareCount: post.shareCount || 0,
        isLiked: false,
        type: post.type || "post",
        rating: post.rating || null,
        location: post.location || (post.locationName ? { id: "loc_1", name: post.locationName } : undefined),
      }))

      // Check if each post is liked by the current user
      if (currentUser && transformedPosts.length > 0) {
        const postsWithLikeStatus = await Promise.all(
          transformedPosts.map(async (post) => {
            try {
              const liked = await isLiked(post.id, currentUser.id)
              return { ...post, isLiked: liked }
            } catch (error) {
              console.error(`Error checking like status for post ${post.id}:`, error)
              return post
            }
          }),
        )
        setPosts(postsWithLikeStatus)
      } else {
        setPosts(transformedPosts)
      }
    } catch (error) {
      console.error("Error loading user posts:", error)
      toast.error("Failed to load user posts")
      setPosts([]) // Set empty array on error
    } finally {
      setIsLoading(false)
    }
  }

  const refreshPosts = () => {
    loadUserPosts()
  }

  // Handle like action
  const handleLike = async (postId: string) => {
    if (!currentUser) {
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
      await likePost(postId, !isCurrentlyLiked, currentUser.id)
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

  // Handle comment action
  const handleComment = (postId: string) => {
    // Placeholder for comment functionality
    toast.info("Comment feature coming soon")
  }

  // Handle share action
  const handleShare = async (postId: string) => {
    if (!currentUser) {
      toast.error("Please log in to share posts")
      return
    }

    try {
      // Find the post
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      // Copy link to clipboard
      const postUrl = `${window.location.origin}/post/${post.id}`
      await navigator.clipboard.writeText(postUrl)

      // Call server action
      await sharePost(post.id, currentUser.id)

      toast.success("Link copied to clipboard")
    } catch (error) {
      console.error("Error sharing post:", error)
      toast.error("Failed to share post")
    }
  }

  if (isLoading) {
    return (
      <div className="mt-6 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <Tabs defaultValue="posts">
        <TabsContent value="posts" className="mt-0 space-y-4">
          {isCurrentUser && currentUser && (
            <CollapsiblePostForm user={currentUser} onSuccess={refreshPosts} className="mb-6" />
          )}
          {posts.filter((post) => post.type === "post").length > 0 ? (
            posts
              .filter((post) => post.type === "post")
              .map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={currentUser}
                  onComment={handleComment}
                />
              ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {isCurrentUser
                    ? "You haven't shared any posts yet. Create your first post above!"
                    : "This user hasn't shared any posts yet. Check back later!"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Other tabs remain the same */}
      </Tabs>
    </div>
  )
}
