"use client"

import { Heart, MapPin, Star, Navigation, Share2, Clock, Phone } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useCallback } from "react"
import { toast } from "sonner"
import { getPrimaryImageUrl, getOptimizedImageUrl, generateImageAltText } from "@/lib/image-utils"
import { getLocationStatusBadgeProps } from "@/lib/status-badge-utils"

interface MobileLocationCardProps {
  location: {
    id: string
    name: string
    description?: string
    shortDescription?: string
    featuredImage?: string | { url: string }
    averageRating?: number
    reviewCount?: number
    categories?: Array<string | { id: string; name: string }>
    priceRange?: string
    address?: string | Record<string, string>
    distance?: number
    isOpen?: boolean
    businessHours?: Array<{ day: string; open?: string; close?: string; closed?: boolean }>
    contactInfo?: {
      phone?: string
      website?: string
    }
    ownership?: {
      claimStatus?: 'unclaimed' | 'pending' | 'approved' | 'rejected'
      ownerId?: string
      claimedAt?: string
      claimEmail?: string
    }
  }
  onLocationClick?: (location: any) => void
  onDirectionsClick?: (location: any) => void
  onShareClick?: (location: any) => void
  currentUserId?: string
  className?: string
}

export default function MobileLocationCard({
  location,
  onLocationClick,
  onDirectionsClick,
  onShareClick,
  currentUserId,
  className,
}: MobileLocationCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!currentUserId) {
      toast.error("Please log in to save locations")
      return
    }

    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    setIsLoading(true)
    
    try {
      const response = await fetch("/api/locations/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: location.id,
          interactionType: isLiked ? "unlike" : "like",
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        }),
      })

      if (response.ok) {
        setIsLiked(!isLiked)
        toast.success(isLiked ? "Removed from favorites" : "Added to favorites")
      } else {
        throw new Error("Failed to update favorite status")
      }
    } catch (error) {
      console.error("Error handling like:", error)
      toast.error("Failed to update favorite status")
    } finally {
      setIsLoading(false)
    }
  }, [location.id, isLiked, currentUserId])

  const handleDirections = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    if (onDirectionsClick) {
      onDirectionsClick(location)
    } else {
      const address = typeof location.address === "string"
        ? location.address
        : Object.values(location.address || {}).filter(Boolean).join(", ")
      
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
      window.open(mapsUrl, "_blank")
    }
  }, [location, onDirectionsClick])

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    if (onShareClick) {
      onShareClick(location)
    } else {
      try {
        const shareUrl = `${window.location.origin}/locations/${location.id}`
        
        if (navigator.share) {
          await navigator.share({
            url: shareUrl,
          })
        } else {
          await navigator.clipboard.writeText(shareUrl)
          toast.success("Link copied to clipboard")
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error sharing:", error)
          toast.error("Could not share location")
        }
      }
    }
  }, [location, onShareClick])

  const handleCardClick = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
    
    if (onLocationClick) {
      onLocationClick(location)
    }
  }, [location, onLocationClick])

  const getImageUrl = useCallback(() => {
    // Use the new image utilities for consistent primary image handling
    const primaryImageUrl = getPrimaryImageUrl({
      id: location.id,
      name: location.name,
      featuredImage: location.featuredImage,
      gallery: (location as any).gallery, // Gallery might not be in type but could exist
      imageUrl: (location as any).imageUrl // Legacy support
    })
    
    return getOptimizedImageUrl(primaryImageUrl, 'card')
  }, [location])

  const getPriceDisplay = useCallback(() => {
    switch (location.priceRange) {
      case "free": return "Free"
      case "budget": return "$"
      case "moderate": return "$$"
      case "expensive": return "$$$"
      case "luxury": return "$$$$"
      default: return null
    }
  }, [location.priceRange])

  const getOpenStatus = useCallback(() => {
    if (!location.businessHours) return null
    
    const now = new Date()
    const currentDay = now.toLocaleDateString('en', { weekday: 'long' })
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    const todayHours = location.businessHours.find(h => 
      h.day.toLowerCase() === currentDay.toLowerCase()
    )
    
    if (!todayHours || todayHours.closed) {
      return { isOpen: false, text: "Closed" }
    }
    
    if (todayHours.open && todayHours.close) {
      const openTime = parseInt(todayHours.open.replace(':', ''))
      const closeTime = parseInt(todayHours.close.replace(':', ''))
      
      const isOpen = currentTime >= openTime && currentTime <= closeTime
      return { 
        isOpen, 
        text: isOpen ? "Open" : "Closed",
        hours: `${todayHours.open} - ${todayHours.close}`
      }
    }
    
    return null
  }, [location.businessHours])

  const openStatus = getOpenStatus()
  const priceDisplay = getPriceDisplay()

  return (
    <div 
      className={cn(
        "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden",
        "transition-all duration-200 ease-in-out",
        "active:scale-[0.98] active:shadow-md",
        "hover:shadow-md hover:border-gray-200",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div className="relative h-48 bg-gray-100">
        <Image
          src={getImageUrl()}
          alt={location.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
        
        {/* Overlay Actions */}
        <div className="absolute top-3 right-3 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm border-white/50 hover:bg-white shadow-sm"
            onClick={handleLike}
            disabled={isLoading}
            aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-colors",
                isLiked ? "text-red-500 fill-red-500" : "text-gray-600"
              )} 
            />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm border-white/50 hover:bg-white shadow-sm"
            onClick={handleShare}
            aria-label="Share location"
          >
            <Share2 className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Category Badge */}
        {location.categories?.[0] && (
          <div className="absolute top-3 left-3">
            <Badge 
              variant="secondary" 
              className="bg-white/90 backdrop-blur-sm text-gray-800 border-white/50 text-xs"
            >
              {typeof location.categories[0] === "string" 
                ? location.categories[0] 
                : location.categories[0].name}
            </Badge>
          </div>
        )}

        {/* Distance Badge */}
        {location.distance && (
          <div className="absolute bottom-3 left-3">
            <Badge 
              variant="outline" 
              className="bg-black/80 text-white border-black/50 text-xs backdrop-blur-sm"
            >
              {location.distance < 1 
                ? `${Math.round(location.distance * 1000)}m away`
                : `${location.distance.toFixed(1)}km away`}
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-1">
                  {location.name}
                </h3>
                <Badge {...getLocationStatusBadgeProps(location.ownership)} />
              </div>
            </div>
            {priceDisplay && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {priceDisplay}
              </Badge>
            )}
          </div>

          {/* Rating & Open Status */}
          <div className="flex items-center gap-3 text-sm">
            {location.averageRating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-900">
                  {location.averageRating.toFixed(1)}
                </span>
                {location.reviewCount && (
                  <span className="text-gray-500">({location.reviewCount})</span>
                )}
              </div>
            )}

            {openStatus && (
              <div className="flex items-center gap-1">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  openStatus.isOpen ? "bg-green-500" : "bg-red-500"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  openStatus.isOpen ? "text-green-700" : "text-red-700"
                )}>
                  {openStatus.text}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {(location.shortDescription || location.description) && (
          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {location.shortDescription || location.description}
          </p>
        )}

        {/* Address */}
        {location.address && (
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">
              {typeof location.address === "string"
                ? location.address
                : Object.values(location.address).filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs font-medium border-gray-200 hover:bg-gray-50"
            onClick={handleDirections}
          >
            <Navigation className="h-3.5 w-3.5 mr-1.5" />
            Directions
          </Button>

          {location.contactInfo?.phone && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-medium border-gray-200 hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation()
                if (navigator.vibrate) navigator.vibrate(50)
                window.open(`tel:${location.contactInfo?.phone}`, "_blank")
              }}
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            className="flex-1 h-9 text-xs font-medium bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            onClick={handleCardClick}
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  )
} 