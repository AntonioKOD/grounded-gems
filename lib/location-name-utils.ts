/**
 * Utility functions for handling location names consistently
 */

/**
 * Formats a location name for display, handling edge cases
 */
export function formatLocationName(name: string | null | undefined): string {
  if (!name) return 'Unnamed Location'
  
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'Unnamed Location'
  
  // Handle common issues
  return trimmed
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/^\s+|\s+$/g, '') // Trim leading/trailing spaces
}

/**
 * Gets a display name for a location with fallbacks
 */
export function getLocationDisplayName(
  name: string | null | undefined,
  fallbackName?: string
): string {
  const formatted = formatLocationName(name)
  
  if (formatted === 'Unnamed Location' && fallbackName) {
    return formatLocationName(fallbackName)
  }
  
  return formatted
}

/**
 * Truncates a location name for card display
 */
export function truncateLocationName(
  name: string | null | undefined,
  maxLength: number = 30
): string {
  const formatted = formatLocationName(name)
  
  if (formatted.length <= maxLength) {
    return formatted
  }
  
  return formatted.substring(0, maxLength - 3) + '...'
}

/**
 * Validates if a location name is valid
 */
export function isValidLocationName(name: string | null | undefined): boolean {
  if (!name) return false
  
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 100
}

/**
 * Sanitizes a location name for URL slugs
 */
export function sanitizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}








