import { Suspense } from "react"
import { Metadata } from "next"
import { getFeedPosts } from "@/app/actions"
import FeedSkeleton from "@/components/feed/feed-skeleton"
import ResponsiveFeed from "@/components/feed/responsive-feed"
import type { Post } from "@/types/feed"

export const metadata: Metadata = {
  title: "Discover | Sacavia",
  description: "Discover amazing places and experiences shared by the community",
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
    <main className="min-h-screen w-full bg-black overflow-hidden">
      <Suspense fallback={<FeedSkeleton />}>
        <ResponsiveFeed
          initialPosts={initialPosts}
          feedType="all"
          sortBy="recent"
          showPostForm={true}
        />
      </Suspense>
    </main>
  )
}
