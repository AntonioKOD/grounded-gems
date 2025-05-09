/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { MapPin, Star, Clock, Phone, Globe, ChevronRight, Loader2, Tag, Check, Calendar, Search, X } from "lucide-react"
import type { Location } from "./map-data"
import { getCategoryColor, formatBusinessHours, formatPriceRange } from "./category-utils"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface LocationListProps {
  locations: Location[]
  onLocationSelect: (location: Location) => void
  selectedLocation: Location | null
  isLoading: boolean
}

export default function LocationList({ locations, onLocationSelect, selectedLocation, isLoading }: LocationListProps) {
  const [sortBy, setSortBy] = useState<"name" | "rating">("name")
  const [quickFilter, setQuickFilter] = useState("")
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(locations)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLLIElement>(null)

  // Apply quick filter
  useEffect(() => {
    if (!quickFilter.trim()) {
      setFilteredLocations(locations)
      return
    }

    const filtered = locations.filter((location) => {
      const searchTerm = quickFilter.toLowerCase()

      // Search in name
      if (location.name.toLowerCase().includes(searchTerm)) return true

      // Search in categories
      if (
        location.categories?.some((cat) => {
          const catName = typeof cat === "string" ? cat : cat.name
          return catName?.toLowerCase().includes(searchTerm)
        })
      )
        return true

      // Search in address
      if (typeof location.address === "string") {
        if (location.address.toLowerCase().includes(searchTerm)) return true
      } else if (location.address) {
        const addressStr = Object.values(location.address).filter(Boolean).join(" ").toLowerCase()
        if (addressStr.includes(searchTerm)) return true
      }

      return false
    })

    setFilteredLocations(filtered)
  }, [quickFilter, locations])

  // Sort locations
  const sortedLocations = [...filteredLocations].sort((a, b) => {
    if (sortBy === "rating") {
      return (b.averageRating || 0) - (a.averageRating || 0)
    }
    return (a.name || "").localeCompare(b.name || "")
  })

  // Scroll to selected location
  useEffect(() => {
    if (selectedLocation && selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [selectedLocation])

  // Clear filter
  const clearFilter = () => {
    setQuickFilter("")
  }

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
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Locations Found</h3>
        <p className="text-gray-500 max-w-xs">Try adjusting your search criteria or explore a different area.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">
            <span className="text-[#FF6B6B]">{filteredLocations.length}</span> Locations
          </h3>
          <div className="flex items-center">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "name" | "rating")}>
              <SelectTrigger className="w-[130px] h-10 text-sm border-none bg-gray-50 focus:ring-0">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name" className="py-3">
                  Name
                </SelectItem>
                <SelectItem value="rating" className="py-3">
                  Rating
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Filter locations..."
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            className="pl-9 pr-8 border-gray-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/10"
          />
          {quickFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={clearFilter}
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50" ref={listRef}>
        {sortedLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Locations</h3>
            <p className="text-gray-500 max-w-xs">Try adjusting your filter criteria</p>
            <Button variant="outline" className="mt-4" onClick={clearFilter}>
              Clear Filter
            </Button>
          </div>
        ) : (
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
              const website = contactInfo.website 

              // Get business hours summary
              const hoursText =
                location.businessHours && location.businessHours.length > 0
                  ? formatBusinessHours(location.businessHours)
                  : null

              // Get price range
              const priceRangeText = location.priceRange ? formatPriceRange(location.priceRange) : null

              // Get today's day
              const today = new Date().toLocaleDateString("en-US", { weekday: "long" })
              const todayHours = location.businessHours?.find((h) => h.day === today)

              // Check if open now
              const isOpenNow = todayHours && !todayHours.closed

              const isSelected = selectedLocation?.id === location.id

              return (
                <li
                  key={location.id}
                  ref={isSelected ? selectedRef : null}
                  className={cn(
                    "bg-white hover:bg-gray-50 cursor-pointer transition-colors",
                    isSelected ? "bg-[#FF6B6B]/5 border-l-4 border-[#FF6B6B]" : "border-l-4 border-transparent",
                  )}
                  onClick={() => onLocationSelect(location)}
                >
                  <div className="p-4 md:p-4 p-5">
                    <div className="flex">
                      <div
                        className={cn(
                          "w-24 h-24 rounded-lg overflow-hidden relative flex-shrink-0 bg-gray-100",
                          !imageUrl && "flex items-center justify-center",
                        )}
                      >
                        {imageUrl ? (
                          <Image
                            src={imageUrl || "/placeholder.svg"}
                            alt={location.name || "Location"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 96px, 96px"
                          />
                        ) : (
                          <MapPin className="h-8 w-8 text-gray-400" />
                        )}

                        {/* Badges */}
                        <div className="absolute top-0 left-0 right-0 flex justify-between p-1">
                          {location.isFeatured && (
                            <Badge className="bg-amber-500 text-white border-0 h-5 px-1.5 text-[10px]">
                              <Star className="h-2.5 w-2.5 mr-0.5 fill-white" />
                              Featured
                            </Badge>
                          )}

                          {location.isVerified && (
                            <Badge className="bg-blue-500 text-white border-0 h-5 px-1.5 text-[10px]">
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex-1">
                        <div className="flex justify-between">
                          <h3 className="font-medium text-gray-900">{location.name}</h3>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>

                        {/* Rating and price */}
                        <div className="flex items-center gap-3 mt-1">
                          {location.averageRating !== undefined && (
                            <div className="flex items-center">
                              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 mr-1" />
                              <span className="text-xs font-medium">{location.averageRating.toFixed(1)}</span>
                              {location.reviewCount !== undefined && (
                                <span className="text-xs text-gray-500 ml-1">({location.reviewCount})</span>
                              )}
                            </div>
                          )}

                          {priceRangeText && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span>{priceRangeText}</span>
                            </div>
                          )}

                          {/* Open/closed status */}
                          {todayHours && (
                            <div
                              className={cn(
                                "text-xs font-medium",
                                todayHours.closed ? "text-red-500" : "text-green-600",
                              )}
                            >
                              {todayHours.closed ? "Closed" : "Open"}
                            </div>
                          )}
                        </div>

                        {/* Address */}
                        {addressText && (
                          <div className="flex items-center mt-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-500 mr-1 flex-shrink-0" />
                            <p className="text-sm text-gray-500 truncate">{addressText}</p>
                          </div>
                        )}

                        {/* Categories */}
                        {location.categories && location.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {location.categories.slice(0, 2).map((category, idx) => {
                              const color = getCategoryColor(category)
                              const name = typeof category === "string" ? category : category?.name || "Category"

                              return (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="px-2 py-0.5 h-5 text-[10px] font-medium rounded-full"
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
                            {location.categories.length > 2 && (
                              <Badge
                                variant="outline"
                                className="px-2 py-0.5 h-5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600 border-gray-200"
                              >
                                +{location.categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Additional info */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                          {/* Hours */}
                          {hoursText && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{hoursText}</span>
                            </div>
                          )}

                          {/* Phone */}
                          {phone && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span>{phone}</span>
                            </div>
                          )}

                          {/* Website */}
                          {website && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Globe className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span>Website</span>
                            </div>
                          )}

                          {/* Best time to visit */}
                          {location.bestTimeToVisit && location.bestTimeToVisit.length > 0 && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate max-w-[100px]">
                                {location.bestTimeToVisit.map((t) => t.season).join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Tags */}
                          {location.tags && location.tags.length > 0 && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate max-w-[100px]">
                                {location.tags.map((t) => t.tag).join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
