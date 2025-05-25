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

interface LocationDetailMobileProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
}

// Separate component for image gallery with improved mobile UX
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
  
  const handlePrevious = () => {
    const newIndex = localIndex === 0 ? images.length - 1 : localIndex - 1
    setLocalIndex(newIndex)
    onIndexChange?.(newIndex)
  }
  
  const handleNext = () => {
    const newIndex = localIndex === images.length - 1 ? 0 : localIndex + 1
    setLocalIndex(newIndex)
    onIndexChange?.(newIndex)
  }

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
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

  return (
    <div 
      className="relative h-64 w-full bg-gray-100"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Image
        src={images[localIndex] || "/placeholder.svg"}
        alt={`${locationName} - Photo ${localIndex + 1}`}
        fill
        className="object-cover"
        priority
      />
      
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 rounded-full h-10 w-10 backdrop-blur-sm"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 rounded-full h-10 w-10 backdrop-blur-sm"
            onClick={handleNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          {/* Dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setLocalIndex(index)
                  onIndexChange?.(index)
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === localIndex ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
          
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
            {localIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  )
}

// Enhanced location info component with better mobile layout
function LocationInfo({ location }: { location: Location }) {
  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  const formatWebsite = (website: string) => {
    return website.replace(/^https?:\/\/(www\.)?/, "")
  }

  return (
    <div className="space-y-4">
      {/* Address */}
      {location.address && (
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <MapPin className="h-5 w-5 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              {typeof location.address === "string"
                ? location.address
                : Object.values(location.address).filter(Boolean).join(", ")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-9 text-sm border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10 w-full sm:w-auto"
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
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-3">
        {location.contactInfo?.phone && (
          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <Phone className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <a
              href={`tel:${location.contactInfo.phone}`}
              className="text-sm text-gray-700 hover:text-[#FF6B6B] font-medium"
            >
              {formatPhone(location.contactInfo.phone)}
            </a>
          </div>
        )}

        {location.contactInfo?.website && (
          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <Globe className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <a
              href={location.contactInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 hover:text-[#FF6B6B] font-medium flex items-center"
            >
              {formatWebsite(location.contactInfo.website)}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        )}
      </div>

      {/* Business Hours */}
      {location.businessHours && location.businessHours.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-gray-500" />
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
        </div>
      )}

      {/* Price Range */}
      {location.priceRange && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <DollarSign className="h-5 w-5 text-gray-500" />
          <div>
            <span className="text-sm font-medium text-gray-900 capitalize">
              {location.priceRange}
            </span>
            <p className="text-xs text-gray-500">Price range</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced reviews tab with better mobile layout
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
          <div key={i} className="p-4 border rounded-lg animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Write Review Button */}
      <Button
        onClick={onWriteReview}
        className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 h-12"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Write a Review
      </Button>

      <Separator />

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 mb-4">Be the first to share your experience!</p>
          <Button
            onClick={onWriteReview}
            variant="outline"
            className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
          >
            Write First Review
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#FF6B6B]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#FF6B6B] font-semibold text-sm">
                      {review.author?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {review.author?.name || 'Anonymous'}
                      </h4>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < (review.rating || 0)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {review.title && (
                  <h5 className="font-medium text-gray-900 mb-2 text-sm">
                    {review.title}
                  </h5>
                )}
                
                <p className="text-sm text-gray-700 leading-relaxed">
                  {review.content}
                </p>

                {/* Review actions */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500">
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    Helpful
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
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
        toast.success("Link copied to clipboard!")
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
    // TODO: Implement review form in a separate sheet
    toast.info("Review form coming soon!")
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
        className="h-[95vh] max-h-[95vh] p-0 rounded-t-3xl border-0 shadow-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{location?.name || 'Location Details'}</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full bg-white">
          {/* Header with image */}
          <div className="relative flex-shrink-0">
            <ImageGallery
              images={images}
              locationName={location.name}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
            />
            
            {/* Header overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 rounded-full border-0"
              >
                <X className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={shareLocation}
                className="h-10 w-10 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 rounded-full border-0"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Gradient overlay for better text readability */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Title and basic info */}
            <div className="flex-shrink-0 p-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                    {location.name}
                  </h1>
                  
                  {location.averageRating && (
                    <div className="flex items-center mb-2">
                      <div className="flex items-center mr-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < Math.floor(location.averageRating || 0)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-700 mr-1">
                        {location.averageRating.toFixed(1)}
                      </span>
                      {location.reviewCount && (
                        <span className="text-sm text-gray-500">
                          ({location.reviewCount} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {categoryName && (
                    <Badge
                      variant="outline"
                      className="mb-3 text-xs"
                      style={{
                        backgroundColor: `${categoryColor}10`,
                        color: categoryColor,
                        borderColor: `${categoryColor}30`,
                      }}
                    >
                      {categoryName}
                    </Badge>
                  )}
                </div>
              </div>

              {location.shortDescription && (
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  {location.shortDescription}
                </p>
              )}

              {/* Location Interactions */}
              <LocationInteractions 
                location={location as any}
                currentUserId={currentUser?.id}
                className="w-full"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="flex-shrink-0 px-4 pt-4">
                <TabsList className="w-full grid grid-cols-3 h-12">
                  <TabsTrigger 
                    value="info" 
                    className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white text-sm"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white text-sm"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Reviews
                  </TabsTrigger>
                  <TabsTrigger 
                    value="specials" 
                    className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white text-sm"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Deals
                  </TabsTrigger>
                </TabsList>
              </div>
                <div className="flex-1 min-h-0">
                  <TabsContent value="info" className="mt-0 h-full">
                    <ScrollArea className="h-full">
                      <div className="p-4 pb-24">
                        <LocationInfo location={location} />
                        
                        {location.description && (
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-semibold mb-3 text-gray-900">About</h3>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {location.description}
                            </p>
                          </div>
                        )}

                        {/* Accessibility info */}
                        {location.accessibility && (
                          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold mb-3 text-gray-900">Accessibility</h3>
                            <div className="space-y-2 text-sm">
                              {location.accessibility.wheelchairAccess && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  <span>Wheelchair accessible</span>
                                </div>
                              )}
                              {location.accessibility.parking && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  <span>Parking available</span>
                                </div>
                              )}
                              {location.accessibility.other && (
                                <p className="text-gray-600">{location.accessibility.other}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0 h-full">
                    <ScrollArea className="h-full">
                      <div className="p-4 pb-24">
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
                      <div className="p-4 pb-24">
                        <div className="text-center py-16">
                          <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No current deals</h3>
                          <p className="text-gray-500 mb-6">Check back later for special offers and promotions</p>
                          <Button variant="outline" className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10">
                            <Heart className="h-4 w-4 mr-2" />
                            Save to get notified
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
            </Tabs>
          </div>

          {/* Fixed Bottom Action Bar */}
          <div className="flex-shrink-0 p-4 border-t bg-white safe-area-bottom">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10 h-12"
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
                <Navigation className="h-4 w-4 mr-2" />
                Directions
              </Button>
              <Button
                className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 h-12"
                onClick={shareLocation}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 