import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Metadata } from 'next'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getImageUrl, getVideoUrl } from '@/lib/image-utils'
import MediaCarousel from '@/components/ui/media-carousel'
import { CommentSystemLight } from '@/components/post/comment-system-light'
import ShareButton from '@/components/ui/share-button'

interface PostPageProps {
  params: Promise<{ postId: string }>
}

// Generate metadata for the post
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { postId } = await params
  
  try {
    const payload = await getPayload({ config })
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 2,
    })

    if (!post) {
      return {
        title: 'Post Not Found',
        description: 'The requested post could not be found.',
      }
    }

    const authorName = post.author?.name || 'Unknown User'
    const content = post.content?.substring(0, 160) || 'Check out this post on Sacavia'
    const imageUrl = post.image ? getImageUrl(post.image) : null

    return {
      title: `${authorName} on Sacavia`,
      description: content,
      openGraph: {
        title: `${authorName} on Sacavia`,
        description: content,
        type: 'article',
        url: `${process.env.NEXT_PUBLIC_APP_URL}/post/${postId}`,
        images: imageUrl ? [{ url: imageUrl }] : [],
        siteName: 'Sacavia',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${authorName} on Sacavia`,
        description: content,
        images: imageUrl ? [imageUrl] : [],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Post on Sacavia',
      description: 'Check out this post on Sacavia',
    }
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params
  
  try {
    const payload = await getPayload({ config })
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 2,
    })

    if (!post) {
      notFound()
    }

    // Process media for the post
    const mediaItems = []
    
    // Add video if available
    if (post.video) {
      const videoUrl = getVideoUrl(post.video)
      if (videoUrl) {
        mediaItems.push({
          type: 'video',
          url: videoUrl,
          thumbnail: post.image ? getImageUrl(post.image) : null,
          alt: 'Post video'
        })
      }
    }
    
    // Add images if available
    if (post.image && !post.video) {
      const imageUrl = getImageUrl(post.image)
      if (imageUrl !== "/placeholder.svg") {
        mediaItems.push({
          type: 'image',
          url: imageUrl,
          alt: post.title || 'Post image'
        })
      }
    }
    
    // Add additional photos
    if (post.photos && Array.isArray(post.photos)) {
      post.photos.forEach((photo, index) => {
        const photoUrl = getImageUrl(photo)
        if (photoUrl !== "/placeholder.svg") {
          mediaItems.push({
            type: 'image',
            url: photoUrl,
            alt: `Photo ${index + 1}`
          })
        }
      })
    }

    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }

    const getAuthorProfileImageUrl = () => {
      if (!post.author) return "/placeholder.svg"
      const profileImageUrl = getImageUrl(post.author.profileImage?.url || post.author.avatar)
      return profileImageUrl !== "/placeholder.svg" ? profileImageUrl : "/placeholder.svg"
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={getAuthorProfileImageUrl()} 
                  alt={post.author?.name || 'User'} 
                />
                <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white">
                  {getInitials(post.author?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="font-semibold text-gray-900">{post.author?.name || 'Unknown User'}</h1>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
              <ShareButton
                url={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/post/${postId}`}
                title={`${post.author?.name || 'Someone'} on Sacavia`}
                text={post.content?.substring(0, 100) || 'Check out this post on Sacavia'}
                variant="ghost"
                size="sm"
                showIcon={true}
              />
            </div>
          </div>

          {/* Media */}
          {mediaItems.length > 0 && (
            <div className="relative">
              <MediaCarousel
                media={mediaItems}
                aspectRatio="square"
                showControls={true}
                showDots={true}
                enableVideoPreview={true}
                videoPreviewMode="click"
                className="w-full"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Post content */}
            {post.content && (
              <p className="text-gray-900 mb-4 leading-relaxed">
                {post.content}
              </p>
            )}

            {/* Location */}
            {post.location && (
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">
                  {typeof post.location === 'string' ? post.location : post.location.name}
                </span>
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag: any, index: number) => (
                  <Badge 
                    key={index}
                    variant="outline" 
                    className="text-xs bg-gray-50 text-gray-700"
                  >
                    #{typeof tag === 'string' ? tag : tag.tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-gray-600 text-sm mb-6">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{post.likeCount || 0} likes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{post.commentCount || 0} comments</span>
              </div>
              <div className="flex items-center gap-1">
                <Share2 className="h-4 w-4" />
                <span>{post.shareCount || 0} shares</span>
              </div>
            </div>

            {/* Comments */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>
              <CommentSystemLight 
                postId={post.id}
                className="bg-transparent"
                autoShow={true}
              />
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading post:', error)
    notFound()
  }
} 