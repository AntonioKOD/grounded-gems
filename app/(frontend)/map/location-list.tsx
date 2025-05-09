"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MapPin, Star, Clock, Phone, Globe, ChevronRight, Loader2, DollarSign, Tag } from "lucide-react"
import type { Location } from "./map-data"
import { getCategoryColor, formatBusinessHours, formatPriceRange } from "./category-utils"
import Image from "next/image"

interface LocationListProps {
  locations: Location[]
  onLocationSelect: (location: Location) => void
  selectedLocation: Location | null
  isLoading: boolean
}

export default function LocationList({ locations, onLocationSelect, selectedLocation, isLoading }: LocationListProps) {
  const [sortBy, setSortBy] = useState<"name" | "rating">("name")

  // Sort locations
  const sortedLocations = [...locations].sort((a, b) => {
    if (sortBy === "rating") {
      return (b.averageRating || 0) - (a.averageRating || 0)
    }
    return (a.name || "").localeCompare(b.name || "")
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4">
        <Loader2 className="h-8 w-8 text-[#FF6B6B] animate-spin mb-4" />
        <p className="text-gray-500">Loading locations...</p>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
        <MapPin className="h-8 w-8 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Locations Found</h3>
        <p className="text-gray-500 max-w-xs">Try adjusting your search criteria or explore a different area.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{locations.length} Locations</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "rating")}
              className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-200">
          {sortedLocations.map((location) => {
            // Format address
            let addressText = ""
            if (typeof location.address === "string") {
              addressText = location.address
            } else if (location.address) {
              addressText = [
                location.address.street,
                location.address.city,
                location.address.state,
                location.address.zip,
                location.address.country,
              ]
                .filter(Boolean)
                .join(", ")
            }

            // Get image URL
            const imageUrl =
              location.imageUrl ||
              (typeof location.featuredImage === "string" ? location.featuredImage : location.featuredImage?.url)

            // Get contact info
            const contactInfo = location.contactInfo || {}
            const phone = contactInfo.phone
            const website =  contactInfo.website

            // Get business hours summary
            const hoursText =
              location.businessHours && location.businessHours.length > 0
                ? formatBusinessHours(location.businessHours)
                : null

            // Get price range
            const priceRangeText = location.priceRange ? formatPriceRange(location.priceRange) : null

            return (
              <li
                key={location.id}
                className={cn(
                  "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                  selectedLocation?.id === location.id ? "bg-[#FF6B6B]/5 border-l-4 border-[#FF6B6B]" : "",
                )}
                onClick={() => onLocationSelect(location)}
              >
                <div className="flex">
                  <div
                    className={cn(
                      "w-20 h-20 rounded-lg overflow-hidden relative flex-shrink-0 bg-gray-100",
                      !imageUrl && "flex items-center justify-center",
                    )}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl || "/placeholder.svg"}
                        alt={location.name || "Location"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 80px, 80px"
                      />
                    ) : (
                      <MapPin className="h-8 w-8 text-gray-400" />
                    )}
                    {location.isFeatured && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs px-1 py-0.5">Featured</div>
                    )}
                  </div>

                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-900">{location.name}</h3>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    {addressText && (
                      <div className="flex items-center mt-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-500 mr-1" />
                        <p className="text-sm text-gray-500 truncate">{addressText}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {/* Categories */}
                      {location.categories && location.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {location.categories.slice(0, 2).map((category, idx) => {
                            const color = getCategoryColor(category)
                            const name = typeof category === "string" ? category : category?.name || "Category"

                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${color}20`,
                                  color: color,
                                }}
                              >
                                {name}
                              </span>
                            )
                          })}
                          {location.categories.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              +{location.categories.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Rating */}
                      {location.averageRating !== undefined && (
                        <div className="flex items-center">
                          <Star className="h-3.5 w-3.5 text-amber-400 mr-1" />
                          <span className="text-xs font-medium">{location.averageRating.toFixed(1)}</span>
                          {location.reviewCount !== undefined && (
                            <span className="text-xs text-gray-500 ml-1">({location.reviewCount})</span>
                          )}
                        </div>
                      )}

                      {/* Price range */}
                      {priceRangeText && (
                        <div className="flex items-center">
                          <DollarSign className="h-3.5 w-3.5 text-gray-500 mr-1" />
                          <span className="text-xs text-gray-600">{priceRangeText}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {/* Hours */}
                      {hoursText && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[150px]">{hoursText}</span>
                        </div>
                      )}

                      {/* Phone */}
                      {phone && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Phone className="h-3 w-3 mr-1" />
                          <span>{phone}</span>
                        </div>
                      )}

                      {/* Website */}
                      {website && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Globe className="h-3 w-3 mr-1" />
                          <span>Website</span>
                        </div>
                      )}

                      {/* Tags */}
                      {location.tags && location.tags.length > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Tag className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[100px]">{location.tags.map((t) => t.tag).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
