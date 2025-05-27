/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
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
  Edit,
  Bookmark,
  Users,
  DollarSign,
  CalendarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getReviewsbyId, createReview, getLocationSpecials } from "@/app/actions"
import type { Location } from "./map-data"
import { getCategoryColor, getCategoryName } from "./category-utils"
import { createLocationShareUrl } from "@/lib/location-sharing"
import LocationInteractions from "@/components/location/location-interactions"
import { useResponsive } from "@/hooks/use-mobile"
import LocationDetailMobile from "./location-detail-mobile"

// Review interfaces
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

interface LocationDetailProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
  isMobile?: boolean
}

// Mini marker preview popup component
export function LocationPreview({ location, onViewDetail }: { location: Location; onViewDetail: () => void }) {
  const [isLiked, setIsLiked] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me")
        if (response.ok) {
          const userData = await response.json()
          setCurrentUser(userData)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }

    fetchCurrentUser()
  }, [])

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser || !location) return

    try {
      const response = await fetch("/api/locations/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: location.id,
          interactionType: "like",
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        }),
      })

      if (response.ok) {
        setIsLiked(!isLiked)

        // Send browser notification
        const { formatNotificationMessage, showNotificationWithPreferences } = await import("@/lib/notifications")
        const message = formatNotificationMessage("location_liked", {
          locationName: location.name,
        })

        await showNotificationWithPreferences("LOCATION_LIKED", message, {
          locationId: location.id,
          url: `/map?location=${location.id}`,
        })
      }
    } catch (error) {
      console.error("Error handling like:", error)
    }
  }

  const getImageUrl = (loc: Location): string => {
    if (typeof loc.featuredImage === "string") {
      return loc.featuredImage
    } else if (loc.featuredImage?.url) {
      return loc.featuredImage.url
    } else if (loc.imageUrl) {
      return loc.imageUrl
    }
    return "/placeholder.svg"
  }

  const category = location.categories?.[0]
  const categoryName = getCategoryName(category)

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg bg-white cursor-pointer transition-all hover:shadow-xl"
      onClick={onViewDetail}
    >
      <div className="relative h-32">
        <Image src={getImageUrl(location) || "/placeholder.svg"} alt={location.name} fill className="object-cover" />
        {categoryName && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-white/90 text-gray-800 backdrop-blur-sm">{categoryName}</Badge>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 mb-1">{location.name}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {location.shortDescription
            ? location.shortDescription
            : location.description
              ? typeof location.description === "string"
                ? location.description.substring(0, 100) + (location.description.length > 100 ? "..." : "")
                : "No description available"
              : "No description available"}
        </p>
        <div className="flex justify-between items-center">
          <button
            className={`text-xs flex items-center gap-1 ${isLiked ? "text-rose-500" : "text-gray-500 hover:text-rose-500"}`}
            onClick={handleLike}
          >
            <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-rose-500" : ""}`} />
            {isLiked ? "Saved" : "Save"}
          </button>
          <Button size="sm" variant="default" className="h-7 text-xs px-2 bg-rose-500 hover:bg-rose-600">
            View Details
          </Button>
        </div>
      </div>
    </div>
  )
}

// Desktop version of the location detail component
function LocationDetailDesktop({ location, isOpen, onClose }: LocationDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullGallery, setShowFullGallery] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<"info" | "photos" | "reviews" | "specials">("info")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)
  const detailRef = useRef<HTMLDivElement>(null)

  // Inside the LocationDetail component, add these state variables near the other state declarations:
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [specials, setSpecials] = useState<any[]>([])
  const [isLoadingSpecials, setIsLoadingSpecials] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userInteractions, setUserInteractions] = useState<any>({})
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [interactionCounts, setInteractionCounts] = useState({
    likes: 0,
    saves: 0,
    checkIns: 0,
    visits: 0,
    shares: 0
  })

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

  // Add new useEffect to load interaction counts
  useEffect(() => {
    const loadInteractionCounts = async () => {
      if (!location?.id) return
      
      try {
        // Use the new API endpoint with locationId filter to get counts directly
        const response = await fetch(`/api/locations/interactions?locationId=${location.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // Use the counts from the API response if available
          if (data.counts) {
            setInteractionCounts(data.counts)
          } else {
            // Fallback: calculate counts from interactions array
            const interactions = data.interactions || []
            const counts = {
              likes: interactions.filter((i: any) => i.type === 'like').length,
              saves: interactions.filter((i: any) => i.type === 'save').length,
              checkIns: interactions.filter((i: any) => i.type === 'check_in').length,
              visits: interactions.filter((i: any) => i.type === 'visit').length,
              shares: interactions.filter((i: any) => i.type === 'share').length,
            }
            setInteractionCounts(counts)
          }
          
          // Update user interaction states if user is logged in
          if (currentUser && data.interactions) {
            const userInteractionsForLocation = data.interactions.filter((i: any) => 
              i.user === currentUser.id
            )
            
            setIsLiked(userInteractionsForLocation.some((i: any) => i.type === 'like'))
            setIsSaved(userInteractionsForLocation.some((i: any) => i.type === 'save'))
          }
        } else {
          console.error('Failed to load interaction counts:', response.status)
        }
      } catch (error) {
        console.error('Error loading interaction counts:', error)
      }
    }

    loadInteractionCounts()
  }, [location?.id, currentUser])

  // Process images using useMemo to avoid conditional hook calls
  const images = useMemo(() => {
    if (!location) return ["/placeholder.svg"]

    const imageList = [
      ...(location.featuredImage
        ? [typeof location.featuredImage === "string" ? location.featuredImage : location.featuredImage.url]
        : []),
      ...(location.imageUrl ? [location.imageUrl] : []),
      ...(location.gallery || []).map((img) => (typeof img === "string" ? img : img.image.url)),
    ].filter(Boolean) as string[]

    // If no images, add a placeholder
    if (imageList.length === 0) {
      imageList.push("/placeholder.svg")
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
      try {
        const url = new URL(window.location.href)
        url.searchParams.set("locationId", location.id)
        window.history.pushState({}, "", url.toString())

        return () => {
          try {
            const originalUrl = new URL(window.location.href)
            originalUrl.searchParams.delete("locationId")
            window.history.pushState({}, "", originalUrl.toString())
          } catch (error) {
            console.error('Failed to clean up URL:', error)
          }
        }
      } catch (error) {
        console.error('Failed to update URL with location ID:', error)
        // Fallback: use simple query string manipulation
        const currentUrl = window.location.href
        const separator = currentUrl.includes('?') ? '&' : '?'
        const newUrl = `${currentUrl}${separator}locationId=${location.id}`
        window.history.pushState({}, "", newUrl)
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
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }, [])

  // Share the location
  const shareLocation = useCallback(() => {
    if (!location) return

    const title = `Check out ${location.name} on Local Explorer`
    const description = location.description
      ? `${location.description.substring(0, 100)}${location.description.length > 100 ? "..." : ""}`
      : `I found this interesting place called ${location.name}!`

    const shareUrl = getShareableUrl()

    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    if (navigator.share) {
      navigator
        .share({
          title,
          text: description,
          url: shareUrl,
        })
        .then(() => {
          toast.success("Shared successfully", {
            description: "The location has been shared",
          })
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Error sharing:", err)
            toast.error("Sharing failed", {
              description: "Could not share this location",
            })
          }
        })
    } else {
      try {
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

  // Copy link to clipboard
  const copyLink = useCallback(() => {
    if (!location) return

    const shareUrl = getShareableUrl()

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

  // Review form handlers
  const addPro = useCallback(() => {
    setReview((prev) => ({
      ...prev,
      pros: [...(prev.pros || []), { pro: "" }],
    }))
  }, [])

  const removePro = useCallback((index: number) => {
    setReview((prev) => ({
      ...prev,
      pros: prev.pros?.filter((_, i) => i !== index),
    }))
  }, [])

  const updatePro = useCallback((index: number, value: string) => {
    setReview((prev) => ({
      ...prev,
      pros: prev.pros?.map((item, i) => (i === index ? { pro: value } : item)),
    }))
  }, [])

  const addCon = useCallback(() => {
    setReview((prev) => ({
      ...prev,
      cons: [...(prev.cons || []), { con: "" }],
    }))
  }, [])

  const removeCon = useCallback((index: number) => {
    setReview((prev) => ({
      ...prev,
      cons: prev.cons?.filter((_, i) => i !== index),
    }))
  }, [])

  const updateCon = useCallback((index: number, value: string) => {
    setReview((prev) => ({
      ...prev,
      cons: prev.cons?.map((item, i) => (i === index ? { con: value } : item)),
    }))
  }, [])

  // Fetch reviews and specials
  useEffect(() => {
    const fetchReviews = async () => {
      if (!location?.id) return

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

    const fetchSpecials = async () => {
      if (!location?.id) return

      setIsLoadingSpecials(true)
      try {
        const result = await getLocationSpecials(location.id)
        setSpecials(result || [])
      } catch (error) {
        console.error("Error fetching specials:", error)
        setSpecials([])
      } finally {
        setIsLoadingSpecials(false)
      }
    }

    if (location && activeTab === "reviews") {
      fetchReviews()
    }

    if (location && activeTab === "specials") {
      fetchSpecials()
    }
  }, [location, activeTab])

  // Submit review
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

    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    try {
      const formData = new FormData()

      formData.append("title", review.title)
      formData.append("content", review.content)
      formData.append("rating", review.rating.toString())
      formData.append("reviewType", "location")
      formData.append("location", location.id)

      if (review.tips) formData.append("tips", review.tips)
      if (review.recommendationLevel) formData.append("recommendationLevel", review.recommendationLevel)
      if (review.isVerifiedVisit) formData.append("isVerifiedVisit", "true")
      if (review.visitDate) formData.append("visitDate", review.visitDate.toISOString())

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

      if (currentUser && currentUser.id) {
        formData.append("author", currentUser.id)
      }

      const result = await createReview(formData)

      toast.success("Review submitted!", {
        description: "Thank you for sharing your experience. Your review is pending approval.",
      })

      resetReviewForm()
      setShowReviewForm(false)

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
          </DialogHeader>
          <div className="p-8 text-center text-gray-500">
            <p>No location selected</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[800px] overflow-hidden flex flex-col p-0 rounded-xl h-[90vh] max-h-[90vh]"
      >
        {/* Hidden DialogTitle for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>{location.name} - Location Details</DialogTitle>
        </DialogHeader>
        {/* Header with image carousel */}
        <div className="relative">
          <AspectRatio ratio={16 / 9} className="bg-gray-100">
            <Image
              src={images[currentImageIndex] || "/placeholder.svg"}
              alt={location.name}
              fill
              priority
              className="object-cover"
            />

            {/* Image navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/30 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
                onClick={onClose}
              >
                <X className="h-4 w-4 text-gray-700" />
              </Button>
            </div>

            {/* Category badge */}
            {primaryCategory && (
              <div className="absolute bottom-2 left-2">
                <Badge className="bg-white/80 backdrop-blur-sm text-gray-800 border-0" style={{ color: primaryColor }}>
                  {getCategoryName(primaryCategory)}
                </Badge>
              </div>
            )}
          </AspectRatio>
        </div>

        {/* Location name and rating */}
        <div className="px-6 pt-4 pb-2 border-b">
          <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>

          <div className="flex items-center mt-1 gap-2">
            {location.averageRating && (
              <div className="flex items-center">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={cn(
                        "h-4 w-4",
                        idx < Math.floor(location.averageRating || 0)
                          ? "text-yellow-400 fill-yellow-400"
                          : idx < (location.averageRating || 0)
                            ? "text-yellow-400 fill-yellow-400/50"
                            : "text-gray-300",
                      )}
                    />
                  ))}
                </div>
                <span className="ml-1.5 text-sm font-medium text-gray-700">{location.averageRating.toFixed(1)}</span>
                {location.reviewCount && <span className="text-sm text-gray-500 ml-1">({location.reviewCount})</span>}
              </div>
            )}

            {location.priceRange && (
              <Badge
                variant="outline"
                className={cn(
                  "ml-2",
                  location.priceRange === "free" ? "bg-green-50 text-green-700 border-green-200" : "",
                  location.priceRange === "budget" ? "bg-blue-50 text-blue-700 border-blue-200" : "",
                  location.priceRange === "moderate" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "",
                  location.priceRange === "expensive" ? "bg-orange-50 text-orange-700 border-orange-200" : "",
                  location.priceRange === "luxury" ? "bg-purple-50 text-purple-700 border-purple-200" : "",
                )}
              >
                {location.priceRange === "free" && "Free"}
                {location.priceRange === "budget" && "$"}
                {location.priceRange === "moderate" && "$$"}
                {location.priceRange === "expensive" && "$$$"}
                {location.priceRange === "luxury" && "$$$$"}
              </Badge>
            )}

            {location.isVerified && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          defaultValue="info"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="px-6 pt-2 bg-transparent justify-start border-b rounded-none h-auto">
            <TabsTrigger
              value="info"
              className="data-[state=active]:border-b-2 data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:shadow-none rounded-none px-4 py-2"
            >
              <Info className="h-4 w-4 mr-2" />
              Information
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="data-[state=active]:border-b-2 data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:shadow-none rounded-none px-4 py-2"
            >
              Photos ({images.length})
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:border-b-2 data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:shadow-none rounded-none px-4 py-2"
            >
              <Star className="h-4 w-4 mr-2" />
              Reviews {location.reviewCount ? `(${location.reviewCount})` : ""}
            </TabsTrigger>
            <TabsTrigger
              value="specials"
              className="data-[state=active]:border-b-2 data-[state=active]:border-rose-500 data-[state=active]:text-rose-500 data-[state=active]:shadow-none rounded-none px-4 py-2"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Specials
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto" ref={detailRef}>
            <TabsContent value="info" className="mt-0 p-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2">
                    {location.address && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800"
                        onClick={() => {
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
                        <Navigation className="h-4 w-4 mr-2" />
                        Get Directions
                      </Button>
                    )}

                    {location.contactInfo?.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                        onClick={() => window.open(`tel:${location.contactInfo?.phone}`, "_blank")}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    )}

                    {location.contactInfo?.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800"
                        onClick={() => window.open(location.contactInfo?.website, "_blank")}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800"
                      onClick={() => setShowReviewForm(true)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Write Review
                    </Button>
                  </div>

                  {/* Address and contact info */}
                  <Card className="overflow-hidden border-gray-200">
                    <CardContent className="p-0">
                      {location.address && (
                        <div className="flex p-4 border-b">
                          <MapPin className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700 font-medium">Address</p>
                            <p className="text-sm text-gray-600">
                              {typeof location.address === "string"
                                ? location.address
                                : Object.values(location.address).filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                      )}

                      {location.contactInfo?.phone && (
                        <div className="flex p-4 border-b">
                          <Phone className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-700 font-medium">Phone</p>
                            <a
                              href={`tel:${location.contactInfo?.phone}`}
                              className="text-sm text-gray-600 hover:text-rose-500"
                            >
                              {formatPhone(location.contactInfo?.phone)}
                            </a>
                          </div>
                        </div>
                      )}

                      {location.contactInfo?.website && (
                        <div className="flex p-4 border-b">
                          <Globe className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-700 font-medium">Website</p>
                            <a
                              href={location.contactInfo?.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-600 hover:text-rose-500 flex items-center"
                            >
                              {location.contactInfo?.website.replace(/^https?:\/\/(www\.)?/, "")}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      )}

                      {location.businessHours && location.businessHours.length > 0 && (
                        <div className="flex p-4">
                          <Clock className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700 font-medium">Hours</p>
                            <div className="mt-1 space-y-1">
                              {location.businessHours.map((businessHour, idx) => (
                                <div key={idx} className="flex text-sm">
                                  <span className="w-24 text-gray-500">{businessHour.day}</span>
                                  <span className="text-gray-600">{businessHour.open || "Closed"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Location Interactions */}
                  <div>
                    <LocationInteractions
                      location={location as any}
                      currentUserId={currentUser?.id}
                      className="w-full"
                    />
                  </div>

                  {/* Description */}
                  {location.description && (
                    <div>
                      <h2 className="text-lg font-semibold mb-2">About</h2>
                      <p className="text-gray-700 whitespace-pre-line">{location.description}</p>
                    </div>
                  )}

                  {/* Event Request Section */}
                  <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-amber-800 mb-1">Host an Event Here</h3>
                          <p className="text-sm text-amber-700 mb-3">
                            Want to organize an event at {location.name}? Submit a request to the location owner.
                          </p>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                            onClick={() => {
                              if (!currentUser) {
                                toast.error("Please log in to request an event")
                                return
                              }

                              toast.info("Event request feature coming soon!", {
                                description: "This feature is currently under development.",
                              })
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Request Event
                          </Button>
                        </div>
                        <Calendar className="h-10 w-10 text-amber-500 ml-4" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insider Tips */}
                  {location.insiderTips && (
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Insider Tips</h2>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg
                            className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <p className="text-blue-800">{location.insiderTips}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Best Time to Visit */}
                  {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Best Time to Visit</h2>
                      <div className="flex flex-wrap gap-2">
                        {location.bestTimeToVisit.map((timeItem, idx) => (
                          <Badge key={idx} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                            {typeof timeItem === "string" ? timeItem : timeItem?.season || "Season"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accessibility */}
                  {location.accessibility && (
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Accessibility</h2>
                      <div className="space-y-2">
                        {location.accessibility.wheelchairAccess && (
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                            <span className="text-gray-700">Wheelchair Accessible</span>
                          </div>
                        )}
                        {location.accessibility.parking && (
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                            <span className="text-gray-700">Parking Available</span>
                          </div>
                        )}
                        {location.accessibility.other && (
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                            <span className="text-gray-700">{location.accessibility.other}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Social Media Links */}
                  {location.contactInfo?.socialMedia && (
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Follow Us</h2>
                      <div className="flex gap-3">
                        {location.contactInfo.socialMedia.facebook && (
                          <a
                            href={location.contactInfo.socialMedia.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.367-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </a>
                        )}
                        {location.contactInfo.socialMedia.instagram && (
                          <a
                            href={location.contactInfo.socialMedia.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                            </svg>
                          </a>
                        )}
                        {location.contactInfo.socialMedia.twitter && (
                          <a
                            href={location.contactInfo.socialMedia.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-10 h-10 bg-blue-400 text-white rounded-full hover:bg-blue-500 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                            </svg>
                          </a>
                        )}
                        {location.contactInfo.socialMedia.linkedin && (
                          <a
                            href={location.contactInfo.socialMedia.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-10 h-10 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="photos" className="mt-0 p-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Photo Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((image, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
                        onClick={() => {
                          setCurrentImageIndex(idx)
                          setShowFullGallery(true)
                        }}
                      >
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`${location.name} - Photo ${idx + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="reviews" className="mt-0 p-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Reviews</h2>
                    <Button onClick={() => setShowReviewForm(true)} className="bg-rose-500 hover:bg-rose-600">
                      Write a Review
                    </Button>
                  </div>

                  {/* Review Form */}
                  {showReviewForm && (
                    <Card className="mb-6 border-rose-200 bg-rose-50/50">
                      <CardContent className="p-4">
                        <ScrollArea className="h-[500px] pr-4">
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium text-center">Share Your Experience</h3>

                            {/* Basic Information */}
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="title" className="text-sm font-medium">
                                  Review Title <span className="text-rose-500">*</span>
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
                                  Overall Rating <span className="text-rose-500">*</span>
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
                                  Your Review <span className="text-rose-500">*</span>
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
                                  onCheckedChange={(checked) =>
                                    setReview({ ...review, isVerifiedVisit: checked as boolean })
                                  }
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
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addPro}
                                    className="h-8 px-2"
                                  >
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
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addCon}
                                    className="h-8 px-2"
                                  >
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
                                className="bg-rose-500 hover:bg-rose-600"
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
                      <div className="h-8 w-8 rounded-full border-2 border-t-rose-500 border-r-rose-500/30 border-b-rose-500/10 border-l-rose-500/60 animate-spin"></div>
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((reviewItem) => (
                        <Card key={reviewItem.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="p-4 border-b bg-gray-50">
                              <div className="flex justify-between mb-2">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 mr-3 overflow-hidden">
                                    {reviewItem.author?.avatar ? (
                                      <Image
                                        src={reviewItem.author.avatar.url || "/placeholder.svg"}
                                        alt={reviewItem.author.name || "Reviewer"}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center bg-rose-500/10 text-rose-500 text-sm font-medium">
                                        {reviewItem.author?.name ? reviewItem.author.name.charAt(0).toUpperCase() : "?"}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium">{reviewItem.author?.name || "Anonymous"}</p>
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
                                        starIdx < reviewItem.rating
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300",
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <h4 className="font-medium text-lg mb-2">{reviewItem.title}</h4>
                              <p className="text-gray-700 whitespace-pre-line mb-4">{reviewItem.content}</p>

                              {/* Pros and Cons */}
                              {(reviewItem.pros?.length > 0 || reviewItem.cons?.length > 0) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                  {reviewItem.pros?.length > 0 && (
                                    <div className="bg-green-50 p-3 rounded-md">
                                      <h5 className="text-sm font-medium text-green-800 mb-2">Pros</h5>
                                      <ul className="text-sm text-green-700 space-y-1">
                                        {reviewItem.pros.map((pro: any, idx: number) => (
                                          <li key={idx} className="flex items-start">
                                            <ThumbsUp className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                                            <span>{pro.pro}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {reviewItem.cons?.length > 0 && (
                                    <div className="bg-red-50 p-3 rounded-md">
                                      <h5 className="text-sm font-medium text-red-800 mb-2">Cons</h5>
                                      <ul className="text-sm text-red-700 space-y-1">
                                        {reviewItem.cons.map((con: any, idx: number) => (
                                          <li key={idx} className="flex items-start">
                                            <ThumbsDown className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
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
                                <div className="bg-blue-50 p-3 rounded-md mb-4">
                                  <h5 className="text-sm font-medium text-blue-800 mb-1">Tips</h5>
                                  <p className="text-sm text-blue-700">{reviewItem.tips}</p>
                                </div>
                              )}

                              {/* Photos */}
                              {reviewItem.photos && reviewItem.photos.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Photos</h5>
                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                    {reviewItem.photos.map((photo: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden"
                                      >
                                        <Image
                                          src={photo.photo?.url || "/placeholder.svg"}
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
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center space-x-4">
                                  <button className="flex items-center text-xs text-gray-500 hover:text-gray-700">
                                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                                    Helpful
                                  </button>
                                  <button className="flex items-center text-xs text-gray-500 hover:text-gray-700">
                                    <Flag className="h-3.5 w-3.5 mr-1" />
                                    Report
                                  </button>
                                </div>
                                {reviewItem.isVerifiedVisit && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-green-50 text-green-700 border-green-200"
                                  >
                                    Verified Visit
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Star className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-medium text-gray-700 mb-2">No reviews yet</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Be the first to share your experience at this location and help others discover what makes it
                        special.
                      </p>
                      <Button
                        variant="default"
                        onClick={() => setShowReviewForm(true)}
                        className="bg-rose-500 hover:bg-rose-600"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Write a Review
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="specials" className="mt-0 p-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Current Specials</h2>
                  </div>

                  {isLoadingSpecials ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : specials.length > 0 ? (
                    <div className="space-y-4">
                      {specials.map((special) => (
                        <Card key={special.id} className="overflow-hidden">
                          <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-semibold text-lg">{special.title}</h3>
                              {special.discountValue && (
                                <Badge className="bg-green-100 text-green-800 border-0">
                                  {special.discountValue.type === "percentage"
                                    ? `${special.discountValue.amount}% OFF`
                                    : `$${special.discountValue.amount} OFF`}
                                </Badge>
                              )}
                            </div>

                            {special.shortDescription && (
                              <p className="text-gray-600 mb-4">{special.shortDescription}</p>
                            )}

                            <div className="space-y-3 text-sm text-gray-500">
                              {special.startDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-green-600" />
                                  <span>
                                    Valid from {new Date(special.startDate).toLocaleDateString()}
                                    {special.endDate &&
                                      !special.isOngoing &&
                                      ` to ${new Date(special.endDate).toLocaleDateString()}`}
                                    {special.isOngoing && " (Ongoing)"}
                                  </span>
                                </div>
                              )}

                              {special.timeRestrictions?.startTime && special.timeRestrictions?.endTime && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-green-600" />
                                  <span>
                                    Available {special.timeRestrictions.startTime} - {special.timeRestrictions.endTime}
                                  </span>
                                </div>
                              )}

                              {special.daysAvailable && special.daysAvailable.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-green-600" />
                                  <span>Available on: {special.daysAvailable.map((d: any) => d.day).join(", ")}</span>
                                </div>
                              )}
                            </div>

                            {special.redemptionDetails?.code && (
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                                <span className="text-xs font-medium text-gray-700 block mb-1">Redemption Code:</span>
                                <div className="font-mono text-base font-bold text-gray-900 tracking-wide bg-white p-2 rounded border border-dashed border-gray-300 text-center">
                                  {special.redemptionDetails.code}
                                </div>
                              </div>
                            )}

                            {special.redemptionDetails?.instructions && (
                              <div className="mt-3 text-sm">
                                <strong className="text-gray-700">How to redeem:</strong>
                                <p className="text-gray-600 mt-1">{special.redemptionDetails.instructions}</p>
                              </div>
                            )}

                            {special.restrictions && special.restrictions.length > 0 && (
                              <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                <strong>Terms & Conditions:</strong>{" "}
                                {special.restrictions.map((r: any) => r.restriction).join("; ")}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-medium text-gray-700 mb-2">No current specials</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Check back later for deals, discounts, and special offers from this location.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

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
                  unoptimized
                  src={images[currentImageIndex] || "/placeholder.svg"}
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
                      unoptimized
                      src={img || "/placeholder.svg"}
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
      </DialogContent>
    </Dialog>
  )
}

// Main wrapper component that handles conditional rendering
export default function LocationDetail({ location, isOpen, onClose, isMobile = false }: LocationDetailProps) {
  const responsive = useResponsive()
  
  // Use mobile version for mobile devices or when explicitly specified
  const shouldUseMobile = isMobile || responsive.isMobile
  
  if (shouldUseMobile) {
    return <LocationDetailMobile location={location} isOpen={isOpen} onClose={onClose} />
  }

  return <LocationDetailDesktop location={location} isOpen={isOpen} onClose={onClose} />
}
