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
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"

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
import type { Post } from "@/types/feed"

interface MobileFeedPostProps {
  post: Post
  user: any
  onPostUpdated?: (post: Post) => void
  className?: string
}

const MobileFeedPost = memo(function MobileFeedPost({ 
  post, 
  user, 
  onPostUpdated, 
  className = "" 
}: MobileFeedPostProps) {
  const [expanded, setExpanded] = useState(false)
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [isSharing, setIsSharing] = useState(false)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isLiking, setIsLiking] = useState(false)

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Safe function to use browser APIs only when mounted
  const safeVibrate = useCallback((duration: number) => {
    if (isMounted && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(duration)
    }
  }, [isMounted])

  // Determine if content should be truncated
  const isLongContent = post.content.length > 200
  const displayContent = isLongContent && !expanded ? `${post.content.substring(0, 200)}...` : post.content

  // Handle like action with safe server action handling
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || isLiking) {
      if (!user) {
        toast.error("Please log in to like posts")
      }
      return
    }

    safeVibrate(50)
    setIsLiking(true)
    const previousLiked = isLiked
    const previousCount = likeCount

    try {
      // Optimistic update
      setIsLiked(!previousLiked)
      setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1)

      // Import and call server action dynamically to avoid stale references
      const { likePost } = await import("@/app/actions")
      await likePost(post.id, !previousLiked, user.id)
      
      // Update parent if needed
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isLiked: !previousLiked,
          likeCount: previousLiked ? (post.likeCount || 0) - 1 : (post.likeCount || 0) + 1
        })
      }
    } catch (error) {
      console.error("Error liking post:", error)
      toast.error("Failed to like post")

      // Revert optimistic update on error
      setIsLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setIsLiking(false)
    }
  }, [isLiked, likeCount, post, user, onPostUpdated, isLiking, safeVibrate])

  // Handle share action
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    safeVibrate(50)
    
    try {
      setIsSharing(true)

      // Use Web Share API if available and mounted
      if (isMounted && typeof navigator !== 'undefined' && navigator.share && typeof window !== 'undefined') {
        await navigator.share({
          title: post.title || `Post by ${post.author.name}`,
          text: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
          url: `${window.location.origin}/post/${post.id}`
        })
      } else if (isMounted && typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined') {
        // Copy link to clipboard
        const postUrl = `${window.location.origin}/post/${post.id}`
        await navigator.clipboard.writeText(postUrl)
        toast.success("Link copied to clipboard")
      } else {
        toast.success("Link copied to clipboard")
      }

      // Update local state optimistically
      setShareCount((prev) => prev + 1)

      // Call server action if user is logged in
      if (user) {
        try {
          const { sharePost } = await import("@/app/actions")
          await sharePost(post.id, user.id)
        } catch (error) {
          console.error("Error updating share count:", error)
          // Don't show error to user as the share functionality worked
        }
      }
    } catch (error) {
      // Only show error if it's not an abort error (user cancelled sharing)
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing post:", error)
        toast.error("Failed to share post")
      }
    } finally {
      setIsSharing(false)
    }
  }, [post, user, isMounted, safeVibrate])

  // Handle save action
  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    safeVibrate(50)
    setIsSaved((prev) => !prev)
    toast.success(isSaved ? "Post removed from saved items" : "Post saved for later")
  }, [isSaved, safeVibrate])

  // Handle comment action
  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    toast.info("Comment feature coming soon")
  }, [])
  
  // Handle post click to navigate to detail
  const handlePostClick = useCallback(() => {
    safeVibrate(30)
    
    // Navigate to post detail page
    if (typeof window !== 'undefined') {
      window.location.href = `/post/${post.id}`
    }
  }, [post.id, safeVibrate])

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
    <Card 
      className={`overflow-hidden shadow-sm border-gray-100 active:scale-[0.995] active:shadow-none transition-all duration-200 ${className}`}
      onClick={handlePostClick}
    >
      <CardContent className="p-4">
        {/* Author info */}
        <div className="flex justify-between items-start mb-3">
          <Link 
            href={`/profile/${post.author.id}`} 
            className="flex items-center group"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-9 w-9 border group-active:scale-95 transition-transform">
              <AvatarImage 
                src={post.author.avatar || "/placeholder.svg"} 
                alt={post.author.name} 
              />
              <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
            </Avatar>
            
            <div className="ml-2">
              <div className="flex items-center">
                <span className="font-medium text-sm group-hover:text-[#FF6B6B] transition-colors">
                  {post.author.name}
                </span>
                {post.type !== "post" && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                    {post.type === "review" ? "Review" : "Tip"}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </div>
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleSave}>
                <Bookmark className="mr-2 h-4 w-4" />
                {isSaved ? "Remove from saved" : "Save for later"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <ExternalLink className="mr-2 h-4 w-4" />
                View full post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post title (if available) */}
        {post.title && <h3 className="text-base font-semibold mb-2">{post.title}</h3>}

        {/* Location info (for reviews and recommendations) */}
        {post.location && (
          <Link 
            href={`/locations/${post.location.id}`}
            className="flex items-center mb-2 text-sm bg-gray-50 px-2 py-1 rounded-md w-fit active:bg-gray-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MapPin className="h-3.5 w-3.5 mr-1 text-[#FF6B6B]" />
            <span className="text-gray-700 font-medium">{post.location.name}</span>

            {/* Rating (for reviews) */}
            {post.type === "review" && post.rating && (
              <div className="ml-2 flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < post.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
            )}
          </Link>
        )}

        {/* Post content */}
        <div className="mb-3 whitespace-pre-line">
          <p className="text-sm text-gray-700 leading-relaxed">{displayContent}</p>
          {isLongContent && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-muted-foreground hover:text-[#FF6B6B]"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
                safeVibrate(30)
              }}
            >
              {expanded ? (
                <span className="flex items-center text-xs">
                  Show less <ChevronUp className="ml-1 h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="flex items-center text-xs">
                  Read more <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Post image (if available) */}
        {post.image && post.image !== "" && !imageError ? (
          <div 
            className="mt-3 mb-2 rounded-lg overflow-hidden relative bg-gray-100"
            onClick={(e) => {
              // Prevent navigation if clicking on image
              e.stopPropagation()
              
              // Open image in fullscreen or modal
              toast.info("Full image view coming soon")
            }}
          >
            <div className="aspect-video relative">
              {isLoadingImage && (
                <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <Image
                src={post.image}
                alt={post.title || "Post image"}
                fill
                className={`object-cover transition-opacity duration-300 ${isLoadingImage ? "opacity-0" : "opacity-100"}`}
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoadingComplete={() => setIsLoadingImage(false)}
                onError={() => {
                  setIsLoadingImage(false)
                  setImageError(true)
                }}
              />
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="px-4 py-2 border-t flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center gap-1 h-9 px-2 rounded-full ${isLiked ? "text-red-500" : "text-gray-700"}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart 
              className={`h-4 w-4 transition-all duration-200 ${
                isLiked ? "fill-red-500 scale-110" : ""
              } ${isLiking ? "animate-pulse" : ""}`} 
            />
            <span className="text-xs font-medium">{likeCount || 0}</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 h-9 px-2 rounded-full text-gray-700"
            onClick={handleComment}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-medium">{post.commentCount || 0}</span>
          </Button>
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className={`p-2 rounded-full ${isSaved ? "text-yellow-500" : "text-gray-700"}`}
            onClick={handleSave}
          >
            <Bookmark className={`h-4 w-4 transition-all duration-200 ${isSaved ? "fill-yellow-500" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full text-gray-700"
            onClick={handleShare}
            disabled={isSharing}
          >
            <Share2 className={`h-4 w-4 ${isSharing ? "animate-pulse" : ""}`} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
})

export default MobileFeedPost 