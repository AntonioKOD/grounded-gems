"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Location, Media as ImportedMedia } from "./map-data"
import { getCategoryColor, getCategoryName } from "./category-utils"
import { createLocationShareUrl } from "@/lib/location-sharing"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// Define User interface
interface User {
  id: string;
  name?: string;
  // Add other user fields as needed
}

// Define ReviewItem interface locally if not available from map-data
interface ReviewItem {
  id: string;
  author?: { name?: string; avatar?: string } | string;
  rating: number;
  title?: string;
  content: string;
  createdAt: string | Date;
  photos?: Array<{ url: string; caption?: string }>;
  pros?: Array<{ pro: string }>;
  cons?: Array<{ con: string }>;
}

// Use ImportedMedia directly
type Media = ImportedMedia

interface LocationDetailMobileProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
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
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({})
  const touchStartX = React.useRef(0)
  const touchEndX = React.useRef(0)

  useEffect(() => {
    setLocalIndex(currentIndex)
  }, [currentIndex])

  useEffect(() => {
    if (galleryImages.length > 0) {
      setImageLoading({ 0: true })
    }
  }, [galleryImages])

  const handleSwipe = () => {
    const threshold = 50
    if (touchStartX.current - touchEndX.current > threshold) {
      // Left swipe - next image
      if (localIndex < galleryImages.length - 1) {
        const newIndex = localIndex + 1
        setLocalIndex(newIndex)
        onIndexChange(newIndex)
      }
    } else if (touchEndX.current - touchStartX.current > threshold) {
      // Right swipe - previous image
      if (localIndex > 0) {
        const newIndex = localIndex - 1
        setLocalIndex(newIndex)
        onIndexChange(newIndex)
      }
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

  const handleImageLoad = (index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }))
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
              onLoad={() => handleImageLoad(localIndex)}
              onError={() => handleImageLoad(localIndex)}
            />
            
            {/* Loading state */}
            {imageLoading[localIndex] && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-3 border-muted-foreground/50 border-t-primary rounded-full"
                />
              </div>
            )}
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
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  const formatWebsite = (website: string) => {
    return website.replace(/^https?:\/\/(www\.)?/, "")
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
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              ✓ Verified
            </span>
          )}
          {location.isFeatured && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
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
                      ? "text-yellow-400 fill-current"
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
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-primary text-sm">💡</span>
              <div>
                <p className="text-sm font-medium text-primary mb-1">Insider Tip</p>
                <p className="text-sm text-muted-foreground">{location.insiderTips}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button 
          variant="outline" 
          onClick={handleDirections} 
          className="flex-col h-auto py-3 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/50"
          disabled={!location.address}
        >
          <Navigation className="h-4 w-4 mb-1" />
          <span className="text-xs">Directions</span>
        </Button>
        <Button 
          variant="outline" 
          onClick={handleCall} 
          disabled={!location.contactInfo?.phone}  
          className="flex-col h-auto py-3 disabled:opacity-50 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/50"
        >
          <Phone className="h-4 w-4 mb-1" />
          <span className="text-xs">Call</span>
        </Button>
        <Button 
          variant="outline" 
          onClick={handleWebsite} 
          disabled={!location.contactInfo?.website} 
          className="flex-col h-auto py-3 disabled:opacity-50 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/50"
        >
          <Globe className="h-4 w-4 mb-1" />
          <span className="text-xs">Website</span>
        </Button>
      </div>

      {/* Contact & Details Info */}
      <div className="space-y-4">
        {/* Address */}
        {location.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">{location.contactInfo.phone}</span>
          </div>
        )}

        {location.contactInfo?.website && (
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={location.contactInfo.website.startsWith("http") ? location.contactInfo.website : `https://${location.contactInfo.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
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
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  ♿ Wheelchair Accessible
                </span>
              )}
              {location.accessibility.parking && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
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
                <span key={index} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
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

// Enhanced reviews tab with better mobile UX
function ReviewsTab({ 
  reviewItems,
  isLoading, 
  onWriteReview 
}: { 
  reviewItems: ReviewItem[]
  isLoading: boolean
  onWriteReview: () => void
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (reviewItems.length === 0) {
    return (
      <div className="text-center py-8 p-4 bg-muted/20 rounded-lg">
        <MessageCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No reviews yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          Be the first to share your experience!
        </p>
        <Button onClick={onWriteReview} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <ThumbsUp className="h-4 w-4 mr-2" />
          Write the first review
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Reviews ({reviewItems.length})
        </h3>
        <Button onClick={onWriteReview} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <ThumbsUp className="h-4 w-4 mr-2" />
          Write Review
        </Button>
      </div>
      
      <div className="space-y-4">
        {reviewItems.map((review) => (
          <div key={review.id} className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {typeof review.author === 'string' ? review.author : review.author?.name || 'Anonymous'}
                  </p>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < review.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <time className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString()}
              </time>
            </div>
            
            {review.title && (
              <h4 className="font-medium text-foreground mb-2">{review.title}</h4>
            )}
            
            <p className="text-sm text-muted-foreground mb-3">{review.content}</p>
            
            {/* Pros and Cons */}
            {(review.pros?.length || review.cons?.length) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {review.pros && review.pros.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-green-700 mb-1">Pros</h5>
                    <ul className="space-y-1">
                      {review.pros.map((pro, index) => (
                        <li key={index} className="text-xs text-green-600 flex items-center gap-1">
                          <span className="text-green-500">+</span>
                          {pro.pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {review.cons && review.cons.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-red-700 mb-1">Cons</h5>
                    <ul className="space-y-1">
                      {review.cons.map((con, index) => (
                        <li key={index} className="text-xs text-red-600 flex items-center gap-1">
                          <span className="text-red-500">-</span>
                          {con.con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
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

export default function LocationDetailMobile({ location, isOpen, onClose }: LocationDetailMobileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [currentImageGalleryIndex, setCurrentImageGalleryIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [isReviewsLoading, setIsReviewsLoading] = useState(false)

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/users/me", {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        console.log("No authenticated user")
        setUser(null)
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
      setUser(null)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchCurrentUser()
    }
  }, [isOpen])

  useEffect(() => {
    if (location && isOpen) {
      fetchReviews()
    }
  }, [location, isOpen])

  const fetchReviews = async () => {
    if (!location) return

    setIsReviewsLoading(true)
    try {
      const response = await fetch(`/api/locations/${location.id}/reviews`, {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setReviewItems(data.reviews || [])
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setIsReviewsLoading(false)
    }
  }

  const shareLocation = () => {
    if (!location) return

    if (navigator.share) {
      navigator.share({
        title: location.name,
        text: location.shortDescription || location.description || `Check out ${location.name}`,
        url: createLocationShareUrl(location.id),
      })
    } else {
      navigator.clipboard.writeText(createLocationShareUrl(location.id))
    }
  }

  const handleWriteReview = () => {
    // TODO: Navigate to review writing page
    console.log("Write review for location:", location?.id)
  }

  const handleInteraction = async (interactionType: string) => {
    if (!location || !user) return

    try {
      const response = await fetch(`/api/locations/interactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          locationId: location.id,
          userId: user.id,
          interactionType,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Interaction result:", result)
      }
    } catch (error) {
      console.error("Error recording interaction:", error)
    }
  }

  const imagesMemo = useMemo(() => {
    if (!location) return []

    const images: string[] = []

    // Add featured image
    if (location.featuredImage) {
      if (typeof location.featuredImage === "string") {
        images.push(location.featuredImage)
      } else if (location.featuredImage.url) {
        images.push(location.featuredImage.url)
      }
    }

    // Add gallery images
    if (location.gallery && Array.isArray(location.gallery)) {
      location.gallery.forEach((item: { image: Media; caption?: string }) => {
        if (item.image && item.image.url) {
          images.push(item.image.url)
        }
      })
    }

    // Fallback
    if (images.length === 0) {
      images.push("/placeholder.svg")
    }

    return images
  }, [location])

  if (!location) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-full max-h-screen w-full p-0 bg-background border-0 rounded-none sm:rounded-t-xl sm:h-[85vh] sm:max-w-md sm:border">
        <DialogTitle className="sr-only">{location.name} Details</DialogTitle>
        <div className="flex flex-col h-full">
          {/* Header with smaller image */}
          <div className="relative">
            <ImageGallery 
              galleryImages={imagesMemo} 
              locationName={location.name} 
              currentIndex={currentImageGalleryIndex} 
              onIndexChange={setCurrentImageGalleryIndex} 
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white z-10"
            >
              <X className="h-5 w-5" />
            </Button>
            
            {/* Action buttons overlay */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleInteraction('save')}
                className="bg-black/20 hover:bg-black/40 text-white"
                aria-label="Save location"
              >
                <Heart className="h-5 w-5" /> 
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={shareLocation}
                className="bg-black/20 hover:bg-black/40 text-white"
                aria-label="Share location"
              >
                <ExternalLink className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content with improved scrolling */}
          <ScrollArea className="flex-1 max-h-[calc(100vh-16rem)] sm:max-h-[calc(85vh-16rem)]">
            <div className="space-y-4">
              {/* Location Info */}
              <LocationInfo location={location} />

              <Separator />

              {/* Tabs */}
              <Tabs defaultValue="reviews" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mx-4">
                  <TabsTrigger value="reviews" className="text-xs">Reviews</TabsTrigger>
                  <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
                  <TabsTrigger value="info" className="text-xs">More Info</TabsTrigger>
                </TabsList>
                <TabsContent value="reviews" className="px-4 pb-4">
                  <ReviewsTab
                    reviewItems={reviewItems}
                    isLoading={isReviewsLoading}
                    onWriteReview={handleWriteReview}
                  />
                </TabsContent>
                <TabsContent value="events" className="px-4 pb-4">
                  <EventsTab locationName={location.name} />
                </TabsContent>
                <TabsContent value="info" className="px-4 pb-4">
                  <div className="text-center py-8 p-4 bg-muted/20 rounded-lg">
                    <Info className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Additional Information</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                      More details about {location.name} coming soon!
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
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