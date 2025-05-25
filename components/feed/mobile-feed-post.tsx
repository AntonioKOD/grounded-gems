"use client"

import { useState, memo, useCallback, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  MessageCircle,
  Share2,
  MapPin,
  Heart,
  Bookmark,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RelativeTime } from "@/components/ui/relative-time"
import type { Post } from "@/types/feed"
import { getInitials } from "@/lib/utils"
import { mediumHaptics } from "@/lib/haptics"
import { likePost, sharePost } from "@/app/actions"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { savePostAsync, toggleSaveOptimistic } from "@/lib/features/posts/postsSlice"
import { CommentSystemDark } from "@/components/post/comment-system-dark"

interface MobileFeedPostProps {
  post: Post
  user?: {
    id: string
    name: string
    avatar?: string
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
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  
  // Get saved state from Redux
  const isSaved = savedPosts.includes(post.id)
  const isSaving = loadingSaves.includes(post.id)

  // Check initial like and save status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.id || !isMounted) return

      try {
        // Use the post's existing state instead of making separate API calls
        setIsLiked(post.isLiked || false)
        setSaveCount(post.saveCount || 0)
      } catch (error) {
        console.error("Error checking post status:", error)
      }
    }

    checkStatus()
  }, [post.id, user?.id, isMounted, post.isLiked, post.isSaved])

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Handle like action with safe server action handling
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || isLiking) {
      if (!user) {
        toast.error("Please log in to like posts")
      }
      return
    }

    mediumHaptics()
    setIsLiking(true)
    const previousLiked = isLiked
    const previousCount = likeCount

    try {
      // Optimistic update
      setIsLiked(!previousLiked)
      setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1)

      // Call server action
      await likePost(post.id, !previousLiked, user.id)
      
      // Update parent if needed
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isLiked: !previousLiked,
          likeCount: previousLiked ? previousCount - 1 : previousCount + 1
        })
      }

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error liking post:", error)
      toast.error("Failed to like post")

      // Revert optimistic update on error
      setIsLiked(previousLiked)
      setLikeCount(previousCount)
      
      // Update parent if needed
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
  }, [isLiked, likeCount, post, user, onPostUpdated, isLiking, mediumHaptics])

  // Handle share action
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSharing) return
    
    mediumHaptics()
    setIsSharing(true)
    
    try {
      // Use Web Share API if available and mounted
      if (isMounted && typeof navigator !== 'undefined' && navigator.share && typeof window !== 'undefined') {
        await navigator.share({
          title: post.title || `Post by ${post.author.name}`,
          text: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
          url: `${window.location.origin}/post/${post.id}`
        })
      } else if (isMounted && typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined') {
        // Copy link to clipboard
        const postUrl = `${window.location.origin}/post/${post.id}`
        await navigator.clipboard.writeText(postUrl)
        toast.success("Link copied to clipboard")
      } else {
        toast.success("Link copied to clipboard")
      }

      // Share functionality completed successfully

      // Call server action if user is logged in
      if (user) {
        try {
          await sharePost(post.id, user.id)
        } catch (error) {
          console.error("Error updating share count:", error)
          // Don't show error to user as the share functionality worked
        }
      }
    } catch (error) {
      // Only show error if it's not an abort error (user cancelled sharing)
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing post:", error)
        toast.error("Failed to share post")
      }
    } finally {
      setIsSharing(false)
    }
  }, [post, user, isMounted, isSharing])

  // Handle save action
  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast.error("Please log in to save posts")
      return
    }

    if (isSaving) return

    mediumHaptics()
    const previousSaved = isSaved

    try {
      const newIsSaved = !previousSaved
      
      // Optimistic update in Redux
      dispatch(toggleSaveOptimistic({ postId: post.id, isSaved: newIsSaved }))

      // Update local save count optimistically
      setSaveCount(prev => newIsSaved ? prev + 1 : prev - 1)

      // Call Redux async action
      const result = await dispatch(savePostAsync({
        postId: post.id,
        shouldSave: newIsSaved,
        userId: user.id
      })).unwrap()
      
      // Update save count with server response
      if (result.saveCount !== undefined) {
        setSaveCount(result.saveCount)
      }
      
      // Update parent if needed
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isSaved: newIsSaved,
          saveCount: result.saveCount || saveCount
        })
      }
      
      toast.success(previousSaved ? "Post removed from saved items" : "Post saved")

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error saving post:", error)
      toast.error("Failed to save post")
    }
  }, [isSaved, post, user, isSaving, onPostUpdated, dispatch, saveCount])



  // Update comment handler - auto-show comments
  const handleComment = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCommentDialog(true)
  }, [])

  // Handle post click to navigate to detail
  const handlePostClick = useCallback(() => {
    mediumHaptics()
    
    // Navigate to post detail page
    if (typeof window !== 'undefined') {
      window.location.href = `/post/${post.id}`
    }
  }, [post.id])

  return (
    <>
      <Card 
        className={`relative overflow-hidden border-none shadow-none bg-black/95 h-full ${className}`}
        onClick={handlePostClick}
      >
        {/* Media Container - Reduced height to make room for content */}
        {post.image && post.image !== "" && !imageError ? (
          <div className="absolute inset-0 bottom-[160px] bg-black">
            <Image
              src={post.image}
              alt={post.title || "Post image"}
              fill
              className="object-cover object-center transition-opacity duration-500"
              loading="lazy"
              sizes="100vw"
              onLoadingComplete={() => setIsLoadingImage(false)}
              onError={() => {
                setIsLoadingImage(false)
                setImageError(true)
              }}
            />
            {isLoadingImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-ping" />
                  <div className="absolute inset-0 border-2 border-white/40 rounded-full animate-pulse" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bottom-[160px] bg-gradient-to-br from-gray-900 to-black" />
        )}

        {/* Content Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90">
          {/* Location Tag - Top Right */}
          {post.location && (
            <div className="absolute top-4 right-4">
              <Badge 
                variant="outline" 
                className="bg-black/40 backdrop-blur-sm text-white/90 border-white/20 flex items-center gap-1.5 px-3 py-1.5 text-sm"
              >
                <MapPin className="h-3.5 w-3.5" />
                {typeof post.location === 'string' ? post.location : post.location.name}
              </Badge>
            </div>
          )}

          {/* Bottom Content Container - Increased height and better spacing */}
          <div className="absolute bottom-0 left-0 right-0 min-h-[160px] bg-gradient-to-t from-black via-black/80 to-transparent pt-16 px-4 pb-6">
            {/* Author Info and Content */}
            <div className="space-y-3 mb-4">
              <Link 
                href={`/profile/${post.author.id}`} 
                className="flex items-center gap-3 group"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar className="h-8 w-8 ring-2 ring-[#FF6B6B]/20 group-hover:ring-[#FF6B6B]/40 transition-all">
                  <AvatarImage 
                    src={post.author.avatar || "/placeholder-avatar.png"} 
                    alt={post.author.name} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                    {getInitials(post.author.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <span className="font-semibold text-white group-hover:text-[#FF6B6B] transition-colors">
                    {post.author.name}
                  </span>
                  {post.type !== "post" && (
                    <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 text-white/90 border-[#FF6B6B]/20 bg-[#FF6B6B]/10 backdrop-blur-sm">
                      {post.type === "review" ? "Review" : "Tip"}
                    </Badge>
                  )}
                  <div className="text-sm text-white/60">
                    <RelativeTime date={post.createdAt} />
                  </div>
                </div>
              </Link>

              {/* Post Content */}
              <p className="text-sm text-white/90 line-clamp-2 leading-relaxed">
                {post.content}
              </p>
            </div>

            {/* Action Buttons - Bottom Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-6">
                {/* Like Button */}
                <button
                  className="group flex items-center gap-2"
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  <div className={`p-1.5 rounded-full bg-[#FF6B6B]/10 backdrop-blur-sm group-hover:bg-[#FF6B6B]/20 transition-all transform group-active:scale-90 ${
                    isLiked ? 'text-[#FF6B6B]' : 'text-white'
                  }`}>
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current animate-like' : ''}`} />
                  </div>
                  <span className="text-xs font-medium text-white/90">{likeCount}</span>
                </button>

                {/* Comment Button */}
                <button
                  className="group flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleComment(e)
                  }}
                >
                  <div className="p-1.5 rounded-full bg-[#FF6B6B]/10 backdrop-blur-sm group-hover:bg-[#FF6B6B]/20 transition-all transform group-active:scale-90">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-white/90">{post.commentCount || 0}</span>
                </button>

                {/* Share Button */}
                <button
                  className="group flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleShare(e)
                  }}
                >
                  <div className="p-1.5 rounded-full bg-[#FF6B6B]/10 backdrop-blur-sm group-hover:bg-[#FF6B6B]/20 transition-all transform group-active:scale-90">
                    <Share2 className="h-4 w-4 text-white" />
                  </div>
                </button>
              </div>

              {/* Save Button */}
              <button
                className="group flex items-center gap-2"
                onClick={handleSave}
                disabled={isSaving}
              >
                <div className={`p-1.5 rounded-full bg-[#FF6B6B]/10 backdrop-blur-sm group-hover:bg-[#FF6B6B]/20 transition-all transform group-active:scale-90 ${
                  isSaved ? 'text-[#FFE66D]' : 'text-white'
                }`}>
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current animate-save' : ''}`} />
                </div>
                <span className="text-xs font-medium text-white/90">{saveCount}</span>
              </button>
            </div>
          </div>
        </div>
      </Card>



      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] bg-black/95 border-white/20 p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-white">Comments</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <CommentSystemDark 
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

export default MobileFeedPost 