import type { Location } from "./map-data"
import type { ReviewItem, User } from "./location-detail-types"

// Shared formatting functions
export const formatAddress = (address: any): string => {
  if (typeof address === "string") return address
  if (!address) return ""
  
  return [
    address.street,
    address.city,
    address.state,
    address.zip,
    address.country
  ].filter(Boolean).join(", ")
}

export const formatPriceRange = (priceRange?: string): string => {
  const ranges = {
    free: "Free",
    budget: "$",
    moderate: "$$",
    expensive: "$$$",
    luxury: "$$$$"
  }
  return ranges[priceRange as keyof typeof ranges] || "Price not available"
}

export const formatPhone = (phone: string): string => {
  try {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  } catch (error) {
    console.warn('Error formatting phone number:', error)
    return phone
  }
}

export const formatWebsite = (website: string): string => {
  try {
    return website.replace(/^https?:\/\/(www\.)?/, "")
  } catch (error) {
    console.warn('Error formatting website:', error)
    return website
  }
}

export const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Business status checker
export const getBusinessStatus = (businessHours?: any[]) => {
  if (!businessHours || businessHours.length === 0) {
    return { status: "Unknown", color: "text-muted-foreground" }
  }

  const now = new Date()
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  const todayHours = businessHours.find(
    (hours) => hours.day?.toLowerCase() === currentDay
  )

  if (!todayHours || todayHours.closed) {
    return { status: "Closed", color: "text-red-600" }
  }

  if (todayHours.open && todayHours.close) {
    const [openHour, openMinute] = todayHours.open.split(":").map(Number)
    const [closeHour, closeMinute] = todayHours.close.split(":").map(Number)
    const openTime = openHour * 60 + openMinute
    const closeTime = closeHour * 60 + closeMinute

    if (currentTime >= openTime && currentTime <= closeTime) {
      return { status: "Open", color: "text-green-600" }
    }
  }

  return { status: "Closed", color: "text-red-600" }
}

// Image URL getters
export const getLocationImageUrl = (location: Location): string => {
  try {
    if (typeof location.featuredImage === "string") {
      return location.featuredImage
    } else if (location.featuredImage?.url) {
      return location.featuredImage.url
    } else if (location.imageUrl) {
      return location.imageUrl
    }
    return "/placeholder.svg"
  } catch (error) {
    console.warn('Error getting image URL:', error)
    return "/placeholder.svg"
  }
}

// Review author helpers
export const getAuthorName = (author: ReviewItem['author']): string => {
  if (typeof author === 'string') return 'Anonymous'
  return author?.name || 'Anonymous'
}

export const getAuthorImage = (author: ReviewItem['author']): string => {
  if (typeof author === 'string') return '/placeholder.svg'
  return author?.profileImage?.url || '/placeholder.svg'
}

// Navigation helpers
export const handleDirections = (location: Location) => {
  if (location.address) {
    const addressString = typeof location.address === "string"
      ? location.address
      : [
          location.address.street,
          location.address.city,
          location.address.state,
          location.address.zip,
          location.address.country
        ].filter(Boolean).join(", ")
    
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressString)}`
    window.open(mapsUrl, "_blank")
  }
}

export const handleCall = (phone: string) => {
  window.location.href = `tel:${phone}`
}

export const handleWebsite = (website: string) => {
  const url = website.startsWith("http") ? website : `https://${website}`
  window.open(url, "_blank")
}

// Interaction helpers
export const handleLikeLocation = async (locationId: string, userId: string) => {
  try {
    const response = await fetch(`/api/locations/${locationId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: 'like' }),
    })

    if (response.ok) {
      return { success: true, message: 'Location liked!' }
    } else {
      return { success: false, message: 'Failed to like location' }
    }
  } catch (error) {
    console.error('Error liking location:', error)
    return { success: false, message: 'Failed to like location' }
  }
}

export const handleSaveLocation = async (locationId: string, userId: string) => {
  try {
    const response = await fetch(`/api/locations/${locationId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: 'save' }),
    })

    if (response.ok) {
      return { success: true, message: 'Location saved!' }
    } else {
      return { success: false, message: 'Failed to save location' }
    }
  } catch (error) {
    console.error('Error saving location:', error)
    return { success: false, message: 'Failed to save location' }
  }
}

// Review helpfulness handler
export const handleReviewHelpful = async (reviewId: string, helpful: boolean, userId: string) => {
  try {
    const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId,
        helpful
      })
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        data: {
          helpfulCount: data.helpfulCount,
          unhelpfulCount: data.unhelpfulCount,
          message: data.message
        }
      }
    } else {
      const error = await response.json()
      return { success: false, message: error.error || 'Failed to rate review' }
    }
  } catch (error) {
    console.error('Error rating review:', error)
    return { success: false, message: 'Failed to rate review' }
  }
}

// API fetchers
export const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch('/api/users/me', {
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      return data.user
    }
    return null
  } catch (error) {
    console.error('Error fetching current user:', error)
    return null
  }
}

export const fetchUserBucketLists = async (userId: string) => {
  try {
    const response = await fetch(`/api/bucket-lists?userId=${userId}`, {
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      return data.bucketLists || []
    } else {
      console.error('Failed to fetch bucket lists:', response.status)
      return []
    }
  } catch (error) {
    console.error('Error fetching bucket lists:', error)
    return []
  }
}

export const fetchLocationReviews = async (locationId: string, limit: number = 10, page: number = 1) => {
  try {
    const response = await fetch(`/api/reviews?locationId=${locationId}&limit=${limit}&page=${page}`)
    if (response.ok) {
      const data = await response.json()
      return data.reviews || []
    } else {
      console.error('Failed to fetch reviews:', response.status)
      return []
    }
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return []
  }
}

// Gallery image processing
export const processGalleryImages = (location: Location): string[] => {
  try {
    let galleryImages = location.gallery?.map(g => 
      typeof g.image === 'string' ? g.image : g.image?.url || ''
    ).filter(Boolean) || [getLocationImageUrl(location)]

    if (location.featuredImage) {
      const featuredUrl = typeof location.featuredImage === 'string' 
        ? location.featuredImage 
        : location.featuredImage.url
      if (featuredUrl && !galleryImages.includes(featuredUrl)) {
        galleryImages.unshift(featuredUrl)
      }
    }

    // Remove duplicates using Set as recommended in the search results
    return [...new Set(galleryImages)]
  } catch (error) {
    console.warn('Error processing gallery images:', error)
    return ['/placeholder.svg']
  }
} 