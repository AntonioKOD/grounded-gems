// lib/optimized-fetch.ts - Production-Ready Fetch Utility
"use client"

import { log } from './logger'

interface FetchOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
  retryCondition?: (error: Error, attempt: number) => boolean
}

interface FetchResponse<T = any> {
  data: T
  response: Response
  fromCache?: boolean
}

interface CacheEntry {
  data: any
  response: Response
  timestamp: number
  ttl: number
}

class OptimizedFetch {
  private cache = new Map<string, CacheEntry>()
  private abortControllers = new Map<string, AbortController>()
  private readonly MAX_CACHE_SIZE = 100
  private readonly DEFAULT_TIMEOUT = 10000 // 10 seconds
  private readonly DEFAULT_RETRIES = 3
  private readonly DEFAULT_RETRY_DELAY = 1000 // 1 second

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET'
    const body = options?.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  private isRetryableError(error: Error): boolean {
    // Retry on network errors, timeouts, and 5xx status codes
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('timeout')
    )
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private cleanCache(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    // Remove expired entries
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }

    // If cache is still too large, remove oldest entries
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.cache.size - this.MAX_CACHE_SIZE)
      
      for (const [key] of sortedEntries) {
        this.cache.delete(key)
      }
    }
  }

  private shouldCache(method: string, response: Response): boolean {
    return (
      method === 'GET' &&
      response.ok &&
      response.status < 400 &&
      !response.headers.get('cache-control')?.includes('no-cache')
    )
  }

  async fetch<T = any>(
    url: string,
    options: FetchOptions = {}
  ): Promise<FetchResponse<T>> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      retryCondition = this.isRetryableError,
      ...fetchOptions
    } = options

    const method = fetchOptions.method || 'GET'
    const cacheKey = this.getCacheKey(url, fetchOptions)
    
    // Check cache for GET requests
    if (method === 'GET') {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        log.debug('Returning cached response', { url, method })
        return {
          data: cached.data,
          response: cached.response,
          fromCache: true
        }
      }
    }

    // Cancel any existing request with the same key
    const existingController = this.abortControllers.get(cacheKey)
    if (existingController) {
      existingController.abort()
    }

    // Create new abort controller
    const abortController = new AbortController()
    this.abortControllers.set(cacheKey, abortController)

    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, timeout)

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        log.debug('Fetching', { 
          url, 
          method, 
          attempt: attempt + 1, 
          maxAttempts: retries + 1 
        })

        const response = await fetch(url, {
          ...fetchOptions,
          signal: abortController.signal
        })

        clearTimeout(timeoutId)
        this.abortControllers.delete(cacheKey)

        if (!response.ok) {
          const errorData = await response.text().catch(() => 'Unknown error')
          throw new Error(`HTTP ${response.status}: ${errorData}`)
        }

        // Clone response for caching
        const responseClone = response.clone()
        let data: T

        try {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            data = await response.json()
          } else if (contentType?.includes('text/')) {
            data = await response.text() as unknown as T
          } else {
            data = await response.blob() as unknown as T
          }
        } catch (parseError) {
          log.warn('Failed to parse response', { url, parseError })
          data = await response.text() as unknown as T
        }

        // Cache successful GET requests
        if (this.shouldCache(method, responseClone)) {
          const ttl = this.getCacheTTL(responseClone)
          this.cache.set(cacheKey, {
            data,
            response: responseClone,
            timestamp: Date.now(),
            ttl
          })
          this.cleanCache()
        }

        log.info('Fetch successful', { 
          url, 
          method, 
          status: response.status,
          attempt: attempt + 1,
          fromCache: false
        })

        return { data, response: responseClone }

      } catch (error) {
        lastError = error as Error
        
        // Handle abort/timeout
        if (abortController.signal.aborted) {
          lastError = new Error('Request timeout')
          lastError.name = 'TimeoutError'
        }

        log.warn('Fetch attempt failed', { 
          url, 
          method, 
          attempt: attempt + 1,
          error: lastError.message 
        })

        // Don't retry on the last attempt
        if (attempt === retries) break

        // Check if we should retry
        if (!retryCondition(lastError, attempt)) {
          log.info('Retry condition not met, stopping retries', { 
            url, 
            error: lastError.message 
          })
          break
        }

        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt)
        log.debug('Waiting before retry', { delay, attempt })
        await this.sleep(delay)
      }
    }

    clearTimeout(timeoutId)
    this.abortControllers.delete(cacheKey)
    if (!lastError) {
      lastError = new Error('Unknown error occurred during fetch')
    }

    log.error('All fetch attempts failed', { url, method, error: lastError.message })
    throw lastError
  }

  private getCacheTTL(response: Response): number {
    const cacheControl = response.headers.get('cache-control')
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
      if (maxAgeMatch) {
        return parseInt(maxAgeMatch[1]!) * 1000 // Convert to milliseconds
      }
    }
    
    // Default TTL: 5 minutes
    return 5 * 60 * 1000
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort()
    }
    this.abortControllers.clear()
    log.info('All pending requests cancelled')
  }

  // Cancel specific request
  cancelRequest(url: string, options?: RequestInit): void {
    const cacheKey = this.getCacheKey(url, options)
    const controller = this.abortControllers.get(cacheKey)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(cacheKey)
      log.info('Request cancelled', { url })
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
    log.info('Cache cleared')
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys())
    }
  }

  // Prefetch utility
  async prefetch(url: string, options?: FetchOptions): Promise<void> {
    try {
      await this.fetch(url, { ...options, method: 'GET' })
      log.debug('Prefetch successful', { url })
    } catch (error) {
      log.warn('Prefetch failed', { url, error: (error as Error).message })
    }
  }

  // Parallel fetch utility
  async fetchAll<T = any>(
    requests: Array<{ url: string; options?: FetchOptions }>
  ): Promise<Array<FetchResponse<T> | Error>> {
    return Promise.allSettled(
      requests.map(({ url, options }) => this.fetch<T>(url, options))
    ).then(results => 
      results.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      )
    )
  }

  // POST helper
  async post<T = any>(url: string, data: any, options?: FetchOptions): Promise<FetchResponse<T>> {
    return this.fetch<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: JSON.stringify(data)
    })
  }

  // PUT helper
  async put<T = any>(url: string, data: any, options?: FetchOptions): Promise<FetchResponse<T>> {
    return this.fetch<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: JSON.stringify(data)
    })
  }

  // DELETE helper
  async delete<T = any>(url: string, options?: FetchOptions): Promise<FetchResponse<T>> {
    return this.fetch<T>(url, {
      ...options,
      method: 'DELETE'
    })
  }
}

// Create singleton instance
const optimizedFetch = new OptimizedFetch()

// Export the instance and convenience function
export { optimizedFetch }
export type { FetchOptions, FetchResponse }
export default optimizedFetch.fetch.bind(optimizedFetch)

// Export convenience methods
export const { post, put, delete: del, prefetch, fetchAll, cancelAllRequests, cancelRequest, clearCache, getCacheStats } = optimizedFetch

// React Hook for component-scoped fetch
export function useFetch() {
  return {
    fetch: optimizedFetch.fetch.bind(optimizedFetch),
    post: optimizedFetch.post.bind(optimizedFetch),
    put: optimizedFetch.put.bind(optimizedFetch),
    delete: optimizedFetch.delete.bind(optimizedFetch),
    prefetch: optimizedFetch.prefetch.bind(optimizedFetch),
    cancel: optimizedFetch.cancelAllRequests.bind(optimizedFetch)
  }
} 