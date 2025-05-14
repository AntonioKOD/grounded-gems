import { Suspense } from "react"
import FeedContainer from "@/components/feed/feed-container"
import FeedSkeleton from "@/components/feed/feed-skeleton"
import FeedSidebar from "@/components/feed/feed-sidebar"

export const metadata = {
  title: "Community Feed | Local Explorer",
  description: "Discover posts and recommendations from your favorite contributors",
}

export default function FeedPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Community Feed</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main feed content */}
        <div className="lg:col-span-8">
          <Suspense fallback={<FeedSkeleton />}>
            <FeedContainer />
          </Suspense>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <FeedSidebar />
        </div>
      </div>
    </div>
  )
}
