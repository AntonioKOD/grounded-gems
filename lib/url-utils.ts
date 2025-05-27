/**
 * Safe URL utilities for production environments
 * Handles URL construction failures gracefully
 */

/**
 * Safely construct a URL with fallback handling
 */
export function safeCreateURL(path: string, base?: string): URL | null {
  try {
    const baseUrl = base || getProductionBaseUrl()
    return new URL(path, baseUrl)
  } catch (error) {
    console.error('Failed to create URL:', { path, base, error })
    return null
  }
}

/**
 * Get the production base URL with fallbacks
 */
export function getProductionBaseUrl(): string {
  // Client-side
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Server-side - production
  if (process.env.NODE_ENV === 'production') {
    return 'https://groundedgems.com'
  }
  
  // Development fallback
  return 'http://localhost:3000'
}

/**
 * Safely parse URL search parameters
 */
export function safeParseSearchParams(search?: string): URLSearchParams {
  try {
    return new URLSearchParams(search || (typeof window !== 'undefined' ? window.location.search : ''))
  } catch (error) {
    console.error('Failed to parse search params:', error)
    return new URLSearchParams()
  }
}

/**
 * Safely construct a redirect URL for middleware
 */
export function safeRedirectURL(path: string, redirectTo?: string): string {
  try {
    const baseUrl = getProductionBaseUrl()
    const url = new URL(path, baseUrl)
    
    if (redirectTo) {
      url.searchParams.set('redirect', redirectTo)
    }
    
    return url.toString()
  } catch (error) {
    console.error('Failed to create redirect URL:', { path, redirectTo, error })
    
    // Fallback URL construction
    const base = 'https://groundedgems.com'
    const query = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
    return `${base}${path}${query}`
  }
}

/**
 * Safely update browser URL with parameters
 */
export function safeUpdateURL(params: Record<string, string>): void {
  if (typeof window === 'undefined') return
  
  try {
    const url = new URL(window.location.href)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    })
    
    window.history.pushState({}, '', url.toString())
  } catch (error) {
    console.error('Failed to update URL:', { params, error })
    
    // Fallback: simple query string manipulation
    const currentUrl = window.location.href.split('?')[0]
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value)
      }
    })
    
    const queryString = searchParams.toString()
    const newUrl = queryString ? `${currentUrl}?${queryString}` : currentUrl
    window.history.pushState({}, '', newUrl)
  }
} 