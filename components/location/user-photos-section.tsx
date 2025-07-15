"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { 
  Camera, 
  User, 
  Filter, 
  Star, 
  Calendar,
  Tag,
  Grid3X3,
  List,
  ChevronDown,
  Eye,
  Award,
  Clock,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface UserPhoto {
  id: string
  photo: {
    id: string
    url: string
    alt?: string
    width?: number
    height?: number
    filename?: string
    mimeType?: string
    filesize?: number
  }
  caption?: string
  category: string
  tags: string[]
  featured: boolean
  qualityScore?: number
  submittedBy: {
    id: string
    name?: string
    email?: string
    profileImage?: string
  }
  submittedAt: string
  approvedAt: string
  approvedBy?: {
    id: string
    name?: string
  } | null
}

interface Category {
  value: string
  label: string
  count: number
}

interface UserPhotosSectionProps {
  locationId: string
  locationName: string
  className?: string
}

// Format date utility
function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateString))
}

export function UserPhotosSection({ locationId, locationName, className }: UserPhotosSectionProps) {
  console.log('🎯 UserPhotosSection component rendered with props:', {
    locationId,
    locationName,
    className
  })

  const [mounted, setMounted] = useState(false)
  const [photos, setPhotos] = useState<UserPhoto[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null)

  // Set mounted state for client-side rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch photos
  const fetchPhotos = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (pageNum === 1) setIsLoading(true)
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        category: selectedCategory,
        ...(showFeaturedOnly && { featured: 'true' })
      })

      const response = await fetch(`/api/locations/${locationId}/user-photos?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch photos')
      }

      const data = await response.json()
      
      if (reset || pageNum === 1) {
        setPhotos(data.photos)
      } else {
        setPhotos(prev => [...prev, ...data.photos])
      }
      
      setCategories(data.categories)
      setTotalCount(data.pagination.totalDocs)
      setHasMore(data.pagination.hasNextPage)
      setPage(pageNum)
      setError(null)
    } catch (err) {
      console.error('Error fetching photos:', err)
      setError('Failed to load photos')
      toast.error('Failed to load photos')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and when filters change
  useEffect(() => {
    fetchPhotos(1, true)
  }, [locationId, selectedCategory, showFeaturedOnly])

  // Load more photos
  const loadMore = () => {
    if (hasMore && !isLoading) {
      fetchPhotos(page + 1, false)
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      exterior: 'bg-green-100 text-green-800',
      interior: 'bg-blue-100 text-blue-800',
      food_drinks: 'bg-orange-100 text-orange-800',
      atmosphere: 'bg-purple-100 text-purple-800',
      menu: 'bg-yellow-100 text-yellow-800',
      staff: 'bg-pink-100 text-pink-800',
      events: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors.other
  }

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  // If no photos and not loading, show empty state
  if (!isLoading && photos.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Community Photos</h2>
            <p className="text-gray-600">Photos shared by visitors</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <div className="bg-gray-50 rounded-full p-6 w-fit mx-auto mb-4">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
            <p className="text-gray-600 mb-4">
              Be the first to share a photo of {locationName}
            </p>
            <p className="text-sm text-gray-500">
              Photos will appear here once they're submitted and approved
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Photos</h2>
          <p className="text-gray-600">
            {totalCount > 0 ? `${totalCount} photo${totalCount === 1 ? '' : 's'} shared by visitors` : 'Photos shared by visitors'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label} ({category.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFeaturedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
          >
            <Award className="h-4 w-4 mr-2" />
            Featured Only
          </Button>
        </div>
      </div>

      {/* Photos Grid/List */}
      <Tabs value={viewMode} className="w-full">
        <TabsList className="hidden">
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group">
                  <CardContent className="p-0">
                    <div className="relative aspect-square">
                      <Image
                        src={photo.photo.url}
                        alt={photo.photo.alt || photo.caption || `Photo by ${photo.submittedBy.name}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        onClick={() => setSelectedPhoto(photo)}
                      />
                      {photo.featured && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-yellow-500 text-white">
                            <Award className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className={getCategoryColor(photo.category)}>
                          {photo.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {photo.caption && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {photo.caption}
                        </p>
                      )}

                      {/* User Info */}
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={photo.submittedBy.profileImage} />
                          <AvatarFallback className="text-xs">
                            {photo.submittedBy.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600">
                          by {photo.submittedBy.name || 'Anonymous'}
                        </span>
                        {photo.qualityScore && (
                          <div className="flex items-center gap-1 ml-auto">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-500">{photo.qualityScore}/100</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <div className="space-y-4">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="cursor-pointer hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <Image
                          src={photo.photo.url}
                          alt={photo.photo.alt || photo.caption || `Photo by ${photo.submittedBy.name}`}
                          fill
                          className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                        {photo.featured && (
                          <div className="absolute -top-1 -left-1">
                            <Badge className="bg-yellow-500 text-white text-xs">
                              <Award className="w-2 h-2 mr-1" />
                              Featured
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(photo.category)}>
                              {photo.category.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDate(photo.submittedAt)}
                            </span>
                          </div>
                        </div>

                        {photo.caption && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {photo.caption}
                          </p>
                        )}

                        {/* User Info */}
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={photo.submittedBy.profileImage} />
                            <AvatarFallback className="text-xs">
                              {photo.submittedBy.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600">
                            by {photo.submittedBy.name || 'Anonymous'}
                          </span>
                          {photo.qualityScore && (
                            <div className="flex items-center gap-1 ml-auto">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs text-gray-500">{photo.qualityScore}/100</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button
            onClick={loadMore}
            disabled={isLoading}
            variant="outline"
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Load More Photos
              </>
            )}
          </Button>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <PhotoDetailModal 
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          categories={categories}
        />
      )}
    </div>
  )
}

// Photo Detail Modal Component
interface PhotoDetailModalProps {
  photo: UserPhoto
  onClose: () => void
  categories: Category[]
}

function PhotoDetailModal({ photo, onClose, categories }: PhotoDetailModalProps) {
  const categoryLabel = categories.find(c => c.value === photo.category)?.label || photo.category

  // Get category color function (duplicated for modal scope)
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      exterior: 'bg-green-100 text-green-800',
      interior: 'bg-blue-100 text-blue-800',
      food_drinks: 'bg-orange-100 text-orange-800',
      atmosphere: 'bg-purple-100 text-purple-800',
      menu: 'bg-yellow-100 text-yellow-800',
      staff: 'bg-pink-100 text-pink-800',
      events: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors.other
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100001] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative aspect-video w-full">
          <Image
            src={photo.photo.url}
            alt={photo.photo.alt || photo.caption || `Photo by ${photo.submittedBy.name}`}
            fill
            className="object-contain bg-gray-100"
          />
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getCategoryColor(photo.category)}>
                  {categoryLabel}
                </Badge>
                {photo.featured && (
                  <Badge className="bg-yellow-500 text-white">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}
              </div>
              {photo.caption && (
                <p className="text-lg text-gray-900">{photo.caption}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tags */}
          {photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photo.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* User & Meta Info */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={photo.submittedBy.profileImage} />
                  <AvatarFallback>
                    {photo.submittedBy.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">
                    {photo.submittedBy.name || 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Submitted {formatDate(photo.submittedAt)}
                  </p>
                </div>
              </div>

              {photo.qualityScore && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">{photo.qualityScore}/100</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 