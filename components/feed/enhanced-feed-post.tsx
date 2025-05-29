"use client"

import { useState, memo, useCallback, useEffect } from "react"
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
} from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import VideoPlayer from "./video-player"
import type { Post } from "@/types/feed"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { likePostAsync, savePostAsync, sharePostAsync } from "@/lib/features/posts/postsSlice"

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
  const dispatch = useAppDispatch()
  const { likedPosts, savedPosts, loadingLikes, loadingSaves, loadingShares } = useAppSelector((state) => state.posts)
  
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

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
        setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.5)
      },
      { threshold: [0.5] }
    )

    const postElement = document.getElementById(`post-${post.id}`)
    if (postElement) {
      observer.observe(postElement)
    }

    return () => observer.disconnect()
  }, [post.id])

  // Handle like action with haptics and animations
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!user) {
      toast.error("Please log in to like posts")
      return
    }

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
        userId: user.id
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
      toast.error("Failed to like post")
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

      toast.success("Link copied!")
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

  // Handle comment action
  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Navigate to post detail for comments
    window.location.href = `/post/${post.id}`
  }, [post.id])

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
      {/* Main Media */}
      <div className="absolute inset-0 w-full h-full">
        {post.video && !imageError ? (
          <VideoPlayer
            src={post.video}
            thumbnail={post.videoThumbnail || post.image}
            aspectRatio="9/16"
            onViewStart={() => {
              // Track view start
            }}
            onViewComplete={() => {
              // Track view completion
            }}
            className="w-full h-full object-cover"
            controls={false}
            showProgress={false}
            showPlayButton={false}
          />
        ) : post.image && !imageError ? (
          <Image
            src={post.image}
            alt={post.title || "Post image"}
            fill
            className="object-cover w-full h-full"
            loading={priority !== undefined && priority < 3 ? undefined : "lazy"}
            sizes="100vw"
            priority={priority !== undefined && priority < 3}
            onLoadingComplete={() => setIsLoadingImage(false)}
            onError={() => {
              setIsLoadingImage(false)
              setImageError(true)
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center text-white/80 px-8">
              <div className="text-8xl mb-6 animate-pulse">✨</div>
              <p className="text-xl font-light leading-relaxed">{post.content}</p>
            </div>
          </div>
        )}

        {isLoadingImage && post.image && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-white/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-transparent to-black/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/20 pointer-events-none" />

      {/* Author Avatar - Top Left */}
      <div className="absolute top-12 left-4 z-20">
        <Link 
          href={`/profile/${post.author.id}`}
          className="group flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-white/30 group-hover:ring-white/50 transition-all duration-300 shadow-2xl">
              <AvatarImage 
                src={
                  post.author.profileImage?.url || 
                  post.author.avatar || 
                  (typeof post.author.profilePicture === 'string' ? post.author.profilePicture : post.author.profilePicture?.url) ||
                  "/placeholder.svg"
                } 
                alt={post.author.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-base">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg animate-pulse" />
          </div>
        </Link>
      </div>

      {/* Right Side Actions - Enhanced TikTok Style */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-4 z-20">
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

        {/* Share Button */}
        <motion.button
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
          className="group relative"
          onClick={handleSave}
          disabled={isSaving}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
      </div>

      {/* Bottom Content with Enhanced Glassmorphism */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="backdrop-blur-xl bg-black/20 rounded-3xl p-6 border border-white/10 shadow-2xl">
          {/* Post Content */}
          <p className="text-white text-lg leading-relaxed font-light mb-4 line-clamp-3">
            {post.content}
          </p>

          {/* Location and Time */}
          <div className="flex items-center justify-between text-white/60 text-sm">
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
      {post.video && (
        <div 
          className="absolute inset-0 md:hidden z-5"
          onClick={(e) => {
            e.stopPropagation()
            // Video tap handling will be managed by VideoPlayer
          }}
        />
      )}
    </motion.div>
  )
})

export default EnhancedFeedPost 