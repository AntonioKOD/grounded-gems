import { Metadata } from "next"
import SearchResults from "@/components/search/search-results-simple"

export const metadata: Metadata = {
  title: "Search | Grounded Gems",
  description: "Search for people and locations",
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ""

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <SearchResults initialQuery={query} />
      </div>
    </div>
  )
}