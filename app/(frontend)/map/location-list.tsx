"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { Search, MapPin, Star, Filter, Heart, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import type { Location } from "./map-data"
import { getCategoryColor } from "./category-utils"
import { Card, CardContent } from "@/components/ui/card"


interface LocationListProps {
  locations: Location[]
  selectedLocation: Location | null
  onLocationSelect: (location: Location) => void
  isLoading?: boolean
  onViewDetail?: (location: Location) => void
}

// Helper to get image URL
const getLocationImageUrl = (location: Location): string => {
  if (typeof location.featuredImage === "string") {
    return location.featuredImage
  }

  if (location.featuredImage?.url) {
    return location.featuredImage.url
  }

  if (location.imageUrl) {
    return location.imageUrl
  }

  return "/placeholder.svg?key=iyzeg"
}

export default function LocationList({
  locations,
  selectedLocation,
  onLocationSelect,
  isLoading = false,
  onViewDetail,
}: LocationListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"relevance" | "distance" | "rating">("relevance")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  const [favoriteLocations, setFavoriteLocations] = useState<Set<string>>(new Set())

  // Extract all unique categories from locations
  const allCategories = useMemo(() => {
    return locations.reduce((acc, location) => {
      if (location.categories && Array.isArray(location.categories)) {
        location.categories.forEach((category) => {
          const categoryName = typeof category === "string" ? category : category.name
          if (categoryName && !acc.includes(categoryName)) {
            acc.push(categoryName)
          }
        })
      }
      return acc
    }, [] as string[])
  }, [locations])

  // Filter locations based on search query and selected categories
  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      // Search query filter
      const matchesSearch =
        searchQuery === "" ||
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (location.description && location.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (location.address &&
          typeof location.address === "string" &&
          location.address.toLowerCase().includes(searchQuery.toLowerCase()))

      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 ||
        (location.categories &&
          location.categories.some((category) => {
            const categoryName = typeof category === "string" ? category : category.name
            return categoryName && selectedCategories.includes(categoryName)
          }))

      return matchesSearch && matchesCategory
    })
  }, [locations, searchQuery, selectedCategories])

  // Sort locations
  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      if (sortBy === "rating") {
        const ratingA = a.averageRating || 0
        const ratingB = b.averageRating || 0
        return ratingB - ratingA
      }

      // For relevance, keep the original order or use a more sophisticated algorithm
      return 0
    })
  }, [filteredLocations, sortBy])

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Handle category selection
  const handleCategoryChange = useCallback((category: string, checked: boolean) => {
    setSelectedCategories((prev) => (checked ? [...prev, category] : prev.filter((c) => c !== category)))
  }, [])

  // Handle sort selection
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as "relevance" | "distance" | "rating")
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedCategories([])
    setSortBy("relevance")
  }, [])

  // Toggle favorite status for a location
  const toggleFavorite = useCallback((e: React.MouseEvent, locationId: string) => {
    e.stopPropagation()
    setFavoriteLocations((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(locationId)) {
        newFavorites.delete(locationId)
      } else {
        newFavorites.add(locationId)
      }
      return newFavorites
    })
  }, [])

  // View location details
  const viewLocationDetails = useCallback(
    (e: React.MouseEvent, location: Location) => {
      e.stopPropagation()
    
      if (onViewDetail) {
        onViewDetail(location)
      }
    },
    [onViewDetail],
  )

  // Close location details
  

  // LocationCard component for consistent rendering
  const LocationCard = useCallback(
    ({ location }: { location: Location }) => {
      const isFavorite = favoriteLocations.has(location.id)
      const primaryCategory = location.categories && location.categories.length > 0 ? location.categories[0] : null
      const primaryColor = getCategoryColor(primaryCategory)

      return (
        <Card
          key={location.id}
          className={cn(
            "overflow-hidden transition-all border hover:shadow-md group mb-2",
            selectedLocation?.id === location.id
              ? "border-[#FF6B6B] bg-[#FF6B6B]/5"
              : "border-gray-200 hover:border-[#FF6B6B]/30",
          )}
          onClick={() => onLocationSelect(location)}
        >
          <CardContent className="p-0">
            <div className="flex">
              <div className="w-20 h-20 relative flex-shrink-0">
                <Image
                  src={getLocationImageUrl(location) || "/placeholder.svg"}
                  alt={location.name}
                  fill
                  className="object-cover"
                />
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: `linear-gradient(to bottom, transparent 50%, ${primaryColor || "#000"} 100%)`,
                  }}
                ></div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => toggleFavorite(e, location.id)}
                  className="absolute top-1 right-1 h-6 w-6 bg-white/70 hover:bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Heart className={cn("h-3 w-3", isFavorite ? "fill-[#FF6B6B] text-[#FF6B6B]" : "text-gray-600")} />
                </Button>
              </div>
              <div className="p-2 flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-900 truncate text-sm">{location.name}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => toggleFavorite(e, location.id)}
                    className="h-6 w-6 text-gray-400 hover:text-[#FF6B6B] -mt-0.5 -mr-0.5"
                  >
                    <Heart className={cn("h-3 w-3", isFavorite ? "fill-[#FF6B6B] text-[#FF6B6B]" : "text-gray-600")} />
                  </Button>
                </div>

                {/* Rating */}
                {location.averageRating && (
                  <div className="flex items-center mt-0.5">
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="ml-1 text-xs font-medium text-gray-700">
                        {location.averageRating.toFixed(1)}
                      </span>
                    </div>
                    {location.reviewCount && (
                      <span className="text-xs text-gray-500 ml-1">({location.reviewCount})</span>
                    )}
                  </div>
                )}

                {/* Address */}
                {location.address && (
                  <div className="flex items-center mt-0.5 text-xs text-gray-500">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <p className="truncate">
                      {typeof location.address === "string"
                        ? location.address
                        : Object.values(location.address).filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}

                {/* Categories */}
                {location.categories && location.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {location.categories.slice(0, 2).map((category, idx) => {
                      const color = getCategoryColor(category)
                      const name = typeof category === "string" ? category : category?.name || "Category"

                      return (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="px-1.5 py-0 h-4 text-[10px] font-medium rounded-full"
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
                      <span className="text-[10px] text-gray-500 flex items-center">
                        +{location.categories.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* View Details Button */}
                <Button
                  size="sm"
                  variant="default"
                  className="w-full mt-2 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white h-7 text-xs"
                  onClick={(e) => viewLocationDetails(e, location)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    },
    [selectedLocation, onLocationSelect, favoriteLocations, toggleFavorite, viewLocationDetails],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search and filter header */}
      <div className="p-3 border-b sticky top-0 bg-white z-10">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 bg-gray-50 border-gray-200 focus:ring-[#FF6B6B]/20 focus:border-[#FF6B6B]"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredLocations.length} {filteredLocations.length === 1 ? "location" : "locations"}
          </p>

          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={favoriteLocations.size > 0 ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0",
                      favoriteLocations.size > 0 && "bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]",
                    )}
                  >
                    <Heart className={cn("h-4 w-4", favoriteLocations.size > 0 && "fill-[#FF6B6B]")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Favorites ({favoriteLocations.size})</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant={selectedCategories.length > 0 ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8",
                    selectedCategories.length > 0 && "bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]",
                  )}
                >
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  Filter & Sort
                  {selectedCategories.length > 0 && (
                    <Badge className="ml-2 bg-[#FF6B6B] text-white rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <SheetHeader>
                  <SheetTitle>Filter & Sort</SheetTitle>
                </SheetHeader>

                <div className="py-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">Sort By</h3>
                    <RadioGroup value={sortBy} onValueChange={handleSortChange}>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="relevance" id="relevance" />
                        <Label htmlFor="relevance">Relevance</Label>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="distance" id="distance" />
                        <Label htmlFor="distance">Distance</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rating" id="rating" />
                        <Label htmlFor="rating">Rating</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h3 className="text-sm font-medium mb-3">Categories</h3>
                    <div className="space-y-2">
                      {allCategories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                          />
                          <Label htmlFor={`category-${category}`} className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: getCategoryColor(category) }}
                            />
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <SheetFooter className="flex-row justify-between sm:justify-between border-t pt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <SheetClose asChild>
                    <Button>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Active filters */}
      {selectedCategories.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-b bg-gray-50/80">
          {selectedCategories.map((category) => {
            const color = getCategoryColor(category)
            return (
              <Badge
                key={category}
                variant="outline"
                className="px-2 py-0.5 h-6 text-xs font-medium"
                style={{
                  backgroundColor: `${color}10`,
                  color: color,
                  borderColor: `${color}30`,
                }}
              >
                {category}
                <button
                  onClick={() => handleCategoryChange(category, false)}
                  className="ml-1 rounded-full hover:bg-gray-200/50 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button variant="link" size="sm" onClick={clearFilters} className="text-xs text-[#FF6B6B] h-6 px-2 pb-0.5">
            Clear all
          </Button>
        </div>
      )}

      {/* Location list with improved visual design */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-3">
        {filteredLocations.length > 0 ? (
          <div className="space-y-0">
            {sortedLocations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No locations found</h3>
            <p className="text-gray-500 max-w-xs">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategories([])
              }}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>



      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full border-4 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin mb-4"></div>
            <p className="text-gray-700">Loading locations...</p>
          </div>
        </div>
      )}
    </div>
  )
}
