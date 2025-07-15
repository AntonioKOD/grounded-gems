"use client"

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface Location {
  id: string
  name: string
  description?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  featuredImage?: {
    url: string
  }
  categories?: Array<{
    name: string
  }>
}

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void
  selectedLocation?: Location | null
  className?: string
}

export default function LocationSearch({
  onLocationSelect,
  selectedLocation,
  className = ""
}: LocationSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setLocations([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      } else {
        console.error('Failed to search locations')
        toast.error('Failed to search locations')
      }
    } catch (error) {
      console.error('Error searching locations:', error)
      toast.error('Failed to search locations')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (value.trim()) {
      setShowResults(true)
      // Debounce the search
      const timeoutId = setTimeout(() => {
        searchLocations(value)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    } else {
      setShowResults(false)
      setLocations([])
    }
    return undefined
  }

  const handleLocationSelect = (location: Location) => {
    onLocationSelect(location)
    setSearchTerm(location.name)
    setShowResults(false)
    setLocations([])
  }

  const clearSelection = () => {
    onLocationSelect(null as any)
    setSearchTerm('')
  }

  const getAddressString = (location: Location) => {
    if (!location.address) return ''
    const { street, city, state, zip, country } = location.address
    const parts = [street, city, state, zip, country].filter(Boolean)
    return parts.join(', ')
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search for a location..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 pr-10"
          disabled={!!selectedLocation}
        />
        {selectedLocation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                Searching locations...
              </div>
            ) : locations.length === 0 && searchTerm.trim() ? (
              <div className="p-4 text-center text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No locations found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => handleLocationSelect(location)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage 
                          src={location.featuredImage?.url} 
                          alt={location.name} 
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                          {getInitials(location.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {location.name}
                          </h4>
                          {location.categories && location.categories.length > 0 && location.categories[0] && (
                            <Badge variant="outline" className="text-xs">
                              {location.categories[0].name}
                            </Badge>
                          )}
                        </div>
                        
                        {location.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                            {location.description}
                          </p>
                        )}
                        
                        {getAddressString(location) && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getAddressString(location)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedLocation && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={selectedLocation.featuredImage?.url} 
                alt={selectedLocation.name} 
              />
              <AvatarFallback className="bg-green-600 text-white text-xs">
                {getInitials(selectedLocation.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-medium text-green-900">{selectedLocation.name}</h4>
              {getAddressString(selectedLocation) && (
                <p className="text-xs text-green-700">{getAddressString(selectedLocation)}</p>
              )}
            </div>
            <Badge variant="outline" className="text-green-700 border-green-300">
              Selected
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}
