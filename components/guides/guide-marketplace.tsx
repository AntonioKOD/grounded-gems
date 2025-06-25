'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Star, 
  Clock, 
  MapPin, 
  User,
  DollarSign,
  Filter,
  Grid,
  List,
  Heart,
  Eye,
  Download,
  CheckCircle,
  TrendingUp,
  Award,
  Loader2,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface Guide {
  id: string
  title: string
  slug: string
  description: string
  creator?: {
    id: string
    name: string
    username: string
    profileImage?: {
      url: string
    }
    creatorProfile?: {
      verification?: {
        isVerified: boolean
      }
      creatorLevel: string
    }
  }
  location?: {
    id: string
    name: string
    city: string
    state: string
  }
  primaryLocation?: {
    id: string
    name: string
    address?: {
      city?: string
      state?: string
      street?: string
      country?: string
    }
  }
  category: string
  difficulty: string
  duration: {
    value: number
    unit: string
  }
  pricing: {
    type: 'free' | 'paid' | 'pwyw'
    price?: number
    suggestedPrice?: number
  }
  featuredImage: {
    url: string
    alt: string
  }
  stats: {
    views: number
    purchases: number
    rating?: number
    reviewCount: number
  }
  highlights: Array<{ highlight: string }>
  tags: Array<{ tag: string }>
  createdAt: string
}

interface GuideMarketplaceProps {
  initialLocation?: string
  initialCategory?: string
}

const categoryOptions = [
  { label: 'All Categories', value: 'all' },
  { label: 'Food & Dining', value: 'food' },
  { label: 'Nightlife & Entertainment', value: 'nightlife' },
  { label: 'Culture & Arts', value: 'culture' },
  { label: 'Outdoor & Adventure', value: 'outdoor' },
  { label: 'Shopping', value: 'shopping' },
  { label: 'Historical', value: 'historical' },
  { label: 'Family-Friendly', value: 'family' },
  { label: 'Hidden Gems', value: 'hidden' },
  { label: 'Photography Spots', value: 'photography' },
  { label: 'Local Lifestyle', value: 'lifestyle' },
]

const difficultyOptions = [
  { label: 'All Levels', value: 'all' },
  { label: 'Easy', value: 'easy' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Challenging', value: 'challenging' },
  { label: 'Expert', value: 'expert' },
]

const priceTypeOptions = [
  { label: 'All Prices', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pay What You Want', value: 'pwyw' },
]

const sortOptions = [
  { label: 'Newest First', value: '-createdAt' },
  { label: 'Most Popular', value: '-stats.views' },
  { label: 'Highest Rated', value: '-stats.rating' },
  { label: 'Most Purchased', value: '-stats.purchases' },
  { label: 'Price: Low to High', value: 'pricing.price' },
  { label: 'Price: High to Low', value: '-pricing.price' },
]

export default function GuideMarketplace({ 
  initialLocation, 
  initialCategory 
}: GuideMarketplaceProps) {
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [category, setCategory] = useState(initialCategory || 'all')
  const [difficulty, setDifficulty] = useState('all')
  const [priceType, setPriceType] = useState('all')
  const [sort, setSort] = useState('-createdAt')
  const [userLocation, setUserLocation] = useState<{city?: string, state?: string} | null>(null)
  const [showNearbyOnly, setShowNearbyOnly] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState(1)

  // Get user location on component mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              
              // Reverse geocode to get city/state
              try {
                const response = await fetch(
                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=pk.eyJ1IjoiYW50b25pby1rb2RoZWxpIiwiYSI6ImNtYTQ3bTlibTAyYTUyanBzem5qZGV1ZzgifQ.cSUliejFuQnIHZ-DDinPRQ&types=place,region`
                )
                const data = await response.json()
                
                if (data.features && data.features.length > 0) {
                  const place = data.features.find(f => f.place_type.includes('place'))
                  const region = data.features.find(f => f.place_type.includes('region'))
                  
                  setUserLocation({
                    city: place?.text,
                    state: region?.text
                  })
                  
                  // Auto-enable nearby filter if we have location
                  setShowNearbyOnly(true)
                }
              } catch (geocodeError) {
                console.error('Geocoding failed:', geocodeError)
              }
            },
            (error) => {
              console.log('Geolocation denied or failed:', error)
            },
            { timeout: 10000, enableHighAccuracy: false }
          )
        }
      } catch (error) {
        console.error('Geolocation not supported:', error)
      }
    }

    getUserLocation()
  }, [])

  const fetchGuides = async (isLoadMore = false) => {
    try {
      const params = new URLSearchParams({
        page: isLoadMore ? (page + 1).toString() : '1',
        limit: '12',
        ...(category !== 'all' && { category }),
        ...(difficulty !== 'all' && { difficulty }),
        ...(priceType !== 'all' && { priceType }),
        ...(searchQuery && !locationSearch && { search: searchQuery }),
        ...(locationSearch && { locationSearch }),
        ...(showNearbyOnly && userLocation?.state && { userState: userLocation.state }),
        ...(initialLocation && { location: initialLocation }),
        sort,
      })

      const response = await fetch(`/api/guides?${params}`)
      const data = await response.json()

      if (data.success) {
        if (isLoadMore) {
          setGuides(prev => [...prev, ...data.guides])
          setPage(prev => prev + 1)
        } else {
          setGuides(data.guides)
          setPage(1)
        }
        
        setHasMore(data.pagination.hasNextPage)
        setTotalPages(data.pagination.totalPages)
      } else {
        toast.error('Failed to load guides')
      }
    } catch (error) {
      console.error('Error fetching guides:', error)
      toast.error('Failed to load guides')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchGuides()
  }, [category, difficulty, priceType, sort, searchQuery, locationSearch, showNearbyOnly, userLocation?.state])

  // Handle success messages from guide creation
  useEffect(() => {
    const created = searchParams.get('created')
    if (created) {
      setShowSuccessMessage(true)
      
      if (created === 'draft') {
        toast.success('🎉 Guide saved as draft! You can continue editing it later.')
      } else if (created === 'review') {
        toast.success('🎉 Guide submitted for review! We\'ll notify you once it\'s approved.')
      }
      
      // Hide the message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000)
      
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('created')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchGuides()
  }

  const formatPrice = (guide: Guide) => {
    if (guide.pricing.type === 'free') return 'Free'
    if (guide.pricing.type === 'pwyw') {
      const suggested = guide.pricing.suggestedPrice
      return suggested ? `Pay what you want (suggested $${suggested})` : 'Pay what you want'
    }
    return `$${guide.pricing.price}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'challenging': return 'bg-orange-100 text-orange-800'
      case 'expert': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const GuideCard = ({ guide }: { guide: Guide }) => (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden bg-white">
      <div className="relative">
        <div className="aspect-[4/3] relative overflow-hidden">
          <Image
            src={guide.featuredImage?.url || '/placeholder-guide.jpg'}
            alt={guide.featuredImage?.alt || guide.title}
            fill
            className="object-cover"
          />
        </div>
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            className={`${
              guide.pricing.type === 'free' 
                ? 'bg-green-600 text-white' 
                : 'bg-blue-600 text-white'
            }`}
          >
            {formatPrice(guide)}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2 mb-3">
          <Link 
            href={`/guides/${guide.slug}`}
            className="hover:text-blue-600 transition-colors"
          >
            {guide.title}
          </Link>
        </CardTitle>
        
        {/* Creator Info */}
        <div className="flex items-center space-x-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarImage src={guide.creator?.profileImage?.url} />
            <AvatarFallback className="text-xs bg-gray-200">
              {guide.creator?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{guide.creator?.name || 'Unknown Creator'}</span>
          {guide.creator?.creatorProfile?.verification?.isVerified && (
            <CheckCircle className="h-4 w-4 text-blue-500" />
          )}
        </div>
        
        {/* Location & Duration */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span>
              {guide.primaryLocation?.name || guide.location?.name}
              {guide.primaryLocation?.address?.city && `, ${guide.primaryLocation.address.city}`}
              {guide.primaryLocation?.address?.state && `, ${guide.primaryLocation.address.state}`}
            </span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{guide.duration.value} {guide.duration.unit}</span>
          </div>
        </div>
        
        <CardDescription className="line-clamp-2 text-sm">
          {guide.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Simple Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-3">
            <span>{guide.stats.views} views</span>
            <span>{guide.stats.purchases} purchases</span>
          </div>
          {guide.stats.rating && (
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span>{guide.stats.rating}</span>
            </div>
          )}
        </div>
        
        {/* Simple Action Button */}
        <Link href={`/guides/${guide.slug}`}>
          <Button className="w-full" variant="outline">
            View Guide
          </Button>
        </Link>
      </CardContent>
    </Card>
  )

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Success Banner */}
          {showSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-green-800 font-medium">
                    {searchParams.get('created') === 'draft' 
                      ? 'Guide saved successfully!' 
                      : 'Guide submitted for review!'
                    }
                  </p>
                  <p className="text-green-600 text-sm">
                    {searchParams.get('created') === 'draft'
                      ? 'You can continue editing your draft anytime.'
                      : 'We\'ll notify you once your guide is approved and published.'
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </Button>
            </div>
          )}

          {/* Search & Filters with Add Button */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Guides</h1>
              <Link href="/guides/create">
                <Button size="sm" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Guide</span>
                </Button>
              </Link>
            </div>

            {/* Search Bars */}
            <div className="space-y-4 mb-6">
              {/* General Search */}
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search guides by title, description, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </form>

              {/* Location Search */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by location (city, state, or place name)..."
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value)
                    // Clear general search when location searching
                    if (e.target.value) setSearchQuery('')
                  }}
                  className="pl-10 h-12"
                />
              </div>

              {/* Location Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {userLocation && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="nearby-filter"
                      checked={showNearbyOnly}
                      onChange={(e) => {
                        setShowNearbyOnly(e.target.checked)
                        // Clear location search when enabling nearby
                        if (e.target.checked) setLocationSearch('')
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="nearby-filter" className="text-sm text-gray-700">
                      Show nearby guides ({userLocation.city}, {userLocation.state})
                    </label>
                  </div>
                )}
                
                {(locationSearch || showNearbyOnly) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocationSearch('')
                      setShowNearbyOnly(false)
                    }}
                    className="text-xs"
                  >
                    Clear location filters
                  </Button>
                )}
              </div>
            </div>

            {/* Simple Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceType} onValueChange={setPriceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  {priceTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-600">
              {loading ? 'Loading...' : (
                <span>
                  {guides.length} guides
                  {locationSearch && ` matching "${locationSearch}"`}
                  {showNearbyOnly && userLocation && ` near ${userLocation.city}, ${userLocation.state}`}
                  {searchQuery && ` matching "${searchQuery}"`}
                </span>
              )}
            </div>
          </div>

          {/* Results Section */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : guides.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No guides found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filters</p>
              <Button 
                onClick={() => {
                  setCategory('all')
                  setPriceType('all')
                  setSearchQuery('')
                  setLocationSearch('')
                  setShowNearbyOnly(false)
                }}
                variant="outline"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              {/* Guides Grid */}
              <div className={`grid gap-6 mb-8 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1 max-w-3xl mx-auto'
              }`}>
                {guides.map((guide) => (
                  <GuideCard key={guide.id} guide={guide} />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center">
                  <Button 
                    onClick={() => fetchGuides(true)}
                    variant="outline"
                  >
                    Load more guides
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
} 