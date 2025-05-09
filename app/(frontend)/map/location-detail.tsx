"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  X,
  MapPin,
  Star,
  Clock,
  Phone,
  Mail,
  Globe,
  ChevronLeft,
  ChevronRight,
  Share2,
  Info,
  Check,
  ShipWheelIcon as Wheelchair,
  Car,
  Heart,
  ExternalLink,
  Calendar,
  Navigation,
  ArrowLeft,
  ChevronDown,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Location } from "./map-data"
import { getCategoryColor, formatBusinessHours, formatPriceRange } from "./category-utils"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LocationDetailProps {
  location: Location
  onCloseAction: () => void
}

export default function LocationDetail({ location, onCloseAction }: LocationDetailProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showAllHours, setShowAllHours] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showFullGallery, setShowFullGallery] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Format address
  const formatAddress = () => {
    if (typeof location.address === "string") {
      return location.address
    } else if (location.address) {
      return Object.values(location.address).filter(Boolean).join(", ")
    }
    return "No address provided"
  }

  // Get contact info
  const contactInfo = location.contactInfo || {}
  const phone = contactInfo.phone 
  const email = contactInfo.email 
  const website = contactInfo.website 


  // Get images
  const images: string[] = []

  // Add featured image if available
  if (typeof location.featuredImage === "string") {
    images.push(location.featuredImage)
  } else if (location.featuredImage?.url) {
    images.push(location.featuredImage.url)
  } else if (location.imageUrl) {
    images.push(location.imageUrl)
  }

  // Add gallery images if available
  if (location.gallery && Array.isArray(location.gallery)) {
    location.gallery.forEach((item) => {
      if (item.image?.url) {
        images.push(item.image.url)
      }
    })
  }

  if (images.length === 0) {
    // Add a placeholder image
    images.push("/abstract-location.png")
  }

  // Handle image navigation
  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  // Format business hours
  const businessHours = location.businessHours || []
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const sortedHours = [...businessHours].sort((a, b) => {
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  })

  // Get today's day
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" })
  const todayHours = businessHours.find((h) => h.day === today)

  // Format today's hours
  const formatTodayHours = () => {
    if (!todayHours) return "Hours not available"
    if (todayHours.closed) return "Closed today"
    return `${todayHours.open || "?"} - ${todayHours.close || "?"}`
  }

  // Track scroll position for header transparency
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setScrollPosition(contentRef.current.scrollTop)
      }
    }

    const contentElement = contentRef.current
    if (contentElement) {
      contentElement.addEventListener("scroll", handleScroll)
      return () => contentElement.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Share location
  const shareLocation = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: location.name,
          text: `Check out ${location.name}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  // Full gallery view
  if (showFullGallery) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="p-4 flex items-center justify-between text-white">
          <Button variant="ghost" size="icon" onClick={() => setShowFullGallery(false)} className="text-white">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-medium">{location.name} Photos</h2>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <div className="flex-1 flex items-center justify-center relative">
          {images.length > 0 && (
            <Image
              src={images[activeImageIndex] || "/placeholder.svg"}
              alt={`${location.name} - Photo ${activeImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          )}

          {/* Image navigation */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-12 w-12"
                onClick={prevImage}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-12 w-12"
                onClick={nextImage}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        <div className="p-4 text-white text-center">
          {activeImageIndex + 1} / {images.length}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "px-4 py-3 border-b flex items-center justify-between bg-white sticky top-0 z-10 transition-all duration-200",
          scrollPosition > 10 ? "shadow-md" : "shadow-none",
        )}
      >
        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onCloseAction} className="mr-2 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-lg font-semibold truncate max-w-[80%]">{location.name}</h2>
        </div>
        {!isMobile && (
          <Button variant="ghost" size="icon" onClick={onCloseAction} className="rounded-full h-9 w-9">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        {/* Image gallery */}
        <div className="relative h-56 md:h-72 bg-gray-100">
          {images.length > 0 && (
            <Image
              src={images[activeImageIndex] || "/placeholder.svg"}
              alt={location.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
              priority
              onClick={() => setShowFullGallery(true)}
            />
          )}

          {/* Image navigation */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 rounded-full h-8 w-8 shadow-md"
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 rounded-full h-8 w-8 shadow-md"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {/* Image indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      idx === activeImageIndex ? "bg-white w-4" : "bg-white/50",
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex(idx)
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* View all photos button */}
          {images.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-xs font-medium py-1 h-8"
              onClick={() => setShowFullGallery(true)}
            >
              View All Photos
            </Button>
          )}

          {/* Badges */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {location.isFeatured && (
              <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white border-none">
                <Star className="h-3 w-3 mr-1 fill-white" />
                Featured
              </Badge>
            )}

            {location.isVerified && (
              <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white border-none">
                <Check className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Quick info bar */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
          {/* Rating */}
          {location.averageRating !== undefined ? (
            <div className="flex items-center">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= Math.round(location.averageRating ?? 0)
                        ? "text-amber-400 fill-amber-400"
                        : "text-gray-300",
                    )}
                  />
                ))}
              </div>
              <span className="ml-1.5 text-sm font-medium">{location.averageRating.toFixed(1)}</span>
              {location.reviewCount !== undefined && (
                <span className="text-sm text-gray-500 ml-1">({location.reviewCount})</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No ratings yet</div>
          )}

          {/* Price range */}
          {location.priceRange && (
            <div className="text-sm font-medium text-gray-700">{formatPriceRange(location.priceRange)}</div>
          )}

          {/* Today's hours */}
          <div className="text-sm">
            <span className={cn("font-medium", todayHours?.closed ? "text-red-500" : "text-green-600")}>
              {formatTodayHours()}
            </span>
          </div>
        </div>

        {/* Categories */}
        {location.categories && location.categories.length > 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2 border-b">
            {location.categories.map((category, idx) => {
              const color = getCategoryColor(category)
              const name = typeof category === "string" ? category : category?.name || "Category"

              return (
                <Badge
                  key={idx}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-sm font-medium"
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

        {/* Tabs for content */}
        <Tabs defaultValue="info" className="w-full">
          <div className="border-b">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="info"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-[#FF6B6B] data-[state=active]:bg-transparent data-[state=active]:text-foreground"
              >
                Info
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-[#FF6B6B] data-[state=active]:bg-transparent data-[state=active]:text-foreground"
              >
                Details
              </TabsTrigger>
              {location.insiderTips && (
                <TabsTrigger
                  value="tips"
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-[#FF6B6B] data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                >
                  Tips
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Info tab */}
          <TabsContent value="info" className="p-4 space-y-5">
            {/* Address */}
            <div className="flex items-start">
              <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                <MapPin className="h-5 w-5 text-[#FF6B6B]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Address</h3>
                <p className="text-gray-700 mt-0.5">{formatAddress()}</p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-[#FF6B6B] font-medium mt-1"
                  onClick={() => {
                    const lat = location.coordinates?.latitude || location.latitude
                    const lng = location.coordinates?.longitude || location.longitude
                    if (lat && lng) {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")
                    }
                  }}
                >
                  Get directions
                </Button>
              </div>
            </div>

            {/* Contact info */}
            {(phone || email || website) && (
              <div className="space-y-3">
                {phone && (
                  <div className="flex items-start">
                    <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Phone className="h-5 w-5 text-[#FF6B6B]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Phone</h3>
                      <a href={`tel:${phone}`} className="text-gray-700 hover:text-[#FF6B6B]">
                        {phone}
                      </a>
                    </div>
                  </div>
                )}

                {email && (
                  <div className="flex items-start">
                    <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Mail className="h-5 w-5 text-[#FF6B6B]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Email</h3>
                      <a href={`mailto:${email}`} className="text-[#FF6B6B] hover:underline">
                        {email}
                      </a>
                    </div>
                  </div>
                )}

                {website && (
                  <div className="flex items-start">
                    <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <Globe className="h-5 w-5 text-[#FF6B6B]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Website</h3>
                      <a
                        href={website.startsWith("http") ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#FF6B6B] hover:underline flex items-center"
                      >
                        {website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Business hours */}
            {businessHours.length > 0 && (
              <div className="flex items-start">
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Clock className="h-5 w-5 text-[#FF6B6B]" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-900">Business Hours</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowAllHours(!showAllHours)}
                    >
                      {showAllHours ? "Show Less" : "Show All"}
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 ml-1 transition-transform", showAllHours && "rotate-180")}
                      />
                    </Button>
                  </div>

                  {!showAllHours ? (
                    <p className="text-gray-700 mt-1">{formatBusinessHours(businessHours)}</p>
                  ) : (
                    <div className="space-y-1 text-sm mt-2">
                      {sortedHours.map((hour, idx) => (
                        <div key={idx} className="flex justify-between py-1">
                          <span className={cn("font-medium", hour.day === today ? "text-[#FF6B6B]" : "")}>
                            {hour.day}
                          </span>
                          <span className={hour.closed ? "text-red-500" : ""}>
                            {hour.closed ? "Closed" : `${hour.open || "?"} - ${hour.close || "?"}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Details tab */}
          <TabsContent value="details" className="p-4 space-y-5">
            {/* Description */}
            {location.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">About</h3>
                <p className="text-gray-700">{location.description}</p>
              </div>
            )}

            {/* Accessibility */}
            {location.accessibility && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Accessibility</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {location.accessibility.wheelchairAccess && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Wheelchair className="h-3.5 w-3.5 mr-1.5" />
                      Wheelchair Access
                    </Badge>
                  )}
                  {location.accessibility.parking && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Car className="h-3.5 w-3.5 mr-1.5" />
                      Parking Available
                    </Badge>
                  )}
                </div>
                {location.accessibility.other && (
                  <p className="text-sm text-gray-700 mt-1">{location.accessibility.other}</p>
                )}
              </div>
            )}

            {/* Tags */}
            {location.tags && location.tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {location.tags.map((tagObj, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                      {tagObj.tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Best time to visit */}
            {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Best Time to Visit</h3>
                <div className="flex flex-wrap gap-2">
                  {location.bestTimeToVisit.map((timeObj, idx) => (
                    <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {timeObj.season}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Social media 
            {socialMedia && Object.values(socialMedia).some(Boolean) && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Social Media</h3>
                <div className="flex items-center gap-4 mt-2">
                  {socialMedia.facebook && (
                    <a
                      href={
                        socialMedia.facebook.startsWith("http")
                          ? socialMedia.facebook
                          : `https://${socialMedia.facebook}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                      </svg>
                    </a>
                  )}
                  {socialMedia.twitter && (
                    <a
                      href={
                        socialMedia.twitter.startsWith("http") ? socialMedia.twitter : `https://${socialMedia.twitter}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                  )}
                  {socialMedia.instagram && (
                    <a
                      href={
                        socialMedia.instagram.startsWith("http")
                          ? socialMedia.instagram
                          : `https://${socialMedia.instagram}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-800"
                    >
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </a>
                  )}
                  {socialMedia.linkedin && (
                    <a
                      href={
                        socialMedia.linkedin.startsWith("http")
                          ? socialMedia.linkedin
                          : `https://${socialMedia.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}*/}
          </TabsContent>
          

          {/* Tips tab */}
          {location.insiderTips && (
            <TabsContent value="tips" className="p-4 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Info className="h-5 w-5 text-amber-600 mr-2" />
                  <h3 className="text-lg font-medium text-amber-800">Insider Tips</h3>
                </div>
                <p className="text-amber-700">{location.insiderTips}</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Footer */}
      <div className="p-3 md:p-4 border-t bg-white sticky bottom-0 z-10 safe-area-bottom">
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 py-5 md:py-2"
            onClick={() => {
              const lat = location.coordinates?.latitude || location.latitude
              const lng = location.coordinates?.longitude || location.longitude

              if (lat && lng) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")
              }
            }}
          >
            <Navigation className="h-5 w-5 mr-2" />
            Directions
          </Button>
          <Button
            variant={isFavorite ? "default" : "outline"}
            className={cn("flex-1 py-5 md:py-2", isFavorite && "bg-pink-500 hover:bg-pink-600 border-pink-500")}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={cn("h-5 w-5 mr-2", isFavorite && "fill-white")} />
            {isFavorite ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12 md:h-10 md:w-10" onClick={shareLocation}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-bottom {
            padding-bottom: calc(1rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  )
}
