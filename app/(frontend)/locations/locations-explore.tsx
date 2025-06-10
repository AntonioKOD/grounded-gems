'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, MapPin, Star, Grid3X3, List, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getLocations, getCategories } from '@/app/actions'

interface Location {
  id: string
  name: string
  slug?: string
  description?: string
  shortDescription?: string
  featuredImage?: { url: string } | string
  categories?: Array<{ id: string; name: string }>
  tags?: Array<{ tag: string }>
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  coordinates?: {
    latitude: number
    longitude: number
  }
  priceRange?: string
  averageRating?: number
  reviewCount?: number
  isVerified?: boolean
  isFeatured?: boolean
  status: string
}

interface Category {
  id: string
  name: string
}

function LocationsExplore() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [priceFilter, setPriceFilter] = useState(searchParams.get('price') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'featured')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch locations and categories in parallel
        const [locationsResult, categoriesResult] = await Promise.all([
          getLocations(),
          getCategories()
        ])

        // Filter to only show published locations
        const publishedLocations = locationsResult.docs.filter(
          (location: Location) => location.status === 'published'
        )

        setLocations(publishedLocations)
        setCategories(categoriesResult.docs)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter and sort locations
  useEffect(() => {
    let filtered = [...locations]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(query) ||
        location.description?.toLowerCase().includes(query) ||
        location.shortDescription?.toLowerCase().includes(query) ||
        location.categories?.some(cat => cat.name.toLowerCase().includes(query)) ||
        location.tags?.some(tag => tag.tag.toLowerCase().includes(query)) ||
        `${location.address?.city}, ${location.address?.state}`.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(location =>
        location.categories?.some(cat => cat.id === selectedCategory)
      )
    }

    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(location => location.priceRange === priceFilter)
    }

    // Sort
    switch (sortBy) {
      case 'featured':
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1
          if (!a.isFeatured && b.isFeatured) return 1
          return (b.averageRating || 0) - (a.averageRating || 0)
        })
        break
      case 'rating':
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
        filtered.sort((a, b) => b.id.localeCompare(a.id))
        break
      default:
        break
    }

    setFilteredLocations(filtered)
  }, [locations, searchQuery, selectedCategory, priceFilter, sortBy])

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (selectedCategory !== 'all') params.set('category', selectedCategory)
    if (priceFilter !== 'all') params.set('price', priceFilter)
    if (sortBy !== 'featured') params.set('sort', sortBy)
    
    const newUrl = params.toString() ? `/locations?${params.toString()}` : '/locations'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedCategory, priceFilter, sortBy, router])

  const getLocationImageUrl = (location: Location): string => {
    if (location.featuredImage) {
      if (typeof location.featuredImage === 'string') {
        return location.featuredImage
      }
      return location.featuredImage.url
    }
    return '/images/placeholder-location.jpg'
  }

  const formatPriceRange = (priceRange?: string): string => {
    switch (priceRange) {
      case 'free': return 'Free'
      case 'budget': return '$'
      case 'moderate': return '$$'
      case 'expensive': return '$$$'
      case 'luxury': return '$$$$'
      default: return ''
    }
  }

  const formatAddress = (address?: Location['address']): string => {
    if (!address) return ''
    const parts = [address.city, address.state].filter(Boolean)
    return parts.join(', ')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-4 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading amazing places...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Explore Locations</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover amazing places, hidden gems, and local favorites from our community
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search locations, cities, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Price Range</label>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Prices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="budget">Budget ($)</SelectItem>
                    <SelectItem value="moderate">Moderate ($$)</SelectItem>
                    <SelectItem value="expensive">Expensive ($$$)</SelectItem>
                    <SelectItem value="luxury">Luxury ($$$$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">View</label>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="flex-1"
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="flex-1"
                  >
                    <List className="h-4 w-4 mr-1" />
                    List
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {filteredLocations.length} {filteredLocations.length === 1 ? 'Location' : 'Locations'}
          </h2>
          {(searchQuery || selectedCategory !== 'all' || priceFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setPriceFilter('all')
                setSortBy('featured')
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/map">
            <Button variant="outline" size="sm">
              <Map className="h-4 w-4 mr-1" />
              Map View
            </Button>
          </Link>
        </div>
      </div>

      {/* Results */}
      {filteredLocations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No locations found</h3>
            <p className="text-sm">Try adjusting your search or filters to find more locations.</p>
          </div>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {filteredLocations.map((location) => (
            <Link
              key={location.id}
              href={`/locations/${location.slug || location.id}`}
              className="block group"
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg group-hover:scale-[1.02]">
                <div className={viewMode === 'grid' ? 'h-48' : 'h-32 md:h-40'}>
                  <div className="relative w-full h-full">
                    <Image
                      src={getLocationImageUrl(location)}
                      alt={location.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {location.isFeatured && (
                        <Badge className="bg-[#FF6B6B] text-white">Featured</Badge>
                      )}
                      {location.isVerified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      )}
                    </div>
                    {location.priceRange && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="outline" className="bg-white/90">
                          {formatPriceRange(location.priceRange)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-[#FF6B6B] transition-colors">
                        {location.name}
                      </h3>
                    </div>

                    {location.averageRating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{location.averageRating.toFixed(1)}</span>
                        {location.reviewCount && (
                          <span className="text-sm text-gray-500">({location.reviewCount})</span>
                        )}
                      </div>
                    )}

                    {formatAddress(location.address) && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {formatAddress(location.address)}
                      </div>
                    )}

                    {location.shortDescription && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {location.shortDescription}
                      </p>
                    )}

                    {location.categories && location.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {location.categories.slice(0, 2).map((category) => (
                          <Badge key={category.id} variant="outline" className="text-xs">
                            {category.name}
                          </Badge>
                        ))}
                        {location.categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{location.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {filteredLocations.length > 0 && (
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-lg p-8">
            <h3 className="text-xl font-semibold mb-4">Can't find what you're looking for?</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/add-location">
                <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
                  Add New Location
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="outline">
                  Explore on Map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LocationsExplore 