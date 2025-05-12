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
    // Use provided baseUrl or current URL
    const url = new URL(baseUrl || (typeof window !== "undefined" ? window.location.href : ""))
  
    // Remove any existing path segments after the base path
    url.pathname = url.pathname.split("/").slice(0, 2).join("/")
  
    // Clear any existing locationId parameter
    url.searchParams.delete("locationId")
  
    // Add the location ID
    url.searchParams.set("locationId", locationId)
  
    return url.toString()
  }
  
  /**
   * Extracts a location ID from a URL
   * @param url The URL to parse (defaults to current URL)
   * @returns The location ID if present, otherwise null
   */
  export function getLocationIdFromUrl(url?: string): string | null {
    if (typeof window === "undefined") return null
  
    const urlObj = new URL(url || window.location.href)
    return urlObj.searchParams.get("locationId")
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
    const url = new URL(window.location.href)
    url.searchParams.set("locationId", locationId)
    window.location.href = url.toString()
    return true
  }
  