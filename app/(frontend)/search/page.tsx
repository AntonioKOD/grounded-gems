import { Metadata } from "next"
import SearchResults from "@/components/search/search-results"

export const metadata: Metadata = {
  title: "Search Results | Grounded Gems",
  description: "Search for locations, users, and experiences",
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ""
  const type = params.type || "all"

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {query ? `Search Results for "${query}"` : "Search"}
            </h1>
            <p className="text-gray-600">
              {query ? "Discover locations and connect with users" : "Enter a search term to get started"}
            </p>
          </div>
          
          <SearchResults initialQuery={query} initialType={type} />
        </div>
      </div>
    </div>
  )
}