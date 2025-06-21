'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getSavedLocationsAction, toggleSaveLocationAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Bookmark, 
  MapPin, 
  Star, 
  Calendar,
  Search,
  SortAsc,
  Filter,
  Heart,
  ExternalLink,
  Trash2,
  Grid3X3,
  List,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getPrimaryImageUrl } from '@/lib/image-utils'

interface SavedLocation {
  id: string
  location: {
    id: string
    name: string
    description?: string
    shortDescription?: string
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
    categories?: Array<{
      id: string
      name: string
    }>
    featuredImage?: {
      url: string
      alt?: string
    }
    gallery?: Array<{
      image: {
        url: string
        alt?: string
      }
      caption?: string
    }>
    priceRange?: string
    rating?: number
    reviewCount?: number
  }
  createdAt: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'date' | 'name' | 'category' | 'price'

export default function SavedLocationsClient() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all')
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  // Fetch saved locations
  useEffect(() => {
    if (authLoading) return
    
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    const fetchSavedLocations = async () => {
      try {
        const locations = await getSavedLocationsAction()
        setSavedLocations(locations)
      } catch (error) {
        console.error('Error fetching saved locations:', error)
        toast.error('Failed to load saved locations')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSavedLocations()
  }, [isAuthenticated, user, authLoading])

  // Filter and sort locations
  const filteredAndSortedLocations = savedLocations
    .filter(item => {
      const location = item.location
      if (!location) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchName = location.name?.toLowerCase().includes(query)
        const matchDescription = location.description?.toLowerCase().includes(query) || 
                               location.shortDescription?.toLowerCase().includes(query)
        const matchAddress = `${location.address?.street || ''} ${location.address?.city || ''} ${location.address?.state || ''}`.toLowerCase().includes(query)
        const matchCategory = location.categories?.some(cat => cat.name.toLowerCase().includes(query))
        
        if (!matchName && !matchDescription && !matchAddress && !matchCategory) {
          return false
        }
      }
      
      // Category filter
      if (selectedCategory !== 'all') {
        const hasCategory = location.categories?.some(cat => cat.name === selectedCategory)
        if (!hasCategory) return false
      }
      
      // Price range filter
      if (selectedPriceRange !== 'all') {
        if (location.priceRange !== selectedPriceRange) return false
      }
      
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.location.name || '').localeCompare(b.location.name || '')
        case 'category':
          const aCat = a.location.categories?.[0]?.name || ''
          const bCat = b.location.categories?.[0]?.name || ''
          return aCat.localeCompare(bCat)
        case 'price':
          const priceOrder = { 'free': 0, 'budget': 1, 'moderate': 2, 'expensive': 3, 'luxury': 4 }
          const aPrice = priceOrder[a.location.priceRange as keyof typeof priceOrder] ?? 2
          const bPrice = priceOrder[b.location.priceRange as keyof typeof priceOrder] ?? 2
          return aPrice - bPrice
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  // Get unique categories and price ranges for filters
  const uniqueCategories = Array.from(
    new Set(
      savedLocations
        .flatMap(item => item.location.categories?.map(cat => cat.name) || [])
        .filter(Boolean)
    )
  ).sort()

  const uniquePriceRanges = Array.from(
    new Set(
      savedLocations
        .map(item => item.location.priceRange)
        .filter(Boolean)
    )
  ).sort()

  // Handle removing a saved location
  const handleRemoveLocation = async (locationId: string, savedId: string) => {
    if (removingIds.has(savedId)) return
    
    setRemovingIds(prev => new Set([...prev, savedId]))
    
    try {
      const result = await toggleSaveLocationAction(locationId)
      
      if (result.success) {
        setSavedLocations(prev => prev.filter(item => item.id !== savedId))
        toast.success('Location removed from saved')
      } else {
        toast.error(result.message || 'Failed to remove location')
      }
    } catch (error) {
      console.error('Error removing saved location:', error)
      toast.error('Failed to remove location')
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(savedId)
        return newSet
      })
    }
  }

  // Get primary image for location
  const getLocationImageUrl = (location: SavedLocation['location']): string => {
    if (location.featuredImage?.url) {
      return location.featuredImage.url.startsWith('http') 
        ? location.featuredImage.url 
        : `${process.env.NEXT_PUBLIC_SERVER_URL || ''}${location.featuredImage.url}`
    }
    
    if (location.gallery?.[0]?.image?.url) {
      const url = location.gallery[0].image.url
      return url.startsWith('http') 
        ? url 
        : `${process.env.NEXT_PUBLIC_SERVER_URL || ''}${url}`
    }
    
    return '/placeholder.svg'
  }

  // Format address for display
  const formatAddress = (address?: SavedLocation['location']['address']): string => {
    if (!address) return ''
    
    const parts = [
      address.street,
      address.city,
      address.state
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  // Get price range display
  const getPriceRangeDisplay = (priceRange?: string): string => {
    const priceMap = {
      'free': 'Free',
      'budget': '$ Budget',
      'moderate': '$$ Moderate',
      'expensive': '$$$ Expensive',
      'luxury': '$$$$ Luxury'
    }
    return priceMap[priceRange as keyof typeof priceMap] || ''
  }

  // Show authentication required state
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Sign in to view saved locations
          </h2>
          <p className="text-gray-600 mb-8">
            Create an account or sign in to save your favorite places and access them anywhere.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div> // This will be covered by the Suspense fallback
  }

  // Show empty state
  if (savedLocations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <Bookmark className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            No saved locations yet
          </h2>
          <p className="text-gray-600 mb-8">
            Start exploring and bookmark your favorite places to see them here.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/map">
              <Button className="bg-gradient-to-r from-[#4ECDC4] to-[#4ECDC4]/80 text-white">
                <MapPin className="w-4 h-4 mr-2" />
                Explore Locations
              </Button>
            </Link>
            <Link href="/feed">
              <Button variant="outline">
                <Heart className="w-4 h-4 mr-2" />
                Browse Feed
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search saved locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                {uniquePriceRanges.map(price => (
                  <SelectItem key={price} value={price}>
                    {getPriceRangeDisplay(price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Latest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="price">Price</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex border rounded-lg p-1 bg-gray-50">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {filteredAndSortedLocations.length} of {savedLocations.length} saved locations
        </p>
      </div>

      {/* Locations Grid/List */}
      <div className={cn(
        "grid gap-6",
        viewMode === 'grid' 
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
          : "grid-cols-1"
      )}>
        <AnimatePresence>
          {filteredAndSortedLocations.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {viewMode === 'grid' ? (
                <SavedLocationCardGrid 
                  item={item}
                  onRemove={handleRemoveLocation}
                  isRemoving={removingIds.has(item.id)}
                  getLocationImageUrl={getLocationImageUrl}
                  formatAddress={formatAddress}
                  getPriceRangeDisplay={getPriceRangeDisplay}
                />
              ) : (
                <SavedLocationCardList 
                  item={item}
                  onRemove={handleRemoveLocation}
                  isRemoving={removingIds.has(item.id)}
                  getLocationImageUrl={getLocationImageUrl}
                  formatAddress={formatAddress}
                  getPriceRangeDisplay={getPriceRangeDisplay}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No results found */}
      {filteredAndSortedLocations.length === 0 && (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No locations found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  )
}

// Grid card component
function SavedLocationCardGrid({ 
  item, 
  onRemove, 
  isRemoving, 
  getLocationImageUrl, 
  formatAddress, 
  getPriceRangeDisplay 
}: {
  item: SavedLocation
  onRemove: (locationId: string, savedId: string) => void
  isRemoving: boolean
  getLocationImageUrl: (location: SavedLocation['location']) => string
  formatAddress: (address?: SavedLocation['location']['address']) => string
  getPriceRangeDisplay: (priceRange?: string) => string
}) {
  const location = item.location

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={getLocationImageUrl(location)}
            alt={location.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder.svg'
            }}
          />
        </div>
        
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRemove(location.id, item.id)}
            disabled={isRemoving}
            className="h-8 w-8 p-0 bg-white/90 hover:bg-white border-0 shadow-md"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>

        {/* Date badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-white/90 text-gray-700">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(item.createdAt).toLocaleDateString()}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-[#FF6B6B] transition-colors">
              <Link href={`/locations/${location.id}`}>
                {location.name}
              </Link>
            </h3>
            {formatAddress(location.address) && (
              <p className="text-sm text-gray-600 flex items-center line-clamp-1">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                {formatAddress(location.address)}
              </p>
            )}
          </div>

          {location.shortDescription && (
            <p className="text-sm text-gray-700 line-clamp-2">
              {location.shortDescription}
            </p>
          )}

          {/* Categories and price */}
          <div className="flex flex-wrap items-center gap-2">
            {location.categories?.slice(0, 2).map(category => (
              <Badge key={category.id} variant="outline" className="text-xs">
                {category.name}
              </Badge>
            ))}
            {location.priceRange && (
              <Badge variant="secondary" className="text-xs">
                {getPriceRangeDisplay(location.priceRange)}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link href={`/locations/${location.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-[#4ECDC4] to-[#4ECDC4]/80 text-white">
                View Details
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
            
            {location.rating && (
              <div className="flex items-center text-sm text-gray-600">
                <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                {location.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// List card component
function SavedLocationCardList({ 
  item, 
  onRemove, 
  isRemoving, 
  getLocationImageUrl, 
  formatAddress, 
  getPriceRangeDisplay 
}: {
  item: SavedLocation
  onRemove: (locationId: string, savedId: string) => void
  isRemoving: boolean
  getLocationImageUrl: (location: SavedLocation['location']) => string
  formatAddress: (address?: SavedLocation['location']['address']) => string
  getPriceRangeDisplay: (priceRange?: string) => string
}) {
  const location = item.location

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Image */}
          <div className="w-24 h-24 lg:w-32 lg:h-32 relative overflow-hidden rounded-lg flex-shrink-0">
            <Image
              src={getLocationImageUrl(location)}
              alt={location.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
                           onError={(e) => {
               const target = e.target as HTMLImageElement
               target.src = '/placeholder.svg'
             }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xl line-clamp-1 group-hover:text-[#FF6B6B] transition-colors">
                  <Link href={`/locations/${location.id}`}>
                    {location.name}
                  </Link>
                </h3>
                
                {formatAddress(location.address) && (
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    {formatAddress(location.address)}
                  </p>
                )}

                {location.shortDescription && (
                  <p className="text-gray-700 mt-2 line-clamp-2">
                    {location.shortDescription}
                  </p>
                )}

                {/* Categories and badges */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {location.categories?.slice(0, 3).map(category => (
                    <Badge key={category.id} variant="outline" className="text-xs">
                      {category.name}
                    </Badge>
                  ))}
                  {location.priceRange && (
                    <Badge variant="secondary" className="text-xs">
                      {getPriceRangeDisplay(location.priceRange)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Saved {new Date(item.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                {location.rating && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                    {location.rating.toFixed(1)}
                  </div>
                )}
                
                <Link href={`/locations/${location.id}`}>
                  <Button size="sm" className="bg-gradient-to-r from-[#4ECDC4] to-[#4ECDC4]/80 text-white">
                    View Details
                  </Button>
                </Link>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(location.id, item.id)}
                  disabled={isRemoving}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 