"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Clock, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Eye,
  ChevronRight,
  X,
  User,
  Calendar,
  ArrowUpRight
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { MiniBlogItem } from '@/types/feed'
import { getImageUrl } from '@/lib/image-utils'

interface MiniBlogCardProps {
  item: MiniBlogItem
  onLike?: (blogId: string) => void
  onSave?: (blogId: string) => void
  onDismiss?: () => void
  className?: string
}

export default function MiniBlogCard({
  item,
  onLike,
  onSave,
  onDismiss,
  className = ""
}: MiniBlogCardProps) {
  // Early return if blog data is invalid
  if (!item || !item.blog) {
    console.warn('Invalid mini blog data:', item)
    return null
  }

  const [likedState, setLikedState] = useState(item.blog.isLiked || false)
  const [savedState, setSavedState] = useState(item.blog.isSaved || false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setLoadingStates(prev => ({ ...prev, like: true }))
    
    try {
      const response = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: item.id, type: 'blog' })
      })
      
      if (response.ok) {
        setLikedState(!likedState)
        onLike?.(item.id)
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      } else {
        throw new Error('Failed to like post')
      }
    } catch (error) {
      console.error('Error liking post:', error)
      toast.error('Failed to like post')
    } finally {
      setLoadingStates(prev => ({ ...prev, like: false }))
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setLoadingStates(prev => ({ ...prev, save: true }))
    
    try {
      const response = await fetch('/api/posts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: item.id, type: 'blog' })
      })
      
      if (response.ok) {
        setSavedState(!savedState)
        onSave?.(item.id)
        toast.success(savedState ? 'Removed from saved' : 'Added to reading list!')
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      } else {
        throw new Error('Failed to save post')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error('Failed to save post')
    } finally {
      setLoadingStates(prev => ({ ...prev, save: false }))
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.blog.title || 'Blog Post',
          text: item.blog.excerpt || '',
          url: `${window.location.origin}/blog/${item.blog.id || item.id}`
        })
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/blog/${item.blog.id || item.id}`)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to share')
      }
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDismiss?.()
  }

  const getAuthorImageUrl = (author: any) => {
    if (!author) return "/placeholder.svg"
    const imageUrl = getImageUrl(author.profileImage?.url || author.avatar)
    return imageUrl !== "/placeholder.svg" ? imageUrl : "/placeholder.svg"
  }

  const getFeaturedImageUrl = () => {
    // Try multiple possible image sources
    const imageUrl = getImageUrl(
      item.blog?.coverImage?.url || 
      item.blog?.featuredImage?.url ||
      item.blog?.image?.url ||
      item.blog?.coverImage ||
      item.blog?.featuredImage ||
      item.blog?.image
    )
    return imageUrl !== "/placeholder.svg" ? imageUrl : null
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={`overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#FFE66D] to-[#FF6B6B] rounded-full">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Featured Story</h3>
              <p className="text-sm text-gray-600">Deep dive into local experiences</p>
            </div>
          </div>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Link href={`/blog/${item.blog?.id || item.id}`} className="block group">
          <article className="relative overflow-hidden rounded-xl bg-white hover:bg-gray-50/50 transition-all duration-300 border border-gray-100 group-hover:border-[#4ECDC4]/30 group-hover:shadow-sm">
            {/* Featured image */}
            {getFeaturedImageUrl() ? (
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={getFeaturedImageUrl()!}
                  alt={item.blog?.title || 'Blog post'}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Reading time badge */}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-black/50 text-white backdrop-blur-sm border-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.blog?.estimatedReadTime || 5} min read
                  </Badge>
                </div>
                
                {/* Category badge */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-[#FFE66D]/90 text-gray-800 backdrop-blur-sm border-0">
                    {item.blog?.categories?.[0] || 'Blog'}
                  </Badge>
                </div>
                
                {/* Quick actions overlay */}
                <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSave}
                    disabled={loadingStates.save}
                    className={`
                      p-2 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-300
                      ${savedState 
                        ? 'bg-[#FF6B6B]/90 text-white' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }
                    `}
                  >
                    {loadingStates.save ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Bookmark className={`h-4 w-4 ${savedState ? 'fill-current' : ''}`} />
                    )}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300 border border-white/20"
                  >
                    <Share2 className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="relative h-48 bg-gradient-to-br from-[#FFE66D]/10 to-[#FF6B6B]/10 flex items-center justify-center">
                <div className="text-center text-[#FF6B6B]">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Story</p>
                </div>
                
                {/* Reading time badge for non-image posts */}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-[#FFE66D]/20 text-[#FF6B6B] backdrop-blur-sm border border-[#FFE66D]/30">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.blog?.estimatedReadTime || 5} min read
                  </Badge>
                </div>
                
                {/* Category badge for non-image posts */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-[#FFE66D] text-gray-800 backdrop-blur-sm border-0">
                    {item.blog?.categories?.[0] || 'Blog'}
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Content */}
            <div className="p-6">
              {/* Author info */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10 ring-2 ring-[#4ECDC4]/20">
                  <AvatarImage 
                    src={getAuthorImageUrl(item.blog?.author)} 
                    alt={item.blog?.author?.name || 'Author'}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white font-bold">
                    {getInitials(item.blog?.author?.name || 'Unknown')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors">
                    {item.blog?.author?.name || 'Unknown Author'}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(item.blog?.publishedAt || item.createdAt)}</span>
                    {/* Only show views if real data exists */}
                    {item.blog?.viewCount && item.blog.viewCount > 0 && (
                      <>
                        <span>•</span>
                        <Eye className="h-3 w-3" />
                        <span>{item.blog.viewCount} views</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* External link indicator */}
                <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-[#4ECDC4] transition-colors" />
              </div>
              
              {/* Title */}
              <h2 className="font-bold text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-[#FF6B6B] transition-colors">
                {item.blog?.title || 'Untitled Post'}
              </h2>
              
              {/* Excerpt */}
              <p className="text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                {item.blog?.excerpt || 'No excerpt available'}
              </p>
              
              {/* Tags */}
              {item.blog?.tags && item.blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.blog.tags.slice(0, 3).map((tag, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="text-xs px-2 py-0.5 bg-gradient-to-r from-[#FFE66D]/10 to-[#FF6B6B]/10 border-[#4ECDC4]/30 text-[#FF6B6B] hover:bg-[#FFE66D]/20 transition-colors"
                    >
                      #{tag}
                    </Badge>
                  ))}
                  {item.blog.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 text-gray-500">
                      +{item.blog.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Engagement stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLike}
                    disabled={loadingStates.like}
                    className={`
                      flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all duration-300
                      ${likedState 
                        ? 'bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {loadingStates.like ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Heart className={`h-4 w-4 ${likedState ? 'fill-current' : ''}`} />
                    )}
                    <span>{(item.blog?.likeCount || 0) + (likedState && !item.blog?.isLiked ? 1 : 0)}</span>
                  </motion.button>
                  
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MessageCircle className="h-4 w-4" />
                    <span>{item.blog?.commentCount || 0}</span>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-[#4ECDC4] hover:text-[#4ECDC4]/80 hover:bg-[#4ECDC4]/10 font-semibold group/btn"
                >
                  Continue Reading
                  <ChevronRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </article>
        </Link>
      </CardContent>
    </Card>
  )
} 