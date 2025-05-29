import { Suspense } from "react"
import { Metadata } from "next"
import FeedSkeleton from "@/components/feed/feed-skeleton"
import AddictiveFeedContainer from "@/components/feed/addictive-feed-container"
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
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* Header skeleton */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-white">
        <CardContent className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="h-8 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse" />
              <div className="h-6 w-20 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          
          {/* Category pills skeleton */}
          <div className="flex gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="h-10 w-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse" 
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          
          {/* Stats skeleton */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gray-300" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-300" />
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-300" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Posts skeleton */}
      <FeedSkeleton />
    </div>
  )
}

export default async function FeedPage() {
  return (
    <>
      <div className="min-h-screen">
        {/* Desktop: gradient background */}
        <div className="hidden md:block fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#FF6B6B]/5 to-[#FFD93D]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-[#4ECDC4]/5 to-[#FF6B6B]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-[#FFD93D]/3 to-[#FF8E53]/3 rounded-full blur-3xl" />
        </div>

        {/* Mobile: full-screen black background */}
        <div className="md:hidden fixed inset-0 bg-black" />

        {/* Main content */}
        <div className="relative z-10 md:container md:mx-auto md:px-4 md:py-8">
          <Suspense fallback={<EnhancedFeedSkeleton />}>
            <AddictiveFeedContainer
              feedType="all"
              sortBy="recent"
              showPostForm={true}
              className="relative z-10 mobile-feed-container"
            />
          </Suspense>
        </div>
      </div>
    </>
  )
}
