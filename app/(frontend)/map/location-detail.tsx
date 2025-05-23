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
  Edit,
  Bookmark,
  Users,
  DollarSign,
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
import { getCategoryColor, getCategoryName } from "./category-utils"
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
import { getReviewsbyId, createReview, getLocationSpecials } from "@/app/actions"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import LocationInteractions from "@/components/location/location-interactions"

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

// New component for mini marker preview popup
export function LocationPreview({ location, onViewDetail }: { location: Location, onViewDetail: () => void }) {
  const [isLiked, setIsLiked] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const userData = await response.json()
          setCurrentUser(userData)
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }

    fetchCurrentUser()
  }, [])

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUser || !location) return

    try {
      const response = await fetch('/api/locations/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: location.id,
          interactionType: 'like',
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        }),
      })

      if (response.ok) {
        setIsLiked(!isLiked)
        
        // Send browser notification
        const { formatNotificationMessage, showNotificationWithPreferences } = await import('@/lib/notifications')
        const message = formatNotificationMessage('location_liked', {
          locationName: location.name,
        })
        
        await showNotificationWithPreferences('LOCATION_LIKED', message, {
          locationId: location.id,
          url: `/map?location=${location.id}`,
        })
      }
    } catch (error) {
      console.error('Error handling like:', error)
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
    <div className="marker-popup" onClick={onViewDetail}>
      <div className="marker-popup-header">
        <h3 className="marker-popup-title">{location.name}</h3>
        {categoryName && (
          <div className="marker-popup-subtitle">{categoryName}</div>
        )}
      </div>
      <div className="marker-popup-content">
        <img 
          src={getImageUrl(location)} 
          alt={location.name} 
          className="marker-popup-image"
        />
        <div className="marker-popup-info">
          {location.shortDescription ? location.shortDescription : 
            location.description ? 
              typeof location.description === 'string' ? 
                location.description.substring(0, 100) + (location.description.length > 100 ? '...' : '') : 
                'No description available' : 
            'No description available'}
        </div>
        <div className="marker-popup-actions">
          <div className="marker-popup-action" onClick={handleLike}>
            {isLiked ? <span>★ Saved</span> : <span>☆ Save</span>}
          </div>
          <div className="marker-popup-action primary">
            View Details
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LocationDetail({ location, isOpen, onClose, isMobile = false }: LocationDetailProps) {
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
          <TabsTrigger
            value="specials"
            className="data-[state=active]:text-[#FF6B6B] data-[state=active]:border-b-2 data-[state=active]:border-[#FF6B6B] data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none h-11"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Specials
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main content based on active tab */}
      <div className="flex-1 overflow-auto">
        {activeTab === "info" && (
          <div className="flex flex-col">
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

              {/* Location Interactions */}
              <div className="mb-4">
                <LocationInteractions 
                  location={location as any}
                  currentUserId={currentUser?.id}
                  className="w-full"
                />
              </div>

              {/* Event Request Section */}
              <div className="mb-4">
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-orange-800 mb-1">
                          Host an Event Here
                        </h3>
                        <p className="text-xs text-orange-700 mb-3">
                          Want to organize an event at {location.name}? Submit a request to the location owner.
                        </p>
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={async () => {
                            if (!currentUser) {
                              toast.error('Please log in to request an event')
                              return
                            }
                            
                            // Import the event request component dynamically
                            const { default: EventRequestManager } = await import('@/components/location/event-request-manager')
                            
                            // Create a modal to show the event request form
                            const eventRequestElement = document.createElement('div')
                            eventRequestElement.id = 'event-request-modal'
                            eventRequestElement.className = 'fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4'
                            eventRequestElement.innerHTML = `
                              <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                                <div class="flex items-center justify-between p-4 border-b">
                                  <h2 class="text-lg font-semibold">Request Event at ${location.name}</h2>
                                  <button id="close-event-request" class="p-2 hover:bg-gray-100 rounded">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                  </button>
                                </div>
                                <div id="event-request-content" class="p-4">
                                  Loading...
                                </div>
                              </div>
                            `
                            
                            document.body.appendChild(eventRequestElement)
                            
                            // Close handler
                            const closeButton = eventRequestElement.querySelector('#close-event-request')
                            const closeModal = () => {
                              document.body.removeChild(eventRequestElement)
                            }
                            
                            closeButton?.addEventListener('click', closeModal)
                            eventRequestElement.addEventListener('click', (e) => {
                              if (e.target === eventRequestElement) closeModal()
                            })
                            
                            // Load the event request form
                            const contentDiv = eventRequestElement.querySelector('#event-request-content')
                            if (contentDiv) {
                              contentDiv.innerHTML = `
                                <div class="space-y-4">
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                    <input type="text" id="event-title" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Enter event title" />
                                  </div>
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
                                    <textarea id="event-description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Describe your event"></textarea>
                                  </div>
                                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label class="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                      <select id="event-type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                                        <option value="">Select type</option>
                                        <option value="workshop">Workshop</option>
                                        <option value="meetup">Meetup</option>
                                        <option value="concert">Concert</option>
                                        <option value="sports_matchmaking">Sports Matchmaking</option>
                                        <option value="social_event">Social Event</option>
                                        <option value="other">Other</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label class="block text-sm font-medium text-gray-700 mb-1">Expected Attendees</label>
                                      <input type="number" id="expected-attendees" min="1" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Number of people" />
                                    </div>
                                  </div>
                                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label class="block text-sm font-medium text-gray-700 mb-1">Requested Date</label>
                                      <input type="date" id="requested-date" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                                    </div>
                                    <div>
                                      <label class="block text-sm font-medium text-gray-700 mb-1">Requested Time</label>
                                      <input type="time" id="requested-time" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                                    </div>
                                  </div>
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Special Requests (Optional)</label>
                                    <textarea id="special-requests" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Any special requirements or notes"></textarea>
                                  </div>
                                  <div class="flex justify-end gap-3 pt-4">
                                    <button id="cancel-request" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                                    <button id="submit-request" class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500">Submit Request</button>
                                  </div>
                                </div>
                              `
                              
                              // Add form submission logic
                              const submitButton = contentDiv.querySelector('#submit-request')
                              const cancelButton = contentDiv.querySelector('#cancel-request')
                              
                              cancelButton?.addEventListener('click', closeModal)
                              
                              submitButton?.addEventListener('click', async () => {
                                const eventTitle = (contentDiv.querySelector('#event-title') as HTMLInputElement)?.value
                                const eventDescription = (contentDiv.querySelector('#event-description') as HTMLTextAreaElement)?.value
                                const eventType = (contentDiv.querySelector('#event-type') as HTMLSelectElement)?.value
                                const expectedAttendees = parseInt((contentDiv.querySelector('#expected-attendees') as HTMLInputElement)?.value || '0')
                                const requestedDate = (contentDiv.querySelector('#requested-date') as HTMLInputElement)?.value
                                const requestedTime = (contentDiv.querySelector('#requested-time') as HTMLInputElement)?.value
                                const specialRequests = (contentDiv.querySelector('#special-requests') as HTMLTextAreaElement)?.value
                                
                                if (!eventTitle || !eventDescription || !eventType || !expectedAttendees || !requestedDate || !requestedTime) {
                                  toast.error('Please fill in all required fields')
                                  return
                                }
                                
                                try {
                                  const response = await fetch('/api/locations/event-requests', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      eventTitle,
                                      eventDescription,
                                      eventType,
                                      locationId: location.id,
                                      requestedDate,
                                      requestedTime,
                                      expectedAttendees,
                                      specialRequests,
                                    }),
                                  })
                                  
                                  if (response.ok) {
                                    toast.success('Event request submitted successfully!')
                                    closeModal()
                                  } else {
                                    const error = await response.json()
                                    toast.error(error.message || 'Failed to submit event request')
                                  }
                                } catch (error) {
                                  console.error('Error submitting event request:', error)
                                  toast.error('Failed to submit event request')
                                }
                              })
                            }
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Request Event
                        </Button>
                      </div>
                      <Calendar className="h-6 w-6 text-orange-600 ml-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {location.description && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">About</h2>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{location.description}</p>
                </div>
              )}

              {/* Short Description */}
              {location.shortDescription && location.shortDescription !== location.description && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Quick Overview</h2>
                  <p className="text-sm text-gray-600">{location.shortDescription}</p>
                </div>
              )}

              {/* Price Range */}
              {location.priceRange && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Price Range</h2>
                  <div className="flex items-center">
                    <Badge 
                      variant="outline" 
                      className={`
                        ${location.priceRange === 'free' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                        ${location.priceRange === 'budget' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${location.priceRange === 'moderate' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                        ${location.priceRange === 'expensive' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                        ${location.priceRange === 'luxury' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                      `}
                    >
                      {location.priceRange.charAt(0).toUpperCase() + location.priceRange.slice(1)}
                      {location.priceRange === 'budget' && ' $'}
                      {location.priceRange === 'moderate' && ' $$'}
                      {location.priceRange === 'expensive' && ' $$$'}
                      {location.priceRange === 'luxury' && ' $$$$'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Verification Status */}
              {(location.isVerified || location.isFeatured) && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Status</h2>
                  <div className="flex gap-2">
                    {location.isVerified && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        Verified Location
                      </Badge>
                    )}
                    {location.isFeatured && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Neighborhood */}
              {location.neighborhood && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Neighborhood</h2>
                  <p className="text-sm text-gray-700">{location.neighborhood}</p>
                </div>
              )}

              {/* Best Time to Visit */}
              {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Best Time to Visit</h2>
                  <div className="flex flex-wrap gap-2">
                    {location.bestTimeToVisit.map((timeItem, idx) => (
                      <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {typeof timeItem === 'string' ? timeItem : timeItem?.season || 'Season'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Insider Tips */}
              {location.insiderTips && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Insider Tips</h2>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <p className="text-sm text-amber-800">{location.insiderTips}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Accessibility */}
              {location.accessibility && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Accessibility</h2>
                  <div className="space-y-2">
                    {location.accessibility.wheelchairAccess && (
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                        <span className="text-sm text-gray-700">Wheelchair Accessible</span>
                      </div>
                    )}
                    {location.accessibility.parking && (
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                        <span className="text-sm text-gray-700">Parking Available</span>
                      </div>
                    )}
                    {location.accessibility.other && (
                      <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                        <span className="text-sm text-gray-700">{location.accessibility.other}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social Media Links */}
              {location.contactInfo?.socialMedia && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Follow Us</h2>
                  <div className="flex gap-3">
                    {location.contactInfo.socialMedia.facebook && (
                      <a 
                        href={location.contactInfo.socialMedia.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.367-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
                          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.864 3.708 13.713 3.708 12.416s.49-2.448 1.297-3.323c.875-.875 2.026-1.365 3.323-1.365 1.297 0 2.448.49 3.323 1.365.875.875 1.365 2.026 1.365 3.323s-.49 2.448-1.365 3.323c-.875.875-2.026 1.365-3.323 1.365zm7.599 0c-1.297 0-2.448-.49-3.323-1.297-.875-.875-1.365-2.026-1.365-3.323s.49-2.448 1.365-3.323c.875-.875 2.026-1.365 3.323-1.365 1.297 0 2.448.49 3.323 1.365.875.875 1.365 2.026 1.365 3.323s-.49 2.448-1.365 3.323c-.875.875-2.026 1.365-3.323 1.365z"/>
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
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
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
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Business Partnership Info */}
              {(location as any).hasBusinessPartnership && (location as any).partnershipDetails && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Partnership</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                      <div>
                        {(location as any).partnershipDetails.partnerName && (
                          <p className="text-sm font-medium text-blue-800 mb-1">
                            Partner: {(location as any).partnershipDetails.partnerName}
                          </p>
                        )}
                        {(location as any).partnershipDetails.details && (
                          <p className="text-sm text-blue-700">{(location as any).partnershipDetails.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visit Verification Count */}
              {(location as any).visitVerificationCount && (location as any).visitVerificationCount > 0 && (
                <div className="mb-4">
                  <h2 className="text-lg font-medium mb-2">Community Engagement</h2>
                  <div className="flex items-center">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Users className="w-3 h-3 mr-1" />
                      {(location as any).visitVerificationCount} verified visits
                    </Badge>
                  </div>
                </div>
              )}

              {/* Additional amenities - now dynamic based on actual data */}
              <div className="mb-4">
                <h2 className="text-lg font-medium mb-2">Features</h2>
                <div className="grid grid-cols-2 gap-2">
                  {/* Show real accessibility features */}
                  {location.accessibility?.wheelchairAccess && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Wheelchair Accessible</span>
                    </div>
                  )}
                  {location.accessibility?.parking && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Parking Available</span>
                    </div>
                  )}
                  {location.contactInfo?.website && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Online Presence</span>
                    </div>
                  )}
                  {location.contactInfo?.phone && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Phone Support</span>
                    </div>
                  )}
                  {location.businessHours && location.businessHours.length > 0 && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Open Schedule</span>
                    </div>
                  )}
                  {(location as any).hasBusinessPartnership && (
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Business Partner</span>
                    </div>
                  )}
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
                    src={image || "/placeholder.svg"}
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
                              src={reviewItem.author.avatar.url || "/placeholder.svg"}
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

        {activeTab === "specials" && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Current Specials</h2>
            </div>

            {isLoadingSpecials ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : specials.length > 0 ? (
              <div className="space-y-4">
                {specials.map((special) => (
                  <Card key={special.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{special.title}</h3>
                        {special.discountValue && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {special.discountValue.type === 'percentage' 
                              ? `${special.discountValue.amount}% OFF`
                              : `$${special.discountValue.amount} OFF`
                            }
                          </Badge>
                        )}
                      </div>
                      
                      {special.shortDescription && (
                        <p className="text-gray-600 mb-3">{special.shortDescription}</p>
                      )}
                      
                      <div className="space-y-2 text-sm text-gray-500">
                        {special.startDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Valid from {new Date(special.startDate).toLocaleDateString()}
                              {special.endDate && !special.isOngoing && 
                                ` to ${new Date(special.endDate).toLocaleDateString()}`
                              }
                              {special.isOngoing && ' (Ongoing)'}
                            </span>
                          </div>
                        )}
                        
                        {special.timeRestrictions?.startTime && special.timeRestrictions?.endTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              Available {special.timeRestrictions.startTime} - {special.timeRestrictions.endTime}
                            </span>
                          </div>
                        )}
                        
                        {special.daysAvailable && special.daysAvailable.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Available on: {special.daysAvailable.map((d: any) => d.day).join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {special.redemptionDetails?.code && (
                          <div className="mt-3 p-2 bg-gray-50 rounded border">
                            <span className="text-xs font-medium text-gray-700">Redemption Code:</span>
                            <div className="font-mono text-sm font-bold text-gray-900 mt-1">
                              {special.redemptionDetails.code}
                            </div>
                          </div>
                        )}
                        
                        {special.redemptionDetails?.instructions && (
                          <div className="mt-2 text-sm text-gray-600">
                            <strong>How to redeem:</strong> {special.redemptionDetails.instructions}
                          </div>
                        )}
                        
                        {special.restrictions && special.restrictions.length > 0 && (
                          <div className="mt-3 text-xs text-gray-500">
                            <strong>Terms:</strong> {special.restrictions.map((r: any) => r.restriction).join('; ')}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-gray-600 mb-1">No current specials</h3>
                <p className="text-sm text-gray-500">Check back later for deals and offers</p>
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
    <Dialog open={isOpen && location !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "sm:max-w-lg overflow-hidden flex flex-col p-0",
        isMobile ? "h-[85vh] max-h-[85vh]" : "h-[90vh] max-h-[90vh]"
      )}>
        <DialogHeader className="p-6 pb-2 flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="text-xl">{location?.name}</DialogTitle>
            {location?.categories?.[0] && (
              <Badge
                variant="outline"
                className="mt-1"
                style={{
                  backgroundColor: `${getCategoryColor(location.categories[0])}20`,
                  borderColor: getCategoryColor(location.categories[0])
                }}
              >
                {getCategoryName(location.categories[0])}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        {/* Image Section */}
        <div className="relative h-60 w-full">
          {location?.featuredImage || location?.imageUrl ? (
            <Image
              src={
                typeof location.featuredImage === "string"
                  ? location.featuredImage
                  : location?.featuredImage?.url
                  ? location.featuredImage.url
                  : location?.imageUrl || "/placeholder.svg"
              }
              alt={location?.name || "Location"}
              fill
              priority
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="rounded-full shadow-md bg-white text-gray-800 h-10 w-10"
                    onClick={() => {
                      // Share functionality
                      if (navigator.share) {
                        navigator.share({
                          title: location?.name || "Check out this location",
                          text: location?.shortDescription || "I found this interesting place",
                          url: window.location.href
                        })
                      } else {
                        // Fallback
                        navigator.clipboard.writeText(window.location.href)
                        toast("Link copied to clipboard")
                      }
                    }}
                  >
                    <Share2 className="h-5 w-5 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Share location
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Rest of the component stays the same */}
        {location ? dialogContent : <div className="p-8 text-center text-gray-500">No location selected</div>}
      </DialogContent>
    </Dialog>
  )
}
