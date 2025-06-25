import { Suspense } from "react"
import { Metadata } from "next"
import { getPayload } from 'payload'
import config from '@/payload.config'
import EnhancedFeedWrapper from '@/components/feed/enhanced-feed-wrapper'
import { TrendingUp, Users, MapPin, Calendar, BookOpen } from 'lucide-react'

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

// Enhanced loading skeleton with brand colors
function EnhancedFeedSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-8 w-32 bg-gradient-to-r from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-lg animate-pulse"></div>
              <div className="h-4 w-48 bg-gray-200 rounded mt-2 animate-pulse"></div>
            </div>
            <div className="h-9 w-20 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          
          {/* Filter skeleton */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <div className="h-4 w-12 bg-gray-200 rounded flex-shrink-0 animate-pulse"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-16 bg-gray-200 rounded-full flex-shrink-0 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function FeedPage() {
  try {
    const payload = await getPayload({ config })
    
    // Check if there's any content in the database
    const [posts, locations, users] = await Promise.all([
      payload.find({
        collection: 'posts',
        limit: 1,
        where: { status: { equals: 'published' } }
      }),
      payload.find({
        collection: 'locations',
        limit: 1,
        where: { status: { equals: 'published' } }
      }),
      payload.find({
        collection: 'users',
        limit: 1
      })
    ])

    const hasContent = posts.docs.length > 0 || locations.docs.length > 0 || users.docs.length > 0

    if (!hasContent) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">📱</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Feed Coming Soon</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We're working on bringing you amazing content from our community. Check back soon for posts, recommendations, and discoveries!
              </p>
              <div className="flex gap-4 justify-center">
                <a 
                  href="/explore" 
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  Explore Locations
                </a>
                <a 
                  href="/guides" 
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  Browse Guides
                </a>
              </div>
            </div>
          </div>
        </main>
      )
    }

    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <Suspense fallback={<EnhancedFeedSkeleton />}>
          <EnhancedFeedWrapper />
        </Suspense>
      </main>
    )
  } catch (error) {
    console.error('Error in feed page:', error)
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">📱</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Feed Coming Soon</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              We're working on bringing you amazing content from our community. Check back soon for posts, recommendations, and discoveries!
            </p>
            <div className="flex gap-4 justify-center">
              <a 
                href="/explore" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Explore Locations
              </a>
              <a 
                href="/guides" 
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
              >
                Browse Guides
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }
}
