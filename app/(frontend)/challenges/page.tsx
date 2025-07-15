export const dynamic = "force-dynamic";
import { Suspense } from "react"
import { Metadata } from "next"
import { getPayload } from 'payload'
import config from '@/payload.config'
import ChallengesPage from '@/components/challenges/challenges-page'

export const metadata: Metadata = {
  title: "Weekly Challenges | Sacavia",
  description: "Join exciting weekly challenges, discover new places, and earn rewards. Vote on community suggestions and create your own adventure!",
  keywords: ["challenges", "weekly challenges", "rewards", "community", "adventure", "exploration"],
  openGraph: {
    title: "Weekly Challenges | Sacavia",
    description: "Join exciting weekly challenges and earn rewards while exploring your city.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weekly Challenges | Sacavia",
    description: "Join exciting weekly challenges and earn rewards while exploring your city.",
  }
}

// Loading skeleton
function ChallengesSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gradient-to-r from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-lg mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weekly challenges skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Suggestions skeleton */}
          <div className="space-y-6">
            <div className="h-6 w-40 bg-gray-200 rounded"></div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function ChallengesPageWrapper() {
  try {
    const payload = await getPayload({ config })
    
    // Check if there are any challenges in the database
    const challenges = await payload.find({
      collection: 'challenges',
      limit: 1,
      where: { status: { equals: 'active' } }
    })

    const hasChallenges = challenges.docs.length > 0

    if (!hasChallenges) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">🏆</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Challenges Coming Soon</h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We're working on bringing you exciting weekly challenges and community voting. Check back soon for amazing adventures and rewards!
              </p>
              <div className="flex gap-4 justify-center">
                <a 
                  href="/explore" 
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  Explore Locations
                </a>
                <a 
                  href="/feed" 
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  Browse Feed
                </a>
              </div>
            </div>
          </div>
        </main>
      )
    }

    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <Suspense fallback={<ChallengesSkeleton />}>
          <ChallengesPage />
        </Suspense>
      </main>
    )
  } catch (error) {
    console.error('Error in challenges page:', error)
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">🏆</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Challenges Coming Soon</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              We're working on bringing you exciting weekly challenges and community voting. Check back soon for amazing adventures and rewards!
            </p>
            <div className="flex gap-4 justify-center">
              <a 
                href="/explore" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Explore Locations
              </a>
              <a 
                href="/feed" 
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
              >
                Browse Feed
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }
} 