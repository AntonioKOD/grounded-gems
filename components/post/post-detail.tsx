"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, Share2, MoreHorizontal, MapPin, Star, ArrowUpRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getPostById, likePost, sharePost, isLiked } from "@/app/actions"
import { toast } from "sonner"
import type { Post } from "@/types/feed"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PostDetailProps {
  postId: string
}

export default function PostDetail({ postId }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true)
      try {
        const fetchedPost = await getPostById(postId)
        if (fetchedPost) {
          setPost(fetchedPost)
          setLikeCount(fetchedPost.likes || fetchedPost.likeCount || 0)
        }
      } catch (error) {
        console.error("Error fetching post:", error)
        toast.error("Failed to load post")
      } finally {
        setIsLoading(false)
      }
    }

    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        if (data?.user) {
          setUser(data.user)
          
          // Check if the post is liked by the current user
          const postIsLiked = await isLiked(postId, data.user.id)
          setLiked(postIsLiked)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }

    fetchPost()
    fetchCurrentUser()
  }, [postId])

  const handleLike = async () => {
    if (isLiking || !user || !post) return

    setIsLiking(true)
    try {
      const newLiked = !liked

      // Optimistically update UI
      setLiked(newLiked)
      setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1))

      // Call the server action
      await likePost(post.id, newLiked, user.id)

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

  if (isLoading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-96"></div>
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Post not found</h2>
        <p className="text-gray-500">The post you&apos;re looking for doesn&apos;t exist or has been removed.</p>
      </div>
    )
  }

  const getPostTypeContent = () => {
    switch (post.type) {
      case "review":
        return (
          <div className="mt-4 bg-gray-50 p-4 rounded-md">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <Link href={`/location/${post.location?.id}`} className="text-base font-medium hover:underline">
                {post.location?.name}
              </Link>
              <div className="flex items-center ml-auto">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < (post.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300",
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-gray-700">{post.content}</p>
            
            {post.location && (
              <Link
                href={`/location/${post.location.id}`}
                className="mt-4 inline-flex items-center text-sm text-[#FF6B6B] hover:underline"
              >
                View {post.location.name}
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            )}
          </div>
        )

      case "recommendation":
        return (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Recommendation
              </Badge>
            </div>
            <p className="text-gray-700">{post.content}</p>
            {post.location && (
              <Link
                href={`/location/${post.location.id}`}
                className="mt-4 flex items-center text-[#FF6B6B] hover:underline"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Visit {post.location.name}
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            )}
          </div>
        )

      default:
        return (
          <div className="mt-4">
            <p className="text-gray-700">{post.content}</p>
          </div>
        )
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Post header with author info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.id}`}>
              <Avatar className="h-12 w-12 border">
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
              <Link href={`/profile/${post.author.id}`} className="font-medium hover:underline text-lg">
                {post.author.name}
              </Link>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-5 w-5" />
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

        {/* Post title */}
        {post.title && <h1 className="text-2xl font-bold mt-4">{post.title}</h1>}

        {/* Post content */}
        {getPostTypeContent()}

        {/* Post image if available */}
        {post.image && (
          <div className="mt-6 relative rounded-md overflow-hidden">
            <Image
              src={post.image || "/placeholder.svg"}
              alt={post.title || "Post image"}
              width={800}
              height={500}
              className="w-full object-cover max-h-[500px]"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="px-6 py-4 border-t bg-gray-50 flex justify-between">
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
                  <Heart className={cn("h-5 w-5", liked && "fill-red-500")} />
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
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.commentCount || 0}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Comments</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleShare} className="px-2">
                <Share2 className="h-5 w-5" />
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
