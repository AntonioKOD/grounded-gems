"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, MessageCircle, Star } from "lucide-react"
import { getImageUrl } from "@/lib/image-utils"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { Post } from "@/types/feed"
import { CustomHeartIcon } from "@/components/custom-heart-icon"

interface ExplorePostGridProps {
  posts: Post[]
  highlightedPosts?: Post[]
  loading: boolean
  onLoadMore: () => void
  hasMore: boolean
  currentPage: number
  totalPosts: number
}

export default function ExplorePostGrid({
  posts,
  highlightedPosts,
  loading,
  onLoadMore,
  hasMore,
  currentPage,
  totalPosts,
}: ExplorePostGridProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    await onLoadMore()
    setIsLoadingMore(false)
  }

  const itemsPerPage = 12
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalPosts)

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {startItem}-{endItem}
        </span>{" "}
        of <span className="font-medium text-foreground">{totalPosts}</span> places
      </div>

      {/* Highlighted/nearby section */}
      {highlightedPosts && highlightedPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Just Added Near You</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {highlightedPosts.map((post) => (
              <ExplorePostCard key={`highlighted-${post.id}`} post={post} highlighted />
            ))}
          </div>
        </div>
      )}

      {/* Date section marker - if you want to group by date */}
      {posts.length > 0 && currentPage === 1 && (
        <h3 className="text-sm font-medium text-muted-foreground pt-2 pb-1 border-b mb-4">Recent Updates</h3>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <ExplorePostCard key={post.id} post={post} />
        ))}

        {/* Loading skeleton placeholders */}
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="h-48 bg-gray-200 animate-pulse"></div>
                <div className="p-4">
                  <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 min-w-[200px]"
            aria-label="Load more posts"
          >
            {isLoadingMore ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

interface ExplorePostCardProps {
  post: Post
  highlighted?: boolean
}

function ExplorePostCard({ post, highlighted = false }: ExplorePostCardProps) {
  const [liked, setLiked] = useState(post.isLiked || false)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked((prev) => !prev)
    // In a real app, you would call an API to like/unlike
  }

  return (
    <Link href={`/post/${post.id}`}>
      <Card className={cn("overflow-hidden transition-all hover:shadow-md", highlighted && "ring-2 ring-[#FF6B6B]/20")}>
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={getImageUrl(post.image) || "/placeholder.svg"}
              alt={post.title || "Post image"}
              fill
              className="object-cover"
              unoptimized={post.image?.includes("vercel-blob.com") || post.image?.includes("blob.vercel-storage.com")}
            />

            {/* Type badge */}
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className={cn(
                  "bg-white/90",
                  post.type === "review"
                    ? "text-yellow-600"
                    : post.type === "recommendation"
                      ? "text-blue-600"
                      : "text-gray-600",
                )}
              >
                {post.type === "review" ? "Review" : post.type === "recommendation" ? "Recommendation" : "Post"}
              </Badge>
            </div>

            {/* Like button */}
            <button
              onClick={handleLike}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
              aria-label={liked ? "Unlike" : "Like"}
            >
              <div className="h-5 w-5">
                <CustomHeartIcon isLiked={liked} />
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {post.title && <h3 className="font-medium text-lg line-clamp-1">{post.title}</h3>}

            {post.location && (
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">
                  {typeof post.location === 'string' ? post.location : post.location.name}
                </span>
              </div>
            )}

            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{post.content}</p>

            {/* Rating for reviews */}
            {post.type === "review" && post.rating && (
              <div className="flex items-center mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn("h-3.5 w-3.5", i < (post.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300")}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-3 border-t flex justify-between bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3">
              <CustomHeartIcon isLiked={false} />
            </div>
            <span>{post.likeCount || 0}</span>
            <MessageCircle className="h-3 w-3 ml-2" />
            <span>{post.commentCount || 0}</span>
          </div>
          <div>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</div>
        </CardFooter>
      </Card>
    </Link>
  )
}
