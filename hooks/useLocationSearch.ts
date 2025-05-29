import { useState, useCallback, useEffect } from 'react'

export interface LocationResult {
  id: string
  name: string
  description: string
  address: string
  coordinates: {
    latitude: number | null
    longitude: number | null
  }
  distance?: number
  averageRating: number
  reviewCount: number
  category: string
  imageUrl: string | null
  isVerified: boolean
  priceRange?: string | null
}

export interface LocationSearchOptions {
  coordinates?: {
    latitude: number
    longitude: number
  }
  radius?: number
  limit?: number
}

export function useLocationSearch() {
  const [locations, setLocations] = useState<LocationResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Search locations by text query and/or coordinates
  const searchLocations = useCallback(async (
    query?: string, 
    options?: LocationSearchOptions
  ) => {
    if (!query && !options?.coordinates) {
      setLocations([])
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/locations/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          coordinates: options?.coordinates,
          radius: options?.radius || 25,
          limit: options?.limit || 15
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLocations(data.locations || [])
        setHasSearched(true)
      } else {
        throw new Error(data.error || 'Failed to search locations')
      }
    } catch (err) {
      console.error('Location search error:', err)
      setError(err instanceof Error ? err.message : 'Failed to search locations')
      setLocations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get nearby locations based on user coordinates
  const getNearbyLocations = useCallback(async (
    latitude: number,
    longitude: number,
    radius = 25,
    limit = 15
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/locations/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius,
          limit
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLocations(data.locations || [])
        setHasSearched(true)
      } else {
        throw new Error(data.error || 'Failed to get nearby locations')
      }
    } catch (err) {
      console.error('Nearby locations error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get nearby locations')
      setLocations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Clear search results
  const clearSearch = useCallback(() => {
    setLocations([])
    setError(null)
    setHasSearched(false)
  }, [])

  // Get user's current location and search nearby
  const searchNearMe = useCallback(async (radius = 25, limit = 15) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setIsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await getNearbyLocations(
          position.coords.latitude,
          position.coords.longitude,
          radius,
          limit
        )
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('Unable to get your location. Please allow location access.')
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [getNearbyLocations])

  return {
    locations,
    isLoading,
    error,
    hasSearched,
    searchLocations,
    getNearbyLocations,
    searchNearMe,
    clearSearch
  }
} 