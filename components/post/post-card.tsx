/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, Share2, MoreHorizontal, MapPin, Star, ChevronDown, ChevronUp } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LikeButton } from "@/components/like-button"
import { likePost, isLiked, sharePost } from "@/app/actions"
import type { Post } from "@/types/feed"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: Post
  onComment?: (id: string) => void
  className?: string
  user: {
    id: string
    name: string
    avatar?: string
  }
  onPostUpdated?: (updatedPost: Post) => void
}

export function PostCard({ post, user, onComment, className = "", onPostUpdated }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [currentPost, setCurrentPost] = useState<Post>(post)
  const [isLikedState, setIsLikedState] = useState<boolean>(post.isLiked || false)
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0)

  // Check if post is liked on mount
  useEffect(() => {
    const checkIfLiked = async () => {
      if (user?.id && currentPost.id) {
        try {
          const liked = await isLiked(currentPost.id, user.id)
          setIsLikedState(liked)
        } catch (error) {
          console.error("Error checking if post is liked:", error)
        }
      }
    }

    checkIfLiked()
  }, [currentPost.id, user?.id])

  // Update local state when post prop changes
  useEffect(() => {
    setCurrentPost(post)
    setIsLikedState(post.isLiked || false)
    setLikeCount(post.likeCount || 0)
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
    if (onComment) {
      onComment(currentPost.id)
    }
  }

  return (
    <Card className={cn("overflow-hidden shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4 pt-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <Link href={`/profile/${currentPost.author.id}`} className="mr-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={currentPost.author.avatar || "/placeholder.svg"} alt={currentPost.author.name} />
                <AvatarFallback>{getInitials(currentPost.author.name)}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <div className="flex items-center">
                <Link href={`/profile/${currentPost.author.id}`} className="font-medium hover:underline">
                  {currentPost.author.name}
                </Link>
                {currentPost.type !== "post" && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {currentPost.type === "review" ? "Review" : "Recommendation"}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex items-center">
                <span>{formatDistanceToNow(new Date(currentPost.createdAt), { addSuffix: true })}</span>
                {currentPost.status === "draft" && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Draft
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Save Post</DropdownMenuItem>
              <DropdownMenuItem onClick={copyLinkToClipboard}>Copy Link</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Report</DropdownMenuItem>
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
          <p className="text-sm sm:text-base">{displayContent}</p>
          {isLongContent && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-muted-foreground hover:text-foreground"
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

        {/* Post image (if available) */}
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

      <CardFooter className="px-4 py-3 border-t flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-8">
          <LikeButton isLiked={isLikedState} likeCount={likeCount} onLike={handleLike} />

          {/* Comment button with count */}
          <div className="flex flex-col items-center">
            <Link href={`/post/${currentPost.id}`}>
              <button
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-blue-50 active:scale-90"
                onClick={handleComment}
                aria-label="View comments"
              >
                <MessageCircle size={24} className="text-gray-500" />
              </button>
            </Link>
            <div className="flex flex-col items-center mt-1">
              <span className="text-xs font-medium">
                {currentPost.commentCount !== undefined ? currentPost.commentCount : 0}
              </span>
              <span className="text-xs text-muted-foreground">Comments</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:inline">Share</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
