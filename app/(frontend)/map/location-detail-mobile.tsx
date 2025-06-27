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
  Camera,
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
import type { Location } from "./map-data"
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
import { PhotoSubmissionModal } from "@/components/location/photo-submission-modal"
import { UserPhotosSection } from "@/components/location/user-photos-section"
import StructuredInsiderTips from "@/components/location/structured-insider-tips"
import SubmitInsiderTipModal from "@/components/location/submit-insider-tip-modal"
import type { 
  User, 
  ReviewItem, 
  BucketList, 
  LocationDetailMobileProps,
  WriteReviewModalProps,
  AddToBucketListModalProps,
  Media
} from "./location-detail-types"
import {
  formatAddress,
  formatPriceRange,
  formatPhone,
  formatWebsite,
  formatDate,
  getBusinessStatus,
  getLocationImageUrl,
  getAuthorName,
  getAuthorImage,
  handleDirections,
  handleCall,
  handleWebsite,
  handleLikeLocation,
  handleSaveLocation,
  handleReviewHelpful,
  fetchCurrentUser,
  fetchUserBucketLists,
  fetchLocationReviews,
  processGalleryImages
} from "./location-detail-utils"

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
function LocationInfo({ 
  location, 
  onWriteReview, 
  onAddToBucketList,
  onAddPhoto,
  isLoadingBucketLists 
}: { 
  location: Location
  onWriteReview: () => void
  onAddToBucketList: () => void
  onAddPhoto: () => void
  isLoadingBucketLists: boolean
}) {
  // Using shared utility functions for formatting

  const handleDirectionsClick = () => handleDirections(location)
  const handleCallClick = () => {
    if (location.contactInfo?.phone) {
      handleCall(location.contactInfo.phone)
    }
  }
  const handleWebsiteClick = () => {
    if (location.contactInfo?.website) {
      handleWebsite(location.contactInfo.website)
    }
  }

  const businessStatus = getBusinessStatus(location.businessHours)
  const categoryColor = getCategoryColor(location.categories)
  const categoryName = getCategoryName(location.categories)

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
      <div className="space-y-4">
        {/* Title and Category - Moved category to be more subtle */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{location.name}</h1>
              {/* Only show category if it's not "Uncategorized" */}
              {categoryName && categoryName.toLowerCase() !== 'uncategorized' && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <span className="text-sm font-medium text-gray-600">
                    {categoryName}
                  </span>
                </div>
              )}
            </div>
            
            {/* Only show meaningful badges */}
            <div className="flex flex-col gap-2 ml-4">
              {location.isFeatured && (
                <span className="text-xs bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 px-3 py-1.5 rounded-full font-medium border border-amber-200 shadow-sm">
                  ⭐ Featured
                </span>
              )}
            </div>
          </div>

          {/* Enhanced Rating Section */}
          {location.averageRating && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(location.averageRating || 0)
                        ? "text-amber-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {location.averageRating.toFixed(1)}
              </span>
              {location.reviewCount && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm font-medium text-gray-600">
                    {location.reviewCount} {location.reviewCount === 1 ? 'review' : 'reviews'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Enhanced Price Range */}
          {location.priceRange && (
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Price Range:</span>
                <span className="text-base font-bold text-gray-900">{formatPriceRange(location.priceRange)}</span>
              </div>
            </div>
          )}

          {/* Enhanced Description with Better Typography */}
          {(location.shortDescription || location.description) && (
            <div className="prose prose-sm max-w-none">
              <p className="text-base text-gray-700 leading-relaxed font-medium">
                {location.shortDescription || location.description}
              </p>
            </div>
          )}


        </div>
      </div>

      {/* Enhanced Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          onClick={handleDirectionsClick}
          variant="outline"
          className="h-14 rounded-xl border-2 border-teal-200 text-teal-600 hover:bg-teal-50 hover:border-teal-300 font-semibold transition-all duration-200"
        >
          <Navigation className="h-5 w-5 mr-2" />
          <span className="text-sm">Directions</span>
        </Button>
        <Button
          onClick={onWriteReview}
          variant="outline"
          className="h-14 rounded-xl border-2 border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300 font-semibold transition-all duration-200"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          <span className="text-sm">Review</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={onAddToBucketList}
          disabled={isLoadingBucketLists}
          className="h-14 rounded-xl bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0"
        >
          {isLoadingBucketLists ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Crown className="h-5 w-5 mr-2" />
          )}
          <span className="text-sm">Add to List</span>
        </Button>
        <Button
          onClick={onAddPhoto}
          variant="outline"
          className="h-14 rounded-xl border-2 border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 font-semibold transition-all duration-200"
        >
          <Camera className="h-5 w-5 mr-2" />
          <span className="text-sm">Add Photo</span>
        </Button>
      </div>

      {/* Enhanced Contact & Details Info */}
      <div className="space-y-5">
        {/* Enhanced Address Section */}
        {location.address && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <MapPin className="h-5 w-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-gray-900 mb-2">Location</h4>
                <p className="text-base text-gray-700 font-medium leading-relaxed">{formatAddress(location.address)}</p>
                {location.neighborhood && (
                  <p className="text-sm text-gray-500 mt-2 font-medium">
                    <span className="font-semibold">Neighborhood:</span> {location.neighborhood}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Business Hours */}
        {location.businessHours && location.businessHours.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-base font-bold text-gray-900">Hours</h4>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${businessStatus.color === 'text-green-600' ? 'bg-green-100 text-green-700' : businessStatus.color === 'text-red-600' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                    {businessStatus.status}
                  </span>
                </div>
                <div className="space-y-2">
                  {location.businessHours.map((hours, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700 capitalize">{hours.day}</span>
                      <span className="text-sm font-medium text-gray-600">
                        {hours.closed ? "Closed" : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Contact Info */}
        {(location.contactInfo?.phone || location.contactInfo?.website) && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h4 className="text-base font-bold text-gray-900 mb-3">Contact Information</h4>
            <div className="space-y-3">
              {location.contactInfo?.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <a 
                    href={`tel:${location.contactInfo.phone}`}
                    className="text-base font-medium text-gray-900 hover:text-green-600 transition-colors"
                  >
                    {location.contactInfo.phone}
                  </a>
                </div>
              )}

              {location.contactInfo?.website && (
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <a
                    href={location.contactInfo.website.startsWith("http") ? location.contactInfo.website : `https://${location.contactInfo.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    {location.contactInfo.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Accessibility Features */}
        {location.accessibility && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h4 className="text-base font-bold text-gray-900 mb-3">Accessibility</h4>
            <div className="flex flex-wrap gap-2">
              {location.accessibility.wheelchairAccess && (
                <span className="inline-flex items-center gap-2 text-sm bg-teal-50 text-teal-700 px-3 py-2 rounded-lg font-medium border border-teal-200">
                  <span>♿</span>
                  Wheelchair Accessible
                </span>
              )}
              {location.accessibility.parking && (
                <span className="inline-flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-medium border border-blue-200">
                  <span>🅿️</span>
                  Parking Available
                </span>
              )}
              {location.accessibility.other && (
                <span className="text-sm bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium border border-gray-200">
                  {location.accessibility.other}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Best Time to Visit */}
        {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h4 className="text-base font-bold text-gray-900 mb-3">Best Time to Visit</h4>
            <div className="flex flex-wrap gap-2">
              {location.bestTimeToVisit.map((time, index) => (
                <span key={index} className="text-sm bg-amber-50 text-amber-700 px-3 py-2 rounded-lg font-medium border border-amber-200">
                  {time.season}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Tags */}
        {location.tags && location.tags.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <h4 className="text-base font-bold text-gray-900 mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {location.tags.map((tag, index) => (
                <span key={index} className="text-sm bg-gray-50 text-gray-600 px-3 py-2 rounded-lg font-medium border border-gray-200">
                  #{tag.tag}
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

    const result = await handleReviewHelpful(reviewId, helpful, currentUser.id)
    if (result.success && result.data) {
      setHelpfulStates(prev => ({
        ...prev,
        [reviewId]: {
          isHelpful: helpful,
          helpfulCount: result.data.helpfulCount,
          unhelpfulCount: result.data.unhelpfulCount
        }
      }))
      toast.success(result.data.message)
    } else {
      toast.error(result.message || 'Failed to rate review')
    }
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
}: WriteReviewModalProps) {
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

// Community Photos Tab Component
function CommunityPhotosTab({ 
  locationId, 
  locationName,
  onAddPhoto 
}: { 
  locationId: string
  locationName: string
  onAddPhoto: () => void
}) {
  const [photos, setPhotos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadCommunityPhotos = async (page: number = 1) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/locations/${locationId}/community-photos?page=${page}&limit=12`)
      
      if (!response.ok) {
        throw new Error('Failed to load community photos')
      }
      
      const data = await response.json()
      
      if (page === 1) {
        setPhotos(data.photos)
      } else {
        setPhotos(prev => [...prev, ...data.photos])
      }
      
      setHasMore(data.pagination.page < data.pagination.totalPages)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error loading community photos:', err)
      setError(err instanceof Error ? err.message : 'Failed to load photos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCommunityPhotos(1)
  }, [locationId])

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadCommunityPhotos(currentPage + 1)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading && photos.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Community Photos</h3>
          <Button
            onClick={onAddPhoto}
            className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Camera className="h-4 w-4 mr-2" />
            Add Photo
          </Button>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && photos.length === 0) {
    return (
      <div className="text-center py-8 p-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Photos</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => loadCommunityPhotos(1)} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Community Photos</h3>
          <p className="text-sm text-gray-600">{photos.length} photos shared by the community</p>
        </div>
        <Button
          onClick={onAddPhoto}
          className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Camera className="h-4 w-4 mr-2" />
          Add Photo
        </Button>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No community photos yet</h3>
          <p className="text-gray-500 mb-6">Be the first to share a photo of this location!</p>
          <Button
            onClick={onAddPhoto}
            className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white"
          >
            Share the First Photo
          </Button>
        </div>
      ) : (
        <>
          {/* Photo Grid */}
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={photo.photoUrl}
                    alt={photo.caption || 'Community photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                
                {/* Photo Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-lg">
                  {photo.caption && (
                    <p className="text-white text-sm font-medium truncate mb-1">
                      {photo.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>{photo.submittedBy.name}</span>
                    <span>{formatDate(photo.submittedAt)}</span>
                  </div>
                </div>

                {/* Featured Badge */}
                {photo.featured && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    ⭐ Featured
                  </div>
                )}

                {/* Quality Score */}
                {photo.qualityScore && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                    {photo.qualityScore}/100
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                onClick={loadMore}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Photos'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AddToBucketListModal({
  isOpen,
  onClose,
  location,
  userBucketLists,
  onSuccess,
}: AddToBucketListModalProps) {
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
                        try {
                          if (typeof window !== 'undefined') {
                            const newWindow = window.open('/bucket-list', '_blank')
                            if (!newWindow) {
                              // Fallback to same window if popup blocked
                              window.location.href = '/bucket-list'
                            }
                          }
                        } catch (error) {
                          console.error('Error navigating to bucket list:', error)
                          toast.error('Unable to open bucket list page')
                        }
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
  const [isPhotoSubmissionModalOpen, setIsPhotoSubmissionModalOpen] = useState(false)
  const [isSubmitTipModalOpen, setIsSubmitTipModalOpen] = useState(false)
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
      
      loadCurrentUser()
      loadReviews()
    }
  }, [isOpen, location, mounted, isIOS])

  useEffect(() => {
    if (user) {
      loadUserBucketLists()
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
      setIsSubmitTipModalOpen(false)
    }
  }, [isOpen, isIOS, location?.id])

  const loadCurrentUser = async () => {
    const user = await fetchCurrentUser()
    if (user) {
      setUser(user)
    }
  }

  const loadUserBucketLists = async () => {
    if (!user) return
    
    setIsLoadingBucketLists(true)
    const bucketLists = await fetchUserBucketLists(user.id)
    setUserBucketLists(bucketLists)
    setIsLoadingBucketLists(false)
  }

  const loadReviews = async () => {
    if (!location) return
    
    setIsLoadingReviews(true)
    const reviews = await fetchLocationReviews(location.id, 10, 1)
    setReviewItems(reviews)
    setIsLoadingReviews(false)
  }

  const shareLocation = async () => {
    if (!location) return
    
    try {
      const shareUrl = createLocationShareUrl(location.id, location.name, location.slug)
      
      if (navigator.share) {
        await navigator.share({
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing location:', error)
        toast.error('Failed to share location')
      }
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

  const handleAddPhoto = () => {
    if (!user) {
      toast.error('Please log in to add photos')
      return
    }
    
    setIsPhotoSubmissionModalOpen(true)
  }

  const handleAddTip = () => {
    if (!user) {
      toast.error('Please log in to share insider tips')
      return
    }
    
    setIsSubmitTipModalOpen(true)
  }

  const handleTipSubmissionSuccess = () => {
    toast.success("Your tip has been submitted and will appear after review!")
    // Could trigger a refresh of tips here if needed
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

  // Using shared utility function for image URL

  const galleryImages = processGalleryImages(location)

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
              <div className="p-6 space-y-6">
                <LocationInfo 
                  location={location} 
                  onWriteReview={handleWriteReview}
                  onAddToBucketList={handleAddToBucketList}
                  onAddPhoto={handleAddPhoto}
                  isLoadingBucketLists={isLoadingBucketLists}
                />

                {/* Action buttons are already included in LocationInfo component - no duplicate needed */}

                {/* Enhanced Tabs */}
                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 bg-gray-100 rounded-xl p-1">
                    <TabsTrigger 
                      value="about" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm text-xs"
                    >
                      About
                    </TabsTrigger>
                    <TabsTrigger 
                      value="photos" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm text-xs"
                    >
                      Photos
                    </TabsTrigger>
                    <TabsTrigger 
                      value="community" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm text-xs"
                    >
                      Community
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reviews" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm text-xs"
                    >
                      Reviews ({reviewItems.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="events" 
                      className="rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:text-[#ff6b6b] data-[state=active]:shadow-sm text-xs"
                    >
                      Events
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-6">
                    <TabsContent value="about" className="space-y-5">
                      {location.description && (
                        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                              <span className="text-teal-600 text-lg">📍</span>
                            </div>
                            About This Place
                          </h3>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-base text-gray-700 leading-relaxed font-medium">{location.description}</p>
                          </div>
                        </div>
                      )}

                    <TabsContent value="photos" className="p-0">
                      <UserPhotosSection 
                        locationId={location.id} 
                        locationName={location.name}
                      />
                    </TabsContent>

                    <TabsContent value="community" className="p-0">
                      <CommunityPhotosTab 
                        locationId={location.id} 
                        locationName={location.name}
                        onAddPhoto={handleAddPhoto}
                      />
                    </TabsContent>

                      {location.insiderTips && (
                        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                          <StructuredInsiderTips
                            tips={location.insiderTips}
                            locationName={location.name}
                            locationId={location.id}
                            showAddTip={true}
                            onAddTip={handleAddTip}
                            currentUser={user}
                            compact={true}
                          />
                        </div>
                      )}

                      {/* Enhanced Contact Information */}
                      {(location.contactInfo?.email || location.contactInfo?.socialMedia) && (
                        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Globe className="h-5 w-5 text-blue-600" />
                            </div>
                            Contact & Social Media
                          </h3>
                          <div className="space-y-4">
                            {location.contactInfo?.email && (
                              <div className="flex items-center gap-4">
                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">@</span>
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-gray-700 block">Email</span>
                                  <a 
                                    href={`mailto:${location.contactInfo.email}`}
                                    className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                  >
                                    {location.contactInfo.email}
                                  </a>
                                </div>
                              </div>
                            )}
                            
                            {location.contactInfo?.socialMedia && (
                              <div>
                                <div className="grid grid-cols-1 gap-3">
                                  {location.contactInfo.socialMedia.instagram && (
                                    <a 
                                      href={location.contactInfo.socialMedia.instagram.startsWith('http') 
                                        ? location.contactInfo.socialMedia.instagram 
                                        : `https://instagram.com/${location.contactInfo.socialMedia.instagram}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-pink-200 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                          </svg>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-900 text-sm">Instagram</div>
                                          <div className="text-xs text-gray-500">@{location.contactInfo.socialMedia.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}</div>
                                        </div>
                                      </div>
                                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-pink-500 transition-colors duration-200" />
                                    </a>
                                  )}
                                  
                                  {location.contactInfo.socialMedia.facebook && (
                                    <a 
                                      href={location.contactInfo.socialMedia.facebook.startsWith('http') 
                                        ? location.contactInfo.socialMedia.facebook 
                                        : `https://facebook.com/${location.contactInfo.socialMedia.facebook}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                          </svg>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-900 text-sm">Facebook</div>
                                          <div className="text-xs text-gray-500">Follow us on Facebook</div>
                                        </div>
                                      </div>
                                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                                    </a>
                                  )}
                                  
                                  {location.contactInfo.socialMedia.twitter && (
                                    <a 
                                      href={location.contactInfo.socialMedia.twitter.startsWith('http') 
                                        ? location.contactInfo.socialMedia.twitter 
                                        : `https://twitter.com/${location.contactInfo.socialMedia.twitter}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-sm">
                                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                          </svg>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-900 text-sm">X (Twitter)</div>
                                          <div className="text-xs text-gray-500">@{location.contactInfo.socialMedia.twitter.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, '').replace(/\/$/, '')}</div>
                                        </div>
                                      </div>
                                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                                    </a>
                                  )}
                                  
                                  {location.contactInfo.socialMedia.linkedin && (
                                    <a 
                                      href={location.contactInfo.socialMedia.linkedin.startsWith('http') 
                                        ? location.contactInfo.socialMedia.linkedin 
                                        : `https://linkedin.com/company/${location.contactInfo.socialMedia.linkedin}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                          </svg>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-900 text-sm">LinkedIn</div>
                                          <div className="text-xs text-gray-500">Professional network</div>
                                        </div>
                                      </div>
                                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-700 transition-colors duration-200" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Enhanced Partnership Info */}
                      {location.hasBusinessPartnership && location.partnershipDetails && (
                        <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-xl p-5 border border-green-200 shadow-sm">
                          <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Crown className="h-5 w-5 text-green-600" />
                            </div>
                            Verified Business Partner
                          </h3>
                          <div className="space-y-2">
                            {location.partnershipDetails.partnerName && (
                              <div>
                                <span className="text-sm font-semibold text-green-800">Partner Name</span>
                                <p className="text-base font-medium text-green-800">{location.partnershipDetails.partnerName}</p>
                              </div>
                            )}
                            {location.partnershipDetails.details && (
                              <div>
                                <span className="text-sm font-semibold text-green-800">Partnership Details</span>
                                <div className="prose prose-sm max-w-none">
                                  <p className="text-base text-green-700 font-medium leading-relaxed">{location.partnershipDetails.details}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Enhanced Neighborhood Info */}
                      {location.neighborhood && (
                        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <MapPin className="h-5 w-5 text-purple-600" />
                            </div>
                            Neighborhood
                          </h3>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-base text-gray-700 font-medium leading-relaxed">{location.neighborhood}</p>
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
                        onRefreshReviews={loadReviews}
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
              loadReviews()
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
              loadUserBucketLists()
              setIsBucketModalOpen(false)
            }}
          />

          {/* Photo Submission Modal */}
          <PhotoSubmissionModal
            isOpen={isPhotoSubmissionModalOpen}
            onClose={() => {
              console.log('🔴 MOBILE: Closing photo submission modal')
              setIsPhotoSubmissionModalOpen(false)
            }}
            location={location ? {
              id: location.id,
              name: location.name
            } : null}
            user={user ? {
              id: user.id,
              name: user.name || '',
              avatar: user.avatar
            } : null}
            onSuccess={() => {
              console.log('🔴 MOBILE: Photo submission successful')
              setIsPhotoSubmissionModalOpen(false)
              toast.success('Photo submitted for review!')
            }}
          />

          {/* Submit Insider Tip Modal */}
          <SubmitInsiderTipModal
            isOpen={isSubmitTipModalOpen}
            onClose={() => setIsSubmitTipModalOpen(false)}
            locationId={location.id}
            locationName={location.name}
            onSuccess={handleTipSubmissionSuccess}
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
