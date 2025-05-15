/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
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
import { sharePost } from "@/app/actions"
import type { Post } from "@/types/feed"
import { toast } from "sonner"

interface PostCardProps {
  post: Post
  onLike?: (id: string) => void
  onComment?: (id: string) => void
  onShare?: (id: string) => void
  className?: string
}

export function PostCard({ post, onLike, onComment, onShare, className = "" }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [user, setUser] = useState<any>(null)
  // Determine if content should be truncated
  const isLongContent = post.content.length > 280
  const displayContent = isLongContent && !expanded ? `${post.content.substring(0, 280)}...` : post.content

  // Handle like action
  useEffect(() => {
   const fetchUser = async () => {
    const response = await fetch('api/users/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            },
    })
    const data = await response.json()
    const user = data.user
    if (user) {
      setUser(user)
    }
   }
   fetchUser()
  }, [])

    const copyLinkToClipboard = () => {
    const link = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(link).then(() => {
        toast.success("Link copied to clipboard")
    }
    ).catch((err) => {
        console.error("Failed to copy link: ", err)
        toast.error("Failed to copy link")
    })
  }
  const handleLike = () => {
    if (onLike) onLike(post.id)
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }


  const handleShare = async () => {
    if (isSharing || !post) return

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
        toast.success("Post shared successfully")
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
              <DropdownMenuItem>Save Post</DropdownMenuItem>
              <DropdownMenuItem onClick={copyLinkToClipboard}>Copy Link</DropdownMenuItem>
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
            <Link href={`map?locationId=${post.location?.id}`} className="hover:underline">
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
        {post.image && (
          <div className="mt-3 mb-2 rounded-md overflow-hidden relative">
            <div className="aspect-video relative">
              <Image
              unoptimized={true}
                src={post?.image || "/placeholder.svg"}
                alt={post.title || "Post image"}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 py-3 border-t flex items-center justify-between bg-muted/10">
  <div className="flex items-center gap-5">
    <LikeButton isLiked={post.isLiked || false} likeCount={post.likeCount || 0} onLike={handleLike} size="sm" />
    <Link href={`/post/${post.id}`} className="flex items-center gap-1">
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-1"
      onClick={() => onComment && onComment(post.id)}
    >
      <MessageCircle className="h-4 w-4" />
      <span>{post.commentCount || 0}</span>
    </Button>
    </Link>
  </div>

  <Button
    variant="ghost"
    size="sm"
    className="flex items-center gap-1"
    onClick={() => onShare && onShare(post.id)}
  >
    <Share2 className="h-4 w-4" />
    <span className="sr-only sm:not-sr-only sm:inline" onClick={handleShare}>Share</span>
  </Button>
</CardFooter>
    </Card>
  )
}
