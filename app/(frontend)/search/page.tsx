import { Metadata } from "next"
import { Suspense } from "react"
import EnhancedSearch from "@/components/search/enhanced-search"
import { Loader2 } from "lucide-react"

// Force dynamic rendering to prevent SSR issues with search components
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Search Places and People | Sacavia",
  description: "Find restaurants, attractions, events and people near you. Search by location, category, or name to discover your next favorite spot.",
  keywords: ["search restaurants", "find places", "local attractions", "search events", "find people", "places near me"],
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string }>
}

// Loading component
function SearchLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3 text-[#4ECDC4]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Loading search...</span>
      </div>
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ""
  const type = params.type || "all"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background decorations - more subtle and mobile-friendly */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-10 left-5 w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 bg-gradient-to-br from-[#FF6B6B]/30 to-[#4ECDC4]/30 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-5 w-32 h-32 sm:w-40 sm:h-40 md:w-60 md:h-60 bg-gradient-to-br from-[#FFD93D]/30 to-[#FF6B6B]/30 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6 max-w-5xl">
        {/* Create Guide CTA Banner */}
        <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-[#FF6B6B]/10 via-[#4ECDC4]/10 to-[#FFD93D]/10 rounded-2xl border border-white/20 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                Share Your Local Expertise 🌟
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Create and sell travel guides for your favorite places. Turn your local knowledge into income!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <a 
                href="/guides" 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/80 hover:bg-white border border-gray-200 rounded-xl transition-all duration-200 text-center"
              >
                Browse Guides
              </a>
              <a 
                href="/guides/create" 
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
              >
                Create Guide & Earn
              </a>
            </div>
          </div>
        </div>

        {/* Enhanced Search Component - more space on mobile */}
        <Suspense fallback={<SearchLoading />}>
          <EnhancedSearch initialQuery={query} initialType={type} />
        </Suspense>
      </div>
    </div>
  )
}