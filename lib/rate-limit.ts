/**
 * Rate limiting utility to prevent rapid API calls
 * DISABLED - Rate limiting removed for development
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
   * DISABLED - Always returns allowed: true
   */
  check(key: string, limit?: number, windowMs?: number): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    // RATE LIMITING DISABLED - Always allow requests
    return {
      allowed: true,
      remaining: 999999,
      resetTime: Date.now() + 60000
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
 * DISABLED - Always allows requests
 */
export function createRateLimitMiddleware(
  rateLimiter: RateLimiter,
  keyGenerator: (request: any) => string,
  limit?: number,
  windowMs?: number
) {
  return (request: any) => {
    // RATE LIMITING DISABLED - Always return allowed
    return {
      allowed: true,
      remaining: 999999,
      resetTime: Date.now() + 60000,
      headers: {
        'X-RateLimit-Limit': '999999',
        'X-RateLimit-Remaining': '999999',
        'X-RateLimit-Reset': Math.ceil((Date.now() + 60000) / 1000).toString()
      }
    }
  }
}

/**
 * Client-side rate limiting helper
 * DISABLED - Always allows calls
 */
export class ClientRateLimiter {
  private lastCalls: Map<string, number> = new Map()
  
  /**
   * Check if enough time has passed since the last call
   * DISABLED - Always returns true
   */
  canCall(key: string, minInterval: number = 1000): boolean {
    // RATE LIMITING DISABLED - Always allow calls
    return true
  }
  
  /**
   * Reset the timer for a specific key
   */
  reset(key: string): void {
    this.lastCalls.delete(key)
  }
  
  /**
   * Get time remaining until next call is allowed
   * DISABLED - Always returns 0
   */
  getTimeRemaining(key: string, minInterval: number = 1000): number {
    // RATE LIMITING DISABLED - No waiting time
    return 0
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