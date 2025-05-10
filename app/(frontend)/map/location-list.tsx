"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Search, MapPin, Star, Filter } from "lucide-react"
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
import Image from "next/image"
import type { Location } from "./map-data"
import { getCategoryColor } from "./category-utils"

interface LocationListProps {
  locations: Location[]
  selectedLocation: Location | null
  onLocationSelect: (location: Location) => void
  isLoading?: boolean
}

export default function LocationList({ locations, selectedLocation, onLocationSelect }: LocationListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"relevance" | "distance" | "rating">("relevance")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Extract all unique categories from locations
  const allCategories = locations.reduce((acc, location) => {
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

  // Filter locations based on search query and selected categories
  const filteredLocations = locations.filter((location) => {
    // Search query filter
    const matchesSearch =
      searchQuery === "" ||
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (location.description && location.description.toLowerCase().includes(searchQuery.toLowerCase()))

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

  // Sort locations
  const sortedLocations = [...filteredLocations].sort((a, b) => {
    if (sortBy === "rating") {
      const ratingA = a.averageRating || 0
      const ratingB = b.averageRating || 0
      return ratingB - ratingA
    }
    // For now, other sort options just maintain original order
    // In a real app, you'd implement distance sorting using coordinates
    return 0
  })

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

  return (
    <div className="flex flex-col h-full">
      {/* Search and filter header */}
      <div className="p-4 border-b sticky top-0 bg-white z-10">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredLocations.length} {filteredLocations.length === 1 ? "location" : "locations"}
          </p>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-2" />
                Filter & Sort
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

      {/* Location list */}
      <div className="flex-1 overflow-y-auto">
        {sortedLocations.length > 0 ? (
          <div className="divide-y">
            {sortedLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => onLocationSelect(location)}
                className={cn(
                  "w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start",
                  selectedLocation?.id === location.id && "bg-[#FF6B6B]/5 hover:bg-[#FF6B6B]/10",
                )}
              >
                {/* Location image */}
                <div className="w-20 h-20 rounded-lg bg-gray-100 relative flex-shrink-0 overflow-hidden">
                  {location.imageUrl || location.featuredImage ? (
                    <Image
                      src={
                        typeof location.featuredImage === "string"
                          ? location.featuredImage
                          : location.featuredImage?.url || location.imageUrl || "/placeholder.svg"
                      }
                      alt={location.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{location.name}</h3>

                  {/* Rating */}
                  {location.averageRating && (
                    <div className="flex items-center mt-1">
                      <div className="flex items-center">
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="ml-1 text-sm font-medium text-gray-700">{location.averageRating.toFixed(1)}</span>
                      </div>
                      {location.reviewCount && (
                        <span className="text-xs text-gray-500 ml-1">({location.reviewCount})</span>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  {location.address && (
                    <div className="flex items-center mt-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-500 mr-1 flex-shrink-0" />
                      <p className="text-sm text-gray-500 truncate">
                        {typeof location.address === "string"
                          ? location.address
                          : Object.values(location.address).filter(Boolean).join(", ")}
                      </p>
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
                        <span className="text-xs text-gray-500 ml-1 flex items-center">
                          +{location.categories.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
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
    </div>
  )
}
