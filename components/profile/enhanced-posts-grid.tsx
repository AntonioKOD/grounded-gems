"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Bookmark, Play, Image as ImageIcon, MapPin, ChevronLeft, ChevronRight, X, Share2, Sparkles, Star, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Post } from "@/types/feed"

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
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0 bg-white rounded-2xl shadow-2xl border-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full max-h-[90vh]">
          {/* Image Section */}
          <div className="relative aspect-square lg:aspect-auto bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            {post.image ? (
              <Image
                src={post.image}
                alt={post.title || "Post image"}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-300">
                <ImageIcon className="h-24 w-24 text-gray-400" />
              </div>
            )}
            
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            
            {post.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-md rounded-full p-8 hover:bg-white/30 transition-all duration-300 cursor-pointer group">
                  <Play className="h-12 w-12 text-white group-hover:scale-110 transition-transform" />
                </div>
              </div>
            )}
            
            {/* Enhanced navigation for carousel */}
            {post.type === "carousel" && (
              <>
                <button className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full p-3 transition-all duration-300 hover:scale-110">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full p-3 transition-all duration-300 hover:scale-110">
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                {/* Carousel indicators */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === 0 ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Enhanced Content Section */}
          <div className="flex flex-col h-[600px] lg:h-auto bg-gradient-to-b from-white to-gray-50">
            {/* Header with enhanced styling */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-gradient-to-r from-[#FF6B6B] to-[#FF8E53] ring-offset-2">
                  <AvatarImage src={post.author?.avatar || "/placeholder.svg"} alt={post.author?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] text-white font-bold text-lg">
                    {post.author?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-base hover:text-[#FF6B6B] cursor-pointer transition-colors">
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
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose} 
                className="hover:bg-gray-100 rounded-full p-2 transition-all duration-200 hover:scale-110"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Enhanced Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {post.title && (
                <div className="relative">
                  <h3 className="font-bold text-2xl text-gray-900 leading-tight">{post.title}</h3>
                  <div className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] rounded-full" />
                </div>
              )}
              
              {post.content && (
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-gray-700 leading-relaxed text-lg">{post.content}</p>
                </div>
              )}

              {post.rating && (
                <div className="flex items-center gap-4 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 transition-all duration-200 ${
                          i < post.rating! 
                            ? "text-yellow-400 fill-yellow-400 animate-pulse" 
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-gray-800">{post.rating}/5</span>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Rated
                  </Badge>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-600 mb-2 font-semibold">Posted</p>
                <p className="text-base font-bold text-blue-800">{formatDate(post.createdAt)}</p>
              </div>
            </div>

            {/* Enhanced Actions */}
            <div className="border-t border-gray-100 bg-white/90 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto group transition-all duration-300 hover:scale-110"
                    onClick={() => onLike?.(post.id)}
                  >
                    <div className={`p-3 rounded-full transition-all duration-300 ${
                      post.isLiked 
                        ? "bg-red-100 text-red-500" 
                        : "bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500"
                    }`}>
                      <Heart
                        className={`h-6 w-6 transition-all duration-300 ${
                          post.isLiked ? "fill-current animate-pulse" : "group-hover:scale-110"
                        }`}
                      />
                    </div>
                  </Button>
                  
                  <Button variant="ghost" size="sm" className="p-0 h-auto group transition-all duration-300 hover:scale-110">
                    <div className="p-3 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-500 transition-all duration-300">
                      <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </div>
                  </Button>
                  
                  <Button variant="ghost" size="sm" className="p-0 h-auto group transition-all duration-300 hover:scale-110">
                    <div className="p-3 rounded-full bg-gray-100 hover:bg-green-50 text-gray-600 hover:text-green-500 transition-all duration-300">
                      <Share2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </div>
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto group transition-all duration-300 hover:scale-110"
                  onClick={() => onSave?.(post.id)}
                >
                  <div className="p-3 rounded-full bg-gray-100 hover:bg-yellow-50 text-gray-600 hover:text-yellow-600 transition-all duration-300">
                    <Bookmark className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </div>
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 text-lg">
                    {post.likeCount || 0} {(post.likeCount || 0) === 1 ? "like" : "likes"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{post.commentCount || 0} comments</span>
                    <span>{post.shareCount || 0} shares</span>
                  </div>
                </div>
                
                {post.commentCount && post.commentCount > 0 && (
                  <p className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors text-sm">
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

  // Function to determine post size based on content and position
  const getPostSize = (post: Post, index: number) => {
    const hasHighEngagement = (post.likeCount || 0) > 10 || (post.commentCount || 0) > 5
    const isSpecialPost = post.rating && post.rating >= 4
    const isVideo = post.type === "video"
    
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
              {post.image ? (
                <>
                  {imageLoadingStates[post.id] && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <Image
                    src={post.image}
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
              {post.type === "video" && (
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
              {post.location && (
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
          onLike={(postId) => {
            console.log("Like post:", postId)
          }}
          onSave={(postId) => {
            console.log("Save post:", postId)
          }}
        />
      )}
    </>
  )
} 