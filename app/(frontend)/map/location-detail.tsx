/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Heart,
  ExternalLink,
  Calendar,
  Info,
  Navigation,
  LinkIcon,
  Copy,
  Send,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Trash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Location } from "./map-data"
import { getCategoryColor } from "./category-utils"
import { createLocationShareUrl } from "@/lib/location-sharing"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

// First, add the imports at the top of the file
import { getReviewsbyId, createReview } from "@/app/actions"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"

interface LocationDetailProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
  isMobile?: boolean
}

// Review interface based on Payload CMS schema
interface ReviewPhoto {
  photo: string | File
  caption?: string
}

interface CategoryRating {
  category: string
  rating: number
}

interface ReviewPro {
  pro: string
}

interface ReviewCon {
  con: string
}

interface ReviewCategory {
  category: string
}

interface Review {
  title: string
  content: string
  rating: number
  reviewType: "location" | "event" | "special"
  location?: string
  event?: string
  special?: string
  photos?: ReviewPhoto[]
  visitDate?: Date
  pros?: ReviewPro[]
  cons?: ReviewCon[]
  tips?: string
  categories?: ReviewCategory[]
  categoryRatings?: CategoryRating[]
  recommendationLevel?: "none" | "maybe" | "yes" | "strong"
  author?: string
  isVerifiedVisit?: boolean
  status?: "pending" | "published" | "rejected" | "reported"
}

export default function LocationDetail({ location, isOpen, onClose, isMobile = false }: LocationDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullGallery, setShowFullGallery] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<"info" | "photos" | "reviews">("info")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)
  const detailRef = useRef<HTMLDivElement>(null)

  // Inside the LocationDetail component, add these state variables near the other state declarations:
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Review form state
  const [review, setReview] = useState<Review>({
    title: "",
    content: "",
    rating: 0,
    reviewType: "location",
    pros: [{ pro: "" }],
    cons: [{ con: "" }],
    categories: [],
    categoryRatings: [],
    recommendationLevel: "maybe",
    isVerifiedVisit: false,
  })

  // Add this useEffect to fetch the current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          credentials: "include",
        })
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

  // Process images using useMemo to avoid conditional hook calls
  const images = useMemo(() => {
    if (!location) return ["/placeholder.svg?key=5nd76"]

    const imageList = [
      ...(location.featuredImage
        ? [typeof location.featuredImage === "string" ? location.featuredImage : location.featuredImage.url]
        : []),
      ...(location.imageUrl ? [location.imageUrl] : []),
      ...(location.gallery || []).map((img) => (typeof img === "string" ? img : img.image.url)),
    ].filter(Boolean) as string[]

    // If no images, add a placeholder
    if (imageList.length === 0) {
      imageList.push("/placeholder.svg?key=5nd76")
    }

    return imageList
  }, [location])

  // Get primary category and color using useMemo
  const { primaryCategory, primaryColor } = useMemo(() => {
    if (!location) {
      return { primaryCategory: null, primaryColor: null }
    }
    const category = location.categories && location.categories.length > 0 ? location.categories[0] : null
    const color = getCategoryColor(category)
    return { primaryCategory: category, primaryColor: color }
  }, [location])

  // Generate shareable URL
  const getShareableUrl = useCallback(() => {
    if (!location) return window.location.href
    return createLocationShareUrl(location.id)
  }, [location])

  // Update browser URL when showing location details
  useEffect(() => {
    if (isOpen && location) {
      const url = new URL(window.location.href)
      url.searchParams.set("locationId", location.id)

      // Update URL without reloading the page
      window.history.pushState({}, "", url.toString())

      // Restore original URL when dialog closes
      return () => {
        const originalUrl = new URL(window.location.href)
        originalUrl.searchParams.delete("locationId")
        window.history.pushState({}, "", originalUrl.toString())
      }
    }
  }, [isOpen, location])

  // Scroll to top when location changes
  useEffect(() => {
    if (location && detailRef.current) {
      detailRef.current.scrollTop = 0
      setCurrentImageIndex(0)
      setActiveTab("info")
      setShowReviewForm(false)
      resetReviewForm()
    }
  }, [location?.id, location])

  // Reset review form
  const resetReviewForm = useCallback(() => {
    setReview({
      title: "",
      content: "",
      rating: 0,
      reviewType: "location",
      pros: [{ pro: "" }],
      cons: [{ con: "" }],
      categories: [],
      categoryRatings: [],
      recommendationLevel: "maybe",
      isVerifiedVisit: false,
    })
  }, [])

  // Navigate to previous image
  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  // Navigate to next image
  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // Toggle favorite status
  const toggleFavorite = useCallback(() => {
    setIsFavorite((prev) => !prev)
  }, [])

  // Format phone number
  const formatPhone = useCallback((phone: string) => {
    // Simple formatting, in a real app you'd use a library for international numbers
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }, [])

  // Share the location with enhanced functionality and Sonner toast
  const shareLocation = useCallback(() => {
    if (!location) return

    // Create a rich description that includes key details about the location
    const title = `Check out ${location.name} on Local Explorer`
    const description = location.description
      ? `${location.description.substring(0, 100)}${location.description.length > 100 ? "..." : ""}`
      : `I found this interesting place called ${location.name}!`

    const shareUrl = getShareableUrl()

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    // Use Web Share API for mobile devices
    if (navigator.share) {
      navigator
        .share({
          title,
          text: description,
          url: shareUrl,
        })
        .then(() => {
          // Show success toast
          toast.success("Shared successfully", {
            description: "The location has been shared",
          })
        })
        .catch((err) => {
          // Only show error for actual errors, not user cancellations
          if (err.name !== "AbortError") {
            console.error("Error sharing:", err)
            toast.error("Sharing failed", {
              description: "Could not share this location",
            })
          }
        })
    } else {
      // For desktop browsers, copy to clipboard with better feedback
      try {
        // Create a temporary element to hold the rich text
        const shareText = `${title}\n\n${description}\n\nView it here: ${shareUrl}`

        navigator.clipboard
          .writeText(shareText)
          .then(() => {
            toast.success("Link copied!", {
              description: "Location link copied to clipboard",
              action: {
                label: "View",
                onClick: () => window.open(shareUrl, "_blank"),
              },
            })
          })
          .catch((err) => {
            console.error("Clipboard error:", err)
            toast.error("Copy failed", {
              description: "Could not copy to clipboard. Try again or use another sharing method.",
            })
          })
      } catch (err) {
        console.error("Share error:", err)
        toast.error("Sharing failed", {
          description: "Could not share this location",
        })
      }
    }
  }, [location, getShareableUrl])

  // Copy link to clipboard with enhanced feedback
  const copyLink = useCallback(() => {
    if (!location) return

    const shareUrl = getShareableUrl()

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success("Link copied!", {
          description: "Location link copied to clipboard",
          action: {
            label: "View",
            onClick: () => window.open(shareUrl, "_blank"),
          },
        })
      })
      .catch((err) => {
        console.error("Error copying to clipboard:", err)
        toast.error("Copy failed", {
          description: "Could not copy link to clipboard",
        })
      })
  }, [location, getShareableUrl])

  // Add a pro
  const addPro = useCallback(() => {
    setReview((prev) => ({
      ...prev,
      pros: [...(prev.pros || []), { pro: "" }],
    }))
  }, [])

  // Remove a pro
  const removePro = useCallback((index: number) => {
    setReview((prev) => ({
      ...prev,
      pros: prev.pros?.filter((_, i) => i !== index),
    }))
  }, [])

  // Update a pro
  const updatePro = useCallback((index: number, value: string) => {
    setReview((prev) => ({
      ...prev,
      pros: prev.pros?.map((item, i) => (i === index ? { pro: value } : item)),
    }))
  }, [])

  // Add a con
  const addCon = useCallback(() => {
    setReview((prev) => ({
      ...prev,
      cons: [...(prev.cons || []), { con: "" }],
    }))
  }, [])

  // Remove a con
  const removeCon = useCallback((index: number) => {
    setReview((prev) => ({
      ...prev,
      cons: prev.cons?.filter((_, i) => i !== index),
    }))
  }, [])

  // Update a con
  const updateCon = useCallback((index: number, value: string) => {
    setReview((prev) => ({
      ...prev,
      cons: prev.cons?.map((item, i) => (i === index ? { con: value } : item)),
    }))
  }, [])

  // Add this useEffect to fetch reviews when the location changes
  useEffect(() => {
    const fetchReviews = async () => {
      if (!location) return

      setIsLoadingReviews(true)
      try {
        const result = await getReviewsbyId(location.id)
        setReviews(result.docs || [])
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setIsLoadingReviews(false)
      }
    }

    if (location && activeTab === "reviews") {
      fetchReviews()
    }
  }, [location, activeTab])

  // Replace the handleSubmitReview function with this implementation:
  const handleSubmitReview = useCallback(async () => {
    if (!location) return
    if (review.rating === 0) {
      toast("Rating required", {
        description: "You must select a star rating to submit a review",
      })
      return
    }

    if (!review.title.trim()) {
      toast("Title required", {
        description: "Please provide a title for your review",
      })
      return
    }

    if (review.content.trim().length < 10) {
      toast("Content too short", {
        description: "Please write a more detailed review (at least 10 characters)",
      })
      return
    }

    setIsSubmittingReview(true)

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    try {
      // Create FormData for the review submission
      const formData = new FormData()

      // Add basic fields
      formData.append("title", review.title)
      formData.append("content", review.content)
      formData.append("rating", review.rating.toString())
      formData.append("reviewType", "location")
      formData.append("location", location.id)

      // Add optional fields
      if (review.tips) formData.append("tips", review.tips)
      if (review.recommendationLevel) formData.append("recommendationLevel", review.recommendationLevel)
      if (review.isVerifiedVisit) formData.append("isVerifiedVisit", "true")
      if (review.visitDate) formData.append("visitDate", review.visitDate.toISOString())

      // Add arrays as JSON strings
      if (review.pros && review.pros.length > 0) {
        const filteredPros = review.pros.filter((item) => item.pro.trim() !== "")
        formData.append("pros", JSON.stringify(filteredPros))
      }

      if (review.cons && review.cons.length > 0) {
        const filteredCons = review.cons.filter((item) => item.con.trim() !== "")
        formData.append("cons", JSON.stringify(filteredCons))
      }

      if (review.categories && review.categories.length > 0) {
        formData.append("categories", JSON.stringify(review.categories))
      }

      if (review.categoryRatings && review.categoryRatings.length > 0) {
        formData.append("categoryRatings", JSON.stringify(review.categoryRatings))
      }

      // Add author if user is logged in
      if (currentUser && currentUser.id) {
        formData.append("author", currentUser.id)
      }

      // Submit the review
      const result = await createReview(formData)

      toast.success("Review submitted!", {
        description: "Thank you for sharing your experience. Your review is pending approval.",
      })

      // Reset form and close it
      resetReviewForm()
      setShowReviewForm(false)

      // Refresh the reviews
      const updatedReviews = await getReviewsbyId(location.id)
      setReviews(updatedReviews.docs || [])
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Submission failed", {
        description: "Could not submit your review. Please try again.",
      })
    } finally {
      setIsSubmittingReview(false)
    }
  }, [location, review, resetReviewForm, currentUser])

  // If no location is provided, render nothing in the dialog
  if (!location) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] overflow-hidden">
          <DialogHeader className="px-4 py-2 flex flex-row items-center justify-between border-b">
            <DialogTitle className="text-lg font-medium truncate">Location Details</DialogTitle>
            {/* Close button handled by the main DialogClose component */}
          </DialogHeader>
          <div className="p-8 text-center text-gray-500">
            <p>No location selected</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const dialogContent = (
    <div
      ref={detailRef}
      className="flex flex-col max-h-[80vh] overflow-y-auto"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#E5E7EB transparent" }}
    >
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full border-b">
        <TabsList className="w-full justify-start h-11 bg-transparent p-0 px-4">
          <TabsTrigger
            value="info"
            className="data-[state=active]:text-[#FF6B6B] data-[state=active]:border-b-2 data-[state=active]:border-[#FF6B6B] data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none h-11"
          >
            <Info className="h-4 w-4 mr-2" />
            Information
          </TabsTrigger>
          <TabsTrigger
            value="photos"
            className="data-[state=active]:text-[#FF6B6B] data-[state=active]:border-b-2 data-[state=active]:border-[#FF6B6B] data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none h-11"
          >
            Photos ({images.length})
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="data-[state=active]:text-[#FF6B6B] data-[state=active]:border-b-2 data-[state=active]:border-[#FF6B6B] data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none h-11"
          >
            <Star className="h-4 w-4 mr-2" />
            Reviews {location.reviewCount && `(${location.reviewCount})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main content based on active tab */}
      <div className="flex-1 overflow-auto">
        {activeTab === "info" && (
          <div className="flex flex-col">
            {/* Image gallery (shown only in info tab) */}
            <div className="relative">
              <AspectRatio ratio={4 / 3} className="bg-gray-100">
                <Image
                  src={images[currentImageIndex] || "/placeholder.svg?height=400&width=600&query=location"}
                  alt={`${location.name} - Photo ${currentImageIndex + 1}`}
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover"
                  fill
                  priority
                  loading="eager"
                />
              </AspectRatio>

              {/* Image navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  {/* Image counter */}
                  <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {currentImageIndex + 1} / {images.length}
                  </div>

                  {/* Thumbnail strip */}
                  <div className="absolute bottom-3 left-3 flex space-x-1">
                    {images.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={cn(
                          "w-10 h-10 rounded-md overflow-hidden border-2",
                          currentImageIndex === idx ? "border-white" : "border-transparent opacity-70",
                        )}
                      >
                        <Image
                          src={img || "/placeholder.svg?height=40&width=40&query=thumbnail"}
                          alt={`${location.name} thumbnail ${idx + 1}`}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <button
                        onClick={() => setActiveTab("photos")}
                        className="w-10 h-10 rounded-md bg-black/50 flex items-center justify-center text-white text-xs"
                      >
                        +{images.length - 5}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Location details */}
            <div className="p-4">
              {/* Title and rating */}
              <div className="mb-3">
                <h1 className="text-xl font-semibold text-gray-900">{location.name}</h1>

                {/* Rating */}
                {location.averageRating && (
                  <div className="flex items-center mt-1">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="ml-1 text-sm font-medium text-gray-700">
                        {location.averageRating.toFixed(1)}
                      </span>
                    </div>
                    {location.reviewCount && (
                      <span className="text-sm text-gray-500 ml-1">({location.reviewCount} reviews)</span>
                    )}
                  </div>
                )}

                {/* Categories */}
                {location.categories && location.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {location.categories.map((category, idx) => {
                      const color = getCategoryColor(category)
                      const name = typeof category === "string" ? category : category?.name || "Category"

                      return (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: `${color}10`,
                            color: color,
                            borderColor: `${color}30`,
                          }}
                        >
                          {name}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              <Card className="mb-4 bg-gray-50 border-gray-200">
                <CardContent className="p-4 space-y-3">
                  {/* Address */}
                  {location.address && (
                    <div className="flex">
                      <MapPin className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-700">
                          {typeof location.address === "string"
                            ? location.address
                            : Object.values(location.address).filter(Boolean).join(", ")}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                            onClick={() => {
                              // Open Google Maps directions
                              const address =
                                typeof location.address === "string"
                                  ? location.address
                                  : Object.values(location.address ?? {})
                                      .filter(Boolean)
                                      .join(", ")

                              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                              window.open(mapsUrl, "_blank")
                            }}
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Get Directions
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            View on Map
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {location.contactInfo?.phone && (
                    <div className="flex">
                      <Phone className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                      <a
                        href={`tel:${location.contactInfo?.phone}`}
                        className="text-sm text-gray-700 hover:text-[#FF6B6B]"
                      >
                        {formatPhone(location.contactInfo?.phone)}
                      </a>
                    </div>
                  )}

                  {/* Website */}
                  {location.contactInfo?.website && (
                    <div className="flex">
                      <Globe className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                      <a
                        href={location.contactInfo?.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-700 hover:text-[#FF6B6B] flex items-center"
                      >
                        {location.contactInfo?.website.replace(/^https?:\/\/(www\.)?/, "")}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}

                  {/* Hours */}
                  {location.businessHours && location.businessHours.length > 0 && (
                    <div className="flex">
                      <Clock className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Hours</p>
                        <div className="mt-1 space-y-1">
                          {location.businessHours.map((businessHour, idx) => (
                            <div key={idx} className="flex text-sm">
                              <span className="w-24 text-gray-500">{businessHour.day}</span>
                              <span className="text-gray-700">{businessHour.open || "Closed"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Share information */}
                  <div className="flex pt-2">
                    <LinkIcon className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Share this location</p>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={shareLocation}>
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyLink}>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {location.description && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">About</h2>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{location.description}</p>
                </div>
              )}

              {/* Additional info (placeholder) */}
              <div className="mb-4">
                <h2 className="text-lg font-medium mb-2">Amenities</h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Wi-Fi",
                    "Parking",
                    "Wheelchair Accessible",
                    "Air Conditioning",
                    "Outdoor Seating",
                    "Pet Friendly",
                  ].map((amenity, idx) => (
                    <div key={idx} className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming events (placeholder) */}
              <div className="mb-4">
                <h2 className="text-lg font-medium mb-2">Upcoming Events</h2>
                <div className="space-y-3">
                  {[
                    { name: "Weekly Workshop", date: "Every Tuesday" },
                    { name: "Community Meetup", date: "June 15, 2025" },
                  ].map((event, idx) => (
                    <div key={idx} className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{event.name}</p>
                        <p className="text-xs text-gray-500">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "photos" && (
          <div className="p-4">
            <h2 className="text-lg font-medium mb-4">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {images.map((image, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-md group cursor-pointer">
                  <Image
                    src={image || "/placeholder.svg?height=200&width=200&query=location-photo"}
                    alt={`${location.name} - Photo ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onClick={() => {
                      setCurrentImageIndex(idx)
                      setShowFullGallery(true)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Reviews</h2>
              <Button onClick={() => setShowReviewForm(true)}>Write a Review</Button>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <Card className="mb-6 border-[#FF6B6B]/20">
                <CardContent className="p-4">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-center">Share Your Experience</h3>

                      {/* Basic Information */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title" className="text-sm font-medium">
                            Review Title <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="title"
                            placeholder="Summarize your experience in a few words"
                            value={review.title}
                            onChange={(e) => setReview({ ...review, title: e.target.value })}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="rating" className="text-sm font-medium">
                            Overall Rating <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex items-center mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className="p-1 focus:outline-none focus:ring-0"
                                onClick={() => setReview({ ...review, rating: star })}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                aria-label={`Rate ${star} stars out of 5`}
                              >
                                <Star
                                  className={cn(
                                    "h-8 w-8 transition-all",
                                    (hoverRating ? star <= hoverRating : star <= review.rating)
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300",
                                  )}
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-500">
                              {review.rating > 0 ? `${review.rating} out of 5 stars` : "Select a rating"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="content" className="text-sm font-medium">
                            Your Review <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            id="content"
                            placeholder="Share details about your experience at this location..."
                            value={review.content}
                            onChange={(e) => setReview({ ...review, content: e.target.value })}
                            className="mt-1 min-h-[120px] resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {review.content.length < 10
                              ? `Please write at least 10 characters (${review.content.length}/10)`
                              : `${review.content.length} characters`}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Visit Details */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Visit Details</h4>

                        <div>
                          <Label htmlFor="visitDate" className="text-sm font-medium">
                            When did you visit?
                          </Label>
                          <div className="mt-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !review.visitDate && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {review.visitDate ? format(review.visitDate, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                  mode="single"
                                  selected={review.visitDate}
                                  onSelect={(date) => setReview({ ...review, visitDate: date || undefined })}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="verified"
                            checked={review.isVerifiedVisit}
                            onCheckedChange={(checked) => setReview({ ...review, isVerifiedVisit: checked as boolean })}
                          />
                          <Label htmlFor="verified" className="text-sm">
                            I confirm that I actually visited this location
                          </Label>
                        </div>

                        <div>
                          <Label htmlFor="recommendationLevel" className="text-sm font-medium">
                            Would you recommend this place?
                          </Label>
                          <Select
                            value={review.recommendationLevel}
                            onValueChange={(value) => setReview({ ...review, recommendationLevel: value as any })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select recommendation level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not Recommended</SelectItem>
                              <SelectItem value="maybe">Maybe</SelectItem>
                              <SelectItem value="yes">Recommended</SelectItem>
                              <SelectItem value="strong">Strongly Recommended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      {/* Pros and Cons */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Pros and Cons</h4>

                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">What did you like?</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addPro} className="h-8 px-2">
                              <Plus className="h-4 w-4 mr-1" />
                              Add Pro
                            </Button>
                          </div>
                          <div className="space-y-2 mt-2">
                            {review.pros?.map((item, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  placeholder={`Pro ${index + 1}`}
                                  value={item.pro}
                                  onChange={(e) => updatePro(index, e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removePro(index)}
                                  className="h-8 w-8"
                                  disabled={review.pros?.length === 1 && index === 0}
                                >
                                  <Trash className="h-4 w-4 text-gray-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">What could be improved?</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addCon} className="h-8 px-2">
                              <Plus className="h-4 w-4 mr-1" />
                              Add Con
                            </Button>
                          </div>
                          <div className="space-y-2 mt-2">
                            {review.cons?.map((item, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  placeholder={`Con ${index + 1}`}
                                  value={item.con}
                                  onChange={(e) => updateCon(index, e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeCon(index)}
                                  className="h-8 w-8"
                                  disabled={review.cons?.length === 1 && index === 0}
                                >
                                  <Trash className="h-4 w-4 text-gray-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="tips" className="text-sm font-medium">
                            Tips for other visitors
                          </Label>
                          <Textarea
                            id="tips"
                            placeholder="Share any helpful tips for people planning to visit..."
                            value={review.tips || ""}
                            onChange={(e) => setReview({ ...review, tips: e.target.value })}
                            className="mt-1 resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReviewForm(false)
                            resetReviewForm()
                          }}
                          disabled={isSubmittingReview}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitReview}
                          disabled={
                            isSubmittingReview ||
                            review.rating === 0 ||
                            !review.title.trim() ||
                            review.content.trim().length < 10
                          }
                          className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                        >
                          {isSubmittingReview ? (
                            <div className="flex items-center">
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Submitting...
                            </div>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Review
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {isLoadingReviews ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 rounded-full border-2 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((reviewItem) => (
                  <div key={reviewItem.id} className="border rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 mr-2 overflow-hidden">
                          {reviewItem.author?.avatar ? (
                            <Image
                              src={reviewItem.author.avatar.url || "/placeholder.svg?height=32&width=32&query=avatar"}
                              alt={reviewItem.author.name || "Reviewer"}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-[#FF6B6B]/10 text-[#FF6B6B] text-xs font-medium">
                              {reviewItem.author?.name ? reviewItem.author.name.charAt(0).toUpperCase() : "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{reviewItem.author?.name || "Anonymous"}</p>
                          <p className="text-xs text-gray-500">
                            {reviewItem.createdAt
                              ? new Date(reviewItem.createdAt).toLocaleDateString()
                              : "Unknown date"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, starIdx) => (
                          <Star
                            key={starIdx}
                            className={cn(
                              "h-4 w-4",
                              starIdx < reviewItem.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300",
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <h4 className="font-medium text-sm mb-1">{reviewItem.title}</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{reviewItem.content}</p>

                    {/* Pros and Cons */}
                    {(reviewItem.pros?.length > 0 || reviewItem.cons?.length > 0) && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {reviewItem.pros?.length > 0 && (
                          <div className="bg-green-50 p-2 rounded-md">
                            <h5 className="text-xs font-medium text-green-800 mb-1">Pros</h5>
                            <ul className="text-xs text-green-700 space-y-1">
                              {reviewItem.pros.map((pro: any, idx: number) => (
                                <li key={idx} className="flex items-start">
                                  <ThumbsUp className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                                  <span>{pro.pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {reviewItem.cons?.length > 0 && (
                          <div className="bg-red-50 p-2 rounded-md">
                            <h5 className="text-xs font-medium text-red-800 mb-1">Cons</h5>
                            <ul className="text-xs text-red-700 space-y-1">
                              {reviewItem.cons.map((con: any, idx: number) => (
                                <li key={idx} className="flex items-start">
                                  <ThumbsDown className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                                  <span>{con.con}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tips */}
                    {reviewItem.tips && (
                      <div className="mt-3 bg-blue-50 p-2 rounded-md">
                        <h5 className="text-xs font-medium text-blue-800 mb-1">Tips</h5>
                        <p className="text-xs text-blue-700">{reviewItem.tips}</p>
                      </div>
                    )}

                    {/* Photos */}
                    {reviewItem.photos && reviewItem.photos.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Photos</h5>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {reviewItem.photos.map((photo: any, idx: number) => (
                            <div key={idx} className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden">
                              <Image
                                src={photo.photo?.url || "/placeholder.svg?height=64&width=64&query=photo"}
                                alt={photo.caption || `Review photo ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review actions */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                      <div className="flex items-center space-x-4">
                        <button className="flex items-center text-xs text-gray-500 hover:text-gray-700">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Helpful
                        </button>
                        <button className="flex items-center text-xs text-gray-500 hover:text-gray-700">
                          <Flag className="h-3 w-3 mr-1" />
                          Report
                        </button>
                      </div>
                      {reviewItem.isVerifiedVisit && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Verified Visit
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-gray-600 mb-1">No reviews yet</h3>
                <p className="text-sm text-gray-500 mb-4">Be the first to review this location</p>
                <Button variant="outline" onClick={() => setShowReviewForm(true)}>
                  Write a Review
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full gallery modal */}
      {showFullGallery && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-white font-medium">Gallery</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowFullGallery(false)} className="text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl aspect-[4/3]">
              <Image
                src={images[currentImageIndex] || "/placeholder.svg?height=800&width=1200&query=gallery-image"}
                alt={`${location.name} - Full Photo ${currentImageIndex + 1}`}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="p-4">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={prevImage} className="text-white">
                <ChevronLeft className="h-5 w-5 mr-1" />
                Previous
              </Button>
              <span className="text-white text-sm">
                {currentImageIndex + 1} / {images.length}
              </span>
              <Button variant="ghost" onClick={nextImage} className="text-white">
                Next
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </div>

            <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={cn(
                    "w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2",
                    currentImageIndex === idx ? "border-white" : "border-transparent opacity-70",
                  )}
                >
                  <Image
                    src={img || "/placeholder.svg?height=64&width=64&query=gallery-thumbnail"}
                    alt={`${location.name} thumbnail ${idx + 1}`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons for mobile */}
      {isMobile && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-3 flex space-x-3 z-10">
          <Button
            variant="outline"
            className="flex-1 border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
            onClick={() => {
              if (location.address) {
                const address =
                  typeof location.address === "string"
                    ? location.address
                    : Object.values(location.address).filter(Boolean).join(", ")

                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                window.open(mapsUrl, "_blank")
              }
            }}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
          <Button className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90" onClick={shareLocation}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-4 py-2 flex flex-row items-center justify-between border-b">
          <DialogTitle className="text-lg font-medium truncate">
            {location ? location.name : "Location Details"}
          </DialogTitle>
          <div className="flex gap-2 mx-12">
            {location && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={shareLocation}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy Link</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn("h-8 w-8 rounded-full", isFavorite && "bg-[#FF6B6B]/10 border-[#FF6B6B]")}
                        onClick={toggleFavorite}
                      >
                        <Heart className={cn("h-4 w-4", isFavorite && "fill-[#FF6B6B] text-[#FF6B6B]")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFavorite ? "Remove from favorites" : "Add to favorites"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>

          {/* Close button - works on both mobile and desktop */}
          <DialogClose asChild className="-mx-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-2 h-8 w-8 rounded-full hover:bg-gray-100 transition-colors z-20"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4 text-gray-700" />
            </Button>
          </DialogClose>
        </DialogHeader>
        {location ? dialogContent : <div className="p-8 text-center text-gray-500">No location selected</div>}
      </DialogContent>
    </Dialog>
  )
}
