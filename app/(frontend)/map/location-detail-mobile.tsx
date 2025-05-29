"use client"

import {
  X,
  MapPin,
  Star,
  Phone,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
  Share2,
  ExternalLink,
  Info,
  Navigation,
  DollarSign,
  ThumbsUp,
  Heart,
  Bookmark,
  MessageCircle,
  Users,
  Camera,
  Video,
  Calendar,
  Award,
  Zap,
  MapIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Image from "next/image"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { Location } from "./map-data"
import { getCategoryColor, getCategoryName } from "./category-utils"
import { createLocationShareUrl } from "@/lib/location-sharing"
import { useEffect, useState, useCallback, useMemo } from "react"
import LocationInteractions from "@/components/location/location-interactions"
import { getReviewsbyId, } from "@/app/actions"
import { motion, AnimatePresence } from "framer-motion"

interface LocationDetailMobileProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
}

// Enhanced image gallery with better mobile gestures and performance
function ImageGallery({ 
  images, 
  locationName, 
  currentIndex = 0, 
  onIndexChange 
}: { 
  images: string[]
  locationName: string
  currentIndex?: number
  onIndexChange?: (index: number) => void
}) {
  const [localIndex, setLocalIndex] = useState(currentIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>({})
  
  const handlePrevious = useCallback(() => {
    const newIndex = localIndex === 0 ? images.length - 1 : localIndex - 1
    setLocalIndex(newIndex)
    onIndexChange?.(newIndex)
  }, [localIndex, images.length, onIndexChange])
  
  const handleNext = useCallback(() => {
    const newIndex = localIndex === images.length - 1 ? 0 : localIndex + 1
    setLocalIndex(newIndex)
    onIndexChange?.(newIndex)
  }, [localIndex, images.length, onIndexChange])

  // Enhanced touch handlers with better swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
    if (touchStart && Math.abs(e.targetTouches[0].clientX - touchStart) > 10) {
      setIsDragging(true)
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !isDragging) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && images.length > 1) {
      handleNext()
    }
    if (isRightSwipe && images.length > 1) {
      handlePrevious()
    }
  }

  const handleImageLoad = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }))
  }

  return (
    <div 
      className="relative h-72 w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image container with smooth transitions */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={localIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={images[localIndex] || "/placeholder.svg"}
              alt={`${locationName} - Photo ${localIndex + 1}`}
              fill
              className="object-cover"
              priority={localIndex === 0}
              onLoad={() => handleImageLoad(localIndex)}
              onError={() => handleImageLoad(localIndex)}
            />
            
            {/* Loading state */}
            {imageLoading[localIndex] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-3 border-gray-400 border-t-blue-500 rounded-full"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation arrows - only show if multiple images */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full h-12 w-12 backdrop-blur-sm border border-white/20"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full h-12 w-12 backdrop-blur-sm border border-white/20"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          
          {/* Dot indicators with improved styling */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setLocalIndex(index)
                  onIndexChange?.(index)
                }}
                className={cn(
                  "rounded-full transition-all duration-200 backdrop-blur-sm",
                  index === localIndex 
                    ? "w-8 h-3 bg-white shadow-lg" 
                    : "w-3 h-3 bg-white/60 hover:bg-white/80"
                )}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: index === localIndex 
                    ? 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
                    : undefined
                }}
              />
            ))}
          </div>
          
          {/* Image counter */}
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
            {localIndex + 1} / {images.length}
          </div>
        </>
      )}

      {/* Gradient overlays for better readability */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  )
}

// Enhanced location info with better mobile layout
function LocationInfo({ location }: { location: Location }) {
  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  const formatWebsite = (website: string) => {
    return website.replace(/^https?:\/\/(www\.)?/, "")
  }

  const getBusinessStatus = () => {
    if (!location.businessHours) return null
    
    const now = new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = dayNames[now.getDay()]
    const currentTime = now.toTimeString().slice(0, 5)
    
    const todayHours = location.businessHours.find(h => h.day === today)
    if (!todayHours) return null
    
    if (todayHours.closed) return { isOpen: false, status: 'Closed today' }
    
    if (todayHours.open && todayHours.close) {
      const isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close
      return { 
        isOpen, 
        status: isOpen ? `Open until ${todayHours.close}` : `Closed • Opens at ${todayHours.open}`
      }
    }
    
    return null
  }

  const businessStatus = getBusinessStatus()

  return (
    <div className="space-y-6">
      {/* Address */}
      {location.address && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/50"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              {typeof location.address === "string"
                ? location.address
                : Object.values(location.address).filter(Boolean).join(", ")}
            </p>
            <Button
              size="sm"
              className="h-10 text-sm w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
              onClick={() => {
                const address = typeof location.address === "string"
                  ? location.address
                  : Object.values(location.address ?? {}).filter(Boolean).join(", ")
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                window.open(mapsUrl, "_blank")
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </motion.div>
      )}

      {/* Contact & Status Info */}
      <div className="space-y-3">
        {/* Business status */}
        {businessStatus && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className={cn(
              "w-3 h-3 rounded-full",
              businessStatus.isOpen ? "bg-green-500" : "bg-red-500"
            )} />
            <span className={cn(
              "text-sm font-medium",
              businessStatus.isOpen ? "text-green-700" : "text-red-700"
            )}>
              {businessStatus.status}
            </span>
          </motion.div>
        )}

        {/* Phone */}
        {location.contactInfo?.phone && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <a
              href={`tel:${location.contactInfo.phone}`}
              className="text-sm text-gray-700 hover:text-green-600 font-medium transition-colors"
            >
              {formatPhone(location.contactInfo.phone)}
            </a>
          </motion.div>
        )}

        {/* Website */}
        {location.contactInfo?.website && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <a
              href={location.contactInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 hover:text-blue-600 font-medium flex items-center transition-colors"
            >
              {formatWebsite(location.contactInfo.website)}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </motion.div>
        )}
      </div>

      {/* Business Hours */}
      {location.businessHours && location.businessHours.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-gray-50 rounded-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Business Hours</h3>
          </div>
          <div className="space-y-2">
            {location.businessHours.map((hour, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">{hour.day}</span>
                <span className={cn(
                  "font-medium",
                  hour.closed ? "text-red-500" : "text-gray-900"
                )}>
                  {hour.closed ? "Closed" : `${hour.open} - ${hour.close}`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Price Range */}
      {location.priceRange && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200/50"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900 capitalize block">
              {location.priceRange} pricing
            </span>
            <p className="text-xs text-gray-600">Price range</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Enhanced reviews tab with better mobile UX
function ReviewsTab({ 
  locationId, 
  reviews, 
  isLoading, 
  onWriteReview 
}: { 
  locationId: string
  reviews: any[]
  isLoading: boolean
  onWriteReview: () => void
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 border rounded-xl animate-pulse"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Write Review Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={onWriteReview}
          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
        >
          <MessageCircle className="h-5 w-5 mr-3" />
          Write a Review
        </Button>
      </motion.div>

      <Separator />

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">No reviews yet</h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">Be the first to share your experience and help others discover this place!</p>
          <Button
            onClick={onWriteReview}
            variant="outline"
            className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold px-8"
          >
            Write First Review
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {review.author?.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {review.author?.name || 'Anonymous'}
                        </h4>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-4 w-4",
                                i < (review.rating || 0)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {review.title && (
                    <h5 className="font-semibold text-gray-900 mb-3">
                      {review.title}
                    </h5>
                  )}
                  
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {review.content}
                  </p>

                  {/* Review actions */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50">
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Helpful
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-gray-600 hover:text-green-600 hover:bg-green-50">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LocationDetailMobile({ location, isOpen, onClose }: LocationDetailMobileProps) {
  const [activeTab, setActiveTab] = useState("info")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)

  // Memoized images array
  const images = useMemo(() => {
    if (!location) return []
    
    const imageUrls: string[] = []
    
    if (location.featuredImage) {
      if (typeof location.featuredImage === 'string') {
        imageUrls.push(location.featuredImage)
      } else if (location.featuredImage.url) {
        imageUrls.push(location.featuredImage.url)
      }
    }
    
    if (location.gallery && Array.isArray(location.gallery)) {
      location.gallery.forEach((item: any) => {
        if (typeof item === 'string') {
          imageUrls.push(item)
        } else if (item.image) {
          if (typeof item.image === 'string') {
            imageUrls.push(item.image)
          } else if (item.image.url) {
            imageUrls.push(item.image.url)
          }
        }
      })
    }
    
    return imageUrls.length > 0 ? imageUrls : ['/placeholder.svg']
  }, [location])

  const shareLocation = useCallback(() => {
    if (!location) return
    
    const shareUrl = createLocationShareUrl(location.id, location.name)
    
    if (navigator.share) {
      navigator.share({
        title: location.name,
        text: `Check out ${location.name}`,
        url: shareUrl,
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Link copied to clipboard! 📋")
      }).catch(() => {
        toast.error("Failed to copy link")
      })
    }
  }, [location])

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data.user)
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }

    fetchCurrentUser()
  }, [])

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!location?.id) return
      
      setIsLoadingReviews(true)
      try {
        const reviewsData = await getReviewsbyId(location.id)
        setReviews(reviewsData.docs || [])
      } catch (error) {
        console.error('Error fetching reviews:', error)
        setReviews([])
      } finally {
        setIsLoadingReviews(false)
      }
    }

    if (isOpen && location) {
      fetchReviews()
    }
  }, [location, isOpen])

  // Reset state when location changes
  useEffect(() => {
    if (location) {
      setCurrentImageIndex(0)
      setActiveTab("info")
    }
  }, [location])

  const handleWriteReview = () => {
    if (!currentUser) {
      toast.error("Please log in to write a review")
      return
    }
    toast.info("Review form coming soon! ✨")
  }

  if (!location) {
    return null
  }

  const primaryCategory = location.categories?.[0]
  const categoryName = getCategoryName(primaryCategory)
  const categoryColor = getCategoryColor(primaryCategory)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] max-h-[95vh] p-0 rounded-t-3xl border-0 shadow-2xl bg-white"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{location?.name || 'Location Details'}</SheetTitle>
        </SheetHeader>
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col h-full bg-white"
        >
          {/* Header with enhanced image gallery */}
          <div className="relative flex-shrink-0">
            <ImageGallery
              images={images}
              locationName={location.name}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
            />
            
            {/* Header overlay with modern glass effect */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-12 w-12 bg-black/20 backdrop-blur-md text-white hover:bg-black/30 rounded-full border border-white/20 shadow-lg"
                >
                  <X className="h-6 w-6" />
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={shareLocation}
                  className="h-12 w-12 bg-black/20 backdrop-blur-md text-white hover:bg-black/30 rounded-full border border-white/20 shadow-lg"
                >
                  <Share2 className="h-6 w-6" />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Title and basic info with enhanced styling */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex-shrink-0 p-6 border-b border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                    {location.name}
                  </h1>
                  
                  {location.averageRating && (
                    <div className="flex items-center mb-3">
                      <div className="flex items-center mr-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-5 w-5",
                              i < Math.floor(location.averageRating || 0)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-semibold text-gray-800 mr-2">
                        {location.averageRating.toFixed(1)}
                      </span>
                      {location.reviewCount && (
                        <span className="text-sm text-gray-600">
                          ({location.reviewCount} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {categoryName && (
                    <Badge
                      variant="outline"
                      className="mb-4 text-sm px-3 py-1 font-medium"
                      style={{
                        backgroundColor: `${categoryColor}15`,
                        color: categoryColor,
                        borderColor: `${categoryColor}40`,
                      }}
                    >
                      {categoryName}
                    </Badge>
                  )}
                </div>
              </div>

              {location.shortDescription && (
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {location.shortDescription}
                </p>
              )}

              {/* Enhanced Location Interactions */}
              <LocationInteractions 
                location={location as any}
                currentUserId={currentUser?.id}
                className="w-full"
              />
            </motion.div>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex-shrink-0 px-6 pt-6"
              >
                <TabsList className="w-full grid grid-cols-3 h-14 bg-gray-100 rounded-xl p-1">
                  <TabsTrigger 
                    value="info" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm font-semibold rounded-lg transition-all"
                  >
                    <Info className="h-5 w-5 mr-2" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm font-semibold rounded-lg transition-all"
                  >
                    <Star className="h-5 w-5 mr-2" />
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger 
                    value="specials" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm font-semibold rounded-lg transition-all"
                  >
                    <Zap className="h-5 w-5 mr-2" />
                    Deals
                  </TabsTrigger>
                </TabsList>
              </motion.div>
              
              <div className="flex-1 min-h-0">
                <TabsContent value="info" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-6 pb-32">
                      <LocationInfo location={location} />
                      
                      {location.description && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200"
                        >
                          <h3 className="font-bold text-lg mb-4 text-gray-900">About This Place</h3>
                          <p className="text-gray-700 leading-relaxed">
                            {location.description}
                          </p>
                        </motion.div>
                      )}

                      {/* Accessibility info with enhanced styling */}
                      {location.accessibility && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                        >
                          <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center">
                            <Award className="h-5 w-5 mr-2 text-blue-600" />
                            Accessibility
                          </h3>
                          <div className="space-y-3 text-sm">
                            {location.accessibility.wheelchairAccess && (
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-gray-700">Wheelchair accessible</span>
                              </div>
                            )}
                            {location.accessibility.parking && (
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-gray-700">Parking available</span>
                              </div>
                            )}
                            {location.accessibility.other && (
                              <p className="text-gray-600 mt-3 pl-5">{location.accessibility.other}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="reviews" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-6 pb-32">
                      <ReviewsTab
                        locationId={location.id}
                        reviews={reviews}
                        isLoading={isLoadingReviews}
                        onWriteReview={handleWriteReview}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="specials" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-6 pb-32">
                      <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                      >
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center">
                          <Zap className="h-12 w-12 text-orange-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">No current deals</h3>
                        <p className="text-gray-600 mb-8 max-w-sm mx-auto">Check back later for special offers and exclusive promotions at this location</p>
                        <Button 
                          variant="outline" 
                          className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold px-8"
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Save to get notified
                        </Button>
                      </motion.div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Enhanced Fixed Bottom Action Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-shrink-0 p-6 border-t bg-white/95 backdrop-blur-md safe-area-bottom"
          >
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 h-14 text-base font-semibold"
                onClick={() => {
                  if (location.address) {
                    const address = typeof location.address === "string"
                      ? location.address
                      : Object.values(location.address).filter(Boolean).join(", ")
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                    window.open(mapsUrl, "_blank")
                  }
                }}
              >
                <Navigation className="h-5 w-5 mr-3" />
                Directions
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 h-14 text-base font-semibold text-white shadow-lg"
                onClick={shareLocation}
              >
                <Share2 className="h-5 w-5 mr-3" />
                Share
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </SheetContent>
    </Sheet>
  )
} 