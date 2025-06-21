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
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-base font-medium">Loading search...</span>
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
      {/* Background decorations - smaller on mobile */}
      <div className="absolute inset-0 opacity-20 overflow-hidden">
        <div className="absolute top-5 left-5 w-32 h-32 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-full blur-2xl md:blur-3xl"></div>
        <div className="absolute bottom-10 right-5 w-40 h-40 sm:w-60 sm:h-60 md:w-96 md:h-96 bg-gradient-to-br from-[#FFD93D]/20 to-[#FF6B6B]/20 rounded-full blur-2xl md:blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-gradient-to-br from-[#4ECDC4]/10 to-[#FFD93D]/10 rounded-full blur-2xl md:blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-6xl">
        {/* Header - more compact on mobile */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#FFD93D] bg-clip-text text-transparent">
            Discover & Connect
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2">
            Find amazing places, connect with like-minded people, and explore your world
          </p>
        </div>

        {/* Enhanced Search Component */}
        <Suspense fallback={<SearchLoading />}>
          <EnhancedSearch initialQuery={query} initialType={type} />
        </Suspense>
      </div>
    </div>
  )
}