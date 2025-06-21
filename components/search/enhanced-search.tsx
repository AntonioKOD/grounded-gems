"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, MapPin, Star, User, ExternalLink, Loader2, Navigation, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getImageUrl } from "@/lib/image-utils"

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
}

interface SearchLocation {
  id: string
  name: string
  slug: string
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
  distance?: number
}

interface SearchCategory {
  id: string
  name: string
  description?: string
  color?: string
  slug?: string
}

interface SearchResults {
  users: SearchUser[]
  locations: SearchLocation[]
  categories: SearchCategory[]
  total: number
}

interface EnhancedSearchProps {
  initialQuery?: string
  initialType?: string
}

export default function EnhancedSearch({ initialQuery = "", initialType = "all" }: EnhancedSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState(initialType)
  const [results, setResults] = useState<SearchResults>({ users: [], locations: [], categories: [], total: 0 })
  const [nearbyLocations, setNearbyLocations] = useState<SearchLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], locations: [], categories: [], total: 0 })
      setHasSearched(false)
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(query, activeTab)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, activeTab])

  // Perform search
  const performSearch = async (searchQuery: string, searchType: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType === 'all' ? '' : searchType,
        ...(userLocation && { lat: userLocation.latitude.toString(), lng: userLocation.longitude.toString() })
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (data.users || data.locations || data.categories) {
        setResults({
          users: data.users || [],
          locations: data.locations || [],
          categories: data.categories || [],
          total: data.total || 0
        })
        setHasSearched(true)
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get nearby locations
  const getNearbyLocations = useCallback(async () => {
    if (nearbyLoading) return

    setNearbyLoading(true)
    try {
      if (!userLocation) {
        // Get user location first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              setUserLocation({ latitude, longitude })
              
              // Now get nearby locations
              const response = await fetch('/api/locations/nearby', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude, radius: 25, limit: 15 })
              })
              
              const data = await response.json()
              if (data.success && data.locations) {
                setNearbyLocations(data.locations.map((loc: any) => ({
                  ...loc,
                  slug: loc.slug || loc.id, // fallback to id if no slug
                  featuredImage: loc.imageUrl ? { url: loc.imageUrl } : null // Convert imageUrl to featuredImage structure
                })))
                setActiveTab('nearby')
              }
            },
            (error) => {
              console.error('Geolocation error:', error)
              toast.error('Unable to get your location. Please enable location services.')
            }
          )
        } else {
          toast.error('Geolocation is not supported by this browser.')
        }
      } else {
        // Use existing location
        const response = await fetch('/api/locations/nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            latitude: userLocation.latitude, 
            longitude: userLocation.longitude, 
            radius: 25, 
            limit: 15 
          })
        })
        
        const data = await response.json()
        if (data.success && data.locations) {
          setNearbyLocations(data.locations.map((loc: any) => ({
            ...loc,
            slug: loc.slug || loc.id, // fallback to id if no slug
            featuredImage: loc.imageUrl ? { url: loc.imageUrl } : null // Convert imageUrl to featuredImage structure
          })))
          setActiveTab('nearby')
        }
      }
    } catch (error) {
      console.error('Nearby search error:', error)
      toast.error('Failed to find nearby places.')
    } finally {
      setNearbyLoading(false)
    }
  }, [userLocation, nearbyLoading])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'nearby') {
      if (nearbyLocations.length === 0) {
        getNearbyLocations()
      }
    } else if (query.trim()) {
      performSearch(query, value)
    }
  }

  // Clear search
  const clearSearch = () => {
    setQuery("")
    setResults({ users: [], locations: [], categories: [], total: 0 })
    setHasSearched(false)
  }

  // Handle category click
  const handleCategoryClick = (category: SearchCategory) => {
    setQuery(category.name)
    setActiveTab('locations')
  }

  // Get current results count
  const getCurrentResults = () => {
    switch (activeTab) {
      case 'users': return results.users
      case 'locations': return results.locations
      case 'categories': return results.categories
      case 'nearby': return nearbyLocations
      default: return [...results.users, ...results.locations, ...results.categories]
    }
  }

  const currentResults = getCurrentResults()
  const currentCount = currentResults.length

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Search places, people, or categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 pr-12 h-16 text-lg bg-white border-2 border-gray-200 focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/20 rounded-2xl shadow-sm"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Custom Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5">
          {[
            { value: 'all', label: 'All' },
            { value: 'locations', label: 'Places' },
            { value: 'nearby', label: 'Nearby', loading: nearbyLoading },
            { value: 'users', label: 'People' },
            { value: 'categories', label: 'Categories' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`px-4 py-4 text-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === tab.value
                  ? 'bg-[#4ECDC4]/10 text-[#4ECDC4] border-[#4ECDC4]'
                  : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                {tab.label}
                {tab.loading && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-[#4ECDC4]">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-lg font-medium">Searching...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && (hasSearched || nearbyLocations.length > 0) && (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-lg text-gray-700">
              {currentCount > 0 ? (
                <>Found <span className="font-bold text-[#4ECDC4]">{currentCount}</span> {activeTab === 'all' ? 'results' : activeTab}{query && ` for "${query}"`}</>
              ) : (
                <>No {activeTab === 'all' ? 'results' : activeTab} found{query && ` for "${query}"`}</>
              )}
            </p>
          </div>

          {/* Results Content */}
          <div className="space-y-6">
            {/* All Tab */}
            {activeTab === 'all' && (
              <div className="space-y-8">
                {results.locations.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-[#4ECDC4]" />
                      Places
                    </h3>
                    <div className="space-y-4">
                      {results.locations.slice(0, 3).map((location) => (
                        <LocationCard key={location.id} location={location} />
                      ))}
                    </div>
                  </div>
                )}
                
                {results.users.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-[#4ECDC4]" />
                      People
                    </h3>
                    <div className="space-y-4">
                      {results.users.slice(0, 3).map((user) => (
                        <UserCard key={user.id} user={user} />
                      ))}
                    </div>
                  </div>
                )}
                
                {results.categories.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Search className="h-5 w-5 text-[#4ECDC4]" />
                      Categories
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.categories.slice(0, 6).map((category) => (
                        <CategoryCard key={category.id} category={category} onClick={() => handleCategoryClick(category)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Places Tab */}
            {activeTab === 'locations' && (
              <div className="space-y-4">
                {results.locations.map((location) => (
                  <LocationCard key={location.id} location={location} />
                ))}
                {results.locations.length === 0 && <NoResults query={query} type="places" />}
              </div>
            )}

            {/* Nearby Tab */}
            {activeTab === 'nearby' && (
              <div className="space-y-4">
                {nearbyLocations.map((location) => (
                  <LocationCard key={location.id} location={location} />
                ))}
                {nearbyLocations.length === 0 && !nearbyLoading && (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <Navigation className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-3">No nearby places found</h3>
                    <p className="text-gray-500 mb-8">We couldn't find any places within 25 miles of your location.</p>
                    <Button onClick={getNearbyLocations} variant="outline" size="lg">
                      <Navigation className="h-5 w-5 mr-2" />
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* People Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {results.users.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
                {results.users.length === 0 && <NoResults query={query} type="people" />}
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.categories.map((category) => (
                  <CategoryCard key={category.id} category={category} onClick={() => handleCategoryClick(category)} />
                ))}
                {results.categories.length === 0 && <NoResults query={query} type="categories" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !hasSearched && nearbyLocations.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <Search className="h-20 w-20 text-gray-300 mx-auto mb-8" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Start searching</h3>
          <p className="text-gray-500 text-lg max-w-md mx-auto mb-8">
            Search for places, people, or categories to discover amazing content
          </p>
          <Button
            onClick={getNearbyLocations}
            className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white px-8 py-3 text-lg"
            disabled={nearbyLoading}
          >
            {nearbyLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Navigation className="h-5 w-5 mr-2" />
            )}
            Find Places Near Me
          </Button>
        </div>
      )}
    </div>
  )
}

// Location Card Component
function LocationCard({ location }: { location: SearchLocation }) {
  const imageUrl = location.featuredImage?.url ? getImageUrl(location.featuredImage.url) : null
  const primaryCategory = location.categories?.[0]

  return (
    <Link href={`/locations/${location.slug}`}>
      <Card className="hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-[#4ECDC4]/50">
        <CardContent className="p-6">
          <div className="flex gap-6">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={location.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{location.name}</h3>
                {location.distance && (
                  <Badge variant="secondary" className="text-sm font-medium bg-[#4ECDC4]/10 text-[#4ECDC4] flex-shrink-0">
                    {location.distance.toFixed(1)} mi
                  </Badge>
                )}
              </div>
              
              {primaryCategory && (
                <p className="text-base text-[#4ECDC4] font-semibold mb-3">{primaryCategory.name}</p>
              )}
              
              {location.address && (
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {typeof location.address === 'string' ? location.address : location.address.city}
                  </p>
                </div>
              )}
              
              {location.averageRating && location.averageRating > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-semibold">{location.averageRating.toFixed(1)}</span>
                  {location.reviewCount && location.reviewCount > 0 && (
                    <span className="text-sm text-gray-500">({location.reviewCount} reviews)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// User Card Component
function UserCard({ user }: { user: SearchUser }) {
  const avatarUrl = user.profileImage?.url ? getImageUrl(user.profileImage.url) : ""
  
  return (
    <Link href={`/profile/${user.id}`}>
      <Card className="hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-[#4ECDC4]/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user.name}
                  width={60}
                  height={60}
                  className="w-15 h-15 rounded-full object-cover"
                />
              ) : (
                <div className="w-15 h-15 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {user.isCreator && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FFE66D] rounded-full flex items-center justify-center">
                  <Star className="h-3 w-3 text-gray-800" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-gray-900 truncate">{user.name}</h4>
              {user.username && (
                <p className="text-base text-[#4ECDC4] font-semibold">@{user.username}</p>
              )}
              {user.bio && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-2">{user.bio}</p>
              )}
            </div>
            
            <div className="flex items-center text-gray-400">
              <ExternalLink className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Category Card Component
function CategoryCard({ category, onClick }: { category: SearchCategory; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-6 bg-white rounded-xl border border-gray-200 hover:border-[#4ECDC4] hover:shadow-lg transition-all duration-200 text-left w-full"
    >
      <div className="flex items-center gap-4 mb-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: category.color || '#4ECDC4' }}
        >
          {category.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-bold text-gray-900 truncate">{category.name}</h4>
        </div>
      </div>
      
      {category.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
      )}
    </button>
  )
}

// No Results Component
function NoResults({ query, type }: { query: string; type?: string }) {
  const typeText = type === "places" ? "places" : type === "people" ? "people" : type === "categories" ? "categories" : "results"
  
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <Search className="h-16 w-16 text-gray-300 mx-auto mb-6" />
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        No {typeText} found{query && ` for "${query}"`}
      </h3>
      <p className="text-gray-500 text-lg">
        Try adjusting your search terms or browse our categories
      </p>
    </div>
  )
} 