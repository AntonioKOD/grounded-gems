"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Users, MapPin, Star, User, Mail, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

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
  address?: {
    city?: string
    state?: string
    street?: string
  }
  featuredImage?: {
    url: string
    alt?: string
  }
  averageRating?: number
  reviewCount?: number
  categories?: Array<{
    name: string
    color?: string
  }>
}

interface SearchResults {
  users: SearchUser[]
  locations: SearchLocation[]
  total: number
}

interface SearchResultsProps {
  initialQuery?: string
  initialType?: string
}

// Helper to get image URL
const getLocationImageUrl = (location: SearchLocation): string => {
  if (location.featuredImage?.url) {
    return location.featuredImage.url
  }
  return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80"
}

export default function SearchResults({ initialQuery = "", initialType = "all" }: SearchResultsProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState(initialType)
  const [results, setResults] = useState<SearchResults>({ users: [], locations: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(!!initialQuery)
  const router = useRouter()

  // Search function
  const performSearch = useCallback(async (searchQuery: string, searchType: string = "all") => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults({ users: [], locations: [], total: 0 })
      setHasSearched(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}&limit=20`)
      
      if (response.ok) {
        const data = await response.json()
        setResults(data)
        setHasSearched(true)
      } else {
        console.error("Search failed:", response.statusText)
        setResults({ users: [], locations: [], total: 0 })
      }
    } catch (error) {
      console.error("Search error:", error)
      setResults({ users: [], locations: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      // Update URL
      router.push(`/search?q=${encodeURIComponent(query)}&type=${activeTab}`)
      performSearch(query, activeTab)
    }
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=${value}`)
      performSearch(query, value)
    }
  }

  // Initial search if query provided
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, initialType)
    }
  }, [initialQuery, initialType, performSearch])

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative group">
          {/* Main search container */}
          <div className="relative flex h-14 overflow-hidden rounded-2xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 shadow-lg transition-all duration-300 group-hover:shadow-xl group-focus-within:border-[#4ECDC4] group-focus-within:shadow-xl group-focus-within:from-[#4ECDC4]/5 group-focus-within:to-white">
            
            {/* Search icon */}
            <div className="absolute left-5 top-0 bottom-0 flex items-center pointer-events-none z-10">
              <Search className="h-5 w-5 text-gray-400 transition-colors duration-200 group-focus-within:text-[#4ECDC4]" />
            </div>

            {/* Input field */}
            <Input
              id="search-input"
              name="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for people or locations..."
              className="flex-1 pl-14 pr-32 h-full border-0 bg-transparent text-gray-900 placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-medium"
            />

            {/* Search button */}
            <div className="absolute right-2 top-2 bottom-2 flex items-center">
              <Button
                type="submit"
                className={cn(
                  "h-10 px-6 rounded-xl font-semibold transition-all duration-200",
                  "bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] hover:from-[#FF5555] hover:to-[#FF7777]",
                  "text-white shadow-md hover:shadow-lg",
                  "transform hover:scale-105 active:scale-95",
                  "border-0 focus-visible:ring-2 focus-visible:ring-[#FF6B6B]/50 focus-visible:ring-offset-2",
                  loading && "cursor-not-allowed opacity-80"
                )}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#4ECDC4]/20 via-transparent to-[#FF6B6B]/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm -z-10" />
        </div>

        {/* Search suggestions or quick filters (optional enhancement) */}
        {query && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 opacity-95 backdrop-blur-sm">
            <div className="p-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Search className="h-4 w-4" />
                <span>Quick suggestions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-[#4ECDC4]/10 text-gray-700 rounded-lg transition-colors duration-200"
                  onClick={() => {
                    setQuery(query + " restaurant")
                    performSearch(query + " restaurant", activeTab)
                  }}
                >
                  + restaurant
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-[#4ECDC4]/10 text-gray-700 rounded-lg transition-colors duration-200"
                  onClick={() => {
                    setQuery(query + " near me")
                    performSearch(query + " near me", activeTab)
                  }}
                >
                  + near me
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-[#4ECDC4]/10 text-gray-700 rounded-lg transition-colors duration-200"
                  onClick={() => {
                    setQuery(query + " events")
                    performSearch(query + " events", activeTab)
                  }}
                >
                  + events
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading ? "Searching..." : `${results.total} result${results.total === 1 ? '' : 's'} found`}
            </p>
          </div>

          {/* Results Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex gap-2 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="users"><Users className="inline-block mr-1 h-4 w-4" /> People</TabsTrigger>
              <TabsTrigger value="locations"><MapPin className="inline-block mr-1 h-4 w-4" /> Locations</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {/* Show both users and locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><Users className="h-5 w-5 text-[#4ECDC4]" /> People</h2>
                  {results.users.length === 0 ? <NoResults query={query} type="users" /> : results.users.map(user => <UserCard key={user.id} user={user} />)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><MapPin className="h-5 w-5 text-[#FF6B6B]" /> Locations</h2>
                  {results.locations.length === 0 ? <NoResults query={query} type="locations" /> : results.locations.map(location => <LocationCard key={location.id} location={location} />)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users">
              {results.users.length === 0 ? <NoResults query={query} type="users" /> : results.users.map(user => <UserCard key={user.id} user={user} />)}
            </TabsContent>

            <TabsContent value="locations">
              {results.locations.length === 0 ? <NoResults query={query} type="locations" /> : results.locations.map(location => <LocationCard key={location.id} location={location} />)}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start your search</h3>
          <p className="text-gray-500">
            Enter a search term above to find locations and users
          </p>
        </div>
      )}
    </div>
  )
}

// Location Card Component
function LocationCard({ location }: { location: SearchLocation }) {
  const primaryCategory = location.categories?.[0]

  return (
    <Link href={`/locations/${location.id}`}>
      <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="relative h-40 overflow-hidden">
          <Image
            src={getLocationImageUrl(location)}
            alt={location.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {primaryCategory && (
            <div className="absolute top-3 left-3">
              <Badge 
                className="text-xs font-medium border-0 shadow-sm"
                style={{
                  backgroundColor: `${primaryCategory.color || '#4ECDC4'}20`,
                  color: primaryCategory.color || '#4ECDC4',
                }}
              >
                {primaryCategory.name}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-2">{location.name}</h4>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{location.description}</p>
          
          {location.address && (
            <p className="text-xs text-gray-500 mb-2">
              {location.address.city && location.address.state 
                ? `${location.address.city}, ${location.address.state}`
                : location.address.street || 'Address not available'}
            </p>
          )}
          
          {location.averageRating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{location.averageRating.toFixed(1)}</span>
              {location.reviewCount && (
                <span className="text-xs text-gray-500">({location.reviewCount} reviews)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

// User Card Component
function UserCard({ user }: { user: SearchUser }) {
  return (
    <Link href={`/profile/${user.id}`}>
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center text-white font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{user.name}</h4>
              {user.username && (
                <p className="text-sm text-gray-600">@{user.username}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Mail className="h-4 w-4" />
            <span className="truncate">{user.email}</span>
          </div>
          
          <div className="mt-3 flex items-center text-[#4ECDC4] text-sm font-medium">
            View Profile
            <ExternalLink className="h-3 w-3 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// No Results Component
function NoResults({ query, type }: { query: string; type?: string }) {
  const typeText = type === "locations" ? "locations" : type === "users" ? "users" : "results"
  
  return (
    <div className="text-center py-12">
      <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No {typeText} found for "{query}"
      </h3>
      <p className="text-gray-500 mb-4">
        Try adjusting your search terms or browsing our categories
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/map">
          <Button variant="outline">Explore Map</Button>
        </Link>
        <Link href="/add-location">
          <Button variant="outline">Add Location</Button>
        </Link>
      </div>
    </div>
  )
} 