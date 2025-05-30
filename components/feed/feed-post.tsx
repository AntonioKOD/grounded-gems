/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Flag,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { likePost, sharePost, savePost } from "@/app/actions"
import { CommentSystemLight } from "@/components/post/comment-system-light"
import VideoPlayer from "./video-player"
import type { Post } from "@/types/feed"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { likePostAsync, savePostAsync, sharePostAsync } from "@/lib/features/posts/postsSlice"

interface FeedPostProps {
  post: Post
  user: any // Accept user from parent component
  className?: string
  showInteractions?: boolean
  onPostUpdated?: (post: Post) => void
}

export const FeedPost = memo(function FeedPost({ 
  post, 
  user, 
  className = "", 
  showInteractions = true,
  onPostUpdated 
}: FeedPostProps) {
  const dispatch = useAppDispatch()
  const { likedPosts, savedPosts, loadingLikes, loadingSaves, loadingShares } = useAppSelector((state) => state.posts)
  
  const [expanded, setExpanded] = useState(false)
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)

  // Get current state from Redux
  const isLiked = likedPosts.includes(post.id)
  const isSaved = savedPosts.includes(post.id)
  const isLiking = loadingLikes.includes(post.id)
  const isSaving = loadingSaves.includes(post.id)
  const isSharing = loadingShares.includes(post.id)

  // Local state for counts (will be updated optimistically)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [saveCount, setSaveCount] = useState(post.saveCount || 0)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)

  // Initialize states correctly on load
  useEffect(() => {
    setLikeCount(post.likeCount || 0)
    setSaveCount(post.saveCount || 0)
    setShareCount(post.shareCount || 0)
  }, [post.likeCount, post.saveCount, post.shareCount])

  // Determine if content should be truncated
  const isLongContent = post.content.length > 280
  const displayContent = isLongContent && !expanded ? `${post.content.substring(0, 280)}...` : post.content

  // Handle like action
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      // Optimistic update
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1)

      // Dispatch Redux action
      await dispatch(likePostAsync({
        postId: post.id,
        shouldLike: !isLiked,
        userId: user?.id || '' // Keep for Redux state management, but API will use authenticated user
      })).unwrap()

      // Update parent component if callback provided
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          likeCount: isLiked ? likeCount - 1 : likeCount + 1,
          isLiked: !isLiked
        })
      }

    } catch (error) {
      console.error("Error liking post:", error)
      
      if (error instanceof Error && error.message.includes('not authenticated')) {
        toast.error("Please log in to like posts")
      } else {
        toast.error("Failed to like post")
      }
      // Revert optimistic update
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
    }
  }, [isLiked, post, user, dispatch, likeCount, onPostUpdated])

  // Handle share action
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Copy link to clipboard
      const postUrl = `${window.location.origin}/post/${post.id}`
      await navigator.clipboard.writeText(postUrl)

      // Update local state optimistically
      setShareCount(prev => prev + 1)

      // Call server action if user is logged in
      if (user) {
        await dispatch(sharePostAsync({
          postId: post.id,
          userId: user.id
        })).unwrap()
      }

      toast.success("Link copied to clipboard")
    } catch (error) {
      console.error("Error sharing post:", error)
      toast.error("Failed to share post")
      // Revert optimistic update
      setShareCount(post.shareCount || 0)
    }
  }, [post.id, user, dispatch, post.shareCount])

  // Handle save action
  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      // Optimistic update
      setSaveCount(prev => isSaved ? prev - 1 : prev + 1)

      // Dispatch Redux action
      await dispatch(savePostAsync({
        postId: post.id,
        shouldSave: !isSaved,
        userId: user?.id || '' // Keep for Redux state management, but API will use authenticated user
      })).unwrap()

      // Update parent component if callback provided
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          saveCount: isSaved ? saveCount - 1 : saveCount + 1,
          isSaved: !isSaved
        })
      }

      toast.success(isSaved ? "Post removed from saved items" : "Post saved for later")
    } catch (error) {
      console.error("Error saving post:", error)
      
      if (error instanceof Error && error.message.includes('not authenticated')) {
        toast.error("Please log in to save posts")
      } else {
        toast.error("Failed to save post")
      }
      // Revert optimistic update
      setSaveCount(prev => isSaved ? prev + 1 : prev - 1)
    }
  }, [isSaved, post, user, dispatch, saveCount, onPostUpdated])

  // Handle comment action
  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCommentDialog(true)
  }, [])

  // Handle report action
  const handleReport = useCallback(() => {
    toast.info("Report feature coming soon")
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
    <>
      <Card className={`overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-lg ${className}`}>
        {/* Post Header */}
        <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4">
            <Link 
              href={`/profile/${post.author.id}`}
              className="group flex items-center gap-4 hover:opacity-90 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {/* Instagram-style gradient ring */}
                <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px] shadow-lg">
                  <div className="w-full h-full rounded-full bg-white p-[2px] group-hover:bg-gray-50 transition-colors">
                    <Avatar className="h-full w-full border-0 shadow-xl">
                      <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} className="object-cover rounded-full" />
                      <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] via-purple-500 to-pink-500 text-white font-bold text-sm rounded-full">
                        {getInitials(post.author.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                {/* Online indicator with subtle animation */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg">
                  <div className="w-full h-full rounded-full bg-green-400 animate-pulse" />
                </div>
                
                {/* Subtle hover glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/10 via-red-500/10 to-purple-600/10 blur-lg scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors text-lg">
                    {post.author.name}
                  </span>
                  {post.type !== "post" && (
                    <Badge variant="outline" className="text-xs px-2 py-1 text-[#FF6B6B] border-[#FF6B6B]/30 bg-[#FF6B6B]/5">
                      {post.type === "review" ? "Review" : "Tip"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-50 rounded-full">
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 shadow-lg border-0">
              <DropdownMenuItem onClick={handleShare} className="hover:bg-gray-50">
                <Share2 className="mr-3 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReport} className="hover:bg-gray-50">
                <Flag className="mr-3 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        {/* Post Content */}
        <CardContent className="px-6 pb-4">
          {/* Location Tag */}
          {post.location && (
            <Link 
              href={`/locations/${typeof post.location === 'string' ? post.location : post.location.id}`}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B6B] mb-4 transition-colors bg-gray-50 px-3 py-1.5 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="h-4 w-4" />
              {typeof post.location === 'string' ? post.location : post.location.name}
            </Link>
          )}

          {/* Post Text */}
          <div className="mb-6">
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base">
              {displayContent}
            </p>
            {isLongContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(!expanded)
                }}
                className="mt-3 p-0 h-auto text-[#FF6B6B] hover:text-[#FF6B6B]/80 hover:bg-transparent font-medium"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Post Media */}
          {(post.video || post.image) && !imageError && (
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-6 shadow-sm">
              {post.video ? (
                <VideoPlayer
                  src={post.video}
                  thumbnail={post.videoThumbnail || post.image}
                  aspectRatio="4/3"
                  className="w-full h-full"
                  onViewStart={() => {
                    // Track video view start
                  }}
                  onViewComplete={() => {
                    // Track video view completion
                  }}
                />
              ) : post.image ? (
                <Image
                  src={post.image}
                  alt={post.title || "Post image"}
                  fill
                  className="object-cover transition-opacity duration-500 hover:scale-105 transition-transform"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onLoadingComplete={() => setIsLoadingImage(false)}
                  onError={() => {
                    setIsLoadingImage(false)
                    setImageError(true)
                  }}
                />
              ) : null}
              {isLoadingImage && !post.video && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 border-2 border-gray-200 rounded-full animate-ping" />
                    <div className="absolute inset-0 border-2 border-[#FF6B6B] rounded-full animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Post Actions */}
        <CardFooter className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-8">
              {/* Like Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex items-center gap-3 hover:bg-white rounded-full px-3 py-2 transition-all"
                      onClick={handleLike}
                      disabled={isLiking}
                    >
                      <div className={`p-2 rounded-full group-hover:bg-[#FF6B6B]/10 transition-all transform group-active:scale-90 ${
                        isLiked ? 'text-[#FF6B6B] bg-[#FF6B6B]/10' : 'text-gray-600'
                      }`}>
                        <Heart className={`h-5 w-5 ${isLiked ? 'fill-current animate-pulse' : ''}`} />
                      </div>
                      <span className={`text-sm font-semibold ${isLiked ? 'text-[#FF6B6B]' : 'text-gray-600'}`}>
                        {likeCount}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isLiked ? 'Unlike' : 'Like'} this post</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Comment Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex items-center gap-3 hover:bg-white rounded-full px-3 py-2 transition-all"
                      onClick={handleComment}
                    >
                      <div className="p-2 rounded-full group-hover:bg-blue-50 transition-all transform group-active:scale-90">
                        <MessageCircle className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600">
                        {post.commentCount || 0}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Comment on this post</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Share Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex items-center gap-3 hover:bg-white rounded-full px-3 py-2 transition-all"
                      onClick={handleShare}
                      disabled={isSharing}
                    >
                      <div className="p-2 rounded-full group-hover:bg-green-50 transition-all transform group-active:scale-90">
                        <Share2 className="h-5 w-5 text-gray-600 group-hover:text-green-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 group-hover:text-green-600">
                        {shareCount}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share this post</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Save Button - moved here */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="group flex items-center gap-3 hover:bg-white rounded-full px-3 py-2 transition-all"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <div className={`p-2 rounded-full group-hover:bg-yellow-50 transition-all transform group-active:scale-90 ${
                        isSaved ? 'text-yellow-500 bg-yellow-50' : 'text-gray-600'
                      }`}>
                        <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                      </div>
                      <span className={`text-sm font-semibold ${isSaved ? 'text-yellow-500' : 'text-gray-600'}`}>{saveCount}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isSaved ? 'Remove from saved' : 'Save'} this post</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Enhanced Comments Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] bg-white border-0 shadow-2xl p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-[#FF6B6B]" />
                Comments ({post.commentCount || 0})
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCommentDialog(false)}
                className="h-8 w-8 rounded-full hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto bg-white">
            <CommentSystemLight 
              postId={post.id}
              user={user}
              className="bg-transparent"
              autoShow={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

export default FeedPost
