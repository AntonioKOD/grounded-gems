/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, memo, useCallback, useEffect } from "react"
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
} from "lucide-react"
import { toast } from "sonner"

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { likePost, sharePost } from "@/app/actions"
import type { Post } from "@/types/feed"

interface FeedPostProps {
  post: Post
  className?: string
  showInteractions?: boolean
}

export const FeedPost = memo(function FeedPost({ post, className = "", showInteractions = true }: FeedPostProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  const [expanded, setExpanded] = useState(false)
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [isSharing, setIsSharing] = useState(false)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoadingImage, setIsLoadingImage] = useState(true)

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (err) {
        console.error("Error fetching current user:", err)
      }
    }

    fetchCurrentUser()
  }, [])

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
    <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4 pt-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <Link href={`/profile/${post.author.id}`} className="mr-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
                <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <div className="flex items-center">
                <Link href={`/profile/${post.author.id}`} className="font-medium hover:underline">
                  {post.author.name}
                </Link>
                {post.type !== "post" && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {post.type === "review" ? "Review" : "Recommendation"}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex items-center">
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                {post.status === "draft" && (
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
              <DropdownMenuItem onClick={handleSave}>{isSaved ? "Unsave Post" : "Save Post"}</DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>Copy Link</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post title (if available) */}
        {post.title && <h3 className="text-lg font-semibold mb-2">{post.title}</h3>}

        {/* Location info (for reviews and recommendations) */}
        {post.location && (
          <div className="flex items-center mb-2 text-sm">
            <MapPin className="h-4 w-4 mr-1 text-[#FF6B6B]" />
            <Link href={`/locations/${post.location.id}`} className="hover:underline">
              {post.location.name}
            </Link>

            {/* Rating (for reviews) */}
            {post.type === "review" && post.rating && (
              <div className="ml-2 flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < post.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
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
        {post.image && post.image !== "" ? (
          <div className="mt-3 mb-2 rounded-md overflow-hidden relative">
            <div className="aspect-video relative">
              {isLoadingImage && (
                <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <Image
                unoptimized={true}
                src={post.image || "/placeholder.svg"}
                alt={post.title || "Post image"}
                fill
                className={`object-cover transition-opacity duration-300 ${isLoadingImage ? "opacity-0" : "opacity-100"}`}
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoadingComplete={() => setIsLoadingImage(false)}
                onError={() => setIsLoadingImage(false)}
              />
            </div>
          </div>
        ) : null}
      </CardContent>

      {showInteractions && (
        <CardFooter className="px-4 py-3 border-t flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center gap-1 ${isLiked ? "text-red-500" : ""}`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500" : ""}`} />
              <span>{likeCount || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={handleComment}>
              <MessageCircle className="h-4 w-4" />
              <span>{post.commentCount || 0}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-2 ${isSaved ? "text-yellow-500" : ""}`}
                    onClick={handleSave}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? "fill-yellow-500" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSaved ? "Saved" : "Save for later"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleShare}
              disabled={isSharing}
            >
              <Share2 className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:inline" onClick={handleShare}>Share</span>
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
})

export default FeedPost
