/**
 * API Request Cache and Deduplication System
 * Optimizes performance by caching responses and preventing duplicate requests
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
}

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

class APICache {
  private cache = new Map<string, CacheEntry>()
  private pendingRequests = new Map<string, PendingRequest>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes
  private readonly maxCacheSize = 200
  private readonly cleanupInterval = 60 * 1000 // 1 minute

  constructor() {
    // Periodic cleanup of expired cache entries
    setInterval(() => this.cleanup(), this.cleanupInterval)
  }

  /**
   * Generate cache key from URL and options
   */
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET'
    const body = options?.body ? JSON.stringify(options.body) : ''
    const headers = options?.headers ? JSON.stringify(options.headers) : ''
    return `${method}:${url}:${body}:${headers}`
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt
  }

  /**
   * Clean up expired entries and limit cache size
   */
  private cleanup(): void {
    const now = Date.now()
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key)
      }
    }

    // Remove old pending requests (timeout after 30 seconds)
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > 30000) {
        this.pendingRequests.delete(key)
      }
    }

    // Limit cache size (remove oldest entries)
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize)
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * Get cached data if available and valid
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key)
    if (entry && this.isValid(entry)) {
      return entry.data
    }
    if (entry) {
      this.cache.delete(key) // Remove expired entry
    }
    return null
  }

  /**
   * Set cache data with TTL
   */
  set<T = any>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    })
  }

  /**
   * Clear cache entry
   */
  clear(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  /**
   * Make deduplicated fetch request with caching
   */
  async fetch<T = any>(
    url: string, 
    options?: RequestInit, 
    ttl: number = this.defaultTTL
  ): Promise<{ data: T; response: Response; fromCache: boolean }> {
    const cacheKey = this.getCacheKey(url, options)
    
    // Check cache first for GET requests
    if (!options?.method || options.method === 'GET') {
      const cached = this.get<T>(cacheKey)
      if (cached) {
        // Create a mock response for cached data
        const mockResponse = new Response(JSON.stringify(cached), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        })
        return { data: cached, response: mockResponse, fromCache: true }
      }
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(cacheKey)
    if (pending) {
      try {
        const result = await pending.promise
        return { ...result, fromCache: false }
      } catch (error) {
        this.pendingRequests.delete(cacheKey)
        throw error
      }
    }

    // Make new request
    const promise = this.makeRequest<T>(url, options, cacheKey, ttl)
    this.pendingRequests.set(cacheKey, {
      promise,
      timestamp: Date.now()
    })

    try {
      const result = await promise
      this.pendingRequests.delete(cacheKey)
      return { ...result, fromCache: false }
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
      throw error
    }
  }

  /**
   * Internal method to make actual fetch request
   */
  private async makeRequest<T>(
    url: string, 
    options?: RequestInit, 
    cacheKey?: string, 
    ttl: number = this.defaultTTL
  ): Promise<{ data: T; response: Response }> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: T = await response.json()

    // Cache GET responses
    if (cacheKey && (!options?.method || options.method === 'GET')) {
      this.set(cacheKey, data, ttl)
    }

    return { data, response }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      memoryUsage: JSON.stringify(Array.from(this.cache.values())).length
    }
  }
}

// Create singleton instance
export const apiCache = new APICache()

/**
 * Debounce utility for limiting function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle utility for limiting function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Optimized fetch wrapper with automatic caching and deduplication
 */
export async function optimizedFetch<T = any>(
  url: string,
  options?: RequestInit & { ttl?: number; skipCache?: boolean }
): Promise<{ data: T; response: Response; fromCache: boolean }> {
  const { ttl, skipCache, ...fetchOptions } = options || {}
  
  if (skipCache) {
    const response = await fetch(url, fetchOptions)
    const data = await response.json()
    return { data, response, fromCache: false }
  }
  
  return apiCache.fetch<T>(url, fetchOptions, ttl)
}

/**
 * Batch multiple API requests with deduplication
 */
export async function batchRequests<T = any>(
  requests: Array<{ url: string; options?: RequestInit }>
): Promise<Array<{ data: T; response: Response; fromCache: boolean }>> {
  const promises = requests.map(({ url, options }) => 
    apiCache.fetch<T>(url, options)
  )
  
  return Promise.all(promises)
}

/**
 * Clear cache by pattern
 */
export function clearCacheByPattern(pattern: RegExp): void {
  const cache = (apiCache as any).cache
  for (const key of cache.keys()) {
    if (pattern.test(key)) {
      cache.delete(key)
    }
  }
}

export default apiCache 