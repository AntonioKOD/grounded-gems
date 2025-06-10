import { useState, useCallback } from 'react'

interface FoursquarePlace {
  foursquareId: string
  preview: any
  original: any
  distance?: number
  distanceText?: string
  categories: string[]
  rating?: number
  verified?: boolean
  photos?: number
  tips?: number
}

interface SearchParams {
  query?: string
  latitude?: number
  longitude?: number
  near?: string
  category?: string
  radius?: number
  limit?: number
  sort?: 'DISTANCE' | 'POPULARITY' | 'RATING' | 'RELEVANCE'
}

interface DiscoverParams {
  latitude: number
  longitude: number
  radius?: number
  limit?: number
  categories?: string
  excludeChains?: boolean
}

interface UseFoursquareReturn {
  // State
  isLoading: boolean
  error: string | null
  searchResults: FoursquarePlace[]
  discoveryResults: FoursquarePlace[]
  
  // Actions
  searchPlaces: (params: SearchParams) => Promise<FoursquarePlace[]>
  discoverNearby: (params: DiscoverParams) => Promise<FoursquarePlace[]>
  discoverByInterests: (params: { 
    latitude: number
    longitude: number
    interests: string[]
    radius?: number
    limit?: number
  }) => Promise<FoursquarePlace[]>
  importPlaces: (foursquareIds: string[]) => Promise<any>
  clearResults: () => void
}

export function useFoursquare(): UseFoursquareReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<FoursquarePlace[]>([])
  const [discoveryResults, setDiscoveryResults] = useState<FoursquarePlace[]>([])

  const searchPlaces = useCallback(async (params: SearchParams): Promise<FoursquarePlace[]> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const searchParams = new URLSearchParams()
      
      if (params.query) searchParams.append('query', params.query)
      if (params.latitude && params.longitude) {
        searchParams.append('latitude', params.latitude.toString())
        searchParams.append('longitude', params.longitude.toString())
      }
      if (params.near) searchParams.append('near', params.near)
      if (params.category) searchParams.append('category', params.category)
      if (params.radius) searchParams.append('radius', params.radius.toString())
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.sort) searchParams.append('sort', params.sort)

      const response = await fetch(`/api/foursquare/search?${searchParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setSearchResults(data.results)
      return data.results
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const discoverNearby = useCallback(async (params: DiscoverParams): Promise<FoursquarePlace[]> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const searchParams = new URLSearchParams({
        latitude: params.latitude.toString(),
        longitude: params.longitude.toString(),
        radius: (params.radius || 1000).toString(),
        limit: (params.limit || 50).toString()
      })

      if (params.categories) searchParams.append('categories', params.categories)
      if (params.excludeChains) searchParams.append('exclude_chains', 'true')

      const response = await fetch(`/api/foursquare/discover?${searchParams}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Discovery failed')
      }

      setDiscoveryResults(data.results)
      return data.results
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const discoverByInterests = useCallback(async (params: { 
    latitude: number
    longitude: number
    interests: string[]
    radius?: number
    limit?: number
  }): Promise<FoursquarePlace[]> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/foursquare/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover_by_interests',
          data: params
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Interest-based discovery failed')
      }

      setDiscoveryResults(data.results)
      return data.results
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const importPlaces = useCallback(async (foursquareIds: string[]) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/foursquare/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          data: {
            foursquareIds,
            createdBy: null // System import
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setSearchResults([])
    setDiscoveryResults([])
    setError(null)
  }, [])

  return {
    // State
    isLoading,
    error,
    searchResults,
    discoveryResults,
    
    // Actions
    searchPlaces,
    discoverNearby,
    discoverByInterests,
    importPlaces,
    clearResults
  }
}

// Helper hook for getting user's current location
export function useGeolocation() {
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return Promise.reject(new Error('Geolocation not supported'))
    }

    setIsLoading(true)
    setError(null)

    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
          setCoordinates(coords)
          setIsLoading(false)
          resolve(coords)
        },
        (error) => {
          const errorMessage = `Geolocation error: ${error.message}`
          setError(errorMessage)
          setIsLoading(false)
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      )
    })
  }, [])

  return {
    coordinates,
    isLoading,
    error,
    getCurrentLocation
  }
} 