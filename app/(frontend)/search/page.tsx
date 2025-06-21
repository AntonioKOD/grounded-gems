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
        {/* Enhanced Search Component - more space on mobile */}
        <Suspense fallback={<SearchLoading />}>
          <EnhancedSearch initialQuery={query} initialType={type} />
        </Suspense>
      </div>
    </div>
  )
}