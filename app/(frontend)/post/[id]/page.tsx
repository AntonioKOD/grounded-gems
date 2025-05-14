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
        title: "Post Not Found | Grounded Gems",
        description: "The post you're looking for could not be found.",
      }
    }

    return {
      title: post.title ? `${post.title} | Grounded Gems` : `Post by ${post.author.name} | Grounded Gems`,
      description: post.content.substring(0, 160),
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Post | Grounded Gems",
      description: "View post details and comments",
    }
  }
}

export default async function PostPage({ params }: PostPageProps) {
  // Check if post exists
  try {
    const { id } = await params
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
