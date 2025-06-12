"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Globe, 
  Share2, 
  Heart, 
  Bookmark,
  Calendar,
  Users,
  Camera,
  ExternalLink,
  MessageCircle,
  CheckCircle,
  Navigation,
  Verified
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { getImageUrl, getPrimaryImageUrl, getLocationImageUrl } from "@/lib/image-utils"
import StructuredInsiderTips, { type StructuredTip } from "@/components/location/structured-insider-tips"

interface Location {
  id: string
  name: string
  description?: string
  shortDescription?: string
  featuredImage?: { url: string } | string
  gallery?: Array<{ image: string; caption?: string }>
  categories?: Array<string | { id: string; name: string }>
  tags?: Array<{ tag: string }>
  address?: string | Record<string, string>
  latitude?: number
  longitude?: number
  coordinates?: { latitude: number; longitude: number }
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
    socialMedia?: {
      facebook?: string
      twitter?: string
      instagram?: string
      linkedin?: string
    }
  }
  businessHours?: Array<{
    day: string
    open?: string
    close?: string
    closed?: boolean
  }>
  priceRange?: string
  averageRating?: number
  reviewCount?: number
  visitCount?: number
  isVerified?: boolean
  isFeatured?: boolean
  createdBy?: string | { id: string; name: string; profileImage?: { url: string } }
  createdAt?: string
  status: string
  bestTimeToVisit?: Array<{ season: string }>
  insiderTips?: StructuredTip[] | string
  accessibility?: {
    wheelchairAccess?: boolean
    parking?: boolean
    other?: string
  }
}

interface LocationDetailPageProps {
  locationId: string
}

export default function LocationDetailPage({ locationId }: LocationDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [location, setLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Fetch location data
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/locations/${locationId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Location not found")
          } else {
            setError("Failed to load location")
          }
          return
        }

        const data = await response.json()
        setLocation(data.location)

        // Fetch interaction states if user is logged in
        if (user) {
          const interactionsResponse = await fetch(`/api/locations/${locationId}/interactions`)
          if (interactionsResponse.ok) {
            const interactionsData = await interactionsResponse.json()
            setIsLiked(interactionsData.isLiked)
            setIsSaved(interactionsData.isSaved)
          }
        }
      } catch (err) {
        console.error("Error fetching location:", err)
        setError("Failed to load location")
      } finally {
        setIsLoading(false)
      }
    }

    if (locationId) {
      fetchLocation()
    }
  }, [locationId, user])

  // Helper functions
  const getLocationImageUrl = useCallback((loc: Location): string => {
    return getPrimaryImageUrl(loc)
  }, [])

  const formatAddress = useCallback((address?: string | Record<string, string>): string => {
    if (typeof address === 'string') {
      return address
    }
    if (address && typeof address === 'object') {
      return Object.values(address).filter(Boolean).join(', ')
    }
    return 'Address not available'
  }, [])

  const getCategoryNames = useCallback((categories?: Array<string | { id: string; name: string }>): string[] => {
    if (!categories) return []
    return categories.map(cat => typeof cat === 'string' ? cat : cat.name)
  }, [])

  const getCoordinates = useCallback((loc: Location): [number, number] | null => {
    let lat, lng

    if (loc.latitude != null && loc.longitude != null) {
      lat = Number(loc.latitude)
      lng = Number(loc.longitude)
    } else if (loc.coordinates?.latitude != null && loc.coordinates?.longitude != null) {
      lat = Number(loc.coordinates.latitude)
      lng = Number(loc.coordinates.longitude)
    }

    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      return [lat, lng]
    }

    return null
  }, [])

  // Interaction handlers
  const handleShare = useCallback(async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({ url })
      } catch (err) {
        console.log("Share cancelled")
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard!")
    }
  }, [])

  const handleGetDirections = useCallback(() => {
    const coords = getCoordinates(location!)
    if (coords) {
      const [lat, lng] = coords
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: userLat, longitude: userLng } = position.coords
            const directionsUrl = `https://maps.google.com/maps?saddr=${userLat},${userLng}&daddr=${lat},${lng}`
            window.open(directionsUrl, '_blank')
          },
          () => {
            const directionsUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`
            window.open(directionsUrl, '_blank')
          }
        )
      } else {
        const directionsUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`
        window.open(directionsUrl, '_blank')
      }
    }
  }, [location, getCoordinates])

  const handleInteraction = useCallback(async (type: 'like' | 'save') => {
    if (!user) {
      toast.error("Please log in to save locations")
      return
    }

    try {
      const response = await fetch(`/api/locations/${locationId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        if (type === 'like') {
          setIsLiked(!isLiked)
          toast.success(isLiked ? "Removed from favorites" : "Added to favorites")
        } else {
          setIsSaved(!isSaved)
          toast.success(isSaved ? "Removed from saved" : "Saved location")
        }
      }
    } catch (err) {
      toast.error("Action failed. Please try again.")
    }
  }, [user, locationId, isLiked, isSaved])

  // Gallery images
  const galleryImages = location?.gallery?.map(item => item.image) || []
  const allImages = location ? [getLocationImageUrl(location), ...galleryImages] : []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading location...</p>
        </div>
      </div>
    )
  }

  if (error || !location) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Location Not Found</h1>
          <p className="text-gray-600 mb-6">{error || "The location you're looking for doesn't exist or has been removed."}</p>
          <Button onClick={() => router.push('/map')} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Map
          </Button>
        </div>
      </div>
    )
  }

  const coordinates = getCoordinates(location)
  const categoryNames = getCategoryNames(location.categories)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Image Gallery */}
      <div className="relative h-96 lg:h-[500px] overflow-hidden">
        {allImages.length > 0 ? (
          <div className="relative w-full h-full">
            <Image
              src={allImages[currentImageIndex] || "/placeholder.svg"}
              alt={location.name}
              fill
              className="object-cover"
              priority
            />
            {allImages.length > 1 && (
              <>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                  {allImages.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
                  <Camera className="w-4 h-4 inline mr-1" />
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <MapPin className="w-24 h-24 text-gray-400" />
          </div>
        )}

        {/* Overlay Controls */}
        <div className="absolute top-4 left-4 z-10">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => router.back()}
            className="bg-white/90 hover:bg-white text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleShare}
            className="bg-white/90 hover:bg-white text-gray-700"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => handleInteraction('like')}
            className={`${isLiked ? 'bg-red-100 text-red-600' : 'bg-white/90 text-gray-700'} hover:bg-white`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => handleInteraction('save')}
            className={`${isSaved ? 'bg-yellow-100 text-yellow-600' : 'bg-white/90 text-gray-700'} hover:bg-white`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-[1]" />
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-3xl font-bold text-gray-900">{location.name}</h1>
                    {location.isVerified && (
                      <Verified className="w-6 h-6 text-blue-500" />
                    )}
                    {location.isFeatured && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    )}
                  </div>

                  {categoryNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {categoryNames.map((category, index) => (
                        <Badge key={index} variant="secondary" className="bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/20">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {location.averageRating && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(location.averageRating!)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-600">
                        {location.averageRating.toFixed(1)} ({location.reviewCount || 0} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {location.shortDescription && (
                <p className="text-lg text-gray-700 mb-4">{location.shortDescription}</p>
              )}

              {location.description && (
                <div className="prose max-w-none">
                  <p className="text-gray-600 leading-relaxed">{location.description}</p>
                </div>
              )}
            </div>

            {/* Insider Tips */}
            {location.insiderTips && (
              <StructuredInsiderTips
                tips={location.insiderTips}
                locationName={location.name}
                compact={false}
              />
            )}

            {/* Best Time to Visit */}
            {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#FF6B6B]" />
                    Best Time to Visit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {location.bestTimeToVisit.map((time, index) => (
                      <Badge key={index} variant="outline">
                        {time.season}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Accessibility */}
            {location.accessibility && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#FF6B6B]" />
                    Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {location.accessibility.wheelchairAccess && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Wheelchair accessible</span>
                    </div>
                  )}
                  {location.accessibility.parking && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Parking available</span>
                    </div>
                  )}
                  {location.accessibility.other && (
                    <p className="text-gray-600 mt-2">{location.accessibility.other}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {coordinates && (
                  <Button 
                    onClick={handleGetDirections}
                    className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/map')}
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleShare}
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Location
                </Button>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{formatAddress(location.address)}</p>
                    {coordinates && (
                      <p className="text-xs text-gray-500 mt-1">
                        {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                {location.contactInfo?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a 
                      href={`tel:${location.contactInfo.phone}`}
                      className="text-sm hover:text-[#FF6B6B] transition-colors"
                    >
                      {location.contactInfo.phone}
                    </a>
                  </div>
                )}

                {location.contactInfo?.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <a 
                      href={location.contactInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:text-[#FF6B6B] transition-colors flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Price Range */}
                {location.priceRange && (
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 text-gray-500 flex-shrink-0">$</span>
                    <span className="text-sm">{location.priceRange}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Hours */}
            {location.businessHours && location.businessHours.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {location.businessHours.map((hours, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="capitalize">{hours.day}</span>
                        <span className="text-gray-600">
                          {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Creator Info */}
            {location.createdBy && typeof location.createdBy === 'object' && (
              <Card>
                <CardHeader>
                  <CardTitle>Added by</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                                                    <AvatarImage src={getImageUrl(location.createdBy.profileImage?.url) || "/placeholder.svg"} />
                      <AvatarFallback>
                        {location.createdBy.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{location.createdBy.name}</p>
                      <p className="text-xs text-gray-500">Local Explorer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 