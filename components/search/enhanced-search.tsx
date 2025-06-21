"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Users, MapPin, Star, User, Mail, ExternalLink, Filter, SortAsc, X, Loader2, Navigation, Clock } from "lucide-react"
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
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
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
  distance?: number
}

interface SearchCategory {
  id: string
  name: string
  description?: string
  color?: string
  slug?: string
  type?: string
  order?: number
  relevanceScore?: number
}

interface SearchPlace {
  id: string
  foursquareId: string
  name: string
  description: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
    formattedAddress?: string
  }
  coordinates?: {
    latitude: number
    longitude: number
  }
  categories?: Array<{
    name: string
    id?: string
    color?: string
  }>
  averageRating?: number
  reviewCount?: number
  isVerified?: boolean
  photos?: number
  website?: string
  phone?: string
  source: 'foursquare'
  distance?: number
  relevanceScore?: number
}

interface NearbyLocation {
  id: string
  name: string
  description?: string
  address?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  distance?: number
  averageRating?: number
  reviewCount?: number
  category?: string
  imageUrl?: string
  isVerified?: boolean
}

interface SearchResults {
  users: SearchUser[]
  locations: SearchLocation[]
  categories: SearchCategory[]
  places: SearchPlace[]
  nearbyLocations: NearbyLocation[]
  total: number
  query?: string
  searchType?: string
  hasResults?: boolean
  hasPlaceDiscovery?: boolean
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
    return getImageUrl(user.profileImage.url)
  }
  return ""
}

export default function EnhancedSearch({ initialQuery = "", initialType = "all" }: EnhancedSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState(initialType)
  const [sortBy, setSortBy] = useState("relevance")
  const [results, setResults] = useState<SearchResults>({ 
    users: [], 
    locations: [], 
    categories: [], 
    places: [], 
    nearbyLocations: [],
    total: 0 
  })
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(!!initialQuery)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [nearbyLoading, setNearbyLoading] = useState(false)
  
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

  // Get user location for better place discovery
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLocationPermission('granted')
        console.log('Location obtained:', position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        console.error('Error getting location:', error)
        setLocationPermission('denied')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [])

  // Get nearby locations from database
  const getNearbyLocations = useCallback(async () => {
    if (!userLocation) {
      getUserLocation()
      return
    }

    setNearbyLoading(true)
    try {
      const response = await fetch('/api/locations/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          radius: 25,
          limit: 20
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setResults(prev => ({
          ...prev,
          nearbyLocations: data.locations || [],
          total: (prev.total - prev.nearbyLocations.length) + (data.locations?.length || 0)
        }))
        setHasSearched(true)
        setActiveTab('nearby')
      } else {
        throw new Error(data.error || 'Failed to get nearby locations')
      }
    } catch (error) {
      console.error('Error fetching nearby locations:', error)
      toast.error('Failed to find nearby locations')
    } finally {
      setNearbyLoading(false)
    }
  }, [userLocation, getUserLocation])

  // Request location permission on mount
  useEffect(() => {
    getUserLocation()
  }, [getUserLocation])

  // Perform search when debounced query changes
  const performSearch = useCallback(async (searchQuery: string, searchType: string = activeTab) => {
    if (!searchQuery.trim()) {
      setResults({ users: [], locations: [], categories: [], places: [], nearbyLocations: [], total: 0 })
      setHasSearched(false)
      return
    }

    setLoading(true)
    saveRecentSearch(searchQuery)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        sortBy,
        limit: '20'
      })

      if (userLocation && (searchType === 'locations' || searchType === 'all')) {
        params.append('lat', userLocation.lat.toString())
        params.append('lng', userLocation.lng.toString())
      }

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (response.ok) {
        setResults({
          users: data.users || [],
          locations: data.locations || [],
          categories: data.categories || [],
          places: data.places || [],
          nearbyLocations: results.nearbyLocations, // Preserve nearby locations
          total: data.total || 0
        })
        setHasSearched(true)
      } else {
        throw new Error(data.message || 'Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, sortBy, userLocation, saveRecentSearch, results.nearbyLocations])

  // Effect for real-time search
  useEffect(() => {
    if (debouncedQuery.trim().length >= 1) {
      performSearch(debouncedQuery)
    } else if (debouncedQuery.trim().length === 0) {
      setResults({ users: [], locations: [], categories: [], places: [], nearbyLocations: results.nearbyLocations, total: 0 })
      setHasSearched(false)
    }
  }, [debouncedQuery, performSearch, results.nearbyLocations])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    
    if (value === 'nearby') {
      if (!userLocation) {
        getUserLocation()
      } else if (results.nearbyLocations.length === 0) {
        getNearbyLocations()
      }
    }
    
    if (query.trim()) {
      performSearch(query, value)
    }
  }

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value)
    if (query.trim()) {
      performSearch(query, activeTab)
    }
  }

  // Clear search
  const clearSearch = () => {
    setQuery("")
    setResults({ users: [], locations: [], categories: [], places: [], nearbyLocations: [], total: 0 })
    setHasSearched(false)
  }

  // Handle category click
  const handleCategoryClick = (category: SearchCategory) => {
    router.push(`/search?q=${encodeURIComponent(category.name)}&type=locations`)
  }

  // Handle place import
  const handlePlaceImport = async (place: SearchPlace) => {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: place.name,
          description: place.description,
          foursquareId: place.foursquareId,
          address: place.address,
          coordinates: place.coordinates,
          categories: place.categories,
          website: place.website,
          phone: place.phone,
        }),
      })

      if (response.ok) {
        toast.success('Location imported successfully!')
        performSearch(query) // Refresh search results
      } else {
        throw new Error('Failed to import location')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import location')
    }
  }

  // Calculate total results for current tab
  const currentTabResults = useMemo(() => {
    switch (activeTab) {
      case 'users':
        return results.users.length
      case 'locations':
        return results.locations.length
      case 'categories':
        return results.categories.length
      case 'places':
        return results.places.length
      case 'nearby':
        return results.nearbyLocations.length
      default:
        return results.total
    }
  }, [activeTab, results])

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Input */}
      <div className="relative mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
          <Input
            type="text"
            placeholder="Search places, people, or categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 h-11 sm:h-12 text-sm sm:text-base bg-white/90 backdrop-blur-sm border-gray-200 focus:border-[#4ECDC4] focus:ring-[#4ECDC4] rounded-xl shadow-sm"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
        
        {/* Recent searches */}
        {!hasSearched && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Recent searches</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-600 hover:text-[#4ECDC4] hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Clock className="h-3 w-3" />
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-9 sm:h-10 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">All</TabsTrigger>
            <TabsTrigger value="locations" className="text-xs sm:text-sm px-2 sm:px-3">Places</TabsTrigger>
            <TabsTrigger value="nearby" className="text-xs sm:text-sm px-2 sm:px-3 relative">
              Nearby
              {nearbyLoading && (
                <Loader2 className="h-3 w-3 animate-spin ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3">People</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 sm:px-3">Categories</TabsTrigger>
            <TabsTrigger value="places" className="text-xs sm:text-sm px-2 sm:px-3">Discover</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Controls */}
        <div className="flex gap-2">
          {/* Nearby Button */}
          {activeTab !== 'nearby' && (
            <Button
              variant="outline"
              size="sm"
              onClick={getNearbyLocations}
              disabled={nearbyLoading}
              className="bg-white/80 backdrop-blur-sm border-gray-200 hover:border-[#4ECDC4] h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm"
            >
              {nearbyLoading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1" />
              ) : (
                <Navigation className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              )}
              Near Me
            </Button>
          )}
          
          {/* Sort Select */}
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-24 sm:w-32 bg-white/80 backdrop-blur-sm border-gray-200 h-9 sm:h-10 text-xs sm:text-sm">
              <SortAsc className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location Permission Banner */}
      {locationPermission === 'denied' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Enable location access to find places near you.{' '}
            <button
              onClick={getUserLocation}
              className="font-medium text-amber-900 hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="flex items-center gap-3 text-[#4ECDC4]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm sm:text-base font-medium">Searching...</span>
            </div>
          </div>
        ) : hasSearched || results.nearbyLocations.length > 0 ? (
          <>
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-200">
              <p className="text-sm sm:text-base text-gray-600">
                {currentTabResults > 0 ? (
                  <>
                    Found <span className="font-semibold text-gray-900">{currentTabResults}</span>{' '}
                    {activeTab === 'all' ? 'results' : 
                     activeTab === 'nearby' ? 'nearby places' :
                     activeTab === 'users' ? 'people' : activeTab}
                    {query && ` for "${query}"`}
                  </>
                ) : (
                  <>No {activeTab === 'all' ? 'results' : activeTab} found{query && ` for "${query}"`}</>
                )}
              </p>
              
              {userLocation && activeTab === 'nearby' && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  <Navigation className="h-3 w-3 mr-1" />
                  Location enabled
                </Badge>
              )}
            </div>

            {/* Tab Content */}
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="all" className="space-y-4 mt-0">
                {results.locations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Places</h3>
                    <div className="grid gap-3 sm:gap-4">
                      {results.locations.slice(0, 3).map((location) => (
                        <LocationCard key={location.id} location={location} />
                      ))}
                    </div>
                  </div>
                )}
                
                {results.users.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">People</h3>
                    <div className="grid gap-3 sm:gap-4">
                      {results.users.slice(0, 3).map((user) => (
                        <UserCard key={user.id} user={user} />
                      ))}
                    </div>
                  </div>
                )}
                
                {results.categories.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Categories</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                      {results.categories.slice(0, 4).map((category) => (
                        <CategoryCard key={category.id} category={category} onClick={() => handleCategoryClick(category)} />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="locations" className="space-y-3 sm:space-y-4 mt-0">
                {results.locations.map((location) => (
                  <LocationCard key={location.id} location={location} />
                ))}
                {results.locations.length === 0 && (
                  <NoResults query={query} type="locations" />
                )}
              </TabsContent>

              <TabsContent value="nearby" className="space-y-3 sm:space-y-4 mt-0">
                {results.nearbyLocations.map((location) => (
                  <NearbyLocationCard key={location.id} location={location} />
                ))}
                {results.nearbyLocations.length === 0 && !nearbyLoading && (
                  <div className="text-center py-8 sm:py-12">
                    <Navigation className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No nearby places found</h3>
                    <p className="text-sm sm:text-base text-gray-500 mb-4">
                      We couldn't find any places within 25 miles of your location.
                    </p>
                    <Button
                      onClick={getNearbyLocations}
                      variant="outline"
                      className="bg-white border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-3 sm:space-y-4 mt-0">
                {results.users.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
                {results.users.length === 0 && (
                  <NoResults query={query} type="users" />
                )}
              </TabsContent>

              <TabsContent value="categories" className="mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {results.categories.map((category) => (
                    <CategoryCard key={category.id} category={category} onClick={() => handleCategoryClick(category)} />
                  ))}
                </div>
                {results.categories.length === 0 && (
                  <NoResults query={query} type="categories" />
                )}
              </TabsContent>

              <TabsContent value="places" className="space-y-3 sm:space-y-4 mt-0">
                {results.places.map((place) => (
                  <PlaceCard key={place.id} place={place} onImport={handlePlaceImport} />
                ))}
                {results.places.length === 0 && (
                  <NoResults query={query} type="places" />
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-8 sm:py-16">
            <Search className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">Start exploring</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6">
              Search for places, people, or categories to discover amazing content
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <Button
                onClick={getNearbyLocations}
                className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white px-4 sm:px-6"
                disabled={nearbyLoading}
              >
                {nearbyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Find Places Near Me
              </Button>
              <p className="text-xs sm:text-sm text-gray-400">
                or start typing to search
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// NearbyLocationCard component for displaying nearby locations
function NearbyLocationCard({ location }: { location: NearbyLocation }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <Card className="hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-gray-200 hover:border-[#4ECDC4]/30">
        <CardContent className="p-3 sm:p-4">
          <div className="flex gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={location.imageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80"}
                alt={location.name}
                width={80}
                height={80}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1 group-hover:text-[#4ECDC4] transition-colors">
                  {location.name}
                </h3>
                {location.distance && (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 flex-shrink-0">
                    {location.distance} mi
                  </Badge>
                )}
              </div>
              
              {location.category && (
                <p className="text-xs sm:text-sm text-[#4ECDC4] font-medium mb-1">
                  {location.category}
                </p>
              )}
              
              {location.address && (
                <div className="flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-500 line-clamp-1">
                    {location.address}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                {location.averageRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      {location.averageRating.toFixed(1)}
                    </span>
                    {location.reviewCount && (
                      <span className="text-xs text-gray-500">
                        ({location.reviewCount})
                      </span>
                    )}
                  </div>
                )}
                
                <Link
                  href={`/locations/${location.id}`}
                  className="text-xs sm:text-sm text-[#4ECDC4] hover:text-[#4ECDC4]/80 font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  View Details
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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

// Category Card Component
function CategoryCard({ category, onClick }: { category: SearchCategory; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group p-4 bg-white rounded-xl border border-gray-100 hover:border-[#FFD93D] hover:shadow-lg transition-all duration-300 text-left w-full"
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
          style={{ backgroundColor: category.color || '#FFD93D' }}
        >
          {category.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate group-hover:text-[#FFD93D] transition-colors">
            {category.name}
          </h4>
          {category.type && (
            <p className="text-xs text-gray-500 capitalize">{category.type}</p>
          )}
        </div>
      </div>
      
      {category.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{category.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          Explore nearby
        </Badge>
        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#FFD93D] transition-colors" />
      </div>
    </button>
  )
}

// New PlaceCard component for discovered places
function PlaceCard({ place, onImport }: { place: SearchPlace; onImport: (place: SearchPlace) => void }) {
  const primaryCategory = place.categories?.[0]
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    setImporting(true)
    try {
      await onImport(place)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden group relative">
      <div className="absolute top-3 left-3 z-10">
        <Badge className="text-xs font-medium bg-[#4ECDC4]/90 text-white border-0">
          🌟 New Discovery
        </Badge>
      </div>
      
      <div className="relative h-40 bg-gradient-to-br from-[#4ECDC4]/20 to-[#FF6B6B]/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#4ECDC4] to-[#FF6B6B] rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">
            {place.name.charAt(0).toUpperCase()}
          </div>
          {place.distance && (
            <Badge variant="secondary" className="text-xs">
              {place.distance < 1 
                ? `${Math.round(place.distance * 1000)}m away`
                : `${Math.round(place.distance * 10) / 10}km away`
              }
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 group-hover:text-[#4ECDC4] transition-colors line-clamp-1">
            {place.name}
          </h4>
          {place.isVerified && (
            <Badge className="text-xs font-medium bg-green-100 text-green-800 border-0 ml-2">
              ✓
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{place.description}</p>
        
        {place.address && (
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1 line-clamp-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {place.address.formattedAddress || 
             `${place.address.city ? place.address.city + ', ' : ''}${place.address.state || ''}`
            }
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {place.averageRating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{place.averageRating.toFixed(1)}</span>
              </div>
            )}
            
            {primaryCategory && (
              <Badge 
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${primaryCategory.color || '#4ECDC4'}20`,
                  color: primaryCategory.color || '#4ECDC4',
                }}
              >
                {primaryCategory.name}
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleImport}
            disabled={importing}
            className="bg-[#4ECDC4] hover:bg-[#26C6DA] text-white"
          >
            {importing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Add to Sacavia'
            )}
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          {place.photos > 0 && (
            <span className="flex items-center gap-1">
              📸 {place.photos} photos
            </span>
          )}
          {place.reviewCount > 0 && (
            <span>{place.reviewCount} reviews</span>
          )}
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-[#4ECDC4] hover:underline">
              Website
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced No Results Component
function NoResults({ query, type }: { query: string; type?: string }) {
  const typeText = type === "locations" ? "places" : type === "users" ? "people" : type === "categories" ? "categories" : type === "places" ? "new places" : "results"
  
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