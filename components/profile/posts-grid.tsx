"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Bookmark, Play, Image as ImageIcon, MapPin, ChevronLeft, ChevronRight, X, Share2, Video } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getImageUrl, getVideoUrl } from "@/lib/image-utils"
import MediaCarousel from "@/components/ui/media-carousel"

interface Post {
  isLiked: any
  author: any
  id: string
  title?: string
  content?: string
  caption?: string
  image?: string
  video?: string | {
    filename?: string
    url?: string
    id?: string
    mimeType?: string
    isVideo?: boolean
  }
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
  likes?: number
  type?: string
  rating?: number
  location?: {
    id: string
    name: string
  }
  videoThumbnail?: string // Added for new logic
}

interface PostsGridProps {
  posts: Post[]
  isCurrentUser?: boolean
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
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

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
        duration: undefined // Could be extracted from video metadata if needed
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
            thumbnail: '/api/media/placeholder-video-thumbnail', // Use placeholder for additional videos
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

  const media = getPostMedia(post)
  const hasVideo = media.some(item => item.type === 'video')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0 bg-white rounded-xl shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Post Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full max-h-[90vh]">
          {/* Media Section */}
          <div className="relative bg-black flex items-center justify-center min-h-[50vh] lg:min-h-[70vh]">
            {media.length > 0 ? (
              <MediaCarousel
                media={media}
                aspectRatio="auto"
                enableVideoPreview={true}
                videoPreviewMode="click"
                showControls={true}
                showDots={true}
                autoPlay={false}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <ImageIcon className="h-24 w-24 text-gray-400" />
              </div>
            )}
            
            {/* Video indicator */}
            {hasVideo && (
              <div className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full">
                <Video className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                  <AvatarImage src={post.author?.avatar || "/placeholder.svg"} alt={post.author?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] text-white font-semibold">
                    {post.author?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base hover:text-[#FF6B6B] cursor-pointer transition-colors">
                    {post.author?.name || "Unknown User"}
                  </p>
                  {post.location && (
                    <p className="text-sm text-gray-500 flex items-center hover:text-gray-700 cursor-pointer transition-colors">
                      <MapPin className="h-4 w-4 mr-1" />
                      {post.location.name}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
              <div className="space-y-6">
                {/* Post type badge */}
                {post.type && post.type !== 'post' && (
                  <Badge className="bg-[#FF6B6B] text-white px-3 py-1 text-sm font-medium">
                    {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                  </Badge>
                )}

                {/* Title */}
                {post.title && (
                  <h3 className="font-bold text-2xl text-gray-900 leading-tight">
                    {post.title}
                  </h3>
                )}
                
                {/* Content */}
                {post.content && (
                  <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                    <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>
                )}

                {/* Rating */}
                {post.rating && (
                  <div className="flex items-center gap-4 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-6 w-6 ${
                            i < post.rating! ? "text-yellow-400" : "text-gray-300"
                          }`}
                        >
                          ⭐
                        </div>
                      ))}
                    </div>
                    <span className="text-lg font-medium text-gray-700">{post.rating}/5 stars</span>
                  </div>
                )}

                {/* Media info */}
                {media.length > 0 && (
                  <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3">Media</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {hasVideo && (
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          <span>Video</span>
                        </div>
                      )}
                      {media.some(item => item.type === 'image') && (
                        <div className="flex items-center gap-1">
                          <ImageIcon className="h-4 w-4" />
                          <span>{media.filter(item => item.type === 'image').length} Photo{media.filter(item => item.type === 'image').length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Posted on</p>
                  <p className="text-base font-medium text-gray-700">{formatDate(post.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto hover:scale-110 transition-transform"
                    onClick={() => onLike?.(post.id)}
                  >
                    <Heart
                      className={`h-8 w-8 transition-colors ${
                        post.isLiked ? "text-red-500 fill-red-500" : "text-gray-700 hover:text-red-500"
                      }`}
                    />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:scale-110 transition-transform">
                    <MessageCircle className="h-8 w-8 text-gray-700 hover:text-blue-500 transition-colors" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:scale-110 transition-transform">
                    <Share2 className="h-8 w-8 text-gray-700 hover:text-green-500 transition-colors" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto hover:scale-110 transition-transform"
                  onClick={() => onSave?.(post.id)}
                >
                  <Bookmark className="h-8 w-8 text-gray-700 hover:text-yellow-500 transition-colors" />
                </Button>
              </div>
              
              <div className="text-base space-y-2">
                <p className="font-bold text-gray-900">
                  {post.likeCount || 0} {(post.likeCount || 0) === 1 ? "like" : "likes"}
                </p>
                {post.commentCount && post.commentCount > 0 && (
                  <p className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors">
                    View all {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PostsGrid({ posts, isCurrentUser }: PostsGridProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({})

  const handleImageLoad = (postId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [postId]: false }))
  }

  const handleImageLoadStart = (postId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [postId]: true }))
  }

  // Helper function to get primary display URL for grid thumbnail
  const getPrimaryDisplayUrl = (post: Post) => {
    const media = getPostMedia(post)
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [PostsGrid] getPrimaryDisplayUrl:', {
        postId: post.id,
        hasMedia: media.length > 0,
        mediaLength: media.length,
        firstMedia: media[0],
        postImage: post.image,
        postVideo: post.video,
        postPhotos: post.photos?.length || 0
      })
    }
    
    if (media.length > 0) {
      // Prioritize images over videos for grid thumbnails
      const firstImage = media.find(item => item.type === 'image')
      if (firstImage) {
        // Ensure we have a string URL
        const imageUrl = firstImage.url
        if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          return imageUrl
        } else if (typeof imageUrl === 'object' && imageUrl !== null) {
          // If url is an object, extract the URL using getImageUrl
          const extractedUrl = getImageUrl(imageUrl)
          return extractedUrl !== '/placeholder.svg' ? extractedUrl : null
        }
        return null
      }
      
      // If no image, use video thumbnail
      if (media[0]?.type === 'video') {
        // If video has a thumbnail, use it
        if (media[0]?.thumbnail && media[0].thumbnail !== '/placeholder.svg' && media[0].thumbnail !== '/api/media/placeholder-video-thumbnail') {
          return media[0].thumbnail
        }
        // Otherwise, use placeholder thumbnail for videos
        return '/api/media/placeholder-video-thumbnail'
      }
      // For videos, ensure we have a string URL
      const videoUrl = media[0]?.url
      if (typeof videoUrl === 'string' && videoUrl.trim() !== '') {
        return videoUrl
      } else if (typeof videoUrl === 'object' && videoUrl !== null) {
        // If url is an object, extract the URL using getVideoUrl
        const extractedUrl = getVideoUrl(videoUrl)
        return extractedUrl || '/api/media/placeholder-video-thumbnail'
      }
      return null
    }
    
    // Fallback to legacy fields
    const imageUrl = getImageUrl(post.image)
    const finalUrl = imageUrl !== '/placeholder.svg' ? imageUrl : null
    
    // Debug logging for fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [PostsGrid] getPrimaryDisplayUrl fallback:', {
        postId: post.id,
        imageUrl,
        finalUrl,
        postImage: post.image
      })
    }
    
    // If we still don't have a valid URL, return null to show placeholder
    if (!finalUrl || finalUrl === '/placeholder.svg' || (typeof finalUrl === 'string' && finalUrl.trim() === '')) {
      return null
    }
    
    return finalUrl
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
      const videoObj = post.video as { isVideo?: boolean }
      if (videoObj.isVideo) {
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
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [PostsGrid] getPostMedia input:', {
        postId: post.id,
        hasMediaArray: !!post.media,
        mediaArrayLength: post.media?.length || 0,
        hasImage: !!post.image,
        hasVideo: !!post.video,
        hasPhotos: !!post.photos,
        photosLength: post.photos?.length || 0
      })
    }
    
    // If post already has media array, use it
    if (post.media && Array.isArray(post.media)) {
      const processedMedia = post.media.map(item => ({
        ...item,
        url: String(item.url || ''),
        thumbnail: item.thumbnail ? String(item.thumbnail) : undefined
      }))
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [PostsGrid] Processed media array:', processedMedia)
      }
      
      return processedMedia
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
        duration: undefined // Could be extracted from video metadata if needed
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
            thumbnail: '/api/media/placeholder-video-thumbnail', // Use placeholder for additional videos
            alt: 'Post video'
          })
        }
      })
    }
    
    // Add main image (always add if it exists, regardless of video)
    if (post.image) {
      const imageUrl = getImageUrl(post.image)
      
      // Debug logging for image processing
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [PostsGrid] Processing image:', {
          postId: post.id,
          postImage: post.image,
          imageUrl,
          isValidUrl: imageUrl !== '/placeholder.svg'
        })
      }
      
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

  // Helper function to get media count
  const getMediaCount = (post: Post) => {
    return getPostMedia(post).length
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          {isCurrentUser ? "Share your first post" : "No posts yet"}
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {isCurrentUser 
            ? "When you share photos and videos, they'll appear on your profile." 
            : "When they share posts, you'll see them here."}
        </p>
        {isCurrentUser && (
          <Button className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] hover:from-[#FF5252] hover:to-[#FF7043] text-white border-0 shadow-lg">
            <ImageIcon className="h-4 w-4 mr-2" />
            Share your first post
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Optimized grid with better spacing and responsive design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {posts.map((post, index) => {
          const primaryUrl = getPrimaryDisplayUrl(post)
          const isVideo = hasVideoContent(post)
          const mediaCount = getMediaCount(post)
          
          // Ensure we have a valid URL before rendering
          const hasValidUrl = primaryUrl && 
            typeof primaryUrl === 'string' && 
            primaryUrl.trim() !== '' && 
            primaryUrl !== '/placeholder.svg' &&
            primaryUrl !== 'undefined' &&
            primaryUrl !== 'null'
          
          // Debug logging for each post
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [PostsGrid] Rendering post:', {
              postId: post.id,
              primaryUrl,
              hasValidUrl,
              isVideo,
              mediaCount
            })
          }
          
          return (
            <Card
              key={post.id}
              className={`relative overflow-hidden cursor-pointer group border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white ${
                isVideo ? 'video-card' : 'image-card'
              }`}
              onClick={() => setSelectedPost(post)}
            >
              {/* Media Section - Optimized for better display */}
              <div className="aspect-square relative overflow-hidden">
                {hasValidUrl ? (
                  <>
                    {imageLoadingStates[post.id] && (
                      <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    {isVideo ? (
                      <div className="relative w-full h-full">
                        {/* Video thumbnail with optimized play button */}
                        <Image
                          src={primaryUrl}
                          alt={post.title || "Post"}
                          fill
                          className="object-cover transition-all duration-300 group-hover:scale-105 video-thumbnail"
                          onLoad={() => handleImageLoad(post.id)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        />
                        
                        {/* Enhanced video indicator - smaller and more subtle */}
                        <div className="absolute top-2 right-2 video-overlay text-white p-1.5 rounded-full shadow-lg video-indicator bg-black/60 backdrop-blur-sm">
                          <Video className="h-3 w-3 fill-white" />
                        </div>
                        
                        {/* Enhanced play button overlay - smaller and more subtle */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-xl video-play-button">
                            <Play className="h-4 w-4 text-gray-800 fill-gray-800 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={primaryUrl}
                        alt={post.title || "Post"}
                        fill
                        className="object-cover transition-all duration-300 group-hover:scale-105 image-thumbnail"
                        onLoad={() => handleImageLoad(post.id)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                    <ImageIcon className="h-8 w-8 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  </div>
                )}

                {/* Media count indicator - smaller and more subtle */}
                {mediaCount > 1 && (
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {mediaCount}
                  </div>
                )}

                {/* Post type badge - smaller and more prominent */}
                {post.type && post.type !== 'post' && (
                  <div className="absolute top-2 left-2 bg-[#FF6B6B] text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
                    {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                  </div>
                )}
              </div>

              {/* Content Section - Optimized spacing */}
              <div className="p-3 md:p-4">
                {/* Title */}
                {post.title && (
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#FF6B6B] transition-colors text-sm md:text-base">
                    {post.title}
                  </h3>
                )}
                
                {/* Content preview - optimized for better readability */}
                {post.content && (
                  <p className="text-gray-600 text-xs md:text-sm mb-3 line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>
                )}

                {/* Location - smaller and more subtle */}
                {post.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{post.location.name}</span>
                  </div>
                )}

                {/* Rating - optimized display */}
                {post.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-xs md:text-sm ${
                            i < post.rating! ? "text-yellow-400" : "text-gray-300"
                          }`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-1">{post.rating}/5</span>
                  </div>
                )}

                {/* Stats and Date - optimized layout */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    {post.likeCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <span>❤️</span>
                        <span>{post.likeCount}</span>
                      </div>
                    )}
                    {post.commentCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <span>💬</span>
                        <span>{post.commentCount}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs">
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Hover overlay with quick actions - optimized for better UX */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white/90 rounded-full p-2 hover:bg-white transition-colors">
                    <Heart className="h-4 w-4 text-gray-700" />
                  </div>
                  <div className="bg-white/90 rounded-full p-2 hover:bg-white transition-colors">
                    <MessageCircle className="h-4 w-4 text-gray-700" />
                  </div>
                  <div className="bg-white/90 rounded-full p-2 hover:bg-white transition-colors">
                    <Share2 className="h-4 w-4 text-gray-700" />
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden p-0 bg-white rounded-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Post Details</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col lg:flex-row h-full">
              {/* Media Section */}
              <div className="flex-1 bg-black flex items-center justify-center min-h-[40vh] lg:min-h-[60vh]">
                {getPostMedia(selectedPost).length > 0 ? (
                  <MediaCarousel
                    media={getPostMedia(selectedPost)}
                    aspectRatio="auto"
                    enableVideoPreview={true}
                    videoPreviewMode="click"
                    showControls={true}
                    showDots={true}
                    autoPlay={false}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-24 w-24 text-gray-400" />
                  </div>
                )}
                
                {/* Enhanced video indicator */}
                {hasVideoContent(selectedPost) && (
                  <div className="absolute top-4 right-4 video-overlay text-white p-3 rounded-full shadow-lg z-10 video-indicator">
                    <Video className="h-5 w-5 fill-white" />
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="lg:w-96 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{selectedPost.title || "Post"}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPost(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>

                <div className="flex-1">
                  {selectedPost.content && (
                    <p className="text-gray-700 mb-4">{selectedPost.content}</p>
                  )}
                  
                  {selectedPost.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>📍</span>
                      <span>{selectedPost.location.name}</span>
                    </div>
                  )}

                  {selectedPost.rating && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>⭐</span>
                      <span>{selectedPost.rating}/5</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{new Date(selectedPost.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-4">
                      {selectedPost.likeCount !== undefined && (
                        <span>❤️ {selectedPost.likeCount}</span>
                      )}
                      {selectedPost.commentCount !== undefined && (
                        <span>💬 {selectedPost.commentCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 