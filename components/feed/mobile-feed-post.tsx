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
      className={`relative overflow-hidden border-none shadow-none bg-black/95 h-full ${className}`}
      onClick={handlePostClick}
    >
      {/* Media Container */}
      {post.image && post.image !== "" && !imageError ? (
        <div className="absolute inset-0 bg-black">
          <Image
            src={post.image}
            alt={post.title || "Post image"}
            fill
            className="object-cover object-center transition-opacity duration-500"
            loading="lazy"
            sizes="100vw"
            onLoadingComplete={() => setIsLoadingImage(false)}
            onError={() => {
              setIsLoadingImage(false)
              setImageError(true)
            }}
          />
          {isLoadingImage && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-2 border-white/40 rounded-full animate-pulse" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
      )}

      {/* Content Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90">
        {/* Location Tag - Top Right */}
        {post.location && (
          <div className="absolute top-4 right-4">
            <Badge 
              variant="outline" 
              className="bg-black/40 backdrop-blur-sm text-white/90 border-white/20 flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <MapPin className="h-3.5 w-3.5" />
              {typeof post.location === 'string' ? post.location : post.location.name}
            </Badge>
          </div>
        )}

        {/* Bottom Content Container */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-24">
          {/* Author Info */}
          <Link 
            href={`/profile/${post.author.id}`} 
            className="flex items-start gap-3 mb-4 group"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-10 w-10 ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
              <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
              <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white group-hover:text-[#FF6B6B] transition-colors">
                  {post.author.name}
                </span>
                {post.type !== "post" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-white/90 border-white/20 bg-white/10 backdrop-blur-sm">
                    {post.type === "review" ? "Review" : "Tip"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-white/90 line-clamp-3 mt-2 leading-relaxed">
                {displayContent}
              </p>
            </div>
          </Link>

          {/* Action Buttons - Bottom Bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-6">
              {/* Like Button */}
              <button
                className="group flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  handleLike(e)
                }}
              >
                <div className={`p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-[#FF6B6B]/20 transition-all transform group-active:scale-90 ${
                  isLiked ? 'text-[#FF6B6B]' : 'text-white'
                }`}>
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current animate-like' : ''}`} />
                </div>
                <span className="text-sm font-medium text-white/90">{likeCount}</span>
              </button>

              {/* Comment Button */}
              <button
                className="group flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  handleComment(e)
                }}
              >
                <div className="p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-all transform group-active:scale-90">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">{post.commentCount || 0}</span>
              </button>

              {/* Share Button */}
              <button
                className="group flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShare(e)
                }}
              >
                <div className="p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-all transform group-active:scale-90">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">{shareCount}</span>
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
              <div className={`p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-all transform group-active:scale-90 ${
                isSaved ? 'text-yellow-400' : 'text-white'
              }`}>
                <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current animate-save' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
})

export default MobileFeedPost 