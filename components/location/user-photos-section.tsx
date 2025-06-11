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

export function UserPhotosSection({ locationId, locationName, className }: UserPhotosSectionProps) {
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString))
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

  // Loading skeleton
  if (isLoading && photos.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // No photos state
  if (!isLoading && photos.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Camera className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No User Photos Yet</h3>
        <p className="text-gray-600 mb-6">
          Be the first to share a photo of {locationName}!
        </p>
        <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          <Camera className="w-4 h-4 mr-2" />
          Add Photo
        </Button>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Camera className="w-12 h-12 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Photos</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button 
          onClick={() => fetchPhotos(1, true)}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#FF6B6B]/10 rounded-full p-2">
            <Camera className="w-5 h-5 text-[#FF6B6B]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Photos</h2>
            <p className="text-gray-600">
              {totalCount} photo{totalCount !== 1 ? 's' : ''} shared by visitors
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label} ({category.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Featured Filter */}
        <Button
          variant={showFeaturedOnly ? 'default' : 'outline'}
          onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
          size="sm"
        >
          <Award className="w-4 h-4 mr-2" />
          Featured Only
        </Button>

        {/* Stats */}
        <div className="text-sm text-gray-600 ml-auto">
          Showing {photos.length} of {totalCount} photos
        </div>
      </div>

      {/* Photos Grid/List */}
      <Tabs value={viewMode} className="space-y-6">
        {/* Grid View */}
        <TabsContent value="grid" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square">
                      <Image
                        src={photo.photo.url}
                        alt={photo.photo.alt || photo.caption || `Photo by ${photo.submittedBy.name}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      
                      {/* Overlays */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      
                      {/* Featured Badge */}
                      {photo.featured && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-yellow-500 text-white">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Featured
                          </Badge>
                        </div>
                      )}

                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className={getCategoryColor(photo.category)}>
                          {categories.find(c => c.value === photo.category)?.label || photo.category}
                        </Badge>
                      </div>

                      {/* User Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={photo.submittedBy.profileImage} />
                            <AvatarFallback className="text-xs">
                              {photo.submittedBy.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white text-sm truncate">
                            {photo.submittedBy.name || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Photo Thumbnail */}
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={photo.photo.url}
                        alt={photo.photo.alt || photo.caption || `Photo by ${photo.submittedBy.name}`}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Photo Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(photo.category)}>
                            {categories.find(c => c.value === photo.category)?.label || photo.category}
                          </Badge>
                          {photo.featured && (
                            <Badge className="bg-yellow-500 text-white">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(photo.approvedAt)}
                        </span>
                      </div>

                      {/* Caption */}
                      {photo.caption && (
                        <p className="text-gray-700 mb-2 line-clamp-2">{photo.caption}</p>
                      )}

                      {/* Tags */}
                      {photo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {photo.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {photo.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{photo.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
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
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
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