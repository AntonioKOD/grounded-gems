"use client"

import { useState } from "react"
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
  DollarSign,
  Tag,
  Info,
  Check,
  ShipWheelIcon as Wheelchair,
  Car,
  Heart,
  ExternalLink,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Location } from "./map-data"
import { getCategoryColor, formatBusinessHours, formatPriceRange } from "./category-utils"

interface LocationDetailProps {
  location: Location
  onCloseAction: () => void
}

export default function LocationDetail({ location, onCloseAction }: LocationDetailProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showAllHours, setShowAllHours] = useState(false)

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
  const phone = contactInfo.phone || contactInfo.phone
  const email = contactInfo.email || contactInfo.email
  const website = contactInfo.website || contactInfo.website
  const socialMedia = contactInfo.socialMedia || {}

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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">{location.name}</h2>
        <Button variant="ghost" size="icon" onClick={onCloseAction}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image gallery */}
        <div className="relative h-64 bg-gray-100">
          {images.length > 0 && (
            <Image
              src={images[activeImageIndex] || "/placeholder.svg"}
              alt={location.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
            />
          )}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 rounded-full h-8 w-8"
                onClick={prevImage}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 rounded-full h-8 w-8"
                onClick={nextImage}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn("w-2 h-2 rounded-full", idx === activeImageIndex ? "bg-white" : "bg-white/50")}
                  />
                ))}
              </div>
            </>
          )}

          {/* Featured badge */}
          {location.isFeatured && (
            <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
              Featured
            </div>
          )}

          {/* Verified badge */}
          {location.isVerified && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <Check className="h-3 w-3 mr-1" />
              Verified
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          {/* Categories */}
          {location.categories && location.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {location.categories.map((category, idx) => {
                const color = getCategoryColor(category)
                const name = typeof category === "string" ? category : category?.name || "Category"

                return (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                    }}
                  >
                    {name}
                  </span>
                )
              })}
            </div>
          )}

          {/* Rating */}
          {location.averageRating !== undefined && (
            <div className="flex items-center">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-5 w-5",
                      star <= Math.round(location.averageRating ?? 0) ? "text-amber-400 fill-amber-400" : "text-gray-300",
                    )}
                  />
                ))}
              </div>
              <span className="ml-2 text-sm font-medium">{location.averageRating.toFixed(1)}</span>
              {location.reviewCount !== undefined && (
                <span className="text-sm text-gray-500 ml-1">({location.reviewCount} reviews)</span>
              )}
            </div>
          )}

          {/* Price range */}
          {location.priceRange && (
            <div className="flex items-center text-gray-700">
              <DollarSign className="h-5 w-5 text-gray-500 mr-2" />
              <span>{formatPriceRange(location.priceRange)}</span>
            </div>
          )}

          {/* Address */}
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-gray-700">{formatAddress()}</p>
          </div>

          {/* Business hours */}
          {businessHours.length > 0 && (
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Business Hours</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowAllHours(!showAllHours)}
                  >
                    {showAllHours ? "Show Less" : "Show All"}
                  </Button>
                </div>

                {!showAllHours ? (
                  <p className="text-gray-700">{formatBusinessHours(businessHours)}</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    {sortedHours.map((hour, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="font-medium">{hour.day}</span>
                        <span>
                          {hour.closed ? (
                            <span className="text-red-500">Closed</span>
                          ) : (
                            `${hour.open || "?"} - ${hour.close || "?"}`
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact info */}
          {phone && (
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-gray-700">{phone}</p>
            </div>
          )}

          {email && (
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
              <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                {email}
              </a>
            </div>
          )}

          {website && (
            <div className="flex items-start">
              <Globe className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                {website.replace(/^https?:\/\//, "")}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}

          {/* Social media */}
          {socialMedia && Object.values(socialMedia).some(Boolean) && (
            <div className="flex items-center gap-3 mt-2">
              {socialMedia.facebook && (
                <a
                  href={
                    socialMedia.facebook.startsWith("http") ? socialMedia.facebook : `https://${socialMedia.facebook}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
              )}
              {socialMedia.twitter && (
                <a
                  href={socialMedia.twitter.startsWith("http") ? socialMedia.twitter : `https://${socialMedia.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
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
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              )}
              {socialMedia.linkedin && (
                <a
                  href={
                    socialMedia.linkedin.startsWith("http") ? socialMedia.linkedin : `https://${socialMedia.linkedin}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Tags */}
          {location.tags && location.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Tag className="h-5 w-5 text-gray-500 mr-1" />
              {location.tags.map((tagObj, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tagObj.tag}
                </span>
              ))}
            </div>
          )}

          {/* Accessibility */}
          {location.accessibility && (
            <div className="flex items-start">
              <Wheelchair className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Accessibility</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {location.accessibility.wheelchairAccess && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <Check className="h-3 w-3 mr-1" />
                      Wheelchair Access
                    </span>
                  )}
                  {location.accessibility.parking && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <Car className="h-3 w-3 mr-1" />
                      Parking Available
                    </span>
                  )}
                  {location.accessibility.other && (
                    <span className="text-sm text-gray-700">{location.accessibility.other}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Insider tips */}
          {location.insiderTips && (
            <div className="flex items-start">
              <Info className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium">Insider Tips</p>
                <p className="text-gray-700 text-sm mt-1">{location.insiderTips}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {location.description && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">About</h3>
              <p className="text-gray-700">{location.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            onClick={() => {
              const lat = location.coordinates?.latitude || location.latitude
              const lng = location.coordinates?.longitude || location.longitude

              if (lat && lng) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")
              }
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Directions
          </Button>
          <Button variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="icon">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
