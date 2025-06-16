import { Suspense } from "react"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import PostDetail from "@/components/post/post-detail"
import CommentSection from "@/components/post/comment-section"
import PostDetailSkeleton from "@/components/post/post-detail-skeleton"
import { getPostById } from "@/app/actions"

interface PostPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PostPageProps) {
  try {
    const { id } = await params
    const post = await getPostById(id)

    if (!post) {
      return {
        title: "Post Not Found | Sacavia",
        description: "The post you're looking for could not be found on Sacavia.",
        robots: 'noindex, nofollow'
      }
    }

    // Generate comprehensive post metadata
    const authorName = post.author?.name || 'Sacavia Community Member'
    const postTitle = post.title || `Post by ${authorName}`
    const seoTitle = post.title 
      ? `${post.title} | Sacavia`
      : `${authorName}'s Review | Sacavia`

    const description = post.content && post.content.length > 0
      ? (post.content.length > 160 ? post.content.substring(0, 157) + '...' : post.content)
      : `Check out ${authorName}'s review and photos on Sacavia. See what locals are saying about the best places to visit.`

    // Handle post images for social media cards
    const getPostImageUrl = (post: any): string => {
      // Check for post media
      if (post.media && post.media.length > 0) {
        const firstMedia = post.media[0]
        if (typeof firstMedia === 'string') {
          return firstMedia.startsWith('http') ? firstMedia : `https://www.sacavia.com${firstMedia}`
        } else if (firstMedia?.url) {
          return firstMedia.url.startsWith('http') ? firstMedia.url : `https://www.sacavia.com${firstMedia.url}`
        }
      }
      
      // Check for location image if post is about a location
      if (post.location?.featuredImage) {
        const locationImage = post.location.featuredImage
        if (typeof locationImage === 'string') {
          return locationImage.startsWith('http') ? locationImage : `https://www.sacavia.com${locationImage}`
        } else if (locationImage?.url) {
          return locationImage.url.startsWith('http') ? locationImage.url : `https://www.sacavia.com${locationImage.url}`
        }
      }

      return 'https://www.sacavia.com/og-image.png'
    }

    const postImage = getPostImageUrl(post)
    const locationName = post.location?.name || null
    
    const keywords = [
      postTitle,
      authorName,
      'review',
      'photos',
      'local recommendations',
      'places to visit',
      locationName,
      'travel tips',
      'user reviews'
    ].filter(Boolean).join(', ')

    return {
      title: seoTitle,
      description,
      keywords,
      authors: [{ name: authorName }],
      creator: 'Sacavia',
      publisher: 'Sacavia',
      alternates: {
        canonical: `https://www.sacavia.com/post/${id}`
      },
      openGraph: {
        title: seoTitle,
        description,
        url: `https://www.sacavia.com/post/${id}`,
        siteName: 'Sacavia',
        images: [
          {
            url: postImage,
            width: 1200,
            height: 630,
            alt: `${postTitle} - Shared on Sacavia by ${authorName}`,
          },
        ],
        type: 'article',
        locale: 'en_US',
        publishedTime: post.createdAt,
        modifiedTime: post.updatedAt,
        authors: [authorName],
      },
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description,
        site: '@sacavia',
        creator: '@sacavia',
        images: [postImage],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      other: {
        'article:author': authorName,
        'article:publisher': 'https://www.sacavia.com',
        'article:published_time': post.createdAt,
        'article:modified_time': post.updatedAt,
        'og:locale': 'en_US',
        'og:type': 'article',
      }
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Post | Sacavia - Find Places to Visit",
      description: "Read reviews and see photos of amazing places shared by our community.",
      robots: 'noindex'
    }
  }
}

export default async function PostPage({ params }: PostPageProps) {
  // Check if post exists
  try {
    const { id } = await params
    
    // If someone tries to access /post/create through this route, redirect them
    if (id === 'create') {
      notFound()
    }
    
    const post = await getPostById(id)

    if (!post) {
      notFound()
    }

    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/feed" className="text-gray-600 hover:text-[#FF6B6B] flex items-center">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Feed
            </Link>
          </Button>
        </div>

        {/* Post detail */}
        <Suspense fallback={<PostDetailSkeleton />}>
          <PostDetail postId={id} />
        </Suspense>

        {/* Comments section */}
        <div className="mt-8">
          <CommentSection postId={id} />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading post:", error)
    notFound()
  }
}
