"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Bookmark, Play, Image as ImageIcon, MapPin, ChevronLeft, ChevronRight, X, Share2, Video } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Post } from "@/types/feed"
import MediaCarousel from "@/components/ui/media-carousel"
import { getImageUrl, getVideoUrl } from "@/lib/image-utils"

interface Post {
  id: string
  title?: string
  content?: string
  caption?: string
  image?: string
  video?: string
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0 bg-white rounded-xl shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full max-h-[90vh]">
          {/* Image Section */}
          <div className="relative aspect-square lg:aspect-auto bg-black flex items-center justify-center">
            {post.image ? (
              <Image
                src={post.image}
                alt={post.title || "Post image"}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-100">
                <ImageIcon className="h-20 w-20 text-gray-400" />
              </div>
            )}
            {post.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-sm rounded-full p-6 hover:bg-black/70 transition-colors cursor-pointer">
                  <Play className="h-10 w-10 text-white" />
                </div>
              </div>
            )}
            
            {/* Image navigation for carousel */}
            {post.type === "carousel" && (
              <>
                <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Content Section */}
          <div className="flex flex-col h-[600px] lg:h-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                  <AvatarImage src={post.author?.avatar || "/placeholder.svg"} alt={post.author?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] text-white font-semibold">
                    {post.author?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm hover:text-[#FF6B6B] cursor-pointer transition-colors">{post.author?.name || "Unknown User"}</p>
                  {post.location && (
                    <p className="text-xs text-gray-500 flex items-center hover:text-gray-700 cursor-pointer transition-colors">
                      <MapPin className="h-3 w-3 mr-1" />
                      {post.location.name}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/30">
              <div className="space-y-4">
                {post.title && (
                  <h3 className="font-bold text-xl text-gray-900">{post.title}</h3>
                )}
                
                {post.content && (
                  <div className="bg-white p-4 rounded-lg border border-gray-100">
                    <p className="text-gray-700 leading-relaxed">{post.content}</p>
                  </div>
                )}

                {post.rating && (
                  <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-100">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-5 w-5 ${
                            i < post.rating! ? "text-yellow-400" : "text-gray-300"
                          }`}
                        >
                          ⭐
                        </div>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{post.rating}/5 stars</span>
                  </div>
                )}

                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Posted on</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(post.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto hover:scale-110 transition-transform"
                    onClick={() => onLike?.(post.id)}
                  >
                    <Heart
                      className={`h-7 w-7 transition-colors ${
                        post.isLiked ? "text-red-500 fill-red-500" : "text-gray-700 hover:text-red-500"
                      }`}
                    />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:scale-110 transition-transform">
                    <MessageCircle className="h-7 w-7 text-gray-700 hover:text-blue-500 transition-colors" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:scale-110 transition-transform">
                    <Share2 className="h-7 w-7 text-gray-700 hover:text-green-500 transition-colors" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto hover:scale-110 transition-transform"
                  onClick={() => onSave?.(post.id)}
                >
                  <Bookmark className="h-7 w-7 text-gray-700 hover:text-yellow-500 transition-colors" />
                </Button>
              </div>
              
              <div className="text-sm space-y-1">
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
      media.push({
        type: 'video' as const,
        url: videoUrl,
        thumbnail: getImageUrl(post.image) !== '/placeholder.svg' ? getImageUrl(post.image) : undefined,
        alt: 'Post video',
        duration: undefined // Could be extracted from video metadata if needed
      })
    }
    
    // Add videos array
    if (post.videos && Array.isArray(post.videos)) {
      post.videos.forEach(video => {
        const url = getVideoUrl(video)
        if (url) {
          media.push({
            type: 'video' as const,
            url,
            thumbnail: undefined,
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
      if (media[0].type === 'video') {
        return media[0].thumbnail || media[0].url
      }
      return media[0].url
    }
    
    // Fallback to legacy fields
    return getImageUrl(post.image) !== '/placeholder.svg' ? getImageUrl(post.image) : null
  }

  // Helper function to determine if post has video content
  const hasVideoContent = (post: Post) => {
    const media = getPostMedia(post)
    return media.some(item => item.type === 'video')
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
      <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
        {posts.map((post, index) => {
          const primaryUrl = getPrimaryDisplayUrl(post)
          const isVideo = hasVideoContent(post)
          const mediaCount = getMediaCount(post)
          
          return (
            <Card
              key={post.id}
              className="aspect-square relative overflow-hidden cursor-pointer group border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              onClick={() => setSelectedPost(post)}
            >
              {primaryUrl ? (
                <>
                  {imageLoadingStates[post.id] && (
                    <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  
                  {isVideo ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={primaryUrl}
                        alt={post.title || "Post"}
                        fill
                        className="object-cover transition-all duration-300 group-hover:scale-110"
                        onLoadingComplete={() => handleImageLoad(post.id)}
                        onLoadStart={() => handleImageLoadStart(post.id)}
                      />
                      
                      {/* Video indicator */}
                      <div className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full">
                        <Video className="h-3 w-3" />
                      </div>
                      
                      {/* Play button overlay */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <Play className="h-6 w-6 text-gray-800 ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={primaryUrl}
                      alt={post.title || "Post"}
                      fill
                      className="object-cover transition-all duration-300 group-hover:scale-110"
                      onLoadingComplete={() => handleImageLoad(post.id)}
                      onLoadStart={() => handleImageLoadStart(post.id)}
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                  <ImageIcon className="h-8 w-8 text-gray-400 group-hover:text-gray-500 transition-colors" />
                </div>
              )}

              {/* Media count indicator */}
              {mediaCount > 1 && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {mediaCount}
                </div>
              )}

              {/* Overlay with stats */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex items-center gap-3 text-white text-sm">
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
              </div>
            </Card>
          )
        })}
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPost(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col lg:flex-row h-full">
              {/* Media Section */}
              <div className="flex-1 bg-black flex items-center justify-center min-h-[40vh] lg:min-h-[60vh]">
                {getPostMedia(selectedPost).length > 0 ? (
                  <MediaCarousel
                    media={getPostMedia(selectedPost)}
                    aspectRatio="auto"
                    enableVideoPreview={true}
                    videoPreviewMode="click"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-24 w-24 text-gray-400" />
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
          </div>
        </div>
      )}
    </>
  )
} 