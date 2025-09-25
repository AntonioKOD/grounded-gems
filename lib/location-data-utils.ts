/**
 * Utility functions for determining location data completeness and display type
 */

export interface LocationData {
  id: string
  name: string
  description?: string
  shortDescription?: string
  featuredImage?: any
  gallery?: any[]
  categories?: any[]
  tags?: any[]
  address?: any
  coordinates?: { latitude?: number; longitude?: number }
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
    socialMedia?: any
  }
  businessHours?: any[]
  priceRange?: string
  bestTimeToVisit?: any[]
  insiderTips?: any
  accessibility?: any
  isVerified?: boolean
  isFeatured?: boolean
  ownership?: {
    claimStatus?: 'unclaimed' | 'pending' | 'approved' | 'rejected'
    ownerId?: string
    claimedAt?: string
    claimEmail?: string
  }
}

/**
 * Determines if a location has comprehensive data (should show full detail page)
 */
export function hasComprehensiveData(location: LocationData): boolean {
  if (!location) return false

  let comprehensiveScore = 0
  const maxScore = 10

  // Basic required fields (2 points)
  if (location.name) comprehensiveScore += 1
  if (location.description || location.shortDescription) comprehensiveScore += 1

  // Media (2 points)
  if (location.featuredImage) comprehensiveScore += 1
  if (location.gallery && location.gallery.length > 0) comprehensiveScore += 1

  // Location details (2 points)
  if (location.address && typeof location.address === 'object' && location.address.street) comprehensiveScore += 1
  if (location.coordinates && location.coordinates.latitude && location.coordinates.longitude) comprehensiveScore += 1

  // Contact information (2 points)
  if (location.contactInfo) {
    if (location.contactInfo.phone || location.contactInfo.email || location.contactInfo.website) comprehensiveScore += 1
    if (location.contactInfo.socialMedia && Object.values(location.contactInfo.socialMedia).some(val => val)) comprehensiveScore += 1
  }

  // Business details (2 points)
  if (location.businessHours && location.businessHours.length > 0) comprehensiveScore += 1
  if (location.priceRange || location.bestTimeToVisit?.length || location.insiderTips || location.accessibility) comprehensiveScore += 1

  // Additional content (2 points)
  if (location.tags && location.tags.length > 0) comprehensiveScore += 1
  if (location.isVerified || location.isFeatured) comprehensiveScore += 1

  // Consider comprehensive if score is 6 or higher (60% of max)
  return comprehensiveScore >= 6
}

/**
 * Determines if a location has basic data only (should show simple view)
 */
export function hasBasicDataOnly(location: LocationData): boolean {
  if (!location) return false

  // Must have at least name and some description
  if (!location.name || (!location.description && !location.shortDescription)) return false

  // Check if it has minimal data (just the essentials from simple form)
  const hasMinimalData = !!(
    location.name &&
    (location.description || location.shortDescription) &&
    location.address &&
    location.coordinates
  )

  // Check if it's missing comprehensive features
  const missingComprehensiveFeatures = !(
    location.contactInfo?.phone ||
    location.contactInfo?.email ||
    location.contactInfo?.website ||
    location.businessHours?.length ||
    location.priceRange ||
    location.bestTimeToVisit?.length ||
    location.insiderTips ||
    location.accessibility ||
    location.tags?.length
  )

  return hasMinimalData && missingComprehensiveFeatures
}

/**
 * Determines the appropriate view type for a location
 */
export function getLocationViewType(location: LocationData): 'simple' | 'comprehensive' {
  if (!location) return 'simple'

  // If it's claimed and has comprehensive data, show full view
  if (location.ownership?.claimStatus === 'approved' && hasComprehensiveData(location)) {
    return 'comprehensive'
  }

  // If it's verified or featured, show comprehensive view
  if (location.isVerified || location.isFeatured) {
    return 'comprehensive'
  }

  // If it has comprehensive data, show full view
  if (hasComprehensiveData(location)) {
    return 'comprehensive'
  }

  // If it has only basic data, show simple view
  if (hasBasicDataOnly(location)) {
    return 'simple'
  }

  // Default to simple view for safety
  return 'simple'
}

/**
 * Gets a data completeness score for a location (0-100)
 */
export function getDataCompletenessScore(location: LocationData): number {
  if (!location) return 0

  let score = 0
  const maxScore = 100

  // Basic info (20 points)
  if (location.name) score += 10
  if (location.description || location.shortDescription) score += 10

  // Media (20 points)
  if (location.featuredImage) score += 10
  if (location.gallery && location.gallery.length > 0) score += 10

  // Location (20 points)
  if (location.address) score += 10
  if (location.coordinates) score += 10

  // Contact (20 points)
  if (location.contactInfo?.phone) score += 5
  if (location.contactInfo?.email) score += 5
  if (location.contactInfo?.website) score += 5
  if (location.contactInfo?.socialMedia) score += 5

  // Business details (20 points)
  if (location.businessHours?.length) score += 5
  if (location.priceRange) score += 5
  if (location.bestTimeToVisit?.length) score += 5
  if (location.insiderTips) score += 5

  return Math.min(score, maxScore)
}







