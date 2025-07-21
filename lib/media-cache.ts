/**
 * Media Cache Utility
 * Prevents redundant requests for the same media files
 */

interface CachedMedia {
  url: string
  timestamp: number
  status: 'loading' | 'loaded' | 'error'
  data?: any
  error?: string
}

class MediaCache {
  private cache = new Map<string, CachedMedia>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 100

  /**
   * Check if a media URL is cached and still valid
   */
  isCached(url: string): boolean {
    const cached = this.cache.get(url)
    if (!cached) return false
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION
    if (isExpired) {
      this.cache.delete(url)
      return false
    }
    
    return true
  }

  /**
   * Get cached media data
   */
  get(url: string): CachedMedia | null {
    const cached = this.cache.get(url)
    if (!cached || this.isExpired(cached)) {
      this.cache.delete(url)
      return null
    }
    return cached
  }

  /**
   * Set media data in cache
   */
  set(url: string, data: any, status: 'loading' | 'loaded' | 'error' = 'loaded', error?: string): void {
    // Clean up old entries if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup()
    }

    this.cache.set(url, {
      url,
      timestamp: Date.now(),
      status,
      data,
      error
    })
  }

  /**
   * Mark media as loading
   */
  setLoading(url: string): void {
    this.set(url, null, 'loading')
  }

  /**
   * Mark media as loaded
   */
  setLoaded(url: string, data: any): void {
    this.set(url, data, 'loaded')
  }

  /**
   * Mark media as error
   */
  setError(url: string, error: string): void {
    this.set(url, null, 'error', error)
  }

  /**
   * Check if media is currently loading
   */
  isLoading(url: string): boolean {
    const cached = this.get(url)
    return cached?.status === 'loading'
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [url, cached] of this.cache.entries()) {
      if (this.isExpired(cached)) {
        this.cache.delete(url)
      }
    }
  }

  /**
   * Check if cached entry is expired
   */
  private isExpired(cached: CachedMedia): boolean {
    return Date.now() - cached.timestamp > this.CACHE_DURATION
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    }
  }
}

// Global media cache instance
export const mediaCache = new MediaCache()

/**
 * Hook to use media cache
 */
export function useMediaCache() {
  return {
    isCached: mediaCache.isCached.bind(mediaCache),
    get: mediaCache.get.bind(mediaCache),
    set: mediaCache.set.bind(mediaCache),
    setLoading: mediaCache.setLoading.bind(mediaCache),
    setLoaded: mediaCache.setLoaded.bind(mediaCache),
    setError: mediaCache.setError.bind(mediaCache),
    isLoading: mediaCache.isLoading.bind(mediaCache),
    clear: mediaCache.clear.bind(mediaCache),
    getStats: mediaCache.getStats.bind(mediaCache)
  }
}

/**
 * Utility to fetch media with caching
 */
export async function fetchMediaWithCache(url: string): Promise<any> {
  // Check if already cached
  if (mediaCache.isCached(url)) {
    const cached = mediaCache.get(url)
    if (cached?.status === 'loaded') {
      return cached.data
    }
  }

  // Check if already loading
  if (mediaCache.isLoading(url)) {
    // Wait for the loading to complete
    return new Promise((resolve, reject) => {
      const checkLoading = () => {
        const cached = mediaCache.get(url)
        if (cached?.status === 'loaded') {
          resolve(cached.data)
        } else if (cached?.status === 'error') {
          reject(new Error(cached.error))
        } else {
          setTimeout(checkLoading, 100)
        }
      }
      checkLoading()
    })
  }

  // Mark as loading
  mediaCache.setLoading(url)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status}`)
    }
    
    const data = await response.blob()
    mediaCache.setLoaded(url, data)
    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    mediaCache.setError(url, errorMessage)
    throw error
  }
} 