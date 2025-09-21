/**
 * Utility functions for formatting and displaying addresses consistently
 */

export interface AddressData {
  street?: string
  city?: string
  state?: string
  zip?: string
  zipCode?: string
  country?: string
  neighborhood?: string
}

/**
 * Formats an address object or string into a readable format
 */
export function formatAddress(address: AddressData | string | null | undefined): string {
  if (!address) return 'Address not available'
  
  if (typeof address === 'string') {
    return address.trim() || 'Address not available'
  }
  
  const parts: string[] = []
  
  // Add street address
  if (address.street) {
    parts.push(address.street.trim())
  }
  
  // Add city
  if (address.city) {
    parts.push(address.city.trim())
  }
  
  // Add state
  if (address.state) {
    parts.push(address.state.trim())
  }
  
  // Add ZIP code (check both zip and zipCode fields)
  const zipCode = address.zip || address.zipCode
  if (zipCode) {
    parts.push(zipCode.trim())
  }
  
  // Add country if it's not US/USA
  if (address.country && !['US', 'USA', 'United States'].includes(address.country.trim())) {
    parts.push(address.country.trim())
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Address not available'
}

/**
 * Formats an address for display in cards (shorter format)
 */
export function formatAddressForCard(address: AddressData | string | null | undefined): string {
  if (!address) return 'Address not available'
  
  if (typeof address === 'string') {
    // If it's a string, try to extract city and state for shorter display
    const parts = address.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      return `${parts[1]}, ${parts[2] || ''}`.replace(/,$/, '').trim()
    }
    return address.length > 50 ? address.substring(0, 50) + '...' : address
  }
  
  const parts: string[] = []
  
  // For cards, prioritize city and state
  if (address.city) {
    parts.push(address.city.trim())
  }
  
  if (address.state) {
    parts.push(address.state.trim())
  }
  
  // If no city/state, fall back to street
  if (parts.length === 0 && address.street) {
    return address.street.length > 50 ? address.street.substring(0, 50) + '...' : address.street
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Address not available'
}

/**
 * Formats an address for display in details (full format)
 */
export function formatAddressForDetails(address: AddressData | string | null | undefined): string {
  return formatAddress(address)
}

/**
 * Gets a short location identifier (city, state)
 */
export function getLocationIdentifier(address: AddressData | string | null | undefined): string {
  if (!address) return 'Location'
  
  if (typeof address === 'string') {
    const parts = address.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      return `${parts[1]}, ${parts[2] || ''}`.replace(/,$/, '').trim()
    }
    return parts[0] || 'Location'
  }
  
  const parts: string[] = []
  
  if (address.city) {
    parts.push(address.city.trim())
  }
  
  if (address.state) {
    parts.push(address.state.trim())
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Location'
}

/**
 * Validates if an address has sufficient information
 */
export function hasValidAddress(address: AddressData | string | null | undefined): boolean {
  if (!address) return false
  
  if (typeof address === 'string') {
    return address.trim().length > 0
  }
  
  // Check if we have at least city or street
  return !!(address.city?.trim() || address.street?.trim())
}

/**
 * Extracts coordinates from address if available
 */
export function getAddressCoordinates(address: AddressData | string | null | undefined): { latitude?: number; longitude?: number } | null {
  if (!address || typeof address !== 'object') return null
  
  const coords = (address as any).coordinates || (address as any).coords
  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    return { latitude: coords.latitude, longitude: coords.longitude }
  }
  
  return null
}

