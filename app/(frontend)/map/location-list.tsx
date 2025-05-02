"use client"

import { MapPin, Calendar, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Location } from "./map-data"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface LocationListProps {
  locations: Location[]
  onLocationSelect: (location: Location) => void
  selectedLocation: Location | null
  isLoading: boolean
}

export default function LocationList({ locations, onLocationSelect, selectedLocation, isLoading }: LocationListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No locations found</h3>
        <p className="text-gray-500">Try adjusting your search or filters</p>
        <Button
          variant="outline"
          className="mt-4 mx-auto"
          onClick={() => {
            // This will clear any filters
            window.dispatchEvent(new CustomEvent("clearFilters"))
          }}
        >
          Clear Filters
        </Button>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {locations.map((location) => (
        <button
          key={location.id}
          className={cn(
            "w-full text-left p-4 hover:bg-gray-50 transition-colors flex gap-3",
            selectedLocation?.id === location.id && "bg-[#4ECDC4]/5 border-l-4 border-[#4ECDC4]",
            "active:bg-gray-100 min-h-[80px]", // Increase minimum height for better touch targets
          )}
          onClick={() => onLocationSelect(location)}
        >
          <div
            className="h-16 w-16 rounded-md bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: location.imageUrl ? "transparent" : `${getCategoryColor(location.category)}20`,
            }}
          >
            {location.imageUrl ? (
              <img
                src={location.imageUrl || "/placeholder.svg"}
                alt={location.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold" style={{ color: getCategoryColor(location.category) }}>
                {location.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-medium text-gray-900 line-clamp-1 text-base">{location.name}</h3>

            <div className="flex items-center text-gray-500 text-sm mt-1">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="line-clamp-1">{location.address}</span>
            </div>

            {location.eventDate && (
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{location.eventDate}</span>
              </div>
            )}

            {location.rating && (
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Star className="h-3 w-3 mr-1 text-[#FFE66D] fill-[#FFE66D] flex-shrink-0" />
                <span>
                  {location.rating} ({location.reviewCount} reviews)
                </span>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// Helper function to get color based on category
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Music: "#FF6B6B",
    Art: "#4ECDC4",
    Food: "#FFE66D",
    Tech: "#6B66FF",
    Wellness: "#66FFB4",
    Entertainment: "#FF66E3",
    Default: "#FF6B6B",
  }

  return colors[category] || colors.Default
}
