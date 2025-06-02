/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  X,
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Navigation,
  ThumbsUp,
  MessageCircle,
  CalendarDays,
  Ticket,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Location, Media } from "./map-data"
import { getCategoryColor, getCategoryName } from "./category-utils"
import LocationDetailMobile from "./location-detail-mobile"

// User interface
interface User {
  id: string
  name?: string
  email?: string
}

// Review interface  
interface Review {
  title: string
  content: string
  rating: number
  author?: string
  createdAt?: string
}

// Location detail props
interface LocationDetailProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
  isMobile?: boolean
  cluster?: {
    locations: Location[]
    isCluster: boolean
  } | null
}

// Simple responsive hook
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { isMobile }
}

// Desktop version of the location detail component
function LocationDetailDesktop({ location, isOpen, onClose }: LocationDetailProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [interactionCounts, setInteractionCounts] = useState({
    likes: 0,
    saves: 0,
    visits: 0,
    shares: 0,
  })
  const [userInteractions, setUserInteractions] = useState({
    hasLiked: false,
    hasSaved: false,
    hasVisited: false,
    hasShared: false,
  })
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [specials, setSpecials] = useState<any[]>([])
  const [loadingSpecials, setLoadingSpecials] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/users/me", {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
      setUser(null)
    } finally {
      setUserLoaded(true)
    }
  }

  // Load interaction counts
  const loadInteractionCounts = async () => {
    if (!location) return

    try {
      const [countsResponse, userInteractionsResponse] = await Promise.all([
        fetch(`/api/locations/${location.id}/interactions`),
        user ? fetch(`/api/locations/${location.id}/user-interactions?userId=${user.id}`) : Promise.resolve(null)
      ])

      if (countsResponse.ok) {
        const countsData = await countsResponse.json()
        setInteractionCounts(countsData)
      }

      if (userInteractionsResponse?.ok) {
        const userInteractionsData = await userInteractionsResponse.json()
        setUserInteractions(userInteractionsData)
      }
    } catch (error) {
      console.error("Error loading interaction data:", error)
    }
  }

  // Fetch reviews
  const fetchReviews = async () => {
    if (!location) return
    
    setLoadingReviews(true)
    try {
      const response = await fetch(`/api/locations/${location.id}/reviews`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Fetch specials
  const fetchSpecials = async () => {
    if (!location) return
    
    setLoadingSpecials(true)
    try {
      const response = await fetch(`/api/locations/${location.id}/specials`)
      if (response.ok) {
        const data = await response.json()
        setSpecials(data.specials || [])
      }
    } catch (error) {
      console.error("Error fetching specials:", error)
    } finally {
      setLoadingSpecials(false)
    }
  }

  useEffect(() => {
    if (isOpen && location) {
      fetchCurrentUser()
    }
  }, [isOpen, location])

  useEffect(() => {
    if (location && userLoaded) {
      loadInteractionCounts()
      fetchReviews()
      fetchSpecials()
    }
  }, [location, userLoaded, user])

  // Get gallery images
  const imagesMemo = useMemo(() => {
    if (!location) return []

    const images: string[] = []

    // Add featured image first
    if (location.featuredImage) {
      if (typeof location.featuredImage === "string") {
        images.push(location.featuredImage)
      } else if (location.featuredImage.url) {
        images.push(location.featuredImage.url)
      }
    }

    // Add gallery images
    if (location.gallery && Array.isArray(location.gallery)) {
      location.gallery.forEach((item: { image: Media; caption?: string }) => {
        if (item.image && item.image.url) {
          images.push(item.image.url)
        }
      })
    }

    // Fallback
    if (images.length === 0) {
      images.push("/placeholder.svg")
    }

    return images
  }, [location])

  // Image navigation
  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === imagesMemo.length - 1 ? 0 : prevIndex + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? imagesMemo.length - 1 : prevIndex - 1
    )
  }

  // Format address for display
  const formatAddress = (address: any): string => {
    if (typeof address === "string") return address
    if (!address) return ""
    
    return [
      address.street,
      address.city,
      address.state,
      address.zip,
      address.country
    ].filter(Boolean).join(", ")
  }

  // Format price range
  const formatPriceRange = (priceRange?: string): string => {
    const ranges = {
      free: "Free",
      budget: "$",
      moderate: "$$",
      expensive: "$$$",
      luxury: "$$$$"
    }
    return ranges[priceRange as keyof typeof ranges] || "Price not available"
  }

  // Business status logic
  const getBusinessStatus = () => {
    if (!location?.businessHours || location.businessHours.length === 0) {
      return { status: "Unknown", color: "text-muted-foreground" }
    }

    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const todayHours = location.businessHours.find(
      (hours) => hours.day?.toLowerCase() === currentDay
    )

    if (!todayHours || todayHours.closed) {
      return { status: "Closed", color: "text-red-600" }
    }

    if (todayHours.open && todayHours.close) {
      const [openHour, openMinute] = todayHours.open.split(":").map(Number)
      const [closeHour, closeMinute] = todayHours.close.split(":").map(Number)
      const openTime = openHour * 60 + openMinute
      const closeTime = closeHour * 60 + closeMinute

      if (currentTime >= openTime && currentTime <= closeTime) {
        return { status: "Open", color: "text-green-600" }
      }
    }

    return { status: "Closed", color: "text-red-600" }
  }

  // Get image URL
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

  // Handle like
  const handleLike = async () => {
    if (!user || !location) return

    try {
      const response = await fetch(`/api/locations/${location.id}/like`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setUserInteractions(prev => ({ ...prev, hasLiked: data.liked }))
        setInteractionCounts(prev => ({ 
          ...prev, 
          likes: data.liked ? prev.likes + 1 : prev.likes - 1 
        }))
      }
    } catch (error) {
      console.error("Error liking location:", error)
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!user || !location) return

    try {
      const response = await fetch(`/api/locations/${location.id}/save`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setUserInteractions(prev => ({ ...prev, hasSaved: data.saved }))
        setInteractionCounts(prev => ({ 
          ...prev, 
          saves: data.saved ? prev.saves + 1 : prev.saves - 1 
        }))
      }
    } catch (error) {
      console.error("Error saving location:", error)
    }
  }

  const businessStatus = getBusinessStatus()
  const categoryColor = getCategoryColor(location?.categories)

  if (!location) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">{location.name}</DialogTitle>
        <ScrollArea className="h-full max-h-[90vh]">
          <div className="relative">
            {/* Header with image */}
            <div className="relative h-64 bg-gradient-to-br from-muted to-muted/80">
              <Image
                src={imagesMemo[currentImageIndex] || getImageUrl(location)}
                alt={location.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
              
              {/* Image navigation */}
              {imagesMemo.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Header content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-white">{location.name}</h2>
                      {location.isVerified && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                          Verified
                        </Badge>
                      )}
                      {location.isFeatured && (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-200">
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-white/90">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoryColor }}
                        />
                        <span className="text-sm">{getCategoryName(location.categories)}</span>
                      </div>
                      
                      {location.averageRating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{location.averageRating.toFixed(1)}</span>
                          {location.reviewCount && (
                            <span className="text-sm text-white/70">({location.reviewCount})</span>
                          )}
                        </div>
                      )}
                      
                      {location.priceRange && (
                        <span className="text-sm">{formatPriceRange(location.priceRange)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLike}
                      className={cn(
                        "bg-black/20 hover:bg-black/40 text-white",
                        userInteractions.hasLiked && "text-red-400"
                      )}
                    >
                      <Heart className={cn("h-5 w-5", userInteractions.hasLiked && "fill-current")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSave}
                      className="bg-black/20 hover:bg-black/40 text-white"
                    >
                      <Users className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="p-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
                  <TabsTrigger value="photos">Photos ({imagesMemo.length})</TabsTrigger>
                  <TabsTrigger value="specials">Specials</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main info */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Description */}
                      {(location.shortDescription || location.description) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">About</h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {location.shortDescription || location.description}
                          </p>
                        </div>
                      )}

                      {/* Insider Tips */}
                      {location.insiderTips && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Insider Tips</h3>
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="flex items-start gap-3">
                              <span className="text-primary text-lg">💡</span>
                              <p className="text-muted-foreground">{location.insiderTips}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {location.tags && location.tags.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {location.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                {tag.tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Best Time to Visit */}
                      {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Best Time to Visit</h3>
                          <div className="flex flex-wrap gap-2">
                            {location.bestTimeToVisit.map((time, index) => (
                              <Badge key={index} variant="outline" className="border-yellow-200 text-yellow-800">
                                {time.season}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sidebar info */}
                    <div className="space-y-6">
                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button className="w-full" onClick={() => {
                            if (location.address) {
                              const addressString = formatAddress(location.address)
                              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressString)}`
                              window.open(mapsUrl, "_blank")
                            }
                          }}>
                            <Navigation className="h-4 w-4 mr-2" />
                            Get Directions
                          </Button>
                          {location.contactInfo?.phone && (
                            <Button variant="outline" className="w-full" onClick={() => {
                              if (location.contactInfo?.phone) {
                                window.location.href = `tel:${location.contactInfo.phone}`
                              }
                            }}>
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                          )}
                          {location.contactInfo?.website && (
                            <Button variant="outline" className="w-full" onClick={() => {
                              if (location.contactInfo?.website) {
                                const website = location.contactInfo.website.startsWith("http")
                                  ? location.contactInfo.website
                                  : `https://${location.contactInfo.website}`
                                window.open(website, "_blank")
                              }
                            }}>
                              <Globe className="h-4 w-4 mr-2" />
                              Website
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      {/* Contact & Hours */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Address */}
                          {location.address && (
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                              <div>
                                <p className="text-sm">{formatAddress(location.address)}</p>
                                {location.neighborhood && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {location.neighborhood}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Business Hours */}
                          {location.businessHours && location.businessHours.length > 0 && (
                            <div className="flex items-start gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium">Hours</span>
                                  <span className={cn("text-sm font-medium", businessStatus.color)}>
                                    {businessStatus.status}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {location.businessHours.map((hours, index) => (
                                    <div key={index} className="flex justify-between text-sm text-muted-foreground">
                                      <span className="capitalize">{hours.day}</span>
                                      <span>
                                        {hours.closed ? "Closed" : `${hours.open} - ${hours.close}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Contact Info */}
                          {location.contactInfo?.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">{location.contactInfo.phone}</span>
                            </div>
                          )}

                          {location.contactInfo?.website && (
                            <div className="flex items-center gap-3">
                              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <a
                                href={location.contactInfo.website.startsWith("http") 
                                  ? location.contactInfo.website 
                                  : `https://${location.contactInfo.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                {location.contactInfo.website.replace(/^https?:\/\//, "")}
                              </a>
                            </div>
                          )}

                          {/* Accessibility */}
                          {location.accessibility && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Accessibility</h4>
                              <div className="flex flex-wrap gap-2">
                                {location.accessibility.wheelchairAccess && (
                                  <Badge variant="outline" className="text-xs">
                                    ♿ Wheelchair Accessible
                                  </Badge>
                                )}
                                {location.accessibility.parking && (
                                  <Badge variant="outline" className="text-xs">
                                    🅿️ Parking
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Reviews</h3>
                    <Button>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Write Review
                    </Button>
                  </div>
                  
                  {loadingReviews ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review, index) => (
                        <Card key={index}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">{review.author || "Anonymous"}</h4>
                                  <div className="flex items-center">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "h-4 w-4",
                                          i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                                {review.title && (
                                  <h5 className="font-medium text-foreground mb-2">{review.title}</h5>
                                )}
                                <p className="text-muted-foreground">{review.content}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                      <p className="text-muted-foreground mb-4">Be the first to share your experience!</p>
                      <Button>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Write the first review
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="photos" className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imagesMemo.map((image, index) => (
                      <div
                        key={index}
                        className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <Image
                          src={image}
                          alt={`${location.name} photo ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="specials" className="space-y-6 mt-6">
                  {loadingSpecials ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : specials.length > 0 ? (
                    <div className="grid gap-4">
                      {specials.map((special, index) => (
                        <Card key={index}>
                          <CardContent className="p-6">
                            <h4 className="font-medium mb-2">{special.title}</h4>
                            <p className="text-muted-foreground">{special.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Ticket className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No current specials</h3>
                      <p className="text-muted-foreground">Check back later for deals and offers!</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Mini marker preview popup component
export function LocationPreview({ location, onViewDetail }: { location: Location; onViewDetail: () => void }) {
  const [isLiked, setIsLiked] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

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

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 min-w-[280px] max-w-[320px] border">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={getImageUrl(location)}
            alt={location.name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate mb-1">{location.name}</h3>
          
          <div className="flex items-center gap-1 mb-2">
            {location.averageRating && (
              <>
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs text-muted-foreground">
                  {location.averageRating.toFixed(1)}
                </span>
              </>
            )}
          </div>
          
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={onViewDetail}
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  )
}

// Main component
export default function LocationDetail({ location, isOpen, onClose, isMobile = false }: LocationDetailProps) {
  const { isMobile: isResponsiveMobile } = useResponsive()
  
  // Determine if we should show mobile version
  const shouldShowMobile = isMobile || isResponsiveMobile

  if (shouldShowMobile) {
    return (
      <LocationDetailMobile 
        location={location} 
        isOpen={isOpen} 
        onClose={onClose}
      />
    )
  }

  return (
    <LocationDetailDesktop 
      location={location} 
      isOpen={isOpen} 
      onClose={onClose}
    />
  )
}
