/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useRef, useEffect } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { Location } from "./map-data"
import { getCategoryColor } from "./category-utils"

interface LocationDetailProps {
  location: Location
  onCloseAction: () => void
  isMobile?: boolean
}

export default function LocationDetail({ location, onCloseAction, isMobile = false }: LocationDetailProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullGallery, setShowFullGallery] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const detailRef = useRef<HTMLDivElement>(null)

  // Get all images for the location
  const images = [
    ...(location.featuredImage
      ? [typeof location.featuredImage === "string" ? location.featuredImage : location.featuredImage.url]
      : []),
    ...(location.imageUrl ? [location.imageUrl] : []),
    ...(location.gallery || []).map((img) => (typeof img === "string" ? img : img.image.url)),
  ].filter(Boolean) as string[]

  // If no images, add a placeholder
  if (images.length === 0) {
    images.push("/abstract-location.png")
  }

  // Scroll to top when location changes
  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollTop = 0
    }
  }, [location.id])

  // Navigate to previous image
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  // Navigate to next image
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  // Toggle favorite status
  const toggleFavorite = () => {
    setIsFavorite((prev) => !prev)
  }

  // Format phone number
  const formatPhone = (phone: string) => {
    // Simple formatting, in a real app you'd use a library for international numbers
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  // Get primary category
  const primaryCategory = location.categories && location.categories.length > 0 ? location.categories[0] : null

  // Get primary category color
  const primaryColor = getCategoryColor(primaryCategory)

  return (
    <div
      ref={detailRef}
      className="flex flex-col h-full overflow-y-auto"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#E5E7EB transparent" }}
    >
      {/* Sticky header for desktop */}
      {!isMobile && (
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b">
          <h2 className="text-lg font-medium truncate">{location.name}</h2>
          <Button variant="ghost" size="icon" onClick={onCloseAction} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image gallery */}
      <div className="relative">
        <div className="relative aspect-[4/3] bg-gray-100">
          <Image
            src={images[currentImageIndex] || "/placeholder.svg"}
            alt={location.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
          />

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
                      "w-8 h-8 rounded-md overflow-hidden border-2",
                      currentImageIndex === idx ? "border-white" : "border-transparent opacity-70",
                    )}
                  >
                    <Image
                      src={img || "/placeholder.svg"}
                      alt={`Thumbnail ${idx + 1}`}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
                {images.length > 5 && (
                  <button
                    onClick={() => setShowFullGallery(true)}
                    className="w-8 h-8 rounded-md bg-black/50 flex items-center justify-center text-white text-xs"
                  >
                    +{images.length - 5}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              className="bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500 text-red-500")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
                <span className="ml-1 text-sm font-medium text-gray-700">{location.averageRating.toFixed(1)}</span>
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

        <Separator className="my-4" />

        {/* Contact information */}
        <div className="space-y-3">
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
                <Button variant="link" className="h-auto p-0 text-sm text-[#FF6B6B]">
                  Get Directions
                </Button>
              </div>
            </div>
          )}

          {/* Phone */}
          {location.contactInfo?.phone && (
            <div className="flex">
              <Phone className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0" />
              <a href={`tel:${location.contactInfo?.phone}`} className="text-sm text-gray-700 hover:text-[#FF6B6B]">
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
                      <span className="w-20 text-gray-500">{businessHour.day}</span>
                      <span className="text-gray-700">{businessHour.open || "N/A"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Description */}
        {location.description && (
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">About</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{location.description}</p>
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
                src={images[currentImageIndex] || "/placeholder.svg"}
                alt={location.name}
                fill
                className="object-contain"
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
                    src={img || "/placeholder.svg"}
                    alt={`Thumbnail ${idx + 1}`}
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
          <Button variant="outline" className="flex-1" onClick={onCloseAction}>
            Back to Map
          </Button>
          <Button className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Get Directions</Button>
        </div>
      )}
    </div>
  )
}
