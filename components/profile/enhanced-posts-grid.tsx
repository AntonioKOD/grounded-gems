"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Bookmark, Play, Image as ImageIcon, MapPin, ChevronLeft, ChevronRight, X, Share2, Video, Star, TrendingUp, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getImageUrl, getVideoUrl } from "@/lib/image-utils"
import MediaCarousel from "@/components/ui/media-carousel"

interface Post {
  id: string
  title?: string
  content?: string
  image?: any
  video?: any
  videos?: any[]
  photos?: any[]
  media?: Array<{
    type: 'image' | 'video'
    url: string
    thumbnail?: string
    alt?: string
    duration?: number
  }>
  createdAt: string
  likeCount?: number
  commentCount?: number
  type?: string
  rating?: number
  location?: {
    id: string
    name: string
  }
  videoThumbnail?: string
}

interface EnhancedPostsGridProps {
  posts: Post[]
  isCurrentUser: boolean
  gridType?: 'dynamic' | 'masonry' | 'alternating'
}

interface PostModalProps {
  post: Post
  isOpen: boolean
  onClose: () => void
  onLike?: (postId: string) => void
  onSave?: (postId: string) => void
}

function PostModal({ post, isOpen, onClose, onLike, onSave }: PostModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Helper function to get media for a post
  const getPostMedia = (post: Post) => {
    const media = []
    
    // If post already has media array, use it
    if (post.media && Array.isArray(post.media)) {
      return post.media
    }
    
    // Otherwise, construct media array from individual fields
    
    // Add main video first (if exists)
    const videoUrl = getVideoUrl(post.video)
    
    if (videoUrl) {
      // Get video thumbnail - prioritize post's videoThumbnail field
      let videoThumbnail = null
      
      // 1. Check if post has a videoThumbnail field (from Posts collection)
      if (post.videoThumbnail) {
        videoThumbnail = getImageUrl(post.videoThumbnail)
      }
      // 2. Fallback to main image if no video thumbnail
      else if (post.image) {
        const imageUrl = getImageUrl(post.image)
        if (imageUrl !== '/placeholder.svg') {
          videoThumbnail = imageUrl
        }
      }
      // 3. Use placeholder if no thumbnail available
      if (!videoThumbnail || videoThumbnail === '/placeholder.svg') {
        videoThumbnail = '/api/media/placeholder-video-thumbnail'
      }
      
      const videoMedia = {
        type: 'video' as const,
        url: videoUrl,
        thumbnail: videoThumbnail,
        alt: 'Post video',
        duration: undefined
      }
      
      media.push(videoMedia)
    } else {
      // If getVideoUrl returns null, try to construct URL manually
      if (post.video && typeof post.video === 'object' && post.video.filename) {
        const manualVideoUrl = `/api/media/file/${post.video.filename}`
        const videoMedia = {
          type: 'video' as const,
          url: manualVideoUrl,
          thumbnail: '/api/media/placeholder-video-thumbnail',
          alt: 'Post video',
          duration: undefined
        }
        media.push(videoMedia)
      } else if (post.video && typeof post.video === 'object' && post.video.url) {
        // If video object has a direct URL, use it
        const videoMedia = {
          type: 'video' as const,
          url: post.video.url,
          thumbnail: '/api/media/placeholder-video-thumbnail',
          alt: 'Post video',
          duration: undefined
        }
        media.push(videoMedia)
      } else if (post.video && typeof post.video === 'object') {
        // Last resort: try to construct URL from any available field
        const videoObj = post.video as any
        let fallbackUrl = null
        
        if (videoObj.url) {
          fallbackUrl = videoObj.url
        } else if (videoObj.filename) {
          fallbackUrl = `/api/media/file/${videoObj.filename}`
        } else if (videoObj.id) {
          fallbackUrl = `/api/media/file/${videoObj.id}`
        }
        
        if (fallbackUrl) {
          const videoMedia = {
            type: 'video' as const,
            url: fallbackUrl,
            thumbnail: '/api/media/placeholder-video-thumbnail',
            alt: 'Post video',
            duration: undefined
          }
          media.push(videoMedia)
        }
      }
    }
    
    // Add videos array
    if (post.videos && Array.isArray(post.videos)) {
      post.videos.forEach(video => {
        const url = getVideoUrl(video)
        if (url) {
          media.push({
            type: 'video' as const,
            url,
            thumbnail: '/api/media/placeholder-video-thumbnail',
            alt: 'Post video'
          })
        }
      })
    }
    
    // Add main image (only if no video)
    if (!videoUrl && post.image) {
      const imageUrl = getImageUrl(post.image)
      if (imageUrl !== '/placeholder.svg') {
        media.push({
          type: 'image' as const,
          url: imageUrl,
          alt: 'Post image'
        })
      }
    }
    
    // Add photos array
    if (post.photos && Array.isArray(post.photos)) {
      post.photos.forEach((photo, index) => {
        const imageUrl = getImageUrl(photo)
        if (imageUrl !== '/placeholder.svg') {
          media.push({
            type: 'image' as const,
            url: imageUrl,
            alt: `Photo ${index + 1}`
          })
        }
      })
    }
    
    return media
  }

  // Helper function to determine if post has video content
  const hasVideoContent = (post: Post) => {
    // Primary check: post has video field
    if (post.video) {
      return true
    }
    
    // Check if post has videos array
    if (post.videos && Array.isArray(post.videos) && post.videos.length > 0) {
      return true
    }
    
    // Check if post has media array with video
    if (post.media && Array.isArray(post.media)) {
      return post.media.some(item => item.type === 'video')
    }
    // Check if the post has a video-related type
    if (post.type === 'video') {
      return true
    }
    if (post.video && typeof post.video === 'object') {
      if (post.video.mimeType?.startsWith('video/') || post.video.isVideo) {
        return true
      }
    }
    
    // Additional check: if the post has a video URL string
    if (typeof post.video === 'string' && post.video.includes('video')) {
      return true
    }
    
    // Check for video in the post content or title
    if (post.content?.toLowerCase().includes('video') || post.title?.toLowerCase().includes('video')) {
      return true
    }
    
    return false
  }

  // Helper function to get primary display URL for grid thumbnail
  const getPrimaryDisplayUrl = (post: Post) => {
    const media = getPostMedia(post)
    if (media.length > 0) {
      // For videos, use thumbnail if available, otherwise use video URL
      if (media[0]?.type === 'video') {
        // If video has a thumbnail, use it
        if (media[0]?.thumbnail && media[0].thumbnail !== '/placeholder.svg' && media[0].thumbnail !== '/api/media/placeholder-video-thumbnail') {
          return media[0].thumbnail
        }
        // Otherwise, use placeholder thumbnail for videos
        return '/api/media/placeholder-video-thumbnail'
      }
      return media[0]?.url
    }
    
    // Fallback to legacy fields
    const imageUrl = getImageUrl(post.image)
    return imageUrl !== '/placeholder.svg' ? imageUrl : null
  }

  const postMedia = getPostMedia(post)
  const isVideo = hasVideoContent(post)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-white">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {post.title || "Post"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col lg:flex-row h-full">
          {/* Media Section */}
          <div className="flex-1 bg-black">
            {postMedia.length > 0 ? (
              <MediaCarousel 
                media={postMedia}
                showControls={true}
                showThumbnails={postMedia.length > 1}
                autoPlay={isVideo}
                className="h-full"
              />
            ) : (
              <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="w-full lg:w-80 p-6 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="space-y-4">
              {/* Post content */}
              {post.content && (
                <p className="text-gray-700 leading-relaxed">{post.content}</p>
              )}
              
              {/* Post metadata */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatDate(post.createdAt)}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{post.likeCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.commentCount || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Location */}
              {post.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{post.location.name}</span>
                </div>
              )}
              
              {/* Rating */}
              {post.rating && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{post.rating}/5</span>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onLike?.(post.id)}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Like
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onSave?.(post.id)}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function EnhancedPostsGrid({ posts, isCurrentUser, gridType = 'dynamic' }: EnhancedPostsGridProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({})
  const [hoveredPost, setHoveredPost] = useState<string | null>(null)

  const handleImageLoad = (postId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [postId]: false }))
  }

  const handleImageLoadStart = (postId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [postId]: true }))
  }

  // Helper function to determine if post has video content
  const hasVideoContent = (post: Post) => {
    // Primary check: post has video field
    if (post.video) {
      return true
    }
    
    // Check if post has videos array
    if (post.videos && Array.isArray(post.videos) && post.videos.length > 0) {
      return true
    }
    
    // Check if post has media array with video
    if (post.media && Array.isArray(post.media)) {
      return post.media.some(item => item.type === 'video')
    }
    
    // Check if the post has a video-related field that indicates it's a video
    if (post.type === 'video') {
      return true
    }
    
    // Check if the video object has video-specific properties
    if (post.video && typeof post.video === 'object') {
      if (post.video.mimeType?.startsWith('video/') || post.video.isVideo) {
        return true
      }
    }
    
    // Additional check: if the post has a video URL string
    if (typeof post.video === 'string' && post.video.includes('video')) {
      return true
    }
    
    // Check for video in the post content or title
    if (post.content?.toLowerCase().includes('video') || post.title?.toLowerCase().includes('video')) {
      return true
    }
    
    return false
  }

  // Helper function to get media for a post
  const getPostMedia = (post: Post) => {
    const media = []
    
    // If post already has media array, use it
    if (post.media && Array.isArray(post.media)) {
      return post.media
    }
    
    // Otherwise, construct media array from individual fields
    
    // Add main video first (if exists)
    const videoUrl = getVideoUrl(post.video)
    
    if (videoUrl) {
      // Get video thumbnail - prioritize post's videoThumbnail field
      let videoThumbnail = null
      
      // 1. Check if post has a videoThumbnail field (from Posts collection)
      if (post.videoThumbnail) {
        videoThumbnail = getImageUrl(post.videoThumbnail)
      }
      // 2. Fallback to main image if no video thumbnail
      else if (post.image) {
        const imageUrl = getImageUrl(post.image)
        if (imageUrl !== '/placeholder.svg') {
          videoThumbnail = imageUrl
        }
      }
      // 3. Use placeholder if no thumbnail available
      if (!videoThumbnail || videoThumbnail === '/placeholder.svg') {
        videoThumbnail = '/api/media/placeholder-video-thumbnail'
      }
      
      const videoMedia = {
        type: 'video' as const,
        url: videoUrl,
        thumbnail: videoThumbnail,
        alt: 'Post video',
        duration: undefined
      }
      
      media.push(videoMedia)
    } else {
      // If getVideoUrl returns null, try to construct URL manually
      if (post.video && typeof post.video === 'object' && post.video.filename) {
        const manualVideoUrl = `/api/media/file/${post.video.filename}`
        const videoMedia = {
          type: 'video' as const,
          url: manualVideoUrl,
          thumbnail: '/api/media/placeholder-video-thumbnail',
          alt: 'Post video',
          duration: undefined
        }
        media.push(videoMedia)
      } else if (post.video && typeof post.video === 'object' && post.video.url) {
        // If video object has a direct URL, use it
        const videoMedia = {
          type: 'video' as const,
          url: post.video.url,
          thumbnail: '/api/media/placeholder-video-thumbnail',
          alt: 'Post video',
          duration: undefined
        }
        media.push(videoMedia)
      } else if (post.video && typeof post.video === 'object') {
        // Last resort: try to construct URL from any available field
        const videoObj = post.video as any
        let fallbackUrl = null
        
        if (videoObj.url) {
          fallbackUrl = videoObj.url
        } else if (videoObj.filename) {
          fallbackUrl = `/api/media/file/${videoObj.filename}`
        } else if (videoObj.id) {
          fallbackUrl = `/api/media/file/${videoObj.id}`
        }
        
        if (fallbackUrl) {
          const videoMedia = {
            type: 'video' as const,
            url: fallbackUrl,
            thumbnail: '/api/media/placeholder-video-thumbnail',
            alt: 'Post video',
            duration: undefined
          }
          media.push(videoMedia)
        }
      }
    }
    
    // Add videos array
    if (post.videos && Array.isArray(post.videos)) {
      post.videos.forEach(video => {
        const url = getVideoUrl(video)
        if (url) {
          media.push({
            type: 'video' as const,
            url,
            thumbnail: '/api/media/placeholder-video-thumbnail',
            alt: 'Post video'
          })
        }
      })
    }
    
    // Add main image (only if no video)
    if (!videoUrl && post.image) {
      const imageUrl = getImageUrl(post.image)
      if (imageUrl !== '/placeholder.svg') {
        media.push({
          type: 'image' as const,
          url: imageUrl,
          alt: 'Post image'
        })
      }
    }
    
    // Add photos array
    if (post.photos && Array.isArray(post.photos)) {
      post.photos.forEach((photo, index) => {
        const imageUrl = getImageUrl(photo)
        if (imageUrl !== '/placeholder.svg') {
          media.push({
            type: 'image' as const,
            url: imageUrl,
            alt: `Photo ${index + 1}`
          })
        }
      })
    }
    
    return media
  }

  // Helper function to get primary display URL for grid thumbnail
  const getPrimaryDisplayUrl = (post: Post) => {
    const media = getPostMedia(post)
    if (media.length > 0) {
      // For videos, use thumbnail if available, otherwise use video URL
      if (media[0]?.type === 'video') {
        // If video has a thumbnail, use it
        if (media[0]?.thumbnail && media[0].thumbnail !== '/placeholder.svg' && media[0].thumbnail !== '/api/media/placeholder-video-thumbnail') {
          return media[0].thumbnail
        }
        // Otherwise, use placeholder thumbnail for videos
        return '/api/media/placeholder-video-thumbnail'
      }
      return media[0]?.url
    }
    
    // Fallback to legacy fields
    const imageUrl = getImageUrl(post.image)
    return imageUrl !== '/placeholder.svg' ? imageUrl : null
  }

  // Function to determine post size based on content and position
  const getPostSize = (post: Post, index: number) => {
    const hasHighEngagement = (post.likeCount || 0) > 10 || (post.commentCount || 0) > 5
    const isSpecialPost = post.rating && post.rating >= 4
    const isVideo = hasVideoContent(post)
    
    // Create a pattern for variety
    if (gridType === 'masonry') {
      if (index % 7 === 0 || hasHighEngagement) return 'large' // Full width
      if ((index % 4 === 0 && index % 7 !== 0) || isSpecialPost) return 'tall' // 2x1
      if (index % 6 === 0 || isVideo) return 'wide' // 1x2
      return 'normal' // 1x1
    }
    
    if (gridType === 'alternating') {
      return index % 3 === 0 ? (index % 6 === 0 ? 'large' : 'wide') : 'normal'
    }
    
    // Dynamic sizing based on content
    if (hasHighEngagement && isSpecialPost) return 'large'
    if (hasHighEngagement || isVideo) return 'tall'
    if (isSpecialPost) return 'wide'
    return 'normal'
  }

  const getGridClasses = (size: string) => {
    switch (size) {
      case 'large': return 'col-span-2 row-span-2' // 2x2
      case 'tall': return 'col-span-1 row-span-2' // 1x2
      case 'wide': return 'col-span-2 row-span-1' // 2x1
      default: return 'col-span-1 row-span-1' // 1x1
    }
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] rounded-full opacity-20 animate-pulse" />
          <div className="absolute inset-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-gray-400" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-[#FFD93D] animate-bounce" />
        </div>
        <h3 className="text-2xl font-bold text-gray-700 mb-3">
          {isCurrentUser ? "Your creative space awaits" : "No posts yet"}
        </h3>
        <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
          {isCurrentUser 
            ? "Share your discoveries, reviews, and moments. Your posts will create a unique visual story." 
            : "This user hasn't shared any posts yet. Check back later for amazing content."}
        </p>
        {isCurrentUser && (
          <Button className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] hover:from-[#FF5252] hover:to-[#FF7043] text-white border-0 shadow-lg px-8 py-3 text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <Sparkles className="h-5 w-5 mr-2" />
            Create your first post
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[200px] gap-2 md:gap-3 lg:gap-4">
        {posts.map((post, index) => {
          const size = getPostSize(post, index)
          const isHovered = hoveredPost === post.id
          const primaryUrl = getPrimaryDisplayUrl(post)
          const isVideo = hasVideoContent(post)
          
          return (
            <Card
              key={post.id}
              className={`relative overflow-hidden cursor-pointer group border-0 shadow-sm hover:shadow-2xl transition-all duration-500 rounded-xl ${getGridClasses(size)} ${
                isHovered ? 'scale-[1.02] z-10' : ''
              }`}
              onClick={() => setSelectedPost(post)}
              onMouseEnter={() => setHoveredPost(post.id)}
              onMouseLeave={() => setHoveredPost(null)}
            >
              {primaryUrl ? (
                <>
                  {imageLoadingStates[post.id] && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <Image
                    src={primaryUrl}
                    alt={post.title || "Post"}
                    fill
                    className="object-cover transition-all duration-700 group-hover:scale-110"
                    onLoadingComplete={() => handleImageLoad(post.id)}
                    onLoadStart={() => handleImageLoadStart(post.id)}
                  />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-400 transition-all duration-500">
                  <ImageIcon className="h-12 w-12 text-gray-400 group-hover:text-gray-500 transition-colors group-hover:scale-110 transform duration-300" />
                </div>
              )}

              {/* Enhanced overlay with gradient animation */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between text-white transform translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                        <Heart className="h-4 w-4 fill-white" />
                        <span className="font-bold text-sm">{post.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                        <MessageCircle className="h-4 w-4 fill-white" />
                        <span className="font-bold text-sm">{post.commentCount || 0}</span>
                      </div>
                    </div>
                    
                    {(post.likeCount || 0) > 20 && (
                      <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full px-2 py-1">
                        <TrendingUp className="h-3 w-3 text-white" />
                        <span className="text-xs font-bold text-white">Hot</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced post indicators */}
              {isVideo && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="bg-black/80 backdrop-blur-sm rounded-full p-2.5 shadow-lg animate-pulse">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {post.type === "carousel" && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="bg-black/80 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
                    <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced location badge */}
              {post.location && typeof post.location === 'object' && post.location !== null && (
                <div className="absolute bottom-3 left-3 z-10 transform group-hover:scale-105 transition-transform duration-300">
                  <Badge className="bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-2 border-0 shadow-lg rounded-full">
                    <MapPin className="h-3 w-3 mr-1" />
                    {post.location.name}
                  </Badge>
                </div>
              )}

              {/* Enhanced rating badge */}
              {post.rating && (
                <div className="absolute top-3 left-3 z-10 transform group-hover:scale-105 transition-transform duration-300">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs px-3 py-2 border-0 shadow-lg font-bold rounded-full animate-pulse">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {post.rating}
                  </Badge>
                </div>
              )}

              {/* Special engagement indicator */}
              {(post.likeCount || 0) > 50 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] rounded-full p-3 shadow-xl animate-bounce">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Enhanced Post Detail Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  )
} 