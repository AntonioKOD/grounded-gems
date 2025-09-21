/**
 * Utility functions for handling location slugs
 */

/**
 * Generate a URL-friendly slug from a location name (fallback only)
 * @param name The location name
 * @param id Optional ID to append for uniqueness
 * @returns A URL-friendly slug
 */
export function generateLocationSlug(name: string, id?: string): string {
  // Remove special characters and convert to lowercase
  let slug = name
    .toLowerCase()
    .trim()
    // Replace spaces and multiple consecutive spaces/hyphens with single hyphens
    .replace(/[\s\-_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9\-]/g, '')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens into single hyphens
    .replace(/-+/g, '-')

  // Ensure slug is not empty
  if (!slug || slug === '-') {
    slug = 'location'
  }

  // Append ID for uniqueness if provided
  if (id) {
    slug = `${slug}-${id.slice(-8)}` // Use last 8 chars of ID
  }

  return slug
}

/**
 * Extract location ID from a slug (if it was generated with an ID)
 * @param slug The location slug
 * @returns The extracted ID or null if not found
 */
export function extractIdFromSlug(slug: string): string | null {
  // Check if slug ends with a pattern like "-12345678" (8 chars)
  const match = slug.match(/-([a-z0-9]{8})$/i)
  if (match) {
    return match[1] || null
  }
  
  // If no ID pattern found, the slug might be the full ID
  // Check if the entire slug looks like an ID (alphanumeric, specific length)
  if (/^[a-z0-9]{20,}$/i.test(slug)) {
    return slug
  }
  
  return null
}

/**
 * Check if a string looks like a Payload CMS document ID
 * @param str The string to check
 * @returns True if it looks like a document ID
 */
function isPayloadId(str: string): boolean {
  // Payload IDs are typically 24-character hexadecimal strings
  return /^[a-f0-9]{24}$/i.test(str)
}

/**
 * Parse a location slug/ID parameter
 * This handles both legacy ID-based URLs and new slug-based URLs
 * @param param The URL parameter (could be ID or slug)
 * @returns Object with slug, id, and isLegacyId flag
 */
export function parseLocationParam(param: string): {
  slug: string
  id: string | null
  isLegacyId: boolean
} {
  console.log('🔍 parseLocationParam input:', param)
  
  // Check if it's a direct ID (legacy format)
  if (isPayloadId(param)) {
    console.log('🔍 Detected as Payload ID:', param)
    return {
      slug: param,
      id: param,
      isLegacyId: true
    }
  }

  // Try to extract ID from slug
  const extractedId = extractIdFromSlug(param)
  console.log('🔍 Extracted ID from slug:', extractedId)
  
  return {
    slug: param,
    id: extractedId,
    isLegacyId: false
  }
}

/**
 * Generate a full location URL using existing slug or fallback
 * @param location The location object with slug and optional id/name
 * @param baseUrl Optional base URL
 * @returns The full location URL
 */
export function generateLocationUrl(
  location: { slug?: string; name?: string; id: string }, 
  baseUrl?: string
): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://www.sacavia.com')
  
  // Use existing slug if available, otherwise fallback to generating one
  const slug = location.slug || generateLocationSlug(location.name || 'location', location.id)
  
  return `${base}/locations/${slug}`
}

/**
 * Check if a location has a canonical redirect (legacy ID to slug)
 * @param location The location object
 * @param currentParam The current URL parameter
 * @returns Redirect info or null
 */
export function getCanonicalRedirect(
  location: { slug?: string; id: string },
  currentParam: string
): { redirectTo: string } | null {
  // If location has a slug and current param is the ID, redirect to slug
  if (location.slug && currentParam === location.id) {
    return { redirectTo: `/locations/${location.slug}` }
  }
  
  return null
} 