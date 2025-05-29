"use client"

import { useState, memo, useCallback, useEffect } from "react"
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
  const { savedPosts, loadingSaves } = useAppSelector((state) => state.posts)
  
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [isSharing, setIsSharing] = useState(false)
  const [saveCount, setSaveCount] = useState(post.saveCount || 0)
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)
  const [showActions, setShowActions] = useState(true)
  const [isViewing, setIsViewing] = useState(false)
  const [viewTime, setViewTime] = useState(0)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)
  
  // Get saved state from Redux
  const isSaved = savedPosts.includes(post.id)
  const isSaving = loadingSaves.includes(post.id)

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
        setIsLiked(post.isLiked || false)
        setSaveCount(post.saveCount || 0)
        setLikeCount(post.likeCount || 0)
        setShareCount(post.shareCount || 0)
      } catch (error) {
        console.error("Error checking post status:", error)
      }
    }

    checkStatus()
  }, [post.id, user?.id, isMounted, post.isLiked, post.isSaved, post.likeCount, post.saveCount, post.shareCount])

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Enhanced like action with heart explosion effect
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || isLiking) {
      if (!user) {
        toast.error("Please log in to like posts")
      }
      return
    }

    mediumHaptics()
    setShowActions(true)
    setIsLiking(true)
    const previousLiked = isLiked
    const previousCount = likeCount

    try {
      // Optimistic update with animation
      setIsLiked(!previousLiked)
      setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1)

      // Enhanced haptic pattern for likes
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30, 50, 100])
      }

      await likePost(post.id, !previousLiked, user.id)
      
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isLiked: !previousLiked,
          likeCount: previousLiked ? previousCount - 1 : previousCount + 1
        })
      }

    } catch (error) {
      console.error("Error liking post:", error)
      toast.error("Failed to like post")
      setIsLiked(previousLiked)
      setLikeCount(previousCount)
      
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isLiked: previousLiked,
          likeCount: previousCount
        })
      }
    } finally {
      setIsLiking(false)
    }
  }, [isLiked, likeCount, post, user, onPostUpdated, isLiking])

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

      setShareCount(prev => prev + 1)

      if (user) {
        await sharePost(post.id, user.id)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing post:", error)
        toast.error("Failed to share post")
      }
    } finally {
      setIsSharing(false)
    }
  }, [post, user, isMounted, isSharing])

  // Enhanced save action with visual feedback
  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast.error("Please log in to save posts")
      return
    }

    if (isSaving) return

    mediumHaptics()
    setShowActions(true)
    const previousSaved = isSaved

    try {
      const newIsSaved = !previousSaved
      
      dispatch(toggleSaveOptimistic({ postId: post.id, isSaved: newIsSaved }))
      setSaveCount(prev => newIsSaved ? prev + 1 : prev - 1)

      const result = await dispatch(savePostAsync({
        postId: post.id,
        shouldSave: newIsSaved,
        userId: user.id
      })).unwrap()
      
      if (result.saveCount !== undefined) {
        setSaveCount(result.saveCount)
      }
      
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isSaved: newIsSaved,
          saveCount: result.saveCount || saveCount
        })
      }
      
      toast.success(previousSaved ? "Removed from saved ✨" : "Saved to collection! 💫")

      if (navigator.vibrate) {
        navigator.vibrate(previousSaved ? [50] : [50, 30, 50])
      }
    } catch (error) {
      console.error("Error saving post:", error)
      toast.error("Failed to save post")
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
          {post.image && post.image !== "" && !imageError ? (
            <div className="relative w-full h-full">
              <Image
                src={post.image}
                alt={post.title || "Post image"}
                fill
                className="object-cover w-full h-full"
                loading="lazy"
                sizes="100vw"
                onLoadingComplete={() => setIsLoadingImage(false)}
                onError={() => {
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
                  className="text-6xl mb-6 animate-pulse"
                >
                  ✨
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl font-light leading-relaxed tracking-wide"
                >
                  {post.content}
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
                  {/* Enhanced profile avatar with glow effect */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-white/40 group-hover:ring-white/60 transition-all duration-300 shadow-2xl">
                      <AvatarImage 
                        src={
                          post.author.profileImage?.url || 
                          post.author.avatar || 
                          (typeof post.author.profilePicture === 'string' ? post.author.profilePicture : post.author.profilePicture?.url) ||
                          "/placeholder-avatar.png"
                        } 
                        alt={post.author.name} 
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm">
                        {getInitials(post.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Premium online indicator */}
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-lg"
                    />
                    
                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 rounded-full bg-white/10 blur-lg scale-110 group-hover:bg-white/20 transition-all duration-300" />
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