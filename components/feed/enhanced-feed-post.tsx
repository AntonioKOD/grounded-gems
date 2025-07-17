"use client"

import { useState, memo, useCallback, useEffect, useRef, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  MessageCircle,
  Share2,
  Heart,
  Bookmark,
  Play,
  Volume2,
  VolumeX,
  X,
  MoreHorizontal,
  Loader2,
  Pause,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import VideoPlayer from "./video-player"
import type { Post } from "@/types/feed"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { likePostAsync, savePostAsync, sharePostAsync } from "@/lib/features/posts/postsSlice"
import { CommentSystemLight } from "@/components/post/comment-system-light"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getImageUrl, getVideoUrl } from "@/lib/image-utils"
import MediaCarousel from "@/components/ui/media-carousel"

interface EnhancedFeedPostProps {
  post: Post
  user: any
  className?: string
  showInteractions?: boolean
  onPostUpdated?: (post: Post) => void
  priority?: number
}

export const EnhancedFeedPost = memo(function EnhancedFeedPost({ 
  post, 
  user, 
  className = "", 
  showInteractions = true,
  onPostUpdated,
  priority = 0
}: EnhancedFeedPostProps) {
  // Early return if post is invalid
  if (!post || !post.id || !post.author) {
    console.warn('Invalid post data:', post)
    return null
  }

  const dispatch = useAppDispatch()
  const { likedPosts, savedPosts, loadingLikes, loadingSaves, loadingShares } = useAppSelector((state) => state.posts)
  
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)

  // Get current state from Redux
  const isLiked = likedPosts.includes(post.id)
  const isSaved = savedPosts.includes(post.id)
  const isLiking = loadingLikes.includes(post.id)
  const isSaving = loadingSaves.includes(post.id)
  const isSharing = loadingShares.includes(post.id)

  // Local state for counts
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [saveCount, setSaveCount] = useState(post.saveCount || 0)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)

  // Initialize states correctly based on Redux store
  useEffect(() => {
    setLikeCount(post.likeCount || 0)
    setSaveCount(post.saveCount || 0)
    setShareCount(post.shareCount || 0)
  }, [post.likeCount, post.saveCount, post.shareCount])

  // Intersection Observer for view tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setIsVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.5))
      },
      { threshold: [0.5] }
    )

    const postElement = document.getElementById(`post-${post.id}`)
    if (postElement) {
      observer.observe(postElement)
    }

    return () => observer.disconnect()
  }, [post.id])

  // Video player state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [videoProgress, setVideoProgress] = useState(0)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Local state
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)

  // Process media from API response (preferred) or fallback to individual fields
  const mediaItems = useMemo(() => {
    // If post has a media array from API, use it directly (this is the correct approach for videos)
    if (Array.isArray((post as any).media) && (post as any).media.length > 0) {
      console.log(`📱 EnhancedFeedPost ${post.id} using API media array:`, (post as any).media)
      return (post as any).media.map((item: any) => ({
        type: item.type,
        url: item.url,
        thumbnail: item.thumbnail || (item.type === 'video' ? item.url : undefined), // Use video URL as thumbnail
        alt: item.alt || (item.type === 'video' ? 'Post video' : 'Post image')
      }))
    }

    // Fallback: reconstruct from individual fields (legacy support)
    const items: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string; alt?: string }> = []
    
    const imageUrl = getImageUrl(post.image || (post as any).featuredImage)
    const videoUrl = getVideoUrl(post.video)
    const photos = Array.isArray(post.photos) 
      ? post.photos.map(photo => getImageUrl(photo)).filter(url => url !== "/placeholder.svg")
      : []

    // Prioritize video if available
    if (videoUrl) {
      items.push({ 
        type: 'video', 
        url: videoUrl,
        thumbnail: videoUrl, // Use video URL as thumbnail for now
        alt: "Post video"
      })
    }
    
    // Add main image only if no video
    if (imageUrl !== "/placeholder.svg" && !videoUrl) {
      items.push({ 
        type: 'image', 
        url: imageUrl,
        alt: post.title || 'Post image'
      })
    }
    
    // Add photos, avoiding duplicates
    photos.forEach((photoUrl, index) => {
      if (photoUrl && photoUrl !== imageUrl) {
        items.push({ 
          type: 'image', 
          url: photoUrl,
          alt: `Photo ${index + 1}`
        })
      }
    })
    
    console.log(`📱 EnhancedFeedPost ${post.id} using fallback media construction:`, items)
    return items
  }, [(post as any).media, post.image, (post as any).featuredImage, post.video, post.photos, (post as any).videoThumbnail, post.title, post.id])

  // Legacy URL extraction for backward compatibility
  const imageUrl = useMemo(() => {
    const url = getImageUrl(post.image || (post as any).featuredImage)
    return url !== "/placeholder.svg" ? url : null
  }, [post.image, (post as any).featuredImage])

  const videoUrl = useMemo(() => {
    return getVideoUrl(post.video)
  }, [post.video])

  const photos = useMemo(() => {
    if (!Array.isArray(post.photos)) return []
    return post.photos.map(photo => {
      const url = getImageUrl(photo)
      return url !== "/placeholder.svg" ? url : null
    }).filter(Boolean)
  }, [post.photos])

  const hasMedia = mediaItems.length > 0
  const currentMedia = mediaItems[currentMediaIndex]

  console.log(`📱 Enhanced Post ${post.id} media debug:`, {
    originalImage: post.image,
    imageUrl,
    videoUrl,
    photos,
    mediaItems: mediaItems.length,
    hasMedia,
    postMediaArray: (post as any).media,
    firstMediaItem: mediaItems[0],
    mediaTypes: mediaItems.map((m: any) => m.type),
    mediaUrls: mediaItems.map((m: any) => m.url)
  })

  // Handle like action with haptics and animations
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

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
      // Generate shareable link
      const postUrl = `${window.location.origin}/post/${post.id}`
      
      // Try native sharing first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `${post.author?.name || 'Someone'} on Sacavia`,
          text: post.content?.substring(0, 100) || 'Check out this post on Sacavia',
          url: postUrl,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(postUrl)
        toast.success("Link copied to clipboard!")
      }

      // Update local state optimistically
      setShareCount(prev => prev + 1)

      // Call server action if user is logged in
      if (user) {
        await dispatch(sharePostAsync({
          postId: post.id,
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
      setShareCount(post.shareCount || 0)
    }
  }, [post.id, post.author?.name, post.content, user, dispatch, post.shareCount])

  // Handle save action
  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!user) {
      toast.error("Please log in to save posts")
      return
    }

    try {
      // Optimistic update
      setSaveCount(prev => isSaved ? prev - 1 : prev + 1)

      // Dispatch Redux action
      await dispatch(savePostAsync({
        postId: post.id,
        shouldSave: !isSaved,
        userId: user.id
      })).unwrap()

      // Update parent component if callback provided
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          saveCount: isSaved ? saveCount - 1 : saveCount + 1,
          isSaved: !isSaved
        })
      }

      toast.success(isSaved ? "Removed from saved" : "Saved!")
    } catch (error) {
      console.error("Error saving post:", error)
      toast.error("Failed to save post")
      // Revert optimistic update
      setSaveCount(prev => isSaved ? prev + 1 : prev - 1)
    }
  }, [isSaved, post, user, dispatch, saveCount, onPostUpdated])

  // Handle comment dialog
  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCommentDialog(true)
  }, [])

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

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Get author profile image URL using proper image utility
  const getAuthorProfileImageUrl = useCallback(() => {
    if (!post.author) return "/placeholder.svg"
    const profileImageUrl = getImageUrl(post.author.profileImage?.url || post.author.avatar)
    return profileImageUrl !== "/placeholder.svg" ? profileImageUrl : "/placeholder.svg"
  }, [post.author?.profileImage?.url, post.author?.avatar])

  return (
    <>
      <motion.div
        id={`post-${post.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`relative w-full h-full bg-black overflow-hidden ${className}`}
        style={{
          width: '100vw',
          height: 'calc(100vh - 70px)', // Full viewport height minus mobile nav height
          position: 'absolute',
          inset: 0
        }}
      >
        {/* Main Media - Reduced height to make room for caption */}
        <div className="absolute inset-0 w-full" style={{ height: 'calc(100% - 120px)' }}>
          {/* Enhanced Media Display with Carousel */}
          {hasMedia && (
            <div className="relative mb-4">
              <MediaCarousel
                media={mediaItems}
                aspectRatio="video"
                showControls={true}
                showDots={true}
                enableVideoPreview={true}
                videoPreviewMode="hover"
                className="rounded-2xl overflow-hidden bg-gray-100"
              />
            </div>
          )}
        </div>

        {/* Enhanced Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-transparent to-black/80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20 pointer-events-none" />

        {/* Author info overlay */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-white/20 shadow-lg">
                <AvatarImage 
                  src={getAuthorProfileImageUrl()} 
                  alt={post.author.name} 
                />
                <AvatarFallback className="bg-gray-800 text-white text-sm font-medium">
                  {getInitials(post.author.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold text-sm drop-shadow-lg">
                  {post.author.name}
                </p>
                <p className="text-white/70 text-xs drop-shadow-lg">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Side Actions - Enhanced TikTok Style */}
        <div className="absolute right-4 flex flex-col items-center space-y-4 z-20" style={{ bottom: 'calc(120px + 1rem)', top: 'auto' }}>
          {/* Like Button */}
          <motion.button
            className="group relative"
            onClick={handleLike}
            disabled={isLiking}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className={`relative p-3 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300 ${
              isLiked 
                ? 'bg-red-500/20 text-red-400 border-red-400/30' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}>
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-current animate-bounce' : ''}`} />
              {isLiked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  className="absolute inset-0 rounded-full bg-red-400/20 animate-ping"
                />
              )}
            </div>
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-xs bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center">
              {likeCount}
            </span>
          </motion.button>

          {/* Comment Button */}
          <motion.button
            className="group relative"
            onClick={handleComment}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="relative p-3 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-2xl">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-xs bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center">
              {post.commentCount || 0}
            </span>
          </motion.button>

          {/* More Actions Button */}
          <motion.button
            className="group relative"
            onClick={(e) => {
              e.stopPropagation()
              setShowMoreActions(!showMoreActions)
              // Haptic feedback
              if (navigator.vibrate) {
                navigator.vibrate(50)
              }
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="relative p-3 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-2xl">
              <motion.div
                animate={{ rotate: showMoreActions ? 45 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <MoreHorizontal className="h-6 w-6 text-white" />
              </motion.div>
            </div>
          </motion.button>

          {/* Additional Actions - Share and Save */}
          <AnimatePresence>
            {showMoreActions && (
              <>
                {/* Share Button */}
                <motion.button
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: 20 }}
                  className="group relative"
                  onClick={handleShare}
                  disabled={isSharing}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="relative p-3 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-2xl">
                    <Share2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-xs bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center">
                    {shareCount}
                  </span>
                </motion.button>

                {/* Save Button */}
                <motion.button
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: 20 }}
                  className="group relative"
                  onClick={handleSave}
                  disabled={isSaving}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17, delay: 0.1 }}
                >
                  <div className={`relative p-3 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300 ${
                    isSaved 
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}>
                    <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
                  </div>
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-xs bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center">
                    {saveCount}
                  </span>
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Content - Now in dedicated space, not overlaying media */}
        <div className="absolute bottom-0 left-0 right-0 bg-black z-10" style={{ height: '120px' }}>
          <div className="h-full p-4 flex flex-col justify-center">
            {/* Post Content */}
            {post.content && (
              <p className="text-white text-sm leading-relaxed font-light mb-2 line-clamp-2">
                {post.content}
              </p>
            )}

            {/* Location and Time */}
            <div className="flex items-center justify-between text-white/60 text-xs">
              <div className="flex items-center gap-3">
                {post.location && (
                  <span className="flex items-center gap-1">
                    📍 {typeof post.location === 'string' ? post.location : post.location.name}
                  </span>
                )}
              </div>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {/* Mobile Tap to Pause/Play (for videos) */}
        {videoUrl && (
          <div 
            className="absolute inset-0 md:hidden z-5"
            onClick={(e) => {
              e.stopPropagation()
              // Video tap handling will be managed by VideoPlayer
            }}
          />
        )}
      </motion.div>

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
              user={user ? {
                id: user.id,
                name: user.name,
                avatar: user.profileImage?.url || user.avatar
              } : undefined}
              className="bg-transparent"
              autoShow={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

export default EnhancedFeedPost 