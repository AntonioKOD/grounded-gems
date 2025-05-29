"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Bookmark, Play, Image as ImageIcon, MapPin, ChevronLeft, ChevronRight, X, Share2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Post } from "@/types/feed"

interface PostsGridProps {
  posts: Post[]
  isCurrentUser: boolean
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
        {posts.map((post, index) => (
          <Card
            key={post.id}
            className="aspect-square relative overflow-hidden cursor-pointer group border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            onClick={() => setSelectedPost(post)}
          >
            {post.image ? (
              <>
                {imageLoadingStates[post.id] && (
                  <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <Image
                  src={post.image}
                  alt={post.title || "Post"}
                  fill
                  className="object-cover transition-all duration-300 group-hover:scale-110"
                  onLoadingComplete={() => handleImageLoad(post.id)}
                  onLoadStart={() => handleImageLoadStart(post.id)}
                />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                <ImageIcon className="h-8 w-8 text-gray-400 group-hover:text-gray-500 transition-colors" />
              </div>
            )}

            {/* Overlay with stats */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <div className="flex items-center gap-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 fill-white" />
                  <span className="font-semibold text-lg">{post.likeCount || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 fill-white" />
                  <span className="font-semibold text-lg">{post.commentCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Post type indicator */}
            {post.type === "video" && (
              <div className="absolute top-3 right-3 z-10">
                <div className="bg-black/80 backdrop-blur-sm rounded-full p-2 shadow-lg">
                  <Play className="h-4 w-4 text-white" />
                </div>
              </div>
            )}

            {/* Multiple images indicator */}
            {post.type === "carousel" && (
              <div className="absolute top-3 right-3 z-10">
                <div className="bg-black/80 backdrop-blur-sm rounded-full p-2 shadow-lg">
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Location badge */}
            {post.location && (
              <div className="absolute bottom-3 left-3 z-10">
                <Badge className="bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 border-0 shadow-lg">
                  <MapPin className="h-3 w-3 mr-1" />
                  {post.location.name}
                </Badge>
              </div>
            )}

            {/* Rating badge */}
            {post.rating && (
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs px-3 py-1.5 border-0 shadow-lg font-semibold">
                  ⭐ {post.rating}
                </Badge>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={(postId) => {
            // Handle like functionality
            console.log("Like post:", postId)
          }}
          onSave={(postId) => {
            // Handle save functionality
            console.log("Save post:", postId)
          }}
        />
      )}
    </>
  )
} 