"use client"

import { useState, memo, useCallback, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  MessageCircle,
  Share2,
  Heart,
  Bookmark,
  MoreHorizontal,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Eye,
  Users,
  Sparkles,
  MapPin,
  ArrowUp,
  X,
  Maximize,
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
import type { Post } from "@/types/feed"
import { getInitials } from "@/lib/utils"
import { mediumHaptics } from "@/lib/haptics"
import { likePost, sharePost } from "@/app/actions"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { savePostAsync, toggleSaveOptimistic } from "@/lib/features/posts/postsSlice"
import { formatDistanceToNow } from "date-fns"
import { CommentSystemLight } from "@/components/post/comment-system-light"
import VideoPlayer from "./video-player"
import { likePostAsync } from "@/lib/features/posts/postsSlice"
import { sharePostAsync } from "@/lib/features/posts/postsSlice"
import { getImageUrl, getVideoUrl } from "@/lib/image-utils"

interface MobileFeedPostProps {
  post: Post
  user?: {
    id: string
    name: string
    avatar?: string
    profileImage?: {
      url: string
    }
  }
  onPostUpdated?: (post: Post) => void
  className?: string
}

const MobileFeedPost = memo(function MobileFeedPost({ 
  post, 
  user, 
  onPostUpdated, 
  className = "" 
}: MobileFeedPostProps) {
  const dispatch = useAppDispatch()
  const { likedPosts, savedPosts, loadingLikes, loadingSaves } = useAppSelector((state) => state.posts)
  
  const [showComments, setShowComments] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Enhanced error handling for media
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [hasValidMedia, setHasValidMedia] = useState(false)

  // Process media from API response (preferred) or fallback to individual fields
  const mediaItems = useMemo(() => {
    // If post has a media array from API, use it directly (this is the correct approach for videos)
    if (Array.isArray(post.media) && post.media.length > 0) {
      console.log(`📱 MobileFeedPost ${post.id} using API media array:`, post.media)
      return post.media.map((item: any) => ({
        type: item.type,
        url: item.url,
        thumbnail: item.thumbnail,
        alt: item.alt || (item.type === 'video' ? 'Post video' : 'Post image')
      }))
    }

    // Fallback: reconstruct from individual fields (legacy support)
    const items: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string; alt?: string }> = []
    
    // Prioritize video if available
    if (post.video && typeof post.video === 'string') {
      items.push({ 
        type: 'video', 
        url: post.video,
        thumbnail: (post.image && typeof post.image === 'string') ? post.image : post.videoThumbnail,
        alt: "Post video"
      })
    }
    
    // Add main image only if no video
    if (post.image && typeof post.image === 'string' && !post.video) {
      items.push({ 
        type: 'image', 
        url: post.image,
        alt: "Post image"
      })
    }
    
    // Add photos, avoiding duplicates
    if (Array.isArray(post.photos)) {
      post.photos.forEach((photo, index) => {
        if (typeof photo === 'string' && photo !== post.image) {
          items.push({ 
            type: 'image', 
            url: photo,
            alt: `Photo ${index + 1}`
          })
        }
      })
    }
    
    console.log(`📱 MobileFeedPost ${post.id} using fallback media construction:`, items)
    return items
  }, [post.media, post.image, post.video, post.photos, post.videoThumbnail, post.id])

  const hasMedia = mediaItems.length > 0

  // Process media URLs with better error handling using proper image utils
  const processedImageUrl = useMemo(() => {
    return getImageUrl(post.image || post.featuredImage)
  }, [post.image, post.featuredImage])

  const processedVideoUrl = useMemo(() => {
    return getVideoUrl(post.video)
  }, [post.video])

  // Check if we have any valid media
  useEffect(() => {
    const hasImage = processedImageUrl && processedImageUrl !== "/placeholder.svg" && !imageError
    const hasVideo = processedVideoUrl && !videoError
    setHasValidMedia(hasImage || hasVideo)
  }, [processedImageUrl, processedVideoUrl, imageError, videoError])

  console.log(`📱 MobileFeedPost ${post.id} media check:`, {
    originalImage: post.image,
    processedImageUrl,
    imageError,
    hasValidMedia,
    environment: process.env.NODE_ENV
  })
  
  // Use Redux state as single source of truth
  const isLiked = likedPosts.includes(post.id)
  const isSaved = savedPosts.includes(post.id)
  const isLiking = loadingLikes.includes(post.id)
  const isSaving = loadingSaves.includes(post.id)
  
  // Use post data directly for counts (no local state that can get out of sync)
  const likeCount = post.likeCount || 0
  const saveCount = post.saveCount || 0
  const shareCount = post.shareCount || 0
  
  const [isSharing, setIsSharing] = useState(false)
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [showActions, setShowActions] = useState(true)
  const [isViewing, setIsViewing] = useState(false)
  const [viewTime, setViewTime] = useState(0)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)
  
  // Video player state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Get author profile image URL with robust fallbacks using proper image utility
  const getAuthorProfileImageUrl = useCallback(() => {
    const profileImageUrl = getImageUrl(
      post.author.profileImage?.url || 
      post.author.avatar || 
      post.author.profilePicture?.url || 
      post.author.profilePicture
    )
    // Fallback to placeholder if getImageUrl returns placeholder
    return profileImageUrl !== "/placeholder.svg" ? profileImageUrl : "/placeholder.svg"
  }, [post.author.profileImage?.url, post.author.avatar, post.author.profilePicture])
  
  // Auto-hide actions after 4 seconds, longer than before for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowActions(false)
    }, 4000)
    
    return () => clearTimeout(timer)
  }, [])

  // View time tracking (Instagram Reels feature)
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isViewing) {
      interval = setInterval(() => {
        setViewTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isViewing])

  // Intersection observer for view tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setIsViewing(entry.isIntersecting && entry.intersectionRatio > 0.7)
      },
      { threshold: [0.7] }
    )

    const postElement = document.getElementById(`mobile-post-${post.id}`)
    if (postElement) {
      observer.observe(postElement)
    }

    return () => observer.disconnect()
  }, [post.id])

  // Check initial like and save status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.id || !isMounted) return

      try {
        // Use Redux state as single source of truth
        const isLiked = likedPosts.includes(post.id)
        const isSaved = savedPosts.includes(post.id)
        const isLiking = loadingLikes.includes(post.id)
        const isSaving = loadingSaves.includes(post.id)
        
        // Use post data directly for counts (no local state that can get out of sync)
        const likeCount = post.likeCount || 0
        const saveCount = post.saveCount || 0
        const shareCount = post.shareCount || 0
      } catch (error) {
        console.error("Error checking post status:", error)
      }
    }

    checkStatus()
  }, [post.id, user?.id, isMounted, likedPosts, savedPosts, loadingLikes, loadingSaves, post.likeCount, post.saveCount, post.shareCount])

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Enhanced like action with proper Redux integration
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLiking) {
      return
    }

    mediumHaptics()
    setShowActions(true)
    const previousLiked = isLiked

    try {
      // Enhanced haptic pattern for likes
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30, 50, 100])
      }

      // Use Redux action with optimistic updates
      await dispatch(likePostAsync({
        postId: post.id,
        shouldLike: !previousLiked,
        userId: user?.id || '' // Keep for Redux state management, but API will use authenticated user
      })).unwrap()
      
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isLiked: !previousLiked,
          likeCount: !previousLiked ? likeCount + 1 : likeCount - 1
        })
      }

      toast.success(previousLiked ? "Unliked ✨" : "Liked! 💫")

    } catch (error) {
      console.error("Error liking post:", error)
      
      if (error instanceof Error && error.message.includes('not authenticated')) {
        toast.error("Please log in to like posts")
      } else {
        toast.error("Failed to like post")
      }
    }
  }, [isLiked, likeCount, post, user, onPostUpdated, isLiking, dispatch])

  // Enhanced share with native sharing API (Instagram Reels-style)
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSharing) return
    
    mediumHaptics()
    setShowActions(true)
    setIsSharing(true)
    
    try {
      if (isMounted && typeof navigator !== 'undefined' && navigator.share && typeof window !== 'undefined') {
        await navigator.share({
          title: post.title || `Check out this post by ${post.author.name}`,
          text: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
          url: `${window.location.origin}/post/${post.id}`
        })
      } else if (isMounted && typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined') {
        const postUrl = `${window.location.origin}/post/${post.id}`
        await navigator.clipboard.writeText(postUrl)
        toast.success("Link copied to clipboard! 📋")
      }

      // Track share if user is available
      if (user) {
        await dispatch(sharePostAsync({
          postId: post.id,
          userId: user.id || '' // Keep for Redux state management, but API will use authenticated user
        })).unwrap()
        
        if (onPostUpdated) {
          onPostUpdated({
            ...post,
            shareCount: shareCount + 1
          })
        }
        
        toast.success("Post shared successfully! 🚀")
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing post:", error)
        
        if (error.message.includes('not authenticated')) {
          toast.error("Please log in to track shares")
        } else {
          toast.error("Failed to share post")
        }
      }
    } finally {
      setIsSharing(false)
    }
  }, [post, user, isMounted, isSharing, shareCount, onPostUpdated, dispatch])

  // Enhanced save action with visual feedback
  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaving) return

    mediumHaptics()
    setShowActions(true)
    const previousSaved = isSaved

    try {
      const newIsSaved = !previousSaved
      
      // Use Redux optimistic update
      dispatch(toggleSaveOptimistic({ postId: post.id, isSaved: newIsSaved }))

      const result = await dispatch(savePostAsync({
        postId: post.id,
        shouldSave: newIsSaved,
        userId: user?.id || '' // Keep for Redux state management, but API will use authenticated user
      })).unwrap()
      
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isSaved: newIsSaved,
          saveCount: result.saveCount || (newIsSaved ? saveCount + 1 : saveCount - 1)
        })
      }
      
      toast.success(previousSaved ? "Removed from saved ✨" : "Saved to collection! 💫")

      if (navigator.vibrate) {
        navigator.vibrate(previousSaved ? [50] : [50, 30, 50])
      }
    } catch (error) {
      console.error("Error saving post:", error)
      
      if (error instanceof Error && error.message.includes('not authenticated')) {
        toast.error("Please log in to save posts")
      } else {
        toast.error("Failed to save post")
      }
    }
  }, [isSaved, post, user, isSaving, onPostUpdated, dispatch, saveCount])

  // Handle comment dialog
  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowActions(true)
    mediumHaptics()
    setShowCommentDialog(true)
  }, [])

  // Handle post tap to show/hide actions (Instagram Reels behavior)
  const handlePostTap = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowActions(prev => !prev)
    mediumHaptics()
  }, [])

  // Get dynamic gradient based on post content
  const getContentGradient = () => {
    if (post.image) {
      return "from-black/20 via-transparent to-black/90"
    }
    
    // Dynamic gradients based on content type
    const gradients = [
      "from-purple-900/90 via-blue-900/70 to-indigo-900/90",
      "from-pink-900/90 via-rose-900/70 to-red-900/90",
      "from-emerald-900/90 via-teal-900/70 to-cyan-900/90",
      "from-amber-900/90 via-orange-900/70 to-red-900/90",
      "from-violet-900/90 via-purple-900/70 to-pink-900/90"
    ]
    
    const index = post.id.charCodeAt(0) % gradients.length
    return gradients[index]
  }

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

  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration)
    }
  }, [])

  // Auto-play video when in view
  useEffect(() => {
    const video = videoRef.current
    if (video && hasMedia) {
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
  }, [hasMedia])

  return (
    <>
      <motion.div
        id={`mobile-post-${post.id}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`relative w-full bg-black overflow-hidden mobile-post-container ${className}`}
        style={{ 
          height: 'calc(100vh - 70px)', // Full viewport height minus mobile nav height
          width: '100vw',
          position: 'relative',
          minHeight: '400px'
        }}
        onTap={handlePostTap}
      >
        {/* Main Media with Enhanced Visual Effects */}
        <div className="absolute inset-0 w-full h-full">
          {processedVideoUrl && !videoError ? (
            <VideoPlayer
              src={processedVideoUrl}
              thumbnail={post.videoThumbnail || processedImageUrl}
              aspectRatio="9/16"
              className="w-full h-full object-cover"
              onViewStart={() => {
                // Track video view start
              }}
              onViewComplete={() => {
                // Track video view completion
              }}
              onError={() => setVideoError(true)}
              controls={false}
              showProgress={false}
              showPlayButton={false}
            />
          ) : processedImageUrl && !imageError ? (
            <div className="relative w-full h-full">
              <Image
                src={processedImageUrl}
                alt={post.title || "Post image"}
                fill
                className="object-cover w-full h-full"
                loading="lazy"
                sizes="100vw"
                unoptimized={processedImageUrl.includes('/api/media/file/')}
                onLoadingComplete={() => setIsLoadingImage(false)}
                onError={() => {
                  console.error(`Failed to load image: ${processedImageUrl}`)
                  setIsLoadingImage(false)
                  setImageError(true)
                }}
              />
              
              {/* Premium gradient overlay system */}
              <div className={`absolute inset-0 bg-gradient-to-b ${getContentGradient()} pointer-events-none`} />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10 pointer-events-none" />
              
              {/* Sophisticated edge vignette */}
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/30 pointer-events-none" 
                   style={{
                     background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)`
                   }} />
            </div>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getContentGradient()} flex items-center justify-center relative overflow-hidden`}>
              {/* Animated background elements */}
              <div className="absolute inset-0">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                    opacity: [0.1, 0.3, 0.1]
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-xl"
                />
                <motion.div
                  animate={{ 
                    scale: [1.2, 1, 1.2],
                    rotate: [360, 180, 0],
                    opacity: [0.2, 0.1, 0.2]
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full bg-white/5 blur-lg"
                />
              </div>
              
              <div className="text-center text-white/90 px-8 z-10">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  className="text-6xl mb-6"
                >
                  {processedImageUrl || processedVideoUrl ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    "📝"
                  )}
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl font-light leading-relaxed tracking-wide"
                >
                  {processedImageUrl || processedVideoUrl ? (
                    "Loading media..."
                  ) : (
                    "Text Post • Sharing thoughts and ideas"
                  )}
                </motion.p>
              </div>
            </div>
          )}

          {/* Enhanced loading state */}
          {isLoadingImage && post.image && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-white/40 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instagram Reels-Style Author Info - Top Left with Enhanced Design */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, x: -30, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -30, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute top-6 left-4 z-20"
            >
              <Link 
                href={`/profile/${post.author.id}`}
                className="group flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  {/* Enhanced profile avatar with Instagram-style design */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    {/* Instagram-style gradient ring */}
                    <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px] shadow-lg">
                      <div className="w-full h-full rounded-full bg-black p-[2px]">
                        <Avatar className="h-full w-full border-0 shadow-2xl">
                          <AvatarImage 
                            src={getAuthorProfileImageUrl()} 
                            alt={post.author.name} 
                            className="object-cover rounded-full"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 text-white font-bold text-sm rounded-full">
                            {getInitials(post.author.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    {/* Premium online indicator with pulse animation */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.7, 1]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-black shadow-lg"
                    >
                      <div className="w-full h-full rounded-full bg-green-400 animate-pulse" />
                    </motion.div>
                    
                    {/* Subtle glow effect on hover */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/20 via-red-500/20 to-purple-600/20 blur-md scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                </div>
                
                {/* Enhanced username display */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="backdrop-blur-xl bg-black/20 rounded-2xl px-4 py-2 border border-white/20 shadow-2xl group-hover:bg-black/30 transition-all duration-300"
                >
                  <p className="text-white font-semibold text-base tracking-wide truncate max-w-[120px]">
                    {post.author.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-white/70 text-xs">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                    {viewTime > 0 && (
                      <div className="flex items-center gap-1 text-white/60">
                        <Eye className="w-3 h-3" />
                        <span className="text-xs">{viewTime}s</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instagram Reels-Style Right Side Actions - Enhanced with More Effects */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4, staggerChildren: 0.1 }}
              className="absolute right-3 bottom-32 flex flex-col items-center space-y-4 z-20"
            >
              {/* Enhanced Like Button with Heart Explosion */}
              <motion.button
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="group relative"
                onClick={handleLike}
                disabled={isLiking}
              >
                <div className={`relative p-3 rounded-full backdrop-blur-xl border shadow-2xl transition-all duration-300 ${
                  isLiked 
                    ? 'bg-red-500/30 text-red-400 border-red-400/50 shadow-red-400/25' 
                    : 'bg-white/15 text-white hover:bg-white/25 border-white/30'
                }`}>
                  <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
                  
                  {/* Heart explosion effect */}
                  {isLiked && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.5, 0] }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 rounded-full"
                    >
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 1, scale: 0 }}
                          animate={{ 
                            opacity: 0, 
                            scale: 1,
                            x: Math.cos((i * 60) * Math.PI / 180) * 20,
                            y: Math.sin((i * 60) * Math.PI / 180) * 20
                          }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-400 rounded-full"
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
                
                <motion.span 
                  animate={{ scale: isLiking ? [1, 1.2, 1] : 1 }}
                  className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-sm bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full min-w-[2rem] text-center border border-white/20"
                >
                  {likeCount}
                </motion.span>
              </motion.button>

              {/* Enhanced Comment Button */}
              <motion.button
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 600, damping: 20, delay: 0.1 }}
                className="group relative"
                onClick={handleComment}
              >
                <div className="relative p-3 rounded-full backdrop-blur-xl bg-white/15 border border-white/30 hover:bg-white/25 transition-all duration-300 shadow-2xl">
                  <MessageCircle className="h-6 w-6 text-white" />
                  
                  {/* Comment ripple effect */}
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-white/30"
                  />
                </div>
                
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-sm bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full min-w-[2rem] text-center border border-white/20">
                  {post.commentCount || 0}
                </span>
              </motion.button>

              {/* More Actions Button */}
              <motion.button
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 600, damping: 20, delay: 0.2 }}
                className="group relative"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMoreActions(!showMoreActions)
                  mediumHaptics()
                }}
              >
                <div className="relative p-3 rounded-full backdrop-blur-xl bg-white/15 border border-white/30 hover:bg-white/25 transition-all duration-300 shadow-2xl">
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
                    {/* Enhanced Share Button */}
                    <motion.button
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0, y: 20 }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                      className="group relative"
                      onClick={handleShare}
                      disabled={isSharing}
                    >
                      <div className="relative p-3 rounded-full backdrop-blur-xl bg-white/15 border border-white/30 hover:bg-white/25 transition-all duration-300 shadow-2xl">
                        <Share2 className={`h-6 w-6 text-white ${isSharing ? 'animate-pulse' : ''}`} />
                      </div>
                      
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-sm bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full min-w-[2rem] text-center border border-white/20">
                        {shareCount}
                      </span>
                    </motion.button>

                    {/* Enhanced Save Button with Collection Animation */}
                    <motion.button
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0, y: 20 }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20, delay: 0.1 }}
                      className="group relative"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <div className={`relative p-3 rounded-full backdrop-blur-xl border shadow-2xl transition-all duration-300 ${
                        isSaved 
                          ? 'bg-yellow-500/30 text-yellow-400 border-yellow-400/50 shadow-yellow-400/25' 
                          : 'bg-white/15 text-white hover:bg-white/25 border-white/30'
                      }`}>
                        <Bookmark className={`h-6 w-6 ${isSaved ? 'fill-current' : ''}`} />
                        
                        {/* Save collection effect */}
                        {isSaved && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            className="absolute inset-0 rounded-full bg-yellow-400/20 animate-pulse"
                          />
                        )}
                      </div>
                      
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-sm bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full min-w-[2rem] text-center border border-white/20">
                        {saveCount}
                      </span>
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Bottom Content - Instagram Reels Style */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute bottom-0 left-0 right-0 p-4 z-10"
            >
              <div className="backdrop-blur-xl bg-black/30 rounded-2xl p-5 border border-white/10 shadow-2xl">
                {/* Music/Audio indicator (Instagram Reels feature) */}
                {(post.type === 'video' || post.image) && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 mb-3"
                  >
                    <div className="p-2 rounded-full bg-white/20">
                      <Music className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <motion.div
                        animate={{ x: [-100, 100] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="text-white/80 text-sm font-medium whitespace-nowrap"
                      >
                        🎵 Original Sound - {post.author.name}
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Enhanced Post Content */}
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white text-base leading-relaxed font-light mb-4 line-clamp-3"
                >
                  {post.content}
                </motion.p>

                {/* Enhanced Location and Metadata */}
                <div className="flex items-center justify-between text-white/60 text-sm">
                  <div className="flex items-center gap-4">
                    {post.location && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full"
                      >
                        <MapPin className="w-3 h-3" />
                        {typeof post.location === 'string' ? post.location : post.location.name}
                      </motion.span>
                    )}
                    
                    {/* View count indicator */}
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {Math.floor(Math.random() * 1000) + 100} views
                    </span>
                  </div>
                  
                  <span className="flex items-center gap-1">
                    <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Tap Indicator - Instagram Reels Style */}
        <AnimatePresence>
          {!showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1], 
                  opacity: [0.6, 1, 0.6],
                  rotate: [0, 180, 360]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-2xl"
              >
                <ArrowUp className="w-6 h-6 text-white animate-bounce" />
              </motion.div>
              
              <motion.p
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="text-white/80 text-sm font-light text-center mt-2"
              >
                Tap to interact
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium floating particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [-20, -100, -20],
                x: [0, Math.random() * 100 - 50, 0],
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
              className="absolute bottom-20 w-2 h-2 bg-white/30 rounded-full blur-sm"
              style={{
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Media content with enhanced video support */}
        <div className="relative">
          {/* Images */}
          {hasMedia && mediaItems.length > 0 && (
            <div className="relative mb-4">
              <div 
                className="relative w-full rounded-2xl overflow-hidden"
                style={{ aspectRatio: '16/10' }}
              >
                <Image
                  src={mediaItems[currentVideoIndex]?.url || '/placeholder-image.jpg'}
                  alt={`Post media ${currentVideoIndex + 1}`}
                  fill
                  className="object-cover"
                  priority={currentVideoIndex === 0}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={(mediaItems[currentVideoIndex]?.url || '').includes('/api/media/file/')}
                  onError={(e) => {
                    console.error('Image load error:', e)
                    e.currentTarget.src = '/placeholder-image.jpg'
                  }}
                />
                
                {/* Multiple images indicator */}
                {mediaItems.length > 1 && (
                  <div className="absolute top-3 right-3">
                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                      {currentVideoIndex + 1}/{mediaItems.length}
                    </div>
                  </div>
                )}
                
                {/* Navigation dots for multiple images */}
                {mediaItems.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {mediaItems.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentVideoIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentVideoIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Videos */}
          {post.video && (
            <div className="relative mb-4">
              <div 
                className="relative w-full rounded-2xl overflow-hidden bg-black"
                style={{ aspectRatio: '16/10' }}
              >
                <video
                  ref={videoRef}
                  src={post.video}
                  className="w-full h-full object-cover"
                  loop
                  muted={isVideoMuted}
                  playsInline
                  preload="metadata"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onClick={handleVideoPlay}
                />
                
                {/* Video controls overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent">
                  {/* Play/Pause button */}
                  <button
                    onClick={handleVideoPlay}
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <AnimatePresence>
                      {!isVideoPlaying && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-active:scale-95 transition-transform"
                        >
                          <Play className="h-8 w-8 text-gray-900 ml-1" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                  
                  {/* Video controls */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={handleVideoMute}
                      className="w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center"
                    >
                      {isVideoMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="w-full bg-white/30 rounded-full h-1">
                      <div 
                        className="bg-white rounded-full h-1 transition-all duration-100"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mixed media (both images and videos) */}
          {hasMedia && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setCurrentVideoIndex(0)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  currentVideoIndex >= 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Videos ({mediaItems.length})
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Enhanced Comments Dialog - Mobile Optimized */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] w-[95vw] bg-white border-0 shadow-2xl p-0 gap-0 rounded-t-2xl md:rounded-2xl">
          <DialogHeader className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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
          <div className="max-h-[80vh] overflow-y-auto bg-white">
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

export default MobileFeedPost 