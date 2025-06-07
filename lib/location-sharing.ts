/**
 * Utility functions for location sharing
 */

declare global {
  interface Window {
    openLocationById?: (locationId: string) => boolean;
  }
}

/**
 * Creates a shareable URL for a location
 * @param locationId The ID of the location to share
 * @param baseUrl Optional base URL (defaults to current URL)
 * @returns A shareable URL with the locationId parameter
 */
export function createLocationShareUrl(locationId: string, baseUrl?: string): string {
    try {
      // Use provided baseUrl or current URL with fallback
      const fallbackUrl = typeof window !== "undefined" ? window.location.href : "https://www.sacavia.com"
      const url = new URL(baseUrl || fallbackUrl)
    
      // Remove any existing path segments after the base path
      url.pathname = url.pathname.split("/").slice(0, 2).join("/")
    
      // Clear any existing locationId parameter
      url.searchParams.delete("locationId")
    
      // Add the location ID
      url.searchParams.set("locationId", locationId)
    
      return url.toString()
    } catch (error) {
      console.error('Failed to create location share URL:', error)
      // Fallback URL construction
      return `https://www.sacavia.com?locationId=${locationId}`
    }
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
  
export function generateLocationShareUrl(locationId: string, locationName?: string): string {
  // Base URL (use current domain or fallback to production)
  const fallbackUrl = typeof window !== "undefined" ? window.location.href : "https://www.sacavia.com"
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_BASE_URL || "https://www.sacavia.com")

  // ... existing code ...
}

export function generateLocationShareText(locationName: string, locationId: string): string {
  // ... existing code ...
  return `Check out ${locationName} on Sacavia! 🌟 Discover amazing places and authentic experiences. ${shareUrl}`
}

export function generateBasicShareUrl(locationId?: string): string {
  if (!locationId) {
    return `https://www.sacavia.com`
  }
  return `https://www.sacavia.com?locationId=${locationId}`
}
  