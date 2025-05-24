"use client"

import { useState, useMemo, useEffect } from "react"
import { Filter, X, Star, MapPin, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { getCategoryColor } from "@/app/(frontend)/map/category-utils"
import type { Location } from "@/app/(frontend)/map/map-data"

interface LocationFiltersProps {
  locations: Location[]
  onFilteredLocationsChange: (locations: Location[]) => void
  className?: string
}

export default function LocationFilters({ locations, onFilteredLocationsChange, className }: LocationFiltersProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"relevance" | "distance" | "rating" | "newest">("relevance")
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)

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

  // Filter and sort locations
  const filteredAndSortedLocations = useMemo(() => {
    let filtered = locations.filter((location) => {
      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 ||
        (location.categories &&
          location.categories.some((category) => {
            const categoryName = typeof category === "string" ? category : category.name
            return categoryName && selectedCategories.includes(categoryName)
          }))

      // Featured filter
      const matchesFeatured = !showFeaturedOnly || location.isFeatured

      return matchesCategory && matchesFeatured
    })

    // Sort locations
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "rating") {
        const ratingA = a.averageRating || 0
        const ratingB = b.averageRating || 0
        return ratingB - ratingA
      }

      if (sortBy === "distance") {
        const distanceA = (a as any).distance || 999
        const distanceB = (b as any).distance || 999
        return distanceA - distanceB
      }

      if (sortBy === "newest") {
        // If locations have a createdAt field, sort by that
        const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0
        const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0
        return dateB - dateA
      }

      // For relevance, keep the original order or use a more sophisticated algorithm
      return 0
    })

    return filtered
  }, [locations, selectedCategories, sortBy, showFeaturedOnly])

  // Update parent component when filtered locations change
  useEffect(() => {
    onFilteredLocationsChange(filteredAndSortedLocations)
  }, [filteredAndSortedLocations, onFilteredLocationsChange])

  // Handle category selection
  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories((prev) => (checked ? [...prev, category] : prev.filter((c) => c !== category)))
  }

  // Handle sort selection
  const handleSortChange = (value: string) => {
    setSortBy(value as "relevance" | "distance" | "rating" | "newest")
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([])
    setSortBy("relevance")
    setShowFeaturedOnly(false)
  }

  const hasActiveFilters = selectedCategories.length > 0 || sortBy !== "relevance" || showFeaturedOnly

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {/* Results count */}
      <p className="text-sm text-gray-600">
        {filteredAndSortedLocations.length} {filteredAndSortedLocations.length === 1 ? "location" : "locations"}
        {hasActiveFilters && ` (filtered from ${locations.length})`}
      </p>

      {/* Active filters display */}
      {selectedCategories.length > 0 && (
        <div className="hidden md:flex items-center gap-2 mx-4">
          {selectedCategories.map((category) => {
            const color = getCategoryColor(category)
            return (
              <Badge
                key={category}
                variant="outline"
                className="px-2 py-1 text-xs font-medium"
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
          {hasActiveFilters && (
            <Button variant="link" size="sm" onClick={clearFilters} className="text-xs text-[#FF6B6B] h-6 px-2">
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Filter button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant={hasActiveFilters ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "h-9 gap-2",
              hasActiveFilters && "bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]",
            )}
          >
            <Filter className="h-4 w-4" />
            Filter & Sort
            {hasActiveFilters && (
              <Badge className="ml-1 bg-[#FF6B6B] text-white rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                {selectedCategories.length + (sortBy !== "relevance" ? 1 : 0) + (showFeaturedOnly ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>Filter & Sort Locations</SheetTitle>
          </SheetHeader>

          <div className="py-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
            {/* Sort Options */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Sort By</h3>
              <RadioGroup value={sortBy} onValueChange={handleSortChange}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="relevance" id="relevance" />
                  <Label htmlFor="relevance" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Relevance
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="distance" id="distance" />
                  <Label htmlFor="distance" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Distance
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="rating" id="rating" />
                  <Label htmlFor="rating" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Rating
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="newest" id="newest" />
                  <Label htmlFor="newest" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Newest
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator className="my-4" />

            {/* Featured Toggle */}
            <div className="mb-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={showFeaturedOnly}
                  onCheckedChange={(checked) => setShowFeaturedOnly(checked as boolean)}
                />
                <Label htmlFor="featured" className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Show featured locations only
                </Label>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Category Filters */}
            <div>
              <h3 className="text-sm font-medium mb-3">Categories</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    />
                    <Label htmlFor={`category-${category}`} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
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
  )
} 