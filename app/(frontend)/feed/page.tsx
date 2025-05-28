import { Suspense } from "react"
import { Metadata } from "next"
import { getFeedPosts } from "@/app/actions"
import FeedSkeleton from "@/components/feed/feed-skeleton"
import ResponsiveFeed from "@/components/feed/responsive-feed"
import type { Post } from "@/types/feed"
import FloatingSearchWrapper from "@/components/ui/floating-search-wrapper"

export const metadata: Metadata = {
  title: "Discover | Grounded Gems",
  description: "Discover amazing places and experiences shared by the community",
}

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  // Pre-fetch initial feed data for SSR
  let initialPosts: Post[] = []
  
  try {
    initialPosts = await getFeedPosts("all", "recent", 1)
  } catch {
    // Will continue with empty array - silently handle errors
  }

  return (
    <main className="min-h-screen w-full bg-black overflow-hidden fullscreen-content">
      <Suspense fallback={<FeedSkeleton />}>
        <ResponsiveFeed
          initialPosts={initialPosts}
          feedType="all"
          sortBy="recent"
          showPostForm={true}
        />
      </Suspense>
      {/* Floating search button in bottom right */}
      <div className="fixed bottom-fab right-safe z-40 md:hidden">
        <FloatingSearchWrapper />
      </div>
    </main>
  )
}
