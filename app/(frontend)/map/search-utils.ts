/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Location } from "./map-data"

/**
 * Search locations by name, description, address, and categories
 */
export function searchLocations(locations: Location[], query: string): Location[] {
  if (!query.trim()) {
    return locations
  }

  const searchTerm = query.toLowerCase().trim()

  return locations.filter((location) => {
    // Search in name
    if (location.name?.toLowerCase().includes(searchTerm)) {
      return true
    }

    // Search in description
    if (location.description?.toLowerCase().includes(searchTerm)) {
      return true
    }

    // Search in short description
    if (location.shortDescription?.toLowerCase().includes(searchTerm)) {
      return true
    }

    // Search in address
    if (location.address) {
      const addressStr = typeof location.address === "string" 
        ? location.address.toLowerCase()
        : Object.values(location.address).filter(Boolean).join(" ").toLowerCase()
      
      if (addressStr.includes(searchTerm)) {
        return true
      }
    }

    // Search in categories
    if (location.categories && Array.isArray(location.categories)) {
      const categoryMatch = location.categories.some((category: any) => {
        if (typeof category === "string") {
          return category.toLowerCase().includes(searchTerm)
        } else if (category && (category.name || category.id)) {
          const categoryName = (category.name || category.id).toLowerCase()
          return categoryName.includes(searchTerm)
        }
        return false
      })
      
      if (categoryMatch) {
        return true
      }
    }

    // Search in tags if they exist
    if (location.tags && Array.isArray(location.tags)) {
      const tagMatch = location.tags.some((tag: any) => {
        if (typeof tag === "string") {
          return tag.toLowerCase().includes(searchTerm)
        } else if (tag && tag.name) {
          return tag.name.toLowerCase().includes(searchTerm)
        }
        return false
      })
      
      if (tagMatch) {
        return true
      }
    }

    return false
  })
}

/**
 * Check if a location matches the selected categories
 */
export function locationMatchesCategories(location: Location, selectedCategories: string[]): boolean {
  if (!selectedCategories.length) {
    return true
  }

  if (!location.categories || !Array.isArray(location.categories)) {
    return false
  }

  return location.categories.some((category: any) => {
    const categoryId = typeof category === "string" ? category : category?.id
    return categoryId && selectedCategories.includes(categoryId)
  })
}

/**
 * Filter locations by multiple criteria
 */
export function filterLocations(
  locations: Location[], 
  filters: {
    query?: string
    categories?: string[]
    rating?: number
    distance?: number
    userLocation?: [number, number]
  }
): Location[] {
  let filtered = [...locations]

  // Apply search query filter
  if (filters.query) {
    filtered = searchLocations(filtered, filters.query)
  }

  // Apply category filter
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(location => locationMatchesCategories(location, filters.categories!))
  }

  // Apply rating filter
  if (filters.rating && filters.rating > 0) {
    filtered = filtered.filter(location => 
      location.averageRating && location.averageRating >= filters.rating!
    )
  }

  // Apply distance filter (if user location is provided)
  if (filters.distance && filters.userLocation) {
    filtered = filtered.filter(location => {
      const distance = calculateDistance(
        filters.userLocation![0], 
        filters.userLocation![1],
        location.latitude,
        location.longitude
      )
      return distance <= filters.distance! * 1000 // Convert km to meters
    })
  }

  return filtered
}

/**
 * Calculate distance between two points in meters using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lng2-lng1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

/**
 * Sort locations by relevance to search query
 */
export function sortLocationsByRelevance(locations: Location[], query: string): Location[] {
  if (!query.trim()) {
    return locations
  }

  const searchTerm = query.toLowerCase().trim()

  return locations.sort((a, b) => {
    // Calculate relevance scores
    const scoreA = calculateRelevanceScore(a, searchTerm)
    const scoreB = calculateRelevanceScore(b, searchTerm)
    
    // Sort by score (higher score = more relevant)
    return scoreB - scoreA
  })
}

/**
 * Calculate relevance score for a location based on search query
 */
function calculateRelevanceScore(location: Location, searchTerm: string): number {
  let score = 0

  // Name match (highest priority)
  if (location.name?.toLowerCase().includes(searchTerm)) {
    score += location.name.toLowerCase().startsWith(searchTerm) ? 100 : 50
  }

  // Category match (high priority)
  if (location.categories && Array.isArray(location.categories)) {
    const categoryMatch = location.categories.some((category: any) => {
      const categoryName = typeof category === "string" ? category : category?.name || category?.id
      return categoryName && categoryName.toLowerCase().includes(searchTerm)
    })
    if (categoryMatch) score += 30
  }

  // Description match (medium priority)
  if (location.description?.toLowerCase().includes(searchTerm)) {
    score += 20
  }

  // Address match (low priority)
  if (location.address) {
    const addressStr = typeof location.address === "string" 
      ? location.address.toLowerCase()
      : Object.values(location.address).filter(Boolean).join(" ").toLowerCase()
    
    if (addressStr.includes(searchTerm)) {
      score += 10
    }
  }

  // Boost score for locations with higher ratings
  if (location.averageRating) {
    score += location.averageRating * 2
  }

  return score
} 