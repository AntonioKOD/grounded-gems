import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { MapPin, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LocationOption {
  id: string
  name: string
  fullName: string
  address: any
  neighborhood?: string
  coordinates?: { latitude: number; longitude: number }
  averageRating: number
  reviewCount: number
  categories: any[]
  imageUrl?: string
  isVerified: boolean
}

interface LocationSearchProps {
  value?: string
  selectedLocation?: LocationOption | null
  onLocationSelect?: (location: LocationOption | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LocationSearch({
  value,
  selectedLocation,
  onLocationSelect,
  placeholder = "Search for a location...",
  className,
  disabled = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch locations with debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 2) {
      setLocations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/locations/for-guides?q=${encodeURIComponent(query)}&limit=8`)
        const data = await response.json()

        if (data.success) {
          console.log('🔍 LocationSearch: API returned', data.locations?.length || 0, 'locations')
          setLocations(data.locations || [])
        } else {
          console.error('🔍 LocationSearch: API error:', data.error)
          setError('Failed to search locations')
          setLocations([])
        }
      } catch (err) {
        console.error('Location search error:', err)
        setError('Failed to search locations')
        setLocations([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const handleLocationSelect = (location: LocationOption) => {
    onLocationSelect?.(location)
    setQuery("")
    setIsOpen(false)
    setLocations([])
  }

  const handleClear = () => {
    onLocationSelect?.(null)
    setQuery("")
    setIsOpen(false)
    setLocations([])
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    console.log('🔍 LocationSearch: Input changed to:', newQuery)
    setQuery(newQuery)
    
    if (newQuery.trim().length >= 2) {
      console.log('🔍 LocationSearch: Opening dropdown')
      setIsOpen(true)
    } else {
      console.log('🔍 LocationSearch: Closing dropdown')
      setIsOpen(false)
      setLocations([])
    }
  }

  const handleInputFocus = () => {
    if (query.trim().length >= 2) {
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    // Delay closing to allow click on results
    setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  return (
    <div className={cn("relative", className)}>
      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="mb-3">
          <Card className="border-[#4ECDC4] bg-[#4ECDC4]/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-[#4ECDC4]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#4ECDC4]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">{selectedLocation.name}</h4>
                    {selectedLocation.address && (
                      <p className="text-sm text-gray-600 mb-2">
                        {[
                          selectedLocation.address.city,
                          selectedLocation.address.state,
                          selectedLocation.address.country
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedLocation.isVerified && (
                        <Badge variant="secondary" className="text-xs">
                          ✓ Verified
                        </Badge>
                      )}
                      {selectedLocation.averageRating > 0 && (
                        <Badge variant="outline" className="text-xs">
                          ⭐ {selectedLocation.averageRating.toFixed(1)} ({selectedLocation.reviewCount})
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={selectedLocation ? "Search for a different location..." : placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
            className="pl-10 h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
          />
        </div>

        {/* Debug Info */}
        {query.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            Query: "{query}" | isOpen: {isOpen.toString()} | Loading: {isLoading.toString()} | Results: {locations.length}
          </div>
        )}

        {/* Results Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-[9999] mt-1 max-h-80 overflow-hidden shadow-lg border-2 border-gray-200 bg-white rounded-lg">
            <div className="p-0">
              {isLoading && (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin w-5 h-5 border-2 border-[#4ECDC4] border-t-transparent rounded-full mx-auto mb-2"></div>
                  Searching locations...
                </div>
              )}

              {error && (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              )}

              {!isLoading && !error && locations.length === 0 && query.trim().length >= 2 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No locations found for "{query}"
                </div>
              )}

              {!isLoading && locations.length > 0 && (
                <div className="max-h-80 overflow-y-auto">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full p-4 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1">{location.name}</h4>
                          {location.address && (
                            <p className="text-sm text-gray-600 mb-2">
                              {[
                                location.address.city,
                                location.address.state,
                                location.address.country
                              ].filter(Boolean).join(', ')}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {location.isVerified && (
                              <Badge variant="secondary" className="text-xs">
                                ✓ Verified
                              </Badge>
                            )}
                            {location.averageRating > 0 && (
                              <Badge variant="outline" className="text-xs">
                                ⭐ {location.averageRating.toFixed(1)} ({location.reviewCount})
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 