'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BookOpen, 
  Clock, 
  MapPin, 
  Star, 
  Download, 
  Eye,
  Calendar,
  Filter,
  Grid,
  List,
  Heart,
  Share2,
  MessageSquare,
  Loader2,
  LibraryBig,
  ShoppingBag,
  Gift
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { useCurrentUser } from '@/hooks/use-current-user'
import { formatDistanceToNow } from 'date-fns'

interface LibraryItem {
  purchase: {
    id: string
    purchaseDate: string
    amount: number
    paymentMethod: string
    downloadCount: number
    lastAccessedAt?: string
    hasReviewed: boolean
    purchaseRating?: number
  }
  guide: {
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
    }
    primaryLocation?: {
      id: string
      name: string
      address?: {
        city?: string
        state?: string
      }
    }
    category?: string
    difficulty: string
    duration?: {
      value: number
      unit: string
    }
    pricing: {
      type: 'free' | 'paid' | 'pwyw'
      price?: number
    }
    featuredImage?: {
      url: string
      alt: string
    }
    stats: {
      views: number
      purchases: number
      rating?: number
      reviewCount: number
    }
    tags?: Array<{ tag: string }>
  }
}

const sortOptions = [
  { label: 'Recently Purchased', value: '-purchaseDate' },
  { label: 'Recently Accessed', value: '-lastAccessedAt' },
  { label: 'Most Accessed', value: '-downloadCount' },
  { label: 'Title A-Z', value: 'guide.title' },
  { label: 'Price: High to Low', value: '-amount' },
  { label: 'Price: Low to High', value: 'amount' },
]

export default function LibraryPage() {
  const { user } = useCurrentUser()
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('-purchaseDate')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    if (user) {
      fetchLibrary()
    }
  }, [user, sortBy])

  const fetchLibrary = async (isLoadMore = false) => {
    if (!user) return

    try {
      const currentPage = isLoadMore ? page + 1 : 1
      const response = await fetch(`/api/users/${user.id}/library?page=${currentPage}&limit=12&sort=${sortBy}`)
      const data = await response.json()

      if (data.success) {
        if (isLoadMore) {
          setLibrary(prev => [...prev, ...data.library])
          setPage(currentPage)
        } else {
          setLibrary(data.library)
          setPage(1)
        }
        
        setHasMore(data.pagination.hasNextPage)
        setTotalItems(data.pagination.totalDocs)
      } else {
        toast.error('Failed to load library')
      }
    } catch (error) {
      console.error('Error fetching library:', error)
      toast.error('Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  const handleGuideAccess = async (guideId: string) => {
    if (!user) return

    try {
      await fetch(`/api/users/${user.id}/library`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guideId,
          action: 'access'
        }),
      })
    } catch (error) {
      console.error('Error tracking guide access:', error)
    }
  }

  const formatPrice = (item: LibraryItem) => {
    if (!item.purchase || item.purchase.amount === undefined || item.purchase.amount === 0) return 'Free'
    return `$${item.purchase.amount}`
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'free': return <Gift className="h-4 w-4 text-green-600" />
      case 'stripe': return <ShoppingBag className="h-4 w-4 text-blue-600" />
      default: return <ShoppingBag className="h-4 w-4 text-gray-600" />
    }
  }

  const LibraryItemCard = ({ item }: { item: LibraryItem }) => (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden bg-white">
      <div className="relative">
        <div className="aspect-[4/3] relative overflow-hidden">
          <Image
            src={item.guide.featuredImage?.url || '/placeholder-guide.jpg'}
            alt={item.guide.featuredImage?.alt || item.guide.title}
            fill
            className="object-cover"
          />
        </div>
        
        {/* Purchase Info Badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            className={`${
              item.purchase.amount === 0 
                ? 'bg-green-600 text-white' 
                : 'bg-blue-600 text-white'
            }`}
          >
            {formatPrice(item)}
          </Badge>
        </div>

        {/* Access Count */}
        <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
          <Eye className="h-3 w-3 mr-1" />
          {item.purchase.downloadCount || 0}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2 mb-3">
          <Link 
            href={`/guides/${item.guide.slug || item.guide.id}`}
            onClick={() => handleGuideAccess(item.guide.id)}
            className="hover:text-blue-600 transition-colors"
          >
            {item.guide.title || 'Untitled Guide'}
          </Link>
        </CardTitle>
        
        {/* Creator Info */}
        <div className="flex items-center space-x-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarImage src={item.guide.creator?.profileImage?.url} />
            <AvatarFallback className="text-xs bg-gray-200">
              {item.guide.creator?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{item.guide.creator?.name || 'Unknown Creator'}</span>
        </div>
        
        {/* Location & Duration */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span>
              {item.guide.primaryLocation?.name || 'Location not specified'}
              {item.guide.primaryLocation?.address?.city && `, ${item.guide.primaryLocation.address.city}`}
            </span>
          </div>
          {item.guide.duration && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{item.guide.duration.value} {item.guide.duration.unit}</span>
            </div>
          )}
        </div>
        
        <CardDescription className="line-clamp-2 text-sm mb-3">
          {item.guide.description || 'No description available'}
        </CardDescription>

        {/* Purchase Metadata */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Purchased {item.purchase.purchaseDate ? formatDistanceToNow(new Date(item.purchase.purchaseDate), { addSuffix: true }) : 'Unknown date'}
            </span>
            {getPaymentMethodIcon(item.purchase.paymentMethod || 'unknown')}
          </div>
          {item.purchase.lastAccessedAt && (
            <div className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              Last accessed {formatDistanceToNow(new Date(item.purchase.lastAccessedAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link 
            href={`/guides/${item.guide.slug || item.guide.id}`}
            onClick={() => handleGuideAccess(item.guide.id)}
            className="flex-1"
          >
            <Button className="w-full" variant="default">
              <BookOpen className="h-4 w-4 mr-2" />
              Read Guide
            </Button>
          </Link>
          
          {!item.purchase.hasReviewed && (
            <Link href={`/guides/${item.guide.slug || item.guide.id}#review`}>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <LibraryBig className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-4">Please sign in to view your guide library.</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <LibraryBig className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">My Library</h1>
          </div>
          <p className="text-gray-600">
            Access all your purchased guides anytime, anywhere.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-sm text-gray-600">
                {totalItems} guide{totalItems !== 1 ? 's' : ''} in your library
              </div>
            </div>

            <div className="flex items-center space-x-2">
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

        {/* Results Section */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : library.length === 0 ? (
          <div className="text-center py-16">
            <LibraryBig className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your library is empty</h3>
            <p className="text-gray-600 mb-4">Start building your collection by purchasing guides</p>
            <Link href="/guides">
              <Button>
                Browse Guides
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Library Grid */}
            <div className={`grid gap-6 mb-8 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1 max-w-3xl mx-auto'
            }`}>
              {library.map((item) => (
                <LibraryItemCard key={item.purchase.id} item={item} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <Button 
                  onClick={() => fetchLibrary(true)}
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
  )
} 