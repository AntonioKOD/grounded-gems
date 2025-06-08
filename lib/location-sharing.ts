/**
 * Location sharing utilities with slug support
 */

import { generateLocationUrl } from './slug-utils'

declare global {
  interface Window {
    openLocationById?: (locationId: string) => boolean;
  }
}

// Define types for better type safety
interface LocationForSharing {
  id: string
  name: string
  slug?: string
}

/**
 * Create a shareable URL for a location using existing slug
 * @param locationId - The location ID (fallback)
 * @param locationName - The location name (fallback)
 * @param locationSlug - The existing slug (preferred)
 * @returns Shareable URL
 */
export function createLocationShareUrl(locationId: string, locationName?: string, locationSlug?: string): string {
  // Create a location object for the utility function
  const location: LocationForSharing = {
    id: locationId,
    name: locationName || 'location',
    slug: locationSlug
  }
  
  return generateLocationUrl(location)
}

/**
 * Share a location using the Web Share API or fallback to clipboard
 * @param location - Location object with slug, name, and id
 * @param description - Optional description for sharing
 */
export async function shareLocation(
  location: LocationForSharing, 
  description?: string
): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'none'; error?: string }> {
  try {
    const shareUrl = generateLocationUrl(location)
    const shareTitle = location.name
    const shareText = description || `Check out ${location.name} on Sacavia!`
    
    // Try native sharing first
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        return { success: true, method: 'native' }
      } catch (error) {
        // User cancelled or sharing failed, fall back to clipboard
        if (error instanceof Error && error.name === 'AbortError') {
          return { success: false, method: 'none', error: 'User cancelled sharing' }
        }
      }
    }
    
    // Fallback to clipboard
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      return { success: true, method: 'clipboard' }
    }
    
    return { success: false, method: 'none', error: 'Sharing not supported' }
  } catch (error) {
    console.error('Error sharing location:', error)
    return { 
      success: false, 
      method: 'none', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get social media sharing URLs for a location
 * @param location - Location object with slug, name, and id
 * @param description - Optional description
 */
export function getSocialShareUrls(location: LocationForSharing, description?: string) {
  const shareUrl = generateLocationUrl(location)
  const shareText = description || `Check out ${location.name} on Sacavia!`
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(shareText)
  
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(location.name)}&body=${encodedText}%20${encodedUrl}`,
    sms: `sms:?body=${encodedText}%20${encodedUrl}`
  }
}

/**
 * Copy location URL to clipboard
 * @param location - Location object with slug, name, and id
 */
export async function copyLocationUrl(location: LocationForSharing): Promise<boolean> {
  try {
    const shareUrl = generateLocationUrl(location)
    
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      return true
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = shareUrl
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      return true
    } finally {
      document.body.removeChild(textArea)
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    return false
  }
}

/**
 * Enhanced location sharing with analytics and error handling
 * @param location - Location object with slug, name, and id
 * @param options - Sharing options
 */
export async function shareLocationAdvanced(
  location: LocationForSharing,
  options?: {
    description?: string
    trackAnalytics?: boolean
    fallbackMessage?: string
  }
): Promise<{ success: boolean; method: string; message: string }> {
  const { description, trackAnalytics = false, fallbackMessage } = options || {}
  
  try {
    const result = await shareLocation(location, description)
    
    // Track analytics if enabled
    if (trackAnalytics && result.success) {
      // You can integrate with your analytics service here
      console.log('Location shared:', {
        locationId: location.id,
        locationSlug: location.slug,
        method: result.method
      })
    }
    
    if (result.success) {
      const message = result.method === 'native' 
        ? 'Location shared successfully!' 
        : 'Location link copied to clipboard!'
      return { success: true, method: result.method, message }
    } else {
      return { 
        success: false, 
        method: result.method, 
        message: fallbackMessage || result.error || 'Failed to share location' 
      }
    }
  } catch (error) {
    console.error('Error in advanced location sharing:', error)
    return { 
      success: false, 
      method: 'error', 
      message: 'An unexpected error occurred while sharing' 
    }
  }
}

/**
 * Generate share text for social media
 * @param location - Location object
 * @param shortDescription - Optional description
 */
export function generateLocationShareText(location: LocationForSharing, shortDescription?: string): string {
  const shareUrl = generateLocationUrl(location)
  const description = shortDescription ? ` - ${shortDescription}` : ''
  
  return `Check out ${location.name}${description} on Sacavia! 🌟 Discover amazing places and authentic experiences. ${shareUrl}`
}

/**
 * Extracts a location ID from a URL
 * @param url The URL to parse (defaults to current URL)
 * @returns The location ID if present, otherwise null
 */
export function getLocationIdFromUrl(url?: string): string | null {
  if (typeof window === "undefined") return null

  try {
    const urlObj = new URL(url || window.location.href)
    return urlObj.searchParams.get("locationId")
  } catch (error) {
    console.error('Failed to parse URL for location ID:', error)
    return null
  }
}

/**
 * Opens a location detail by ID
 * @param locationId The ID of the location to open
 * @returns true if successful, false otherwise
 */
export function openLocation(locationId: string): boolean {
  if (typeof window === "undefined") return false

  if (window.openLocationById && typeof window.openLocationById === "function") {
    return window.openLocationById(locationId)
  }

  // Fallback: update URL and reload
  try {
    const url = new URL(window.location.href)
    url.searchParams.set("locationId", locationId)
    window.location.href = url.toString()
    return true
  } catch (error) {
    console.error('Failed to update URL with location ID:', error)
    // Simple fallback
    window.location.href = `${window.location.origin}?locationId=${locationId}`
    return true
  }
} 