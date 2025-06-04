"use client"

import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import CommentsModal from './comments-modal'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { likePostAsync, savePostAsync, sharePostAsync } from '@/lib/features/posts/postsSlice'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from "@/components/ui/badge"
import { CommentSystemDark } from "../post/comment-system-dark"
import { getImageUrl, getVideoUrl } from '@/lib/image-utils'

/* eslint-disable @typescript-eslint/no-unused-vars */

// Define a type for the Media object based on the provided JSON
interface PayloadMediaObject {
  id: string;
  url?: string; // Full size
  thumbnailURL?: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
  alt?: string;
  sizes?: {
    thumbnail?: {
      url?: string;
      width?: number;
      height?: number;
    };
    card?: {
      url?: string;
      width?: number;
      height?: number;
    };
    // Add other potential sizes if needed
  };
  // other fields like createdAt, updatedAt etc. can be added if needed
}

// Updated Post interface
interface Post {
  id: string;
  content: string;
  title?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    profileImage?: {
      url: string;
    };
  };
  image?: string | PayloadMediaObject | boolean; // Can be URL, object, or boolean flag
  video?: string | PayloadMediaObject | boolean; // Can be URL, object, or boolean flag
  videoThumbnail?: string;
  photos?: (string | PayloadMediaObject)[]; // Array can contain URLs or media objects
  location?: {
    id: string;
    name: string;
  };
  type: string;
  rating?: number;
  tags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
  rawData?: {
    image?: string; // Expected to be a direct URL string
    video?: string; // Expected to be a direct URL string
    photos?: string[]; // Expected to be direct URL strings
  };
}

interface SocialMediaPostProps {
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
  variant?: 'mobile' | 'desktop'
  isActive?: boolean // For video autoplay
}

const SocialMediaPost = memo(function SocialMediaPost({ 
  post, 
  user, 
  onPostUpdated, 
  className = "",
  variant = 'mobile',
  isActive = false
}: SocialMediaPostProps) {
  const dispatch = useAppDispatch()
  
  // Redux state
  const { likedPosts, savedPosts, loadingLikes, loadingSaves } = useAppSelector((state) => state.posts)
  
  // Local state
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Process and normalize media data using proper image utilities
  const imageUrl = useMemo(() => {
    const url = getImageUrl(post.image || post.featuredImage)
    return url !== "/placeholder.svg" ? url : null
  }, [post.image, post.featuredImage])

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

  // Create media items array for carousel - simplified
  const mediaItems = useMemo(() => {
    const items: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string }> = []
    
    // Add main image
    if (imageUrl) {
      items.push({ type: 'image', url: imageUrl })
    }
    
    // Add main video
    if (videoUrl) {
      items.push({ 
        type: 'video', 
        url: videoUrl,
        thumbnail: imageUrl || undefined
      })
    }
    
    // Add photos
    photos.forEach(photoUrl => {
      if (photoUrl) {
        items.push({ type: 'image', url: photoUrl })
      }
    })
    
    return items
  }, [imageUrl, videoUrl, photos])

  const hasMedia = mediaItems.length > 0
  const currentMedia = mediaItems[currentMediaIndex]

  console.log(`📱 Post ${post.id} using getImageUrl:`, {
    originalImage: post.image,
    imageUrl,
    videoUrl,
    photos,
    mediaItems: mediaItems.length,
    hasMedia
  })

  // Check interaction states with improved fallback logic
  const isLiked = (() => {
    // Priority 1: If post has explicit state from server and it's not undefined
    if (post.isLiked !== undefined && post.isLiked !== null) {
      return post.isLiked
    }
    // Priority 2: Check Redux state (user's interaction history)
    return likedPosts.includes(post.id)
  })()
  
  const isSaved = (() => {
    // Priority 1: If post has explicit state from server and it's not undefined
    if (post.isSaved !== undefined && post.isSaved !== null) {
      return post.isSaved
    }
    // Priority 2: Check Redux state (user's interaction history)
    return savedPosts.includes(post.id)
  })()
  
  const isLiking = loadingLikes.includes(post.id)
  const isSaving = loadingSaves.includes(post.id)

  // User profile helpers
  const getAuthorProfileImageUrl = () => {
    if (post.author.profileImage?.url) return post.author.profileImage.url
    if (post.author.avatar) return post.author.avatar
    return "/placeholder.svg"
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Interaction handlers
  const handleLike = useCallback(async () => {
    if (!user || isLiking) return
    
    try {
      const result = await dispatch(likePostAsync({
        postId: post.id,
        shouldLike: !isLiked,
        userId: user.id
      })).unwrap()
      
      // Update the post with the latest server data if onPostUpdated is available
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isLiked: !isLiked,
          likeCount: result.likeCount !== undefined ? result.likeCount : (isLiked ? post.likeCount - 1 : post.likeCount + 1)
        })
      }

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error('Error liking post:', error)
      toast.error('Failed to like post')
    }
  }, [dispatch, post, user, isLiked, isLiking, onPostUpdated])

  const handleSave = useCallback(async () => {
    if (!user || isSaving) return
    
    try {
      const result = await dispatch(savePostAsync({
        postId: post.id,
        shouldSave: !isSaved,
        userId: user.id
      })).unwrap()
      
      // Update the post with the latest server data if onPostUpdated is available
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isSaved: !isSaved,
          saveCount: result.saveCount !== undefined ? result.saveCount : (isSaved ? post.saveCount - 1 : post.saveCount + 1)
        })
      }

      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
      
      toast.success(isSaved ? 'Removed from saved' : 'Added to saved')
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error('Failed to save post')
    }
  }, [dispatch, post, user, isSaved, isSaving, onPostUpdated])

  const handleShare = useCallback(async () => {
    if (isSharing) return
    
    setIsSharing(true)
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || `Check out this post by ${post.author.name}`,
          text: post.content,
          url: `${window.location.origin}/post/${post.id}`
        })
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
        toast.success('Link copied to clipboard!')
      }

      if (user) {
        await dispatch(sharePostAsync({
          postId: post.id,
          userId: user.id
        })).unwrap()
      }
    } catch (error) {
      console.error('Error sharing post:', error)
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to share post')
      }
    } finally {
      setIsSharing(false)
    }
  }, [dispatch, post, user, isSharing])

  // Handle comment button click
  const handleComment = useCallback(() => {
    setShowComments(true)
  }, [])

  // Navigation functions - work with currentMediaIndex
  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length)
  }
  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
  }

  // Use the post's like count directly - server handles all counting
  const displayLikeCount = post.likeCount || 0

  // Get container height for different variants
  const getContainerHeight = () => {
    if (variant === 'mobile') {
      return 'h-screen'
    } else {
      return 'h-96 md:h-[500px]'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative w-full bg-black text-white overflow-hidden group",
        getContainerHeight(),
        className
      )}
    >
      {/* Media Section */}
      {hasMedia && currentMedia ? (
        <div className="relative w-full h-full">
          {/* Media Content */}
          <div className="relative w-full h-full overflow-hidden">
            {currentMedia.type === 'image' ? (
              <Image
                src={currentMedia.url}
                alt={post.title || post.content}
                fill
                quality={90}
                priority={isActive}
                className="object-cover"
                unoptimized={true}
                onLoad={() => {
                  setIsImageLoaded(true)
                  if (hasError) setHasError(false)
                }}
                onError={() => {
                  setIsImageLoaded(false)
                  setHasError(true)
                }}
              />
            ) : (
              <video
                ref={videoRef}
                src={currentMedia.url}
                poster={currentMedia.thumbnail}
                autoPlay={true}
                muted
                loop
                playsInline // Important for iOS
                className="w-full h-full object-cover"
                onLoadedData={() => {
                  setIsVideoLoaded(true)
                  if (hasError) setHasError(false)
                }}
                onError={() => {
                  console.warn('Video failed to load:', currentMedia.url)
                  setHasError(true)
                  setIsVideoLoaded(false)
                }}
                controls={false} // Keep controls hidden for TikTok style
              />
            )}
          </div>
        </div>
      ) : (
        // Fallback gradient background for text-only posts
        <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-lg font-medium opacity-90">Text Post</p>
            <p className="text-sm opacity-70 mt-1">Sharing thoughts and ideas</p>
          </div>
        </div>
      )}

      {/* Media Navigation Indicators */}
      {mediaItems.length > 1 && (
        <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 z-20 flex gap-1">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentMediaIndex(index)}
              className={cn(
                "w-6 h-1 md:w-8 md:h-1 rounded-full transition-all",
                index === currentMediaIndex 
                  ? 'bg-white shadow-lg' 
                  : 'bg-white/40 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      )}

      {/* Right Side Action Bar (TikTok Style) - Moved higher up for better accessibility */}
      <div className="absolute right-2 md:right-4 bottom-40 md:bottom-44 z-20 flex flex-col gap-3 md:gap-4">
        {/* Like Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          disabled={isLiking || !user}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-lg border border-white/20",
            isLiked 
              ? 'bg-red-500/90 text-white border-red-500/50' 
              : 'bg-black/60 hover:bg-black/80 text-white hover:border-white/40'
          )}>
            <Heart className={cn("h-5 w-5 md:h-6 md:w-6", isLiked && "fill-current")} />
          </div>
          <span className="text-xs text-white/90 font-medium drop-shadow-lg min-w-[20px] text-center">
            {displayLikeCount > 0 ? displayLikeCount.toLocaleString() : ''}
          </span>
        </motion.button>

        {/* Comment Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleComment}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-all backdrop-blur-sm shadow-lg border border-white/20 hover:border-white/40">
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <span className="text-xs text-white/90 font-medium drop-shadow-lg min-w-[20px] text-center">
            {post.commentCount > 0 ? post.commentCount.toLocaleString() : ''}
          </span>
        </motion.button>

        {/* Share Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          disabled={isSharing}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-all backdrop-blur-sm shadow-lg border border-white/20 hover:border-white/40">
            <Share2 className={cn("h-5 w-5 md:h-6 md:w-6 text-white", isSharing && "animate-pulse")} />
          </div>
          <span className="text-xs text-white/90 font-medium drop-shadow-lg min-w-[20px] text-center">
            {post.shareCount > 0 ? post.shareCount.toLocaleString() : ''}
          </span>
        </motion.button>

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSave}
          disabled={isSaving || !user}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-sm shadow-lg border border-white/20",
            isSaved 
              ? 'bg-yellow-500/90 text-white border-yellow-500/50' 
              : 'bg-black/60 hover:bg-black/80 text-white hover:border-white/40'
          )}>
            <Bookmark className={cn("h-5 w-5 md:h-6 md:w-6", isSaved && "fill-current")} />
          </div>
          <span className="text-xs text-white/90 font-medium drop-shadow-lg min-w-[20px] text-center">
            {post.saveCount > 0 ? post.saveCount.toLocaleString() : ''}
          </span>
        </motion.button>
      </div>

      {/* Bottom Content Area - Better mobile spacing and navigation clearance */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 md:p-6 pb-20 md:pb-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        {/* Author Info */}
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <Link href={`/profile/${post.author.id}`} className="flex items-center gap-2 md:gap-3 group/author">
            <div className="relative">
              <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-2 ring-white/30 group-hover/author:ring-white/50 transition-all">
                <AvatarImage src={getAuthorProfileImageUrl()} alt={post.author.name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-xs">
                  {getInitials(post.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border border-black" />
            </div>
            <div>
              <p className="font-bold text-sm md:text-base text-white drop-shadow-lg">
                {post.author.name}
              </p>
              <p className="text-xs text-white/80 drop-shadow-lg">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
          {post.rating && (
            <div className="flex items-center gap-1 ml-auto">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium text-xs md:text-sm">{post.rating}/5</span>
            </div>
          )}
        </div>

        {/* Location */}
        {post.location && (
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 text-white flex-shrink-0" />
            <span className="text-white/90 text-xs md:text-sm font-medium truncate">
              {post.location.name}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="mb-3 md:mb-4">
          <p className={cn(
            "text-white text-sm md:text-base leading-relaxed",
            !showFullContent && post.content.length > 120 && "line-clamp-2 md:line-clamp-3"
          )}>
            {post.content}
          </p>
          {post.content.length > 120 && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-white/80 text-xs md:text-sm font-medium mt-1 hover:text-white transition-colors"
            >
              {showFullContent ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 md:gap-2 max-w-[calc(100%-80px)]">
            {post.tags.slice(0, 3).map((tag, index) => {
              const tagText = typeof tag === 'object' && tag !== null && 'tag' in tag 
                ? (tag as any).tag 
                : typeof tag === 'string' 
                ? tag 
                : String(tag)
              
              return (
                <span 
                  key={index}
                  className="bg-white/20 backdrop-blur-sm text-white text-xs md:text-sm px-2 md:px-3 py-1 rounded-full hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0"
                >
                  #{tagText}
                </span>
              )
            })}
            {post.tags.length > 3 && (
              <span className="text-white/60 text-xs md:text-sm px-2 py-1">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading States */}
      {currentMedia?.type === 'image' && !isImageLoaded && hasMedia && !hasError && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
        user={user}
        commentCount={post.commentCount}
      />
    </motion.div>
  )
})

export default SocialMediaPost 