import { Suspense } from "react"
import { Metadata } from "next"
import FeedSkeleton from "@/components/feed/feed-skeleton"
import AddictiveFeedContainer from "@/components/feed/addictive-feed-container"
import ModernDiscoveryFeed from "@/components/feed/instagram-style-feed"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, TrendingUp, Users } from "lucide-react"

export const metadata: Metadata = {
  title: "Discover Amazing Places | Sacavia",
  description: "Explore trending locations, hidden gems, and authentic experiences shared by our global community of travelers and locals.",
  keywords: ["travel", "locations", "hidden gems", "travel community", "discover places", "travel feed"],
  openGraph: {
    title: "Discover Amazing Places | Sacavia",
    description: "Explore trending locations, hidden gems, and authentic experiences shared by our global community.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Amazing Places | Sacavia",
    description: "Explore trending locations, hidden gems, and authentic experiences.",
  }
}

// Enhanced loading component with better visual appeal
function EnhancedFeedSkeleton() {
  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/60 text-sm">Loading your personalized feed...</p>
      </div>
    </div>
  )
}

export default async function FeedPage() {
  return (
    <>
      <div className="min-h-screen bg-black">
        {/* Modern Discovery Feed for all screen sizes */}
        <Suspense fallback={<EnhancedFeedSkeleton />}>
          <ModernDiscoveryFeed
            feedType="all"
            sortBy="recent"
            variant="mobile"
            showHeader={true}
            className="h-screen"
          />
        </Suspense>
      </div>
    </>
  )
}
