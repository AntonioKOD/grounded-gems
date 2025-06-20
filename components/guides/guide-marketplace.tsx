'use client'

import { useState, useEffect } from 'react'
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
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface Guide {
  id: string
  title: string
  slug: string
  description: string
  creator: {
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
  location: {
    id: string
    name: string
    city: string
    state: string
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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState(initialCategory || 'all')
  const [difficulty, setDifficulty] = useState('all')
  const [priceType, setPriceType] = useState('all')
  const [sort, setSort] = useState('-createdAt')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState(1)

  const fetchGuides = async (isLoadMore = false) => {
    try {
      const params = new URLSearchParams({
        page: isLoadMore ? (page + 1).toString() : '1',
        limit: '12',
        ...(category !== 'all' && { category }),
        ...(difficulty !== 'all' && { difficulty }),
        ...(priceType !== 'all' && { priceType }),
        ...(searchQuery && { search: searchQuery }),
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
  }, [category, difficulty, priceType, sort, searchQuery])

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
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={guide.featuredImage?.url || '/placeholder-guide.jpg'}
            alt={guide.featuredImage?.alt || guide.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            className={`${
              guide.pricing.type === 'free' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {formatPrice(guide)}
          </Badge>
        </div>
        
        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={getDifficultyColor(guide.difficulty)}>
            {guide.difficulty}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 mb-2">
              <Link 
                href={`/guides/${guide.slug}`}
                className="hover:text-blue-600 transition-colors"
              >
                {guide.title}
              </Link>
            </CardTitle>
            
            {/* Creator Info */}
            <div className="flex items-center space-x-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={guide.creator.profileImage?.url} />
                <AvatarFallback className="text-xs">
                  {guide.creator.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600">{guide.creator.name}</span>
                {guide.creator.creatorProfile?.verification?.isVerified && (
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                )}
              </div>
            </div>
            
            {/* Location */}
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{guide.location.name}, {guide.location.city}</span>
            </div>
            
            {/* Duration */}
            <div className="flex items-center text-sm text-gray-600 mb-3">
              <Clock className="h-4 w-4 mr-1" />
              <span>{guide.duration.value} {guide.duration.unit}</span>
            </div>
          </div>
        </div>
        
        <CardDescription className="line-clamp-2">
          {guide.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Highlights */}
        {guide.highlights.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {guide.highlights.slice(0, 2).map((highlight, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {highlight.highlight}
                </Badge>
              ))}
              {guide.highlights.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{guide.highlights.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              <span>{guide.stats.views}</span>
            </div>
            <div className="flex items-center">
              <Download className="h-4 w-4 mr-1" />
              <span>{guide.stats.purchases}</span>
            </div>
            {guide.stats.rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1 text-yellow-500" />
                <span>{guide.stats.rating}</span>
                <span className="ml-1">({guide.stats.reviewCount})</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Button */}
        <Link href={`/guides/${guide.slug}`}>
          <Button className="w-full">
            View Guide
          </Button>
        </Link>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Local Guide Marketplace</h1>
        <p className="text-gray-600">
          Discover expert guides created by local creators to enhance your experience
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search guides, locations, or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
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

          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {difficultyOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priceType} onValueChange={setPriceType}>
            <SelectTrigger className="w-[140px]">
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
            <SelectTrigger className="w-[160px]">
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

          <div className="flex items-center gap-2 ml-auto">
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
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No guides found</h3>
            <p>Try adjusting your search criteria or filters</p>
          </div>
        </div>
      ) : (
        <>
          {/* Results Info */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Showing {guides.length} guides
            </p>
          </div>

          {/* Guides Grid */}
          <div className={`grid gap-6 mb-8 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
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
                size="lg"
              >
                Load More Guides
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
} 