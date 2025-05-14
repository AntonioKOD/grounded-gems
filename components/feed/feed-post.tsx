"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, Share2, MoreHorizontal, MapPin, Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Post } from "@/types/feed"
import { likePost, sharePost, isLiked } from "@/app/actions"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FeedPostProps {
  post: Post
}

export default function FeedPost({ post }: FeedPostProps) {
  const [liked, setLiked] = useState(post.isLiked || false)
  const [isLiking, setIsLiking] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [likeCount, setLikeCount] = useState(post.likes || post.likeCount || 0)

  const handleLike = async () => {
    if (isLiking) return

    setIsLiking(true)
    try {
      const response = await fetch("/api/users/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const currentUser = await response.json()
      const user = currentUser?.user
      setUser(user)
      const newLiked = !liked

      // Optimistically update UI
      setLiked(newLiked)
      setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1))

      // Call the server action
      await likePost(post.id, newLiked, user?.id)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error liking post:", error)
      toast.error("Failed to like post")

      // Revert optimistic update on error
      setLiked(!liked)
      setLikeCount((prev) => (liked ? prev + 1 : prev - 1))
    } finally {
      setIsLiking(false)
    }
  }

  const handleShare = async () => {
    if (isSharing) return

    setIsSharing(true)
    try {
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: post.title || `Post by ${post.author.name}`,
          text: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
          url: `${window.location.origin}/post/${post.id}`,
        })

        // Record share
        await sharePost(post.id, user?.id as string)
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
        toast.success("Link copied to clipboard")

        // Record share
        await sharePost(post.id, user?.id as string)
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

  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
        const currentUser = await response.json()
        const user = currentUser?.user

        if (user) {
          setUser(user)
          const liked = await isLiked(post.id, user.id)
          setLiked(liked)
        }
      } catch (error) {
        console.error("Error checking if post is liked:", error)
      }
    }

    // Initialize like count from either post.likes or post.likeCount
    setLikeCount(post.likes || post.likeCount || 0)

    checkIfLiked()
  }, [post])

  const getPostTypeContent = () => {
    switch (post.type) {
      case "review":
        return (
          <div className="mt-2 bg-gray-50 p-3 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <Link href={`/location/${post.location?.id}`} className="text-sm font-medium hover:underline">
                {post.location?.name}
              </Link>
              <div className="flex items-center ml-auto">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < (post.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300",
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-700">{post.content}</p>
          </div>
        )

      case "recommendation":
        return (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Recommendation
              </Badge>
            </div>
            <p className="text-sm text-gray-700">{post.content}</p>
            {post.location && (
              <Link
                href={`/location/${post.location.id}`}
                className="mt-2 flex items-center text-sm text-blue-600 hover:underline"
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {post.location.name}
              </Link>
            )}
          </div>
        )

      default:
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-700">{post.content}</p>
          </div>
        )
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Post header with author info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.id}`}>
              <Avatar className="h-10 w-10 border">
                {post.author.avatar ? (
                  <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
                ) : (
                  <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                    {post.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </Link>
            <div>
              <Link href={`/profile/${post.author.id}`} className="font-medium hover:underline">
                {post.author.name}
              </Link>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Save post</DropdownMenuItem>
              <DropdownMenuItem>Hide post</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post content */}
        {post.title && <h3 className="font-medium mt-2">{post.title}</h3>}

        {getPostTypeContent()}

        {/* Post image if available */}
        {post.image && (
          <div className="mt-3 relative rounded-md overflow-hidden">
            <Image
              src={post.image || "/placeholder.svg"}
              alt={post.title || "Post image"}
              width={600}
              height={400}
              className="w-full object-cover max-h-[400px]"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 py-3 border-t bg-gray-50 flex justify-between">
        <div className="flex items-center gap-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={cn("flex items-center gap-1 px-2", liked && "text-red-500")}
                  disabled={isLiking}
                >
                  <Heart className={cn("h-4 w-4", liked && "fill-red-500")} />
                  <span>{likeCount > 0 ? likeCount : ""}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{liked ? "Unlike" : "Like"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/post/${post.id}`}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{(post.commentCount ?? 0) > 0 ? post.commentCount : ""}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Comment</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleShare} className="px-2">
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  )
}
