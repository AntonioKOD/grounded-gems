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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Image from "next/image"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
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

// Separate component for image gallery
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

  return (
    <div className="relative h-64 w-full">
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
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 rounded-full h-10 w-10"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 rounded-full h-10 w-10"
            onClick={handleNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {localIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  )
}

// Separate component for location info
function LocationInfo({ location }: { location: Location }) {
  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-4 space-y-4">
        {/* Address */}
        {location.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                {typeof location.address === "string"
                  ? location.address
                  : Object.values(location.address).filter(Boolean).join(", ")}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-8 text-xs border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                onClick={() => {
                  const address = typeof location.address === "string"
                    ? location.address
                    : Object.values(location.address ?? {}).filter(Boolean).join(", ")
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                  window.open(mapsUrl, "_blank")
                }}
              >
                <Navigation className="h-3 w-3 mr-1" />
                Get Directions
              </Button>
            </div>
          </div>
        )}

        {/* Contact Info */}
        {location.contactInfo?.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <a
              href={`tel:${location.contactInfo.phone}`}
              className="text-sm text-gray-700 hover:text-[#FF6B6B]"
            >
              {formatPhone(location.contactInfo.phone)}
            </a>
          </div>
        )}

        {location.contactInfo?.website && (
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <a
              href={location.contactInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 hover:text-[#FF6B6B] flex items-center"
            >
              {location.contactInfo.website.replace(/^https?:\/\/(www\.)?/, "")}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        )}

        {/* Business Hours */}
        {location.businessHours && location.businessHours.length > 0 && (
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-2">Hours</p>
              <div className="space-y-1">
                {location.businessHours.slice(0, 3).map((hour, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-500">{hour.day}</span>
                    <span className="text-gray-700">{hour.open || "Closed"}</span>
                  </div>
                ))}
                {location.businessHours.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{location.businessHours.length - 3} more days
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Separate component for reviews
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
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Star className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
        <p className="text-gray-500 mb-6">Be the first to share your experience</p>
        <Button onClick={onWriteReview} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          Write a Review
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Reviews ({reviews.length})</h3>
        <Button size="sm" onClick={onWriteReview}>
          Write Review
        </Button>
      </div>

      {reviews.map((review) => (
        <Card key={review.id} className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {review.author?.avatar ? (
                  <Image
                    src={review.author.avatar.url}
                    alt={review.author.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-[#FF6B6B]/10 text-[#FF6B6B] font-medium">
                    {review.author?.name ? review.author.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">{review.author?.name || "Anonymous"}</p>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, starIdx) => (
                      <Star
                        key={starIdx}
                        className={cn(
                          "h-4 w-4",
                          starIdx < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                </p>
              </div>
            </div>

            <h4 className="font-medium text-sm mb-2">{review.title}</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>

            {review.pros?.length > 0 && (
              <div className="mt-3 bg-green-50 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-green-800 mb-2">Pros</h5>
                <ul className="space-y-1">
                  {review.pros.map((pro: any, idx: number) => (
                    <li key={idx} className="text-xs text-green-700 flex items-start">
                      <ThumbsUp className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{pro.pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Main mobile location detail component
export default function LocationDetailMobile({ location, isOpen, onClose }: LocationDetailMobileProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState("info")
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [specials, setSpecials] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Get images
  const images = useMemo(() => {
    if (!location) return ["/placeholder.svg"]

    const imageList = [
      ...(location.featuredImage
        ? [typeof location.featuredImage === "string" ? location.featuredImage : location.featuredImage.url]
        : []),
      ...(location.imageUrl ? [location.imageUrl] : []),
      ...(location.gallery || []).map((img) => (typeof img === "string" ? img : img.image.url)),
    ].filter(Boolean) as string[]

    return imageList.length > 0 ? imageList : ["/placeholder.svg"]
  }, [location])

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me")
        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data.user)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }
    fetchCurrentUser()
  }, [])

  // Fetch reviews when tab is active
  useEffect(() => {
    const fetchReviews = async () => {
      if (!location?.id || activeTab !== "reviews") return
      
      setIsLoadingReviews(true)
      try {
        const result = await getReviewsbyId(location.id)
        setReviews(result.docs || [])
      } catch (error) {
        console.error("Error fetching reviews:", error)
        setReviews([])
      } finally {
        setIsLoadingReviews(false)
      }
    }

    fetchReviews()
  }, [location?.id, activeTab])

  // Share location
  const shareLocation = useCallback(() => {
    if (!location) return

    const shareUrl = createLocationShareUrl(location.id)
    const title = `Check out ${location.name}`
    const description = location.shortDescription || location.description || `I found this place called ${location.name}!`

    if (navigator.share) {
      navigator.share({
        title,
        text: description,
        url: shareUrl,
      }).then(() => {
        toast.success("Shared successfully")
      }).catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err)
        }
      })
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Link copied to clipboard")
      }).catch(() => {
        toast.error("Could not copy link")
      })
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
        className="h-[90vh] max-h-[90vh] p-0 rounded-t-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{location?.name || 'Location Details'}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          {/* Header with image */}
          <div className="relative">
            <ImageGallery
              images={images}
              locationName={location.name}
              currentIndex={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
            />
            
            {/* Header overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="bg-black/20 backdrop-blur-sm rounded-full p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="bg-black/20 backdrop-blur-sm rounded-full p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={shareLocation}
                  className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Title and basic info */}
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold text-gray-900 mb-2">{location.name}</h1>
              
              {location.averageRating && (
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="text-sm font-medium text-gray-700 mr-1">
                    {location.averageRating.toFixed(1)}
                  </span>
                  {location.reviewCount && (
                    <span className="text-sm text-gray-500">({location.reviewCount} reviews)</span>
                  )}
                </div>
              )}

              {categoryName && (
                <Badge
                  variant="outline"
                  className="mb-3"
                  style={{
                    backgroundColor: `${categoryColor}10`,
                    color: categoryColor,
                    borderColor: `${categoryColor}30`,
                  }}
                >
                  {categoryName}
                </Badge>
              )}

              {location.shortDescription && (
                <p className="text-sm text-gray-600 mb-3">{location.shortDescription}</p>
              )}

              {/* Location Interactions */}
              <LocationInteractions 
                location={location as any}
                currentUserId={currentUser?.id}
                className="w-full"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full grid grid-cols-3 mx-4 mt-4">
                <TabsTrigger value="info" className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white">
                  <Info className="h-4 w-4 mr-2" />
                  Info
                </TabsTrigger>
                <TabsTrigger value="reviews" className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white">
                  <Star className="h-4 w-4 mr-2" />
                  Reviews
                </TabsTrigger>
                <TabsTrigger value="specials" className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Deals
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0">
                <TabsContent value="info" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <LocationInfo location={location} />
                    
                    {location.description && (
                      <div className="p-4">
                        <h3 className="font-medium mb-2">About</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{location.description}</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="reviews" className="mt-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="p-4">
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
                    <div className="p-4">
                      <div className="text-center py-12">
                        <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No current deals</h3>
                        <p className="text-gray-500">Check back later for special offers</p>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Bottom action bar */}
          <div className="p-4 border-t bg-white">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
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
                className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
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