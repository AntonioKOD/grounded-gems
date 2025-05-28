"use client"

import { useState, useEffect } from "react"
import { Search, User, MapPin, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface SearchUser {
  id: string
  name: string
  username?: string
  email: string
}

interface SearchLocation {
  id: string
  name: string
  description: string
}

interface SearchResults {
  users: SearchUser[]
  locations: SearchLocation[]
  total: number
}

export default function SearchResultsSimple({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResults>({ users: [], locations: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(!!initialQuery)

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
    // eslint-disable-next-line
  }, [initialQuery])

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults({ users: [], locations: [], total: 0 })
      setHasSearched(false)
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=all&limit=20`)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
        setHasSearched(true)
      } else {
        setResults({ users: [], locations: [], total: 0 })
      }
    } catch {
      setResults({ users: [], locations: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    performSearch(query)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for people or locations..."
            className="border-0 focus:ring-0 focus-visible:ring-0 shadow-none px-2"
          />
        </div>
      </form>
      {loading && <div className="text-gray-500 text-sm mb-4">Searching...</div>}
      {hasSearched && !loading && results.total === 0 && (
        <div className="text-gray-500 text-sm mb-4">No results found.</div>
      )}
      <div className="space-y-2">
        {results.users.filter(user => typeof user.name === 'string' && typeof user.email === 'string').map(user => (
          <Link href={`/profile/${user.id}`} key={user.id} className="block border rounded px-3 py-2 hover:bg-gray-50 transition flex items-center gap-3">
            <User className="h-6 w-6 text-[#4ECDC4]" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{typeof user.name === 'string' ? user.name : '[Unknown]'}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" /> {typeof user.email === 'string' ? user.email : ''}</div>
            </div>
          </Link>
        ))}
        {results.locations.filter(location => typeof location.name === 'string' && typeof location.description === 'string').map(location => (
          <Link href={`/locations/${location.id}`} key={location.id} className="block border rounded px-3 py-2 hover:bg-gray-50 transition flex items-center gap-3">
            <MapPin className="h-6 w-6 text-[#FF6B6B]" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{typeof location.name === 'string' ? location.name : '[Unknown]'}</div>
              <div className="text-xs text-gray-500 line-clamp-1">{typeof location.description === 'string' ? location.description : ''}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 