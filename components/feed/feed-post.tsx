
"use client"

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Star,
  MapPin,
  Clock,
  Lightbulb,
  ThumbsUp,
  Award,
  Sparkles,
  Flag
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import type { Post } from '@/types/feed'
import { getImageUrl, getVideoUrl } from '@/lib/image-utils'
import CommentsModal from './comments-modal'
import VideoPlayer from './video-player'
import { formatDistanceToNow } from "date-fns"
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
import { likePostAsync, savePostAsync, sharePostAsync } from "@/lib/features/posts/postsSlice"
import { CommentSystemLight } from "@/components/post/comment-system-light"
import MediaCarousel from "@/components/ui/media-carousel"
import { ChevronUp, ChevronDown, X } from 'lucide-react'

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
  // Early return if post or author is invalid
  // Handle both direct post structure and nested post structure from feed API
  // Use type assertion to allow for post.post (from feed API) or direct post (from detail page)
  const postData = (post as any).post || post
  const author = postData.author
  

  
  if (!post || !post.id || !author || !author.name) {
    console.warn('Invalid post data:', { post, postData, author })
    return null
  }

  const dispatch = useAppDispatch()
  const { likedPosts, savedPosts, loadingLikes, loadingSaves, loadingShares } = useAppSelector((state) => state.posts)
  
  const [expanded, setExpanded] = useState(false)
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)

  // Get current state from Redux
  const isLiked = likedPosts.includes(postData.id)
  const isSaved = savedPosts.includes(postData.id)
  const isLiking = loadingLikes.includes(postData.id)
  const isSaving = loadingSaves.includes(postData.id)
  const isSharing = loadingShares.includes(postData.id)

  // Local state for counts (will be updated optimistically)
  const [likeCount, setLikeCount] = useState(postData.likeCount || 0)
  const [saveCount, setSaveCount] = useState(postData.saveCount || 0)
  const [shareCount, setShareCount] = useState(postData.shareCount || 0)

  // Initialize states correctly on load
  useEffect(() => {
    setLikeCount(postData.likeCount || 0)
    setSaveCount(postData.saveCount || 0)
    setShareCount(postData.shareCount || 0)
  }, [postData.likeCount, postData.saveCount, postData.shareCount])

  // Determine if content should be truncated
  const isLongContent = postData.content && postData.content.length > 280
  const displayContent = isLongContent && !expanded ? `${postData.content.substring(0, 280)}...` : (postData.content || '')

  // Video player state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [videoProgress, setVideoProgress] = useState(0)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Local state
  const [showComments, setShowComments] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  const [imageLoadStates, setImageLoadStates] = useState<Record<number, boolean>>({})
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Process media from API response (preferred) or fallback to individual fields
  const mediaItems = useMemo(() => {
    // If post has a media array from API, use it directly (this is the correct approach for videos)
    if (Array.isArray(postData.media) && postData.media.length > 0) {
      // Deduplicate media items by URL
      const uniqueMedia = postData.media.reduce((acc: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string; alt?: string }>, item: any) => {
        const existingItem = acc.find(existing => existing.url === item.url)
        if (!existingItem) {
          acc.push({
            type: item.type,
            url: item.url,
            thumbnail: item.thumbnail || (item.type === 'video' ? item.url : undefined), // Use video URL as thumbnail
            alt: item.alt || (item.type === 'video' ? 'Post video' : 'Post image')
          })
        }
        return acc
      }, [])
      
      // Ensure videos come first
      const videos = uniqueMedia.filter((item: { type: 'image' | 'video'; url: string; thumbnail?: string; alt?: string }) => item.type === 'video')
      const images = uniqueMedia.filter((item: { type: 'image' | 'video'; url: string; thumbnail?: string; alt?: string }) => item.type === 'image')
      return [...videos, ...images]
    }

    // Fallback: reconstruct from individual fields (legacy support)
    const items: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string; alt?: string }> = []
    
    // Add main image if exists
    if (postData.image) {
      const imageUrl = getImageUrl(postData.image)
      if (imageUrl) {
        items.push({
          type: 'image',
          url: imageUrl,
          alt: 'Post image'
        })
      }
    }

    // Add video if exists - videos should come first for better UX
    if (postData.video) {
      const videoUrl = getVideoUrl(postData.video)
      if (videoUrl) {
        items.unshift({
          type: 'video',
          url: videoUrl,
          thumbnail: videoUrl, // Use video URL as thumbnail - VideoPlayer will generate its own
          alt: 'Post video'
        })
      }
    }

    // Add photos array if exists
    if (postData.photos && Array.isArray(postData.photos)) {
      postData.photos.forEach((photo: any) => {
        const photoUrl = getImageUrl(photo)
        if (photoUrl) {
          items.push({
            type: 'image',
            url: photoUrl,
            alt: 'Post photo'
          })
        }
      })
    }

    return items
  }, [postData])

  const hasMedia = mediaItems.length > 0

  // Legacy URL extraction for backward compatibility
  const imageUrl = useMemo(() => {
    const url = getImageUrl(postData.image || postData.featuredImage)
    return url !== "/placeholder.svg" ? url : null
  }, [postData.image, postData.featuredImage])

  const videoUrl = useMemo(() => {
    return getVideoUrl(postData.video)
  }, [postData.video])

  const photos = useMemo(() => {
    if (!Array.isArray(postData.photos)) return []
    return postData.photos.map((photo: any) => {
      const url = getImageUrl(photo)
      return url !== "/placeholder.svg" ? url : null
    }).filter(Boolean)
  }, [postData.photos])



  // Handle like action
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      // Optimistic update
      setLikeCount((prev: number) => isLiked ? prev - 1 : prev + 1)

      // Dispatch Redux action
      await dispatch(likePostAsync({
        postId: postData.id,
        shouldLike: !isLiked,
        userId: user?.id || '' // Keep for Redux state management, but API will use authenticated user
      })).unwrap()

      // Update parent component if callback provided
      if (onPostUpdated) {
        onPostUpdated({
          ...postData,
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
      setLikeCount((prev: number) => isLiked ? prev + 1 : prev - 1)
    }
  }, [isLiked, post, user, dispatch, likeCount, onPostUpdated])

  // Handle share action
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Generate shareable link
      const postUrl = `${window.location.origin}/post/${postData.id}`
      
      // Try native sharing first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `${postData.author?.name || 'Someone'} on Sacavia`,
          text: postData.content?.substring(0, 100) || 'Check out this post on Sacavia',
          url: postUrl,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(postUrl)
        toast.success("Link copied to clipboard!")
      }

      // Update local state optimistically
      setShareCount((prev: number) => prev + 1)

      // Call server action if user is logged in
      if (user) {
        await dispatch(sharePostAsync({
          postId: postData.id,
          userId: user.id
        })).unwrap()
      }

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error sharing post:", error)
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("Failed to share post")
      }
      // Revert optimistic update
      setShareCount((prev: number) => post.shareCount || 0)
    }
  }, [post.id, postData.author?.name, postData.content, user, dispatch, post.shareCount])

  // Handle save action
  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      // Optimistic update
      setSaveCount((prev: number) => isSaved ? prev - 1 : prev + 1)

      // Dispatch Redux action
      await dispatch(savePostAsync({
        postId: postData.id,
        shouldSave: !isSaved,
        userId: user?.id || '' // Keep for Redux state management, but API will use authenticated user
      })).unwrap()

      // Update parent component if callback provided
      if (onPostUpdated) {
        onPostUpdated({
          ...postData,
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
      setSaveCount((prev: number) => isSaved ? prev + 1 : prev - 1)
    }
  }, [isSaved, post, user, dispatch, saveCount, onPostUpdated])

  // Handle comment action
  const handleComment = useCallback(() => {
    setShowCommentsModal(true)
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

  // User profile helpers with enhanced debugging
  const getAuthorProfileImageUrl = useCallback(() => {
    // Try to get profile image from the author object
    let imageSource = null
    
    if (author.profileImage?.url || author.profileImage) {
      imageSource = author.profileImage
    } else if (author.avatar) {
      imageSource = author.avatar
    }
    
    const profileImageUrl = getImageUrl(imageSource)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ [FeedPost] Author profile image processing:', {
        postId: postData.id,
        authorId: author.id,
        authorName: author.name,
        hasProfileImage: !!author.profileImage,
        hasAvatar: !!author.avatar,
        profileImageStructure: author.profileImage,
        avatar: author.avatar,
        imageSource,
        processedUrl: profileImageUrl,
        isPlaceholder: profileImageUrl === "/placeholder.svg"
      })
    }
    
    return profileImageUrl !== "/placeholder.svg" ? profileImageUrl : "/placeholder.svg"
  }, [author.profileImage, author.avatar, postData.id, author.id, author.name])

  // Video player controls
  const handleVideoPlay = useCallback(() => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }, [isVideoPlaying])

  const handleVideoMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted
      setIsVideoMuted(!isVideoMuted)
    }
  }, [isVideoMuted])

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setVideoProgress(progress)
    }
  }, [])

  // Auto-play video when in view
  useEffect(() => {
    const video = videoRef.current
    if (video && videoUrl) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.play().catch(() => {
                // Auto-play failed, user interaction required
              })
              setIsVideoPlaying(true)
            } else {
              video.pause()
              setIsVideoPlaying(false)
            }
          })
        },
        { threshold: 0.7 }
      )

      observer.observe(video)
      return () => observer.disconnect()
    }
    return undefined
  }, [videoUrl])

  return (
    <>
      <Card className={`overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-lg ${className}`}>
        {/* Post Header */}
        <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link 
              href={`/profile/${author.id}`}
              className="group flex items-center gap-4 hover:opacity-90 transition-opacity flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Avatar container with proper sizing constraints */}
              <div className="relative w-14 h-14 flex-shrink-0">
                {/* Instagram-style gradient ring */}
                <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px] shadow-lg">
                  <div className="w-full h-full rounded-full bg-white p-[2px] group-hover:bg-gray-50 transition-colors">
                    <Avatar className="h-full w-full border-0 shadow-xl">
                      <AvatarImage 
                        src={getAuthorProfileImageUrl()} 
                        alt={author.name} 
                        className="object-cover rounded-full" 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] via-purple-500 to-pink-500 text-white font-bold text-sm rounded-full">
                        {getInitials(author.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                {/* Online indicator with proper positioning */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg z-10">
                  <div className="w-full h-full rounded-full bg-green-400 animate-pulse" />
                </div>
                
                {/* Subtle hover glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/10 via-red-500/10 to-purple-600/10 blur-lg scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
              
              {/* User info with proper spacing */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors text-lg truncate">
                    {author.name}
                  </span>
                  
                  {/* Enhanced Post Type Badges */}
                  {postData.type && postData.type !== "post" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {postData.type === "review" && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs px-2 py-1 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Review
                        </Badge>
                      )}
                      {postData.type === "tip" && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 text-xs px-2 py-1 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3 fill-current" />
                          Tip
                        </Badge>
                      )}
                      {postData.type === "recommendation" && (
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-xs px-2 py-1 flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3 fill-current" />
                          Recommendation
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Rating Display for Reviews */}
                  {postData.type === "review" && postData.rating && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(postData.rating!) 
                              ? 'text-yellow-400 fill-current' 
                              : i < postData.rating! 
                                ? 'text-yellow-400 fill-current opacity-50' 
                                : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm font-medium text-gray-600 ml-1">
                        {postData.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  {formatDistanceToNow(new Date(postData.createdAt), { addSuffix: true })}
                </p>
              </div>
            </Link>
          </div>
          
          {/* More options button */}
          <div className="flex-shrink-0 ml-2">
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
          </div>
        </CardHeader>

        {/* Post Content */}
        <CardContent className="px-6 pb-4">
          {/* Enhanced Location Tag with Post Type Context */}
          {postData.location && (
            <Link 
              href={typeof postData.location === 'string' 
                ? `/locations/${postData.location}` 
                : postData.location.slug 
                  ? `/locations/${postData.location.slug}` 
                  : `/locations/${postData.location.id}`
              }
              className={`inline-flex items-center gap-2 text-sm mb-4 transition-colors px-3 py-1.5 rounded-full ${
                postData.type === "review" 
                  ? "text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100" 
                  : postData.type === "tip"
                  ? "text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100"
                  : postData.type === "recommendation"
                  ? "text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100"
                  : "text-gray-600 hover:text-[#FF6B6B] bg-gray-50"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="h-4 w-4" />
              {typeof postData.location === 'string' ? postData.location : postData.location.name}
            </Link>
          )}

          {/* Post Type Specific Header */}
          {postData.type === "review" && postData.rating && (
            <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Star className="h-5 w-5 text-yellow-600 fill-current" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Review</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(postData.rating!) 
                              ? 'text-yellow-400 fill-current' 
                              : i < postData.rating! 
                                ? 'text-yellow-400 fill-current opacity-50' 
                                : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {postData.rating.toFixed(1)} out of 5
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {postData.type === "tip" && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Lightbulb className="h-5 w-5 text-blue-600 fill-current" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Pro Tip</h3>
                  <p className="text-sm text-gray-600 mt-1">Insider knowledge to enhance your experience</p>
                </div>
              </div>
            </div>
          )}

          {postData.type === "recommendation" && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <ThumbsUp className="h-5 w-5 text-green-600 fill-current" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Recommendation</h3>
                  <p className="text-sm text-gray-600 mt-1">Highly recommended by the community</p>
                </div>
              </div>
            </div>
          )}

          {/* Post Text with Enhanced Styling */}
          {displayContent && (
            <div className={`mb-6 ${
              postData.type === "review" 
                ? "text-gray-800" 
                : postData.type === "tip"
                ? "text-gray-800"
                : postData.type === "recommendation"
                ? "text-gray-800"
                : "text-gray-900"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed text-base">
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
          )}

          {/* Enhanced Media Display with Carousel */}
          {hasMedia && (
            <div className="mb-4">
              {mediaItems.length > 1 || mediaItems.some((item: { type: 'image' | 'video'; url: string; thumbnail?: string; alt?: string }) => item.type === 'video') ? (
                <MediaCarousel
                  media={mediaItems}
                  aspectRatio="video"
                  showControls={true}
                  showDots={true}
                  enableVideoPreview={true}
                  videoPreviewMode="hover"
                  className="rounded-2xl overflow-hidden bg-gray-50"
                />
              ) : (
                // Single image - display without carousel
                <div className="rounded-2xl overflow-hidden bg-gray-50">
                  <img
                    src={mediaItems[0].url}
                    alt={mediaItems[0].alt || "Post image"}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Post Actions */}
        <CardFooter className={`px-6 py-4 border-t ${
          postData.type === "review" 
            ? "bg-gradient-to-r from-yellow-50/50 to-orange-50/50 border-yellow-200" 
            : postData.type === "tip"
            ? "bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-blue-200"
            : postData.type === "recommendation"
            ? "bg-gradient-to-r from-green-50/50 to-emerald-50/50 border-green-200"
            : "bg-gray-50/50 border-gray-100"
        }`}>
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
                    <p>{isLiked ? 'Unlike' : 'Like'} this {postData.type || 'post'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Comments Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-full px-4 py-2 font-medium"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{postData.commentCount || 0}</span>
              </Button>

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
                    <p>Share this {postData.type || 'post'}</p>
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
                    <p>{isSaved ? 'Remove from' : 'Add to'} saved {postData.type === 'review' ? 'reviews' : postData.type === 'tip' ? 'tips' : 'posts'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Post Type Specific Action */}
            <div className="flex items-center gap-2">
              {postData.type === "review" && postData.rating && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 rounded-full">
                  <Star className="h-4 w-4 text-yellow-600 fill-current" />
                  <span className="text-sm font-medium text-yellow-800">
                    {postData.rating.toFixed(1)}
                  </span>
                </div>
              )}
              
              {postData.type === "tip" && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
                  <Lightbulb className="h-4 w-4 text-blue-600 fill-current" />
                  <span className="text-sm font-medium text-blue-800">
                    Pro Tip
                  </span>
                </div>
              )}
              
              {postData.type === "recommendation" && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                  <ThumbsUp className="h-4 w-4 text-green-600 fill-current" />
                  <span className="text-sm font-medium text-green-800">
                    Recommended
                  </span>
                </div>
              )}
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
                Comments ({postData.commentCount || 0})
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
              postId={postData.id}
              user={user}
              className="bg-transparent"
              autoShow={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        postId={postData.id}
        user={user}
        commentCount={postData.commentCount}
      />
    </>
  )
})

export default FeedPost
