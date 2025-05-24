/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, memo, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Heart,
  Bookmark,
  ImageIcon,
  Flag,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { likePost, sharePost } from "@/app/actions"
import type { Post } from "@/types/feed"

interface FeedPostProps {
  post: Post
  user: any // Accept user from parent component
  className?: string
  showInteractions?: boolean
}

export const FeedPost = memo(function FeedPost({ post, user, className = "", showInteractions = true }: FeedPostProps) {
  const [expanded, setExpanded] = useState(false)
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [isSharing, setIsSharing] = useState(false)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Determine if content should be truncated
  const isLongContent = post.content.length > 280
  const displayContent = isLongContent && !expanded ? `${post.content.substring(0, 280)}...` : post.content

  // Handle like action
  const handleLike = useCallback(async () => {
    if (!user) {
      toast.error("Please log in to like posts")
      return
    }

    try {
      // Optimistic update
      setIsLiked((prev) => !prev)
      setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))

      // Call server action
      await likePost(post.id, !isLiked, user.id)
    } catch (error) {
      console.error("Error liking post:", error)
      toast.error("Failed to like post")

      // Revert optimistic update on error
      setIsLiked((prev) => !prev)
      setLikeCount((prev) => (isLiked ? prev + 1 : prev - 1))
    }
  }, [isLiked, post.id, user])

  // Handle share action
  const handleShare = useCallback(async () => {
    try {
      setIsSharing(true)

      // Copy link to clipboard
      const postUrl = `${window.location.origin}/posts/${post.id}`
      await navigator.clipboard.writeText(postUrl)

      // Update local state optimistically
      setShareCount((prev) => prev + 1)

      // Call server action if user is logged in
      if (user) {
        await sharePost(post.id, user.id)
      }

      toast.success("Link copied to clipboard")
    } catch (error) {
      console.error("Error sharing post:", error)
      toast.error("Failed to share post")
      // Revert optimistic update
      setShareCount(post.shareCount || 0)
    } finally {
      setIsSharing(false)
    }
  }, [post.id, user])

  // Handle save action
  const handleSave = useCallback(() => {
    setIsSaved((prev) => !prev)
    toast.success(isSaved ? "Post removed from saved items" : "Post saved for later")
  }, [isSaved])

  // Handle comment action
  const handleComment = useCallback(() => {
    toast.info("Comment feature coming soon")
  }, [])

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <Card className={`overflow-hidden bg-white hover:shadow-lg transition-all duration-300 ${className}`}>
      {/* Post Header */}
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Link 
            href={`/profile/${post.author.id}`}
            className="group flex items-center gap-3 hover:opacity-90 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-10 w-10 ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
              <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
              <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors">
                  {post.author.name}
                </span>
                {post.type !== "post" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-700 border-gray-200 bg-gray-50">
                    {post.type === "review" ? "Review" : "Tip"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
            </div>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReport}>
              <Flag className="mr-2 h-4 w-4" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Post Content */}
      <CardContent className="p-4">
        {/* Location Tag */}
        {post.location && (
          <Link 
            href={`/locations/${typeof post.location === 'string' ? post.location : post.location.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#FF6B6B] mb-3 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MapPin className="h-3.5 w-3.5" />
            {typeof post.location === 'string' ? post.location : post.location.name}
          </Link>
        )}

        {/* Post Text */}
        <p className="text-gray-900 whitespace-pre-wrap mb-4">{post.content}</p>

        {/* Post Media */}
        {post.image && !imageError && (
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 mb-4">
            <Image
              src={post.image}
              alt={post.title || "Post image"}
              fill
              className="object-cover transition-opacity duration-500"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onLoadingComplete={() => setIsLoadingImage(false)}
              onError={() => {
                setIsLoadingImage(false)
                setImageError(true)
              }}
            />
            {isLoadingImage && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 border-2 border-gray-200 rounded-full animate-ping" />
                  <div className="absolute inset-0 border-2 border-gray-300 rounded-full animate-pulse" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-6">
            {/* Like Button */}
            <button
              className="group flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation()
                handleLike(e)
              }}
            >
              <div className={`p-2 rounded-full group-hover:bg-[#FF6B6B]/10 transition-all transform group-active:scale-90 ${
                isLiked ? 'text-[#FF6B6B]' : 'text-gray-600'
              }`}>
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current animate-like' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-600">{likeCount}</span>
            </button>

            {/* Comment Button */}
            <button
              className="group flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation()
                handleComment(e)
              }}
            >
              <div className="p-2 rounded-full group-hover:bg-gray-100 transition-all transform group-active:scale-90">
                <MessageCircle className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">{post.commentCount || 0}</span>
            </button>

            {/* Share Button */}
            <button
              className="group flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation()
                handleShare(e)
              }}
            >
              <div className="p-2 rounded-full group-hover:bg-gray-100 transition-all transform group-active:scale-90">
                <Share2 className="h-5 w-5 text-gray-600" />
              </div>
            </button>
          </div>

          {/* Save Button */}
          <button
            className="group"
            onClick={(e) => {
              e.stopPropagation()
              handleSave(e)
            }}
          >
            <div className={`p-2 rounded-full group-hover:bg-gray-100 transition-all transform group-active:scale-90 ${
              isSaved ? 'text-yellow-400' : 'text-gray-600'
            }`}>
              <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current animate-save' : ''}`} />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  )
})

export default FeedPost
