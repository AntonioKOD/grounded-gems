"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
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
  Ticket,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CalendarDays,
  Heart,
  Navigation,
  Bookmark,
  Plus,
  Loader2,
  Crown,
  Target,
  AlertTriangle,
  MessageSquare,
} from "lucide-react"
import { Capacitor } from '@capacitor/core'
import { trackIOSModal, logIOSEvent } from '@/lib/ios-crash-debug'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Location, Media as ImportedMedia } from "./map-data"
import { getCategoryColor, getCategoryName } from "./category-utils"
import { createLocationShareUrl } from "@/lib/location-sharing"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// Define User interface
interface User {
  id: string;
  name?: string;
  // Add other user fields as needed
}

// Define ReviewItem interface locally if not available from map-data
interface ReviewItem {
  id: string;
  title: string;
  content: string;
  rating: number;
  author?: { 
    id: string
    name?: string
    profileImage?: { url: string }
  } | string;
  visitDate?: string | Date;
  createdAt: string | Date;
  pros?: Array<{ pro: string }>;
  cons?: Array<{ con: string }>;
  tips?: string;
  helpfulCount?: number;
  unhelpfulCount?: number;
  usersWhoMarkedHelpful?: string[];
  usersWhoMarkedUnhelpful?: string[];
}

// Use ImportedMedia directly
type Media = ImportedMedia

interface LocationDetailMobileProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
}

interface BucketList {
  id: string
  name: string
  description?: string
  type: 'personal' | 'shared' | 'ai-generated'
  stats: {
    totalItems: number
    completedItems: number
  }
}

// Enhanced image gallery with better mobile gestures and performance
function ImageGallery({
  galleryImages,
  locationName,
  currentIndex = 0,
  onIndexChange = () => {},
}: {
  galleryImages: string[]
  locationName: string
  currentIndex?: number
  onIndexChange?: (index: number) => void
}) {
  const [localIndex, setLocalIndex] = useState(currentIndex)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  useEffect(() => {
    setLocalIndex(currentIndex)
  }, [currentIndex])

  const minSwipeDistance = 50

  const handleSwipe = () => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && localIndex < galleryImages.length - 1) {
      goToNext()
    }
    if (isRightSwipe && localIndex > 0) {
      goToPrevious()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    handleSwipe()
  }

  const goToNext = () => {
    if (localIndex < galleryImages.length - 1) {
      const newIndex = localIndex + 1
      setLocalIndex(newIndex)
      onIndexChange(newIndex)
    }
  }

  const goToPrevious = () => {
    if (localIndex > 0) {
      const newIndex = localIndex - 1
      setLocalIndex(newIndex)
      onIndexChange(newIndex)
    }
  }

  if (!galleryImages || galleryImages.length === 0) {
    return (
      <div className="w-full h-64 bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No images available</p>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-64 bg-muted overflow-hidden touch-pan-x"
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
              src={galleryImages[localIndex] || "/placeholder.svg"}
              alt={`${locationName} - Photo ${localIndex + 1}`}
              fill
              className="object-cover"
              priority={localIndex === 0}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation arrows - only show if multiple images */}
      {galleryImages.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white z-10"
            onClick={goToPrevious}
            disabled={localIndex === 0}
          >
            ←
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white z-10"
            onClick={goToNext}
            disabled={localIndex === galleryImages.length - 1}
          >
            →
          </Button>
        </>
      )}
      
      {/* Image indicators */}
      {galleryImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {galleryImages.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === localIndex ? "bg-white" : "bg-white/50"
              }`}
              onClick={() => {
                setLocalIndex(index)
                onIndexChange(index)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Enhanced location info with better mobile layout
function LocationInfo({ location }: { location: Location }) {
  const formatPhone = (phone: string) => {
    try {
      return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
    } catch (error) {
      console.warn('Error formatting phone number:', error)
      return phone
    }
  }

  const formatWebsite = (website: string) => {
    try {
      return website.replace(/^https?:\/\/(www\.)?/, "")
    } catch (error) {
      console.warn('Error formatting website:', error)
      return website
    }
  }

  const getBusinessStatus = () => {
    if (!location.businessHours || location.businessHours.length === 0) {
      return { status: "Unknown", color: "text-muted-foreground" }
    }

    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const todayHours = location.businessHours.find(
      (hours) => hours.day?.toLowerCase() === currentDay
    )

    if (!todayHours || todayHours.closed) {
      return { status: "Closed", color: "text-red-600" }
    }

    if (todayHours.open && todayHours.close) {
      const [openHour, openMinute] = todayHours.open.split(":").map(Number)
      const [closeHour, closeMinute] = todayHours.close.split(":").map(Number)
      const openTime = openHour * 60 + openMinute
      const closeTime = closeHour * 60 + closeMinute

      if (currentTime >= openTime && currentTime <= closeTime) {
        return { status: "Open", color: "text-green-600" }
      }
    }

    return { status: "Closed", color: "text-red-600" }
  }

  const handleDirections = () => {
    if (location.address) {
      const addressString = typeof location.address === "string"
        ? location.address
        : [
            location.address.street,
            location.address.city,
            location.address.state,
            location.address.zip,
            location.address.country
          ].filter(Boolean).join(", ")
      
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressString)}`
      window.open(mapsUrl, "_blank")
    }
  }

  const handleCall = () => {
    if (location.contactInfo?.phone) {
      window.location.href = `tel:${location.contactInfo.phone}`
    }
  }

  const handleWebsite = () => {
    if (location.contactInfo?.website) {
      const website = location.contactInfo.website.startsWith("http")
        ? location.contactInfo.website
        : `https://${location.contactInfo.website}`
      window.open(website, "_blank")
    }
  }

  const businessStatus = getBusinessStatus()
  const categoryColor = getCategoryColor(location.categories)

  // Format address for display
  const formatAddress = (address: any): string => {
    if (typeof address === "string") return address
    if (!address) return ""
    
    return [
      address.street,
      address.city,
      address.state,
      address.zip,
      address.country
    ].filter(Boolean).join(", ")
  }

  // Format price range
  const formatPriceRange = (priceRange?: string): string => {
    const ranges = {
      free: "Free",
      budget: "$",
      moderate: "$$",
      expensive: "$$$",
      luxury: "$$$$"
    }
    return ranges[priceRange as keyof typeof ranges] || "Price not available"
  }

  return (
    <div className="p-4 space-y-6">
      {/* Basic Info */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{location.name}</h1>
        
        {/* Category and verification badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="text-sm text-muted-foreground font-medium">
              {getCategoryName(location.categories)}
            </span>
          </div>
          {location.isVerified && (
            <span className="text-xs bg-[#4ecdc4]/10 text-[#4ecdc4] px-2 py-1 rounded-full font-medium">
              ✓ Verified
            </span>
          )}
          {location.isFeatured && (
            <span className="text-xs bg-[#ffe66d]/20 text-[#b8860b] px-2 py-1 rounded-full font-medium">
              ⭐ Featured
            </span>
          )}
        </div>

        {/* Rating */}
        {location.averageRating && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(location.averageRating || 0)
                      ? "text-[#ffe66d] fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">
              {location.averageRating.toFixed(1)}
            </span>
            {location.reviewCount && (
              <span className="text-sm text-muted-foreground">
                ({location.reviewCount} reviews)
              </span>
            )}
          </div>
        )}

        {/* Price Range */}
        {location.priceRange && (
          <div className="mb-3">
            <span className="text-sm text-muted-foreground">
              Price: <span className="font-medium text-foreground">{formatPriceRange(location.priceRange)}</span>
            </span>
          </div>
        )}

        {/* Description */}
        {(location.shortDescription || location.description) && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {location.shortDescription || location.description}
          </p>
        )}

        {/* Insider Tips */}
        {location.insiderTips && (
          <div className="mt-4 p-3 bg-[#ffe66d]/10 border border-[#ffe66d]/30 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-[#b8860b] text-sm">💡</span>
              <div>
                <p className="text-sm font-medium text-[#b8860b] mb-1">Insider Tip</p>
                <p className="text-sm text-muted-foreground">{location.insiderTips}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={() => {
            const address = typeof location.address === 'string' 
              ? location.address 
              : Object.values(location.address || {}).filter(Boolean).join(', ')
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
            window.open(mapsUrl, '_blank')
          }}
          variant="outline"
          className="h-12 rounded-xl border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/10 font-medium"
        >
          <Navigation className="h-4 w-4 mr-1" />
          <span className="text-sm">Directions</span>
        </Button>
        <Button
          onClick={handleWriteReview}
          variant="outline"
          className="h-12 rounded-xl border-[#ff6b6b]/30 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 font-medium"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          <span className="text-sm">Review</span>
        </Button>
        <Button
          onClick={handleAddToBucketList}
          disabled={isLoadingBucketLists}
          className="h-12 rounded-xl bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isLoadingBucketLists ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 mr-1" />
          )}
          <span className="text-sm">Add to List</span>
        </Button>
      </div>

      {/* Contact & Details Info */}
      <div className="space-y-4">
        {/* Address */}
        {location.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-[#4ecdc4] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{formatAddress(location.address)}</p>
              {location.neighborhood && (
                <p className="text-xs text-muted-foreground mt-1">
                  Neighborhood: {location.neighborhood}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Business Hours */}
        {location.businessHours && location.businessHours.length > 0 && (
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-[#4ecdc4] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-foreground">Hours</span>
                <span className={`text-sm font-medium ${businessStatus.color}`}>
                  {businessStatus.status}
                </span>
              </div>
              <div className="space-y-1">
                {location.businessHours.map((hours, index) => (
                  <div key={index} className="flex justify-between text-xs text-muted-foreground">
                    <span className="capitalize font-medium">{hours.day}</span>
                    <span>
                      {hours.closed ? "Closed" : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contact Info */}
        {location.contactInfo?.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-[#4ecdc4] flex-shrink-0" />
            <span className="text-sm text-foreground">{location.contactInfo.phone}</span>
          </div>
        )}

        {location.contactInfo?.website && (
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-[#4ecdc4] flex-shrink-0" />
            <a
              href={location.contactInfo.website.startsWith("http") ? location.contactInfo.website : `https://${location.contactInfo.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#ff6b6b] hover:underline"
            >
              {location.contactInfo.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}

        {/* Accessibility Features */}
        {location.accessibility && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Accessibility</h4>
            <div className="flex flex-wrap gap-2">
              {location.accessibility.wheelchairAccess && (
                <span className="text-xs bg-[#4ecdc4]/10 text-[#4ecdc4] px-2 py-1 rounded-full">
                  ♿ Wheelchair Accessible
                </span>
              )}
              {location.accessibility.parking && (
                <span className="text-xs bg-[#ffe66d]/20 text-[#b8860b] px-2 py-1 rounded-full">
                  🅿️ Parking Available
                </span>
              )}
              {location.accessibility.other && (
                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                  {location.accessibility.other}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Best Time to Visit */}
        {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Best Time to Visit</h4>
            <div className="flex flex-wrap gap-2">
              {location.bestTimeToVisit.map((time, index) => (
                <span key={index} className="text-xs bg-[#ffe66d]/20 text-[#b8860b] px-2 py-1 rounded-full">
                  {time.season}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {location.tags && location.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {location.tags.map((tag, index) => (
                <span key={index} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  {tag.tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced Reviews Tab with full functionality
function ReviewsTab({ 
  location,
  reviewItems,
  isLoading, 
  onWriteReview,
  onRefreshReviews,
  currentUser
}: { 
  location: Location
  reviewItems: ReviewItem[]
  isLoading: boolean
  onWriteReview: () => void
  onRefreshReviews: () => void
  currentUser: User | null
}) {
  const [helpfulStates, setHelpfulStates] = useState<Record<string, { isHelpful: boolean | null, helpfulCount: number, unhelpfulCount: number }>>({})

  useEffect(() => {
    // Initialize helpful states
    const states: Record<string, { isHelpful: boolean | null, helpfulCount: number, unhelpfulCount: number }> = {}
    reviewItems.forEach(review => {
      const userMarkedHelpful = currentUser && review.usersWhoMarkedHelpful?.includes(currentUser.id)
      const userMarkedUnhelpful = currentUser && review.usersWhoMarkedUnhelpful?.includes(currentUser.id)
      
      states[review.id] = {
        isHelpful: userMarkedHelpful ? true : userMarkedUnhelpful ? false : null,
        helpfulCount: review.helpfulCount || 0,
        unhelpfulCount: review.unhelpfulCount || 0
      }
    })
    setHelpfulStates(states)
  }, [reviewItems, currentUser])

  const handleHelpfulClick = async (reviewId: string, helpful: boolean) => {
    if (!currentUser) {
      toast.error('Please log in to rate reviews')
      return
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          helpful
        })
      })

      if (response.ok) {
        const data = await response.json()
        setHelpfulStates(prev => ({
          ...prev,
          [reviewId]: {
            isHelpful: helpful,
            helpfulCount: data.helpfulCount,
            unhelpfulCount: data.unhelpfulCount
          }
        }))
        toast.success(data.message)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to rate review')
      }
    } catch (error) {
      console.error('Error rating review:', error)
      toast.error('Failed to rate review')
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getAuthorName = (author: ReviewItem['author']): string => {
    if (typeof author === 'string') return 'Anonymous'
    return author?.name || 'Anonymous'
  }

  const getAuthorImage = (author: ReviewItem['author']): string => {
    if (typeof author === 'string') return '/placeholder.svg'
    return author?.profileImage?.url || '/placeholder.svg'
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Write Review Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Reviews ({reviewItems.length})
        </h3>
        <Button
          onClick={onWriteReview}
          className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Write Review
        </Button>
      </div>

      {reviewItems.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 mb-6">Be the first to share your experience!</p>
          <Button
            onClick={onWriteReview}
            className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white"
          >
            Write the First Review
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {reviewItems.map((review) => {
            const helpfulState = helpfulStates[review.id]
            return (
              <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                {/* Review Header */}
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={getAuthorImage(review.author)}
                      alt={getAuthorName(review.author)}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {getAuthorName(review.author)}
                      </h4>
                      {review.visitDate && (
                        <span className="text-xs text-gray-500">
                          • Visited {formatDate(review.visitDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating 
                                ? "text-[#ffe66d] fill-current" 
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <div className="space-y-3">
                  {review.title && (
                    <h5 className="font-medium text-gray-900">{review.title}</h5>
                  )}
                  <p className="text-gray-700 leading-relaxed">{review.content}</p>

                  {/* Pros and Cons */}
                  {(review.pros?.length || review.cons?.length) && (
                    <div className="grid grid-cols-1 gap-3 mt-4">
                      {review.pros && review.pros.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <h6 className="font-medium text-green-800 mb-2 flex items-center">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Pros
                          </h6>
                          <ul className="space-y-1">
                            {review.pros.map((pro, index) => (
                              <li key={index} className="text-sm text-green-700 flex items-start">
                                <span className="text-green-500 mr-2">+</span>
                                {pro.pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {review.cons && review.cons.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <h6 className="font-medium text-red-800 mb-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Cons
                          </h6>
                          <ul className="space-y-1">
                            {review.cons.map((con, index) => (
                              <li key={index} className="text-sm text-red-700 flex items-start">
                                <span className="text-red-500 mr-2">-</span>
                                {con.con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tips */}
                  {review.tips && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h6 className="font-medium text-blue-800 mb-2 flex items-center">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Insider Tip
                      </h6>
                      <p className="text-sm text-blue-700">{review.tips}</p>
                    </div>
                  )}
                </div>

                {/* Review Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleHelpfulClick(review.id, true)}
                      className={`flex items-center space-x-1 text-sm transition-colors ${
                        helpfulState?.isHelpful === true
                          ? 'text-green-600 font-medium'
                          : 'text-gray-500 hover:text-green-600'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>Helpful ({helpfulState?.helpfulCount || 0})</span>
                    </button>
                    <button
                      onClick={() => handleHelpfulClick(review.id, false)}
                      className={`flex items-center space-x-1 text-sm transition-colors ${
                        helpfulState?.isHelpful === false
                          ? 'text-red-600 font-medium'
                          : 'text-gray-500 hover:text-red-600'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 rotate-180" />
                      <span>Not helpful ({helpfulState?.unhelpfulCount || 0})</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Write Review Modal Component
function WriteReviewModal({
  isOpen,
  onClose,
  location,
  currentUser,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  location: Location | null
  currentUser: User | null
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 5,
    visitDate: new Date().toISOString().split('T')[0],
    pros: [''],
    cons: [''],
    tips: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        title: '',
        content: '',
        rating: 5,
        visitDate: new Date().toISOString().split('T')[0],
        pros: [''],
        cons: [''],
        tips: ''
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser || !location) {
      toast.error('You must be logged in to write a review')
      return
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in the title and review content')
      return
    }

    setIsSubmitting(true)
    try {
      const reviewData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        rating: formData.rating,
        locationId: location.id,
        authorId: currentUser.id,
        visitDate: formData.visitDate,
        pros: formData.pros.filter(p => p.trim()).map(p => p.trim()),
        cons: formData.cons.filter(c => c.trim()).map(c => c.trim()),
        tips: formData.tips.trim()
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reviewData)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Review submitted successfully!')
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit review')
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateProsOrCons = (type: 'pros' | 'cons', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => i === index ? value : item)
    }))
  }

  const addProsOrCons = (type: 'pros' | 'cons') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }))
  }

  const removeProsOrCons = (type: 'pros' | 'cons', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }))
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-start justify-center p-4 overflow-y-auto"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 my-8 max-h-[90vh] overflow-y-auto border border-gray-200 write-review-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[#ff6b6b]" />
                    <h2 className="text-xl font-semibold text-gray-900">Write a Review</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 text-gray-600 rounded-full h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {location && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-6">
                    <p className="text-sm text-gray-600">
                      Writing review for <span className="font-medium text-gray-900">{location.name}</span>
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Rating */}
                  <div>
                    <Label className="text-gray-700 font-medium mb-3 block">
                      Overall Rating
                    </Label>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, rating: i + 1 }))}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-8 w-8 transition-colors ${
                              i < formData.rating
                                ? "text-[#ffe66d] fill-current"
                                : "text-gray-300 hover:text-[#ffe66d]"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">
                        ({formData.rating} star{formData.rating !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>

                  {/* Visit Date */}
                  <div>
                    <Label htmlFor="visitDate" className="text-gray-700 font-medium mb-2 block">
                      Visit Date
                    </Label>
                    <Input
                      type="date"
                      id="visitDate"
                      value={formData.visitDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
                      className="w-full"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="text-gray-700 font-medium mb-2 block">
                      Review Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Summarize your experience..."
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <Label htmlFor="content" className="text-gray-700 font-medium mb-2 block">
                      Your Review <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Share your detailed experience..."
                      rows={4}
                      className="w-full resize-none"
                      required
                    />
                  </div>

                  {/* Pros */}
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">
                      What did you like? (Optional)
                    </Label>
                    {formData.pros.map((pro, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <Input
                          type="text"
                          value={pro}
                          onChange={(e) => updateProsOrCons('pros', index, e.target.value)}
                          placeholder="Something you enjoyed..."
                          className="flex-1"
                        />
                        {formData.pros.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProsOrCons('pros', index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addProsOrCons('pros')}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Pro
                    </Button>
                  </div>

                  {/* Cons */}
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">
                      What could be improved? (Optional)
                    </Label>
                    {formData.cons.map((con, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <Input
                          type="text"
                          value={con}
                          onChange={(e) => updateProsOrCons('cons', index, e.target.value)}
                          placeholder="Something that could be better..."
                          className="flex-1"
                        />
                        {formData.cons.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProsOrCons('cons', index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addProsOrCons('cons')}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Con
                    </Button>
                  </div>

                  {/* Tips */}
                  <div>
                    <Label htmlFor="tips" className="text-gray-700 font-medium mb-2 block">
                      Insider Tips (Optional)
                    </Label>
                    <Textarea
                      id="tips"
                      value={formData.tips}
                      onChange={(e) => setFormData(prev => ({ ...prev, tips: e.target.value }))}
                      placeholder="Any tips for future visitors..."
                      rows={2}
                      className="w-full resize-none"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function EventsTab({ locationName }: { locationName: string }) {
  return (
    <div className="text-center py-8 p-4 bg-muted/20 rounded-lg">
      <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Events at {locationName}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
        No upcoming events listed. Check back soon!
      </p>
    </div>
  )
}

function AddToBucketListModal({
  isOpen,
  onClose,
  location,
  userBucketLists,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  location: Location | null
  userBucketLists: BucketList[]
  onSuccess: () => void
}) {
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [goal, setGoal] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isAdding, setIsAdding] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedListId('')
      setGoal('')
      setPriority('medium')
      setIsAdding(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Bucket list form submission started (mobile)')
    console.log('Selected list ID (mobile):', selectedListId)
    console.log('Location (mobile):', location)
    console.log('Goal (mobile):', goal)
    console.log('Priority (mobile):', priority)
    console.log('Available bucket lists (mobile):', userBucketLists)
    
    if (!selectedListId || !location) {
      toast.error('Please select a bucket list')
      return
    }

    setIsAdding(true)
    try {
      const requestBody = {
        location: location.id,
        goal: goal.trim() || `Visit ${location.name}`,
        priority,
        status: 'not_started'
      }
      
      console.log('Sending request to (mobile):', `/api/bucket-lists/${selectedListId}/items`)
      console.log('Request body (mobile):', requestBody)
      
      const response = await fetch(`/api/bucket-lists/${selectedListId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      console.log('Response status (mobile):', response.status)
      const data = await response.json()
      console.log('Response data (mobile):', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add to bucket list')
      }

      toast.success(`Added "${location.name}" to your bucket list!`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding to bucket list (mobile):', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add to bucket list')
    } finally {
      setIsAdding(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Responsive Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4"
            onClick={onClose}
            style={{ zIndex: 100000 }}
          >
            {/* Responsive Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-[#4ecdc4]/20 bucket-list-modal"
              style={{ zIndex: 100001 }}
              onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking inside modal
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[#ff6b6b]">
                    <Crown className="h-5 w-5 text-[#ffe66d]" />
                    <h2 className="text-lg font-semibold">Add to Bucket List</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 text-gray-600 rounded-full h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {location && (
                  <p className="text-sm text-gray-600 mb-6">
                    Adding "{location.name}" to your bucket list
                  </p>
                )}

                {userBucketLists.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="h-16 w-16 mx-auto text-[#ff6b6b]/50 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bucket Lists Yet</h3>
                    <p className="text-gray-600 mb-6">Create your first bucket list to start collecting amazing places!</p>
                    <Button
                      onClick={() => {
                        onClose()
                        window.open('/bucket-list', '_blank')
                      }}
                      className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Bucket List
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Bucket List Selection */}
                    <div>
                      <Label htmlFor="bucket-list" className="text-gray-700 font-medium mb-2 block">
                        Choose Bucket List ({userBucketLists.length} available)
                      </Label>
                      <Select value={selectedListId} onValueChange={setSelectedListId}>
                        <SelectTrigger className="w-full border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20 h-12 rounded-xl">
                          <SelectValue placeholder="Select a bucket list..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 z-[100002]" style={{ zIndex: 100002 }}>
                          {userBucketLists.map((list) => (
                            <SelectItem key={list.id} value={list.id} className="py-3">
                              <div className="flex items-center gap-3 w-full">
                                <Target className="h-4 w-4 text-[#4ecdc4] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{list.name}</div>
                                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                    <span>{list.stats.completedItems}/{list.stats.totalItems} completed</span>
                                    {list.type && (
                                      <>
                                        <span>•</span>
                                        <span className="capitalize">{list.type}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-[#4ecdc4] font-medium">
                                  {Math.round((list.stats.completedItems / list.stats.totalItems) * 100) || 0}%
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Goal Input */}
                    <div>
                      <Label htmlFor="goal" className="text-gray-700 font-medium mb-2 block">
                        Personal Goal (Optional)
                      </Label>
                      <Textarea
                        id="goal"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder={`e.g., Try their famous burger, Visit during sunset, Take photos with friends`}
                        rows={3}
                        className="w-full border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20 rounded-xl resize-none"
                      />
                    </div>

                    {/* Priority Selection */}
                    <div>
                      <Label htmlFor="priority" className="text-gray-700 font-medium mb-2 block">
                        Priority Level
                      </Label>
                      <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                        <SelectTrigger className="w-full border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20 h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100002]" style={{ zIndex: 100002 }}>
                          <SelectItem value="low" className="py-3">
                            <span className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-green-400"></div>
                              <div>
                                <div className="font-medium">Low Priority</div>
                                <div className="text-xs text-gray-500">Visit when convenient</div>
                              </div>
                            </span>
                          </SelectItem>
                          <SelectItem value="medium" className="py-3">
                            <span className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-[#ffe66d]"></div>
                              <div>
                                <div className="font-medium">Medium Priority</div>
                                <div className="text-xs text-gray-500">Plan to visit soon</div>
                              </div>
                            </span>
                          </SelectItem>
                          <SelectItem value="high" className="py-3">
                            <span className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div>
                              <div>
                                <div className="font-medium">High Priority</div>
                                <div className="text-xs text-gray-500">Must visit ASAP!</div>
                              </div>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose} 
                        disabled={isAdding}
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 h-12 rounded-xl font-medium"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isAdding || !selectedListId}
                        className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-12 rounded-xl font-medium"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add to List
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default function LocationDetailMobile({ location, isOpen, onClose }: LocationDetailMobileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userBucketLists, setUserBucketLists] = useState<BucketList[]>([])
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false)
  const [isLoadingBucketLists, setIsLoadingBucketLists] = useState(false)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [isWriteReviewModalOpen, setIsWriteReviewModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isIOS, setIsIOS] = useState(false)

  // Wait for component to mount before rendering portal
  useEffect(() => {
    setMounted(true)
    setIsIOS(Capacitor.getPlatform() === 'ios')
    
    if (Capacitor.getPlatform() === 'ios') {
      logIOSEvent('location_detail_mobile_mount', { 
        locationId: location?.id,
        locationName: location?.name 
      })
    }
    
    return () => {
      setMounted(false)
      if (Capacitor.getPlatform() === 'ios') {
        logIOSEvent('location_detail_mobile_unmount', { 
          locationId: location?.id 
        })
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen && location && mounted) {
      setError(null) // Clear any previous errors
      
      if (isIOS) {
        trackIOSModal('opening', { 
          locationId: location.id,
          locationName: location.name,
          modalType: 'location_detail'
        })
      }
      
      fetchCurrentUser()
      fetchReviews()
    }
  }, [isOpen, location, mounted, isIOS])

  useEffect(() => {
    if (user) {
      fetchUserBucketLists()
    }
  }, [user])

  // Handle cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (isIOS) {
        trackIOSModal('closing', { 
          locationId: location?.id,
          modalType: 'location_detail'
        })
      }
      
      setError(null)
      setIsBucketModalOpen(false)
      setIsWriteReviewModalOpen(false)
    }
  }, [isOpen, isIOS, location?.id])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
      // Don't set error state for user fetch failure as it's optional
    }
  }

  const fetchUserBucketLists = async () => {
    if (!user) return
    
    setIsLoadingBucketLists(true)
    try {
      const response = await fetch(`/api/bucket-lists?userId=${user.id}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUserBucketLists(data.bucketLists || [])
      } else {
        console.error('Failed to fetch bucket lists:', response.status)
      }
    } catch (error) {
      console.error('Error fetching bucket lists:', error)
      // Don't set error state as bucket lists are not critical for viewing location details
    } finally {
      setIsLoadingBucketLists(false)
    }
  }

  const fetchReviews = async () => {
    if (!location) return
    
    setIsLoadingReviews(true)
    try {
      const response = await fetch(`/api/reviews?locationId=${location.id}&limit=10&page=1`)
      if (response.ok) {
        const data = await response.json()
        setReviewItems(data.reviews || [])
      } else {
        console.error('Failed to fetch reviews:', response.status)
        // Set empty reviews array instead of error to allow modal to still display
        setReviewItems([])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      setReviewItems([]) // Set empty array instead of error
    } finally {
      setIsLoadingReviews(false)
    }
  }

  const shareLocation = () => {
    if (!location) return
    
    if (navigator.share) {
      navigator.share({
        title: location.name,
        text: location.shortDescription || location.description || `Check out ${location.name}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const handleWriteReview = () => {
    if (!user) {
      toast.error('Please log in to write a review')
      return
    }
    setIsWriteReviewModalOpen(true)
  }

  const handleAddToBucketList = () => {
    if (!user) {
      toast.error('Please log in to add to bucket list')
      return
    }
    
    if (isLoadingBucketLists) {
      toast.info('Loading your bucket lists...')
      return
    }
    
    setIsBucketModalOpen(true)
  }

  const handleInteraction = async (interactionType: string) => {
    if (!user || !location) {
      toast.error('Please log in to interact with locations')
      return
    }

    try {
      const response = await fetch(`/api/locations/${location.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: interactionType }),
      })

      if (response.ok) {
        const message = interactionType === 'like' ? 'Location liked!' : 'Location saved!'
        toast.success(message)
      } else {
        toast.error('Failed to update interaction')
      }
    } catch (error) {
      console.error('Error handling interaction:', error)
      toast.error('Failed to update interaction')
    }
  }

  // Don't render if not mounted (prevents SSR issues)
  if (!mounted) return null
  
  // Don't render if no location
  if (!location) return null

  // Handle errors gracefully
  if (error) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 top-0 bg-white z-[9999] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h1 className="text-lg font-bold text-gray-900">Error</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-gray-100 text-gray-600 rounded-full h-10 w-10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <Button onClick={onClose} className="bg-[#ff6b6b] text-white">
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )
  }

  const getImageUrl = (loc: Location): string => {
    try {
      if (typeof loc.featuredImage === 'string') {
        return loc.featuredImage
      } else if (loc.featuredImage?.url) {
        return loc.featuredImage.url
      } else if (loc.imageUrl) {
        return loc.imageUrl
      }
      return '/placeholder.svg'
    } catch (error) {
      console.warn('Error getting image URL:', error)
      return '/placeholder.svg'
    }
  }

  let galleryImages: string[] = []
  try {
    galleryImages = location.gallery?.map(g => 
      typeof g.image === 'string' ? g.image : g.image?.url || ''
    ).filter(Boolean) || [getImageUrl(location)]

    if (location.featuredImage) {
      const featuredUrl = typeof location.featuredImage === 'string' 
        ? location.featuredImage 
        : location.featuredImage.url
      if (featuredUrl && !galleryImages.includes(featuredUrl)) {
        galleryImages.unshift(featuredUrl)
      }
    }
  } catch (error) {
    console.warn('Error processing gallery images:', error)
    galleryImages = ['/placeholder.svg']
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          data-modal="true" 
          data-modal-type="location-detail"
          className={isIOS ? 'ios-modal-container' : ''}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] modal-backdrop"
            onClick={(e) => {
              if (isIOS) {
                logIOSEvent('modal_backdrop_click', { locationId: location.id })
              }
              onClose()
            }}
          />

          {/* Enhanced Mobile Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-0 bg-gradient-to-b from-[#fdecd7] to-white z-[9999] overflow-hidden flex flex-col"
          >
            {/* Enhanced Header with Gradient */}
            <div className="relative">
              {/* Header Background with Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b6b]/10 via-[#4ecdc4]/10 to-[#ffe66d]/10"></div>
              
              <div className="relative flex items-center justify-between p-4 border-b border-[#4ecdc4]/20 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge
                    variant="outline"
                    className="text-white border-0 px-3 py-1 text-xs font-medium shadow-sm"
                    style={{ backgroundColor: getCategoryColor(location.categories?.[0]) }}
                  >
                    {getCategoryName(location.categories?.[0])}
                  </Badge>
                  <h1 className="text-lg font-bold text-gray-900 truncate">{location.name}</h1>
                  {location.isVerified && (
                    <span className="text-xs bg-[#4ecdc4]/20 text-[#4ecdc4] px-2 py-1 rounded-full font-medium flex-shrink-0">
                      ✓ Verified
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={shareLocation}
                    className="hover:bg-[#4ecdc4]/10 text-[#4ecdc4] rounded-full h-10 w-10"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 text-gray-600 rounded-full h-10 w-10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Enhanced Content Area */}
            <div className="flex-1 overflow-y-auto">
              {/* Enhanced Image Gallery */}
              {galleryImages.length > 0 && (
                <div className="relative h-64 sm:h-80">
                  <ImageGallery 
                    galleryImages={galleryImages} 
                    locationName={location.name} 
                  />
                  
                  {/* Floating Action Buttons on Image */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleInteraction('like')}
                      className="bg-white/90 hover:bg-white backdrop-blur-sm text-red-500 rounded-full h-10 w-10 shadow-lg"
                    >
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleInteraction('save')}
                      className="bg-white/90 hover:bg-white backdrop-blur-sm text-blue-500 rounded-full h-10 w-10 shadow-lg"
                    >
                      <Bookmark className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Quick Stats Overlay */}
                  {location.averageRating && (
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-semibold">{location.averageRating.toFixed(1)}</span>
                        {location.reviewCount && (
                          <span className="text-sm opacity-90">({location.reviewCount})</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Location Info */}
              <div className="p-4 space-y-6">
                <LocationInfo location={location} />

                {/* Enhanced Action Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => {
                      const address = typeof location.address === 'string' 
                        ? location.address 
                        : Object.values(location.address || {}).filter(Boolean).join(', ')
                      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                      window.open(mapsUrl, '_blank')
                    }}
                    variant="outline"
                    className="h-12 rounded-xl border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/10 font-medium"
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    <span className="text-sm">Directions</span>
                  </Button>
                  <Button
                    onClick={handleWriteReview}
                    variant="outline"
                    className="h-12 rounded-xl border-[#ff6b6b]/30 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 font-medium"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="text-sm">Review</span>
                  </Button>
                  <Button
                    onClick={handleAddToBucketList}
                    disabled={isLoadingBucketLists}
                    className="h-12 rounded-xl bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isLoadingBucketLists ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-sm">Add to List</span>
                  </Button>
                </div>

                {/* Enhanced Tabs */}
                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
                    <TabsTrigger 
                      value="about" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm"
                    >
                      About
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reviews" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm"
                    >
                      Reviews ({reviewItems.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="events" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm"
                    >
                      Events
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-6">
                    <TabsContent value="about" className="space-y-4">
                      {location.description && (
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="text-[#4ecdc4]">📍</span>
                            Description
                          </h3>
                          <p className="text-gray-700 leading-relaxed">{location.description}</p>
                        </div>
                      )}

                      {location.insiderTips && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Insider Tips
                          </h3>
                          <p className="text-amber-800 leading-relaxed">{location.insiderTips}</p>
                        </div>
                      )}

                      {location.businessHours && location.businessHours.length > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-[#4ecdc4]" />
                            Hours
                          </h3>
                          <div className="space-y-2">
                            {location.businessHours.map((hours, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-700">{hours.day}</span>
                                <span className={hours.closed ? 'text-red-500' : 'text-gray-600'}>
                                  {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="reviews" className="p-0">
                      <ReviewsTab 
                        location={location}
                        reviewItems={reviewItems}
                        isLoading={isLoadingReviews}
                        onWriteReview={handleWriteReview}
                        onRefreshReviews={fetchReviews}
                        currentUser={user}
                      />
                    </TabsContent>

                    <TabsContent value="events" className="space-y-4">
                      <EventsTab locationName={location.name} />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </motion.div>

          {/* Write Review Modal */}
          <WriteReviewModal
            isOpen={isWriteReviewModalOpen}
            onClose={() => setIsWriteReviewModalOpen(false)}
            location={location}
            currentUser={user}
            onSuccess={() => {
              fetchReviews()
              setIsWriteReviewModalOpen(false)
            }}
          />

          {/* Add to Bucket List Modal */}
          <AddToBucketListModal
            isOpen={isBucketModalOpen}
            onClose={() => setIsBucketModalOpen(false)}
            location={location}
            userBucketLists={userBucketLists}
            onSuccess={() => {
              fetchUserBucketLists()
              setIsBucketModalOpen(false)
            }}
          />
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Helper icon (if not already imported or available globally)
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
) 
