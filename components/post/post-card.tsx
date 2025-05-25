/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { MessageCircle, Share2, MoreHorizontal, MapPin, Star, ChevronDown, ChevronUp, Bookmark } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { RelativeTime } from "@/components/ui/relative-time"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LikeButton } from "@/components/like-button"
import { CommentSystem } from "@/components/post/comment-system"
import { likePost, sharePost } from "@/app/actions"
import type { Post } from "@/types/feed"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { savePostAsync, toggleSaveOptimistic } from "@/lib/features/posts/postsSlice"

interface PostCardProps {
  post: Post
  className?: string
  user: {
    id: string
    name: string
    avatar?: string
  }
  onPostUpdated?: (updatedPost: Post) => void
}

export function PostCard({ post, user, className = "", onPostUpdated }: PostCardProps) {
  const dispatch = useAppDispatch()
  const { savedPosts, loadingSaves } = useAppSelector((state) => state.posts)
  
  const [expanded, setExpanded] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [currentPost, setCurrentPost] = useState<Post>(post)
  const [isLikedState, setIsLikedState] = useState<boolean>(post.isLiked || false)
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0)
  const [saveCount, setSaveCount] = useState<number>(post.saveCount || 0)
  
  // Get saved state from Redux
  const isSaved = savedPosts.includes(post.id)
  const isSaving = loadingSaves.includes(post.id)

  // Check if post is liked on mount
  useEffect(() => {
    const checkIfLiked = async () => {
      if (user?.id && currentPost.id) {
        try {
          // Instead of checking isLiked separately, we'll use the post's isLiked property
          setIsLikedState(currentPost.isLiked || false)
        } catch (error) {
          console.error("Error checking if post is liked:", error)
        }
      }
    }

    checkIfLiked()
  }, [currentPost.id, user?.id, currentPost.isLiked])

  // Update local state when post prop changes
  useEffect(() => {
    setCurrentPost(post)
    setIsLikedState(post.isLiked || false)
    setLikeCount(post.likeCount || 0)
    setSaveCount(post.saveCount || 0)
  }, [post])

  // Determine if content should be truncated
  const isLongContent = currentPost.content?.length > 280
  const displayContent =
    isLongContent && !expanded ? `${currentPost.content.substring(0, 280)}...` : currentPost.content

  const copyLinkToClipboard = () => {
    const link = `${window.location.origin}/post/${currentPost.id}`
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast.success("Link copied to clipboard")
      })
      .catch((err) => {
        console.error("Failed to copy link: ", err)
        toast.error("Failed to copy link")
      })
  }

  const handleLike = async () => {
    if (!user?.id) {
      toast.error("Please log in to like posts")
      return
    }

    try {
      // Optimistic update
      const newIsLiked = !isLikedState
      const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1

      setIsLikedState(newIsLiked)
      setLikeCount(newLikeCount)

      // Update the post object
      const updatedPost = {
        ...currentPost,
        isLiked: newIsLiked,
        likeCount: newLikeCount,
      }

      setCurrentPost(updatedPost)

      // Notify parent component if needed
      if (onPostUpdated) {
        onPostUpdated(updatedPost)
      }

      // Call server action
      await likePost(currentPost.id, newIsLiked, user.id)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error liking post:", error)
      toast.error("Failed to like post. Please try again.")

      // Revert optimistic update on error
      setIsLikedState(!isLikedState)
      setLikeCount(isLikedState ? likeCount + 1 : likeCount - 1)

      // Update the post object
      const revertedPost = {
        ...currentPost,
        isLiked: !isLikedState,
        likeCount: isLikedState ? likeCount + 1 : likeCount - 1,
      }

      setCurrentPost(revertedPost)

      // Notify parent component if needed
      if (onPostUpdated) {
        onPostUpdated(revertedPost)
      }
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Please log in to save posts")
      return
    }

    try {
      const newIsSaved = !isSaved
      
      // Optimistic update in Redux
      dispatch(toggleSaveOptimistic({ postId: currentPost.id, isSaved: newIsSaved }))

      // Update local save count optimistically
      setSaveCount(prev => newIsSaved ? prev + 1 : prev - 1)

      // Update the post object
      const updatedPost = {
        ...currentPost,
        isSaved: newIsSaved,
        saveCount: newIsSaved ? saveCount + 1 : saveCount - 1,
      }

      setCurrentPost(updatedPost)

      // Notify parent component if needed
      if (onPostUpdated) {
        onPostUpdated(updatedPost)
      }

      // Call Redux async action
      const result = await dispatch(savePostAsync({
        postId: currentPost.id,
        shouldSave: newIsSaved,
        userId: user.id
      })).unwrap()

      // Update save count with server response
      if (result.saveCount !== undefined) {
        setSaveCount(result.saveCount)
        const finalPost = {
          ...updatedPost,
          saveCount: result.saveCount,
        }
        setCurrentPost(finalPost)
        if (onPostUpdated) {
          onPostUpdated(finalPost)
        }
      }

      toast.success(newIsSaved ? "Post saved" : "Post removed from saved items")

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error saving post:", error)
      toast.error("Failed to save post. Please try again.")
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handleShare = async () => {
    if (isSharing || !currentPost) return

    setIsSharing(true)
    try {
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: currentPost.title || `Post by ${currentPost.author.name}`,
          text: currentPost.content.substring(0, 100) + (currentPost.content.length > 100 ? "..." : ""),
          url: `${window.location.origin}/post/${currentPost.id}`,
        })

        // Record share
        if (user?.id) {
          await sharePost(currentPost.id, user.id)
        }
        toast.success("Post shared successfully")
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${window.location.origin}/post/${currentPost.id}`)
        toast.success("Link copied to clipboard")

        // Record share
        if (user?.id) {
          await sharePost(currentPost.id, user.id)
        }
      }

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing post:", error)
        toast.error("Failed to share post")
      }
    } finally {
      setIsSharing(false)
    }
  }

  const handleComment = () => {
    // Just a placeholder - the CommentSystem below handles all comment functionality
    // No navigation needed since comments are displayed inline
  }

  return (
    <Card className={cn(
      "overflow-hidden bg-black/95 hover:bg-black/90 transition-all duration-300",
      "border-none shadow-none",
      className
    )}>
      <CardContent className="p-4 pt-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <Link href={`/profile/${currentPost.author.id}`} className="mr-3 group">
              <Avatar className="h-10 w-10 ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
                <AvatarImage src={currentPost.author.avatar || "/placeholder.svg"} alt={currentPost.author.name} />
                <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                  {getInitials(currentPost.author.name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <div className="flex items-center">
                <Link 
                  href={`/profile/${currentPost.author.id}`} 
                  className="font-medium text-white group-hover:text-[#FF6B6B] transition-colors"
                >
                  {currentPost.author.name}
                </Link>
                {currentPost.type !== "post" && (
                  <Badge variant="outline" className="ml-2 text-xs text-white/90 border-white/20 bg-white/10">
                    {currentPost.type === "review" ? "Review" : "Recommendation"}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-white/60">
                <RelativeTime date={currentPost.createdAt} />
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/95 border-white/20">
              <DropdownMenuItem onClick={handleSave} className="text-white/90 hover:text-white focus:text-white">
                {isSaved ? "Remove from Saved" : "Save Post"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLinkToClipboard} className="text-white/90 hover:text-white focus:text-white">Copy Link</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem className="text-red-400 hover:text-red-300 focus:text-red-300">Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post title (if available) */}
        {currentPost.title && <h3 className="text-lg font-semibold mb-2">{currentPost.title}</h3>}

        {/* Location info (for reviews and recommendations) */}
        {currentPost.location && (
          <div className="flex items-center mb-2 text-sm">
            <MapPin className="h-4 w-4 mr-1 text-[#FF6B6B]" />
            <Link href={`map?locationId=${currentPost.location?.id}`} className="hover:underline">
              {currentPost.location.name}
            </Link>

            {/* Rating (for reviews) */}
            {currentPost.type === "review" && currentPost.rating && (
              <div className="ml-2 flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < currentPost.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post content */}
        <div className="mb-3 whitespace-pre-line">
          <p className="text-sm sm:text-base text-white/90">{displayContent}</p>
          {isLongContent && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-[#FF6B6B] hover:text-[#FF6B6B]/80"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <span className="flex items-center">
                  Show less <ChevronUp className="ml-1 h-4 w-4" />
                </span>
              ) : (
                <span className="flex items-center">
                  Read more <ChevronDown className="ml-1 h-4 w-4" />
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Post image */}
        {currentPost.image && (
          <div className="mt-3 mb-2 rounded-md overflow-hidden relative">
            <div className="aspect-video relative">
              <Image
                unoptimized={true}
                src={currentPost.image || "/placeholder.svg"}
                alt={currentPost.title || "Post image"}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 py-3 border-t border-white/10 flex items-center justify-between bg-black/95">
        <div className="flex items-center gap-8">
          <LikeButton isLiked={isLikedState} likeCount={likeCount} onLike={handleLike} />

          {/* Comment button - handled by CommentSystem */}
          <div className="flex flex-col items-center">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-white/10 active:scale-90"
              onClick={handleComment}
              aria-label="View comments"
            >
              <MessageCircle size={24} className="text-white/80" />
            </button>
            <div className="flex flex-col items-center mt-1">
              <span className="text-xs font-medium text-white/90">
                {currentPost.commentCount !== undefined ? currentPost.commentCount : 0}
              </span>
              <span className="text-xs text-white/60">Comments</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 text-white/80 hover:text-white hover:bg-white/10" 
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Share</span>
          </Button>

          {/* Save Button with Count */}
          <button
            className="group flex items-center gap-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            <div className={`p-1.5 rounded-full bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-all transform group-active:scale-90 ${
              isSaved ? 'text-[#FFE66D]' : 'text-white/80'
            }`}>
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current animate-save' : ''}`} />
            </div>
            <span className="text-xs font-medium text-white/90">{saveCount}</span>
          </button>
        </div>
      </CardFooter>

      {/* Comments System */}
      <CommentSystem 
        postId={currentPost.id}
        user={user}
        className="border-t border-white/10"
      />
    </Card>
  )
}
