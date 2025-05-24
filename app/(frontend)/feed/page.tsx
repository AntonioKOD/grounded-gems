import { Suspense } from "react"
import { Metadata } from "next"
import { getFeedPosts } from "@/app/actions"
import FeedSkeleton from "@/components/feed/feed-skeleton"
import ResponsiveFeed from "@/components/feed/responsive-feed"
import type { Post } from "@/types/feed"

export const metadata: Metadata = {
  title: "Feed | Grounded Gems",
  description: "Discover locations and events shared by the community",
}

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  // Pre-fetch initial feed data for SSR
  let initialPosts: Post[] = []
  
  try {
    initialPosts = await getFeedPosts("all", "recent", 1)
    console.log(`Feed page loaded with ${initialPosts.length} posts`)
  } catch (err) {
    console.error("Error pre-loading feed posts:", err)
    // Will continue with empty array
  }

  return (
    <main className="py-6">
      <div className="container px-4 sm:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Feed</h1>

        <Suspense fallback={<FeedSkeleton />}>
          <ResponsiveFeed
            initialPosts={initialPosts}
            feedType="all"
            sortBy="recent"
            showPostForm={true}
          />
        </Suspense>
      </div>
    </main>
  )
}
