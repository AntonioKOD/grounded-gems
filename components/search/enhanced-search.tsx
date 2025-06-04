"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Users, MapPin, Star, User, Mail, ExternalLink, Filter, SortAsc, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"

interface SearchUser {
  id: string
  name: string
  username?: string
  email: string
  profileImage?: {
    url: string
    alt?: string
  }
  bio?: string
  isCreator?: boolean
  followers?: any[]
  relevanceScore?: number
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
  isVerified?: boolean
  isFeatured?: boolean
  relevanceScore?: number
}

interface SearchResults {
  users: SearchUser[]
  locations: SearchLocation[]
  total: number
  query?: string
  searchType?: string
  hasResults?: boolean
}

interface EnhancedSearchProps {
  initialQuery?: string
  initialType?: string
}

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Helper to get image URL
const getLocationImageUrl = (location: SearchLocation): string => {
  if (location.featuredImage?.url) {
    return location.featuredImage.url
  }
  return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80"
}

const getUserAvatarUrl = (user: SearchUser): string => {
  if (user.profileImage?.url) {
    return user.profileImage.url
  }
  return ""
}

export default function EnhancedSearch({ initialQuery = "", initialType = "all" }: EnhancedSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState(initialType)
  const [sortBy, setSortBy] = useState("relevance")
  const [results, setResults] = useState<SearchResults>({ users: [], locations: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(!!initialQuery)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Debounce search query for real-time search
  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recentSearches')
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved))
        } catch (e) {
          console.error('Error loading recent searches:', e)
        }
      }
    }
  }, [])

  // Save recent search
  const saveRecentSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) return
    
    setRecentSearches(prev => {
      const updated = [searchTerm, ...prev.filter(s => s !== searchTerm)].slice(0, 5)
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  // Search function
  const performSearch = useCallback(async (searchQuery: string, searchType: string = "all", sort: string = "relevance") => {
    if (!searchQuery.trim()) {
      setResults({ users: [], locations: [], total: 0 })
      setHasSearched(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}&sortBy=${sort}&limit=20`)
      
      if (response.ok) {
        const data = await response.json()
        setResults(data)
        setHasSearched(true)
        saveRecentSearch(searchQuery)
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
  }, [saveRecentSearch])

  // Real-time search effect
  useEffect(() => {
    if (debouncedQuery.trim() && debouncedQuery.length >= 1) {
      performSearch(debouncedQuery, activeTab, sortBy)
    } else {
      setResults({ users: [], locations: [], total: 0 })
      setHasSearched(false)
    }
  }, [debouncedQuery, activeTab, sortBy, performSearch])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (query.trim()) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('type', value)
      router.push(`/search?${params.toString()}`)
    }
  }

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value)
  }

  // Clear search
  const clearSearch = () => {
    setQuery("")
    setResults({ users: [], locations: [], total: 0 })
    setHasSearched(false)
    router.push('/search')
  }

  // Filter results for current tab
  const filteredResults = useMemo(() => {
    if (activeTab === "users") {
      return { ...results, locations: [], total: results.users.length }
    } else if (activeTab === "locations") {
      return { ...results, users: [], total: results.locations.length }
    }
    return results
  }, [results, activeTab])

  // Initial search if query provided
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery)
    }
  }, [initialQuery, query])

  return (
    <div className="space-y-6">
      {/* Enhanced Search Form */}
      <div className="relative">
        <div className="relative group">
          {/* Main search container */}
          <div className="relative flex h-14 overflow-hidden rounded-2xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 shadow-lg transition-all duration-300 group-hover:shadow-xl group-focus-within:border-[#4ECDC4] group-focus-within:shadow-xl group-focus-within:from-[#4ECDC4]/5 group-focus-within:to-white">
            
            {/* Search icon */}
            <div className="absolute left-5 top-0 bottom-0 flex items-center pointer-events-none z-10">
              <Search className={cn(
                "h-5 w-5 transition-colors duration-200",
                loading ? "text-[#4ECDC4] animate-pulse" : "text-gray-400 group-focus-within:text-[#4ECDC4]"
              )} />
            </div>

            {/* Input field */}
            <Input
              id="search-input"
              name="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search usernames, locations, or categories..."
              className="flex-1 pl-14 pr-20 h-full border-0 bg-transparent text-gray-900 placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-medium"
            />

            {/* Clear button */}
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-16 top-0 bottom-0 flex items-center px-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="absolute right-2 top-2 bottom-2 flex items-center">
                <div className="h-10 px-4 rounded-xl bg-[#4ECDC4]/10 flex items-center">
                  <Loader2 className="h-4 w-4 text-[#4ECDC4] animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Decorative elements */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#4ECDC4]/20 via-transparent to-[#FF6B6B]/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm -z-10" />
        </div>

        {/* Recent searches */}
        {!query && recentSearches.length > 0 && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((recent, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(recent)}
                  className="text-sm px-3 py-1.5 bg-gray-50 hover:bg-[#4ECDC4]/10 text-gray-700 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <Search className="h-3 w-3" />
                  {recent}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search controls */}
      {hasSearched && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              {loading ? "Searching..." : `${filteredResults.total} result${filteredResults.total === 1 ? '' : 's'} found`}
              {query && <span className="font-medium"> for "{query}"</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[140px] h-9">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              All ({results.total})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              People ({results.users.length})
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Places ({results.locations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {filteredResults.total === 0 ? (
              <NoResults query={query} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Users column */}
                <div className="space-y-4">
                  {results.users.length > 0 && (
                    <>
                      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#4ECDC4]" />
                        People ({results.users.length})
                      </h2>
                      {results.users.slice(0, 5).map(user => (
                        <UserCard key={user.id} user={user} />
                      ))}
                    </>
                  )}
                </div>
                
                {/* Locations column */}
                <div className="space-y-4">
                  {results.locations.length > 0 && (
                    <>
                      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[#FF6B6B]" />
                        Places ({results.locations.length})
                      </h2>
                      {results.locations.slice(0, 5).map(location => (
                        <LocationCard key={location.id} location={location} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            {results.users.length === 0 ? (
              <NoResults query={query} type="users" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.users.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="mt-6">
            {results.locations.length === 0 ? (
              <NoResults query={query} type="locations" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.locations.map(location => (
                  <LocationCard key={location.id} location={location} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!hasSearched && !loading && (
        <div className="text-center py-16">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Discover amazing places and people</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Search for locations by name, usernames, categories, or anything that interests you
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/map">
              <Button variant="outline" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Explore Map
              </Button>
            </Link>
            <Link href="/add-location">
              <Button variant="outline" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Add Location
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced User Card Component
function UserCard({ user }: { user: SearchUser }) {
  const avatarUrl = getUserAvatarUrl(user)
  
  return (
    <Link href={`/profile/${user.id}`}>
      <Card className="hover:shadow-lg transition-all duration-300 group">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {user.isCreator && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FFE66D] rounded-full flex items-center justify-center">
                  <Star className="h-3 w-3 text-gray-800" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
              {user.username && (
                <p className="text-sm text-[#4ECDC4] font-medium">@{user.username}</p>
              )}
            </div>
          </div>
          
          {user.bio && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{user.bio}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="h-4 w-4" />
              <span className="truncate">
                {user.followers && user.followers.length > 0 
                  ? `${user.followers.length} followers` 
                  : 'No followers yet'}
              </span>
            </div>
            {user.followers && user.followers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {user.followers.length} followers
              </Badge>
            )}
          </div>
          
          <div className="mt-3 flex items-center text-[#4ECDC4] text-sm font-medium group-hover:text-[#26C6DA] transition-colors">
            View Profile
            <ExternalLink className="h-3 w-3 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Enhanced Location Card Component
function LocationCard({ location }: { location: SearchLocation }) {
  const primaryCategory = location.categories?.[0]
  const imageUrl = getLocationImageUrl(location)

  return (
    <Link href={`/locations/${location.id}`}>
      <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden group">
        <div className="relative h-40 overflow-hidden">
          <Image
            src={imageUrl}
            alt={location.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            {primaryCategory && (
              <Badge 
                className="text-xs font-medium border-0 shadow-sm"
                style={{
                  backgroundColor: `${primaryCategory.color || '#4ECDC4'}20`,
                  color: primaryCategory.color || '#4ECDC4',
                }}
              >
                {primaryCategory.name}
              </Badge>
            )}
            {location.isVerified && (
              <Badge className="text-xs font-medium bg-green-100 text-green-800 border-0">
                Verified
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-[#FF6B6B] transition-colors">
            {location.name}
          </h4>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{location.description}</p>
          
          {location.address && (
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
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

// Enhanced No Results Component
function NoResults({ query, type }: { query: string; type?: string }) {
  const typeText = type === "locations" ? "places" : type === "users" ? "people" : "results"
  
  return (
    <div className="text-center py-16">
      <Search className="h-16 w-16 text-gray-300 mx-auto mb-6" />
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        No {typeText} found{query && ` for "${query}"`}
      </h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Try adjusting your search terms, checking for typos, or browsing our categories
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/map">
          <Button variant="outline" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Explore Map
          </Button>
        </Link>
        <Link href="/add-location">
          <Button variant="outline" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Add Location
          </Button>
        </Link>
      </div>
    </div>
  )
} 