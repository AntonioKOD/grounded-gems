/**
 * Rate limiting utility to prevent rapid API calls
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private defaultLimit: number
  private defaultWindow: number

  constructor(limit: number = 100, windowMs: number = 60000) {
    this.defaultLimit = limit
    this.defaultWindow = windowMs
  }

  /**
   * Check if a request is rate limited
   * @param key - Unique identifier for the rate limit (e.g., user ID, IP address)
   * @param limit - Maximum number of requests (optional, uses default if not provided)
   * @param windowMs - Time window in milliseconds (optional, uses default if not provided)
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key: string, limit?: number, windowMs?: number): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    const currentLimit = limit ?? this.defaultLimit
    const currentWindow = windowMs ?? this.defaultWindow
    const now = Date.now()
    
    let entry = this.store.get(key)
    
    // If no entry exists or the window has expired, create a new one
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + currentWindow
      }
      this.store.set(key, entry)
      
      return {
        allowed: true,
        remaining: currentLimit - 1,
        resetTime: entry.resetTime
      }
    }
    
    // Increment the count
    entry.count++
    
    // Check if limit is exceeded
    if (entry.count > currentLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }
    
    return {
      allowed: true,
      remaining: currentLimit - entry.count,
      resetTime: entry.resetTime
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Get current stats for a key
   */
  getStats(key: string): { count: number; resetTime: number } | null {
    const entry = this.store.get(key)
    if (!entry || Date.now() >= entry.resetTime) {
      return null
    }
    return { count: entry.count, resetTime: entry.resetTime }
  }
}

// Create singleton instances for different use cases
export const userRateLimiter = new RateLimiter(50, 60000) // 50 requests per minute per user
export const ipRateLimiter = new RateLimiter(100, 60000)  // 100 requests per minute per IP
export const followRateLimiter = new RateLimiter(10, 60000) // 10 follow/unfollow actions per minute

/**
 * Express-like middleware for rate limiting
 */
export function createRateLimitMiddleware(
  rateLimiter: RateLimiter,
  keyGenerator: (request: any) => string,
  limit?: number,
  windowMs?: number
) {
  return (request: any) => {
    const key = keyGenerator(request)
    const result = rateLimiter.check(key, limit, windowMs)
    
    return {
      ...result,
      headers: {
        'X-RateLimit-Limit': limit?.toString() || rateLimiter['defaultLimit'].toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
      }
    }
  }
}

/**
 * Client-side rate limiting helper
 */
export class ClientRateLimiter {
  private lastCalls: Map<string, number> = new Map()
  
  /**
   * Check if enough time has passed since the last call
   * @param key - Unique identifier for the operation
   * @param minInterval - Minimum time between calls in milliseconds
   * @returns boolean - true if call is allowed
   */
  canCall(key: string, minInterval: number = 1000): boolean {
    const now = Date.now()
    const lastCall = this.lastCalls.get(key)
    
    if (!lastCall || (now - lastCall) >= minInterval) {
      this.lastCalls.set(key, now)
      return true
    }
    
    return false
  }
  
  /**
   * Reset the timer for a specific key
   */
  reset(key: string): void {
    this.lastCalls.delete(key)
  }
  
  /**
   * Get time remaining until next call is allowed
   */
  getTimeRemaining(key: string, minInterval: number = 1000): number {
    const now = Date.now()
    const lastCall = this.lastCalls.get(key)
    
    if (!lastCall) return 0
    
    const elapsed = now - lastCall
    return Math.max(0, minInterval - elapsed)
  }
}

// Export a global client rate limiter instance
export const clientRateLimiter = new ClientRateLimiter()

/**
 * Cleanup function to be called periodically
 */
export function cleanupRateLimiters(): void {
  userRateLimiter.cleanup()
  ipRateLimiter.cleanup()
  followRateLimiter.cleanup()
}

// Set up periodic cleanup (every 5 minutes)
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimiters, 5 * 60 * 1000)
} 