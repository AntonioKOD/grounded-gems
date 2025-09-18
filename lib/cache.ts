/**
 * In-Memory Caching Layer for High-Performance Scaling
 * 
 * This module provides a comprehensive caching solution to reduce database load
 * and improve response times for 10,000+ users.
 * 
 * Note: This implementation uses in-memory caching instead of Redis.
 * For production with high traffic, consider using Redis for better scalability.
 */

// In-memory cache store
const memoryCache = new Map<string, { value: any; expires: number }>()

// Cache cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null

// Start cache cleanup
function startCacheCleanup() {
  if (cleanupInterval) return
  
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, item] of memoryCache.entries()) {
      if (now > item.expires) {
        memoryCache.delete(key)
      }
    }
  }, 60000) // Clean up every minute
}

// Initialize cache cleanup
startCacheCleanup()

export function getRedisClient(): any {
  // Return a mock Redis client for compatibility
  return {
    get: async (key: string) => {
      const item = memoryCache.get(key)
      if (!item || Date.now() > item.expires) {
        memoryCache.delete(key)
        return null
      }
      return JSON.stringify(item.value)
    },
    setex: async (key: string, ttl: number, value: string) => {
      memoryCache.set(key, {
        value: JSON.parse(value),
        expires: Date.now() + (ttl * 1000)
      })
      return 'OK'
    },
    del: async (key: string) => {
      memoryCache.delete(key)
      return 1
    },
    exists: async (key: string) => {
      const item = memoryCache.get(key)
      return item && Date.now() <= item.expires ? 1 : 0
    },
    mget: async (...keys: string[]) => {
      return keys.map(key => {
        const item = memoryCache.get(key)
        if (!item || Date.now() > item.expires) {
          memoryCache.delete(key)
          return null
        }
        return JSON.stringify(item.value)
      })
    },
    incr: async (key: string) => {
      const item = memoryCache.get(key)
      const current = item && Date.now() <= item.expires ? item.value : 0
      const newValue = current + 1
      memoryCache.set(key, {
        value: newValue,
        expires: Date.now() + (3600 * 1000) // 1 hour default
      })
      return newValue
    },
    expire: async (key: string, ttl: number) => {
      const item = memoryCache.get(key)
      if (item) {
        item.expires = Date.now() + (ttl * 1000)
      }
      return 1
    },
    keys: async (pattern: string) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return Array.from(memoryCache.keys()).filter(key => regex.test(key))
    },
    info: async (section: string) => {
      return `# Memory Cache Info\nused_memory:${memoryCache.size}\nused_memory_human:${memoryCache.size}B`
    },
    ping: async () => 'PONG',
    status: 'ready'
  }
}

// Cache key generators
export const CacheKeys = {
  // User-related cache keys
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  userStats: (id: string) => `user:stats:${id}`,
  userFollowers: (id: string) => `user:followers:${id}`,
  userFollowing: (id: string) => `user:following:${id}`,
  
  // Post-related cache keys
  post: (id: string) => `post:${id}`,
  userPosts: (userId: string, page: number) => `user:posts:${userId}:${page}`,
  feedPosts: (userId: string, page: number) => `feed:posts:${userId}:${page}`,
  trendingPosts: (limit: number) => `posts:trending:${limit}`,
  
  // Location-related cache keys
  location: (id: string) => `location:${id}`,
  nearbyLocations: (lat: number, lng: number, radius: number) => 
    `locations:nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`,
  locationReviews: (locationId: string, page: number) => 
    `location:reviews:${locationId}:${page}`,
  
  // Notification cache keys
  userNotifications: (userId: string, page: number) => 
    `notifications:${userId}:${page}`,
  unreadNotificationCount: (userId: string) => 
    `notifications:unread:count:${userId}`,
  
  // Search cache keys
  searchResults: (query: string, type: string, page: number) => 
    `search:${type}:${Buffer.from(query).toString('base64')}:${page}`,
  
  // Analytics cache keys
  analytics: (eventType: string, date: string) => 
    `analytics:${eventType}:${date}`,
}

// Cache TTL (Time To Live) constants
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  USER_PROFILE: 1800,    // 30 minutes
  USER_STATS: 600,       // 10 minutes
  POSTS: 900,            // 15 minutes
  LOCATIONS: 3600,       // 1 hour
  NOTIFICATIONS: 300,    // 5 minutes
  SEARCH_RESULTS: 1800,  // 30 minutes
  ANALYTICS: 3600,       // 1 hour
}

/**
 * Cache service class
 */
export class CacheService {
  private redis: any
  
  constructor() {
    this.redis = getRedisClient()
  }
  
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error)
      return null
    }
  }
  
  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      await this.redis.setex(key, ttl, serialized)
      return true
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error)
      return false
    }
  }
  
  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      console.error(`❌ Cache delete error for key ${key}:`, error)
      return false
    }
  }
  
  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        return await this.redis.del(...keys)
      }
      return 0
    } catch (error) {
      console.error(`❌ Cache delete pattern error for ${pattern}:`, error)
      return 0
    }
  }
  
  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`❌ Cache exists error for key ${key}:`, error)
      return false
    }
  }
  
  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys)
      return values.map((value: string) => value ? JSON.parse(value) : null)
    } catch (error) {
      console.error(`❌ Cache mget error:`, error)
      return keys.map(() => null)
    }
  }
  
  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, any>, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline()
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value)
        pipeline.setex(key, ttl, serialized)
      }
      
      await pipeline.exec()
      return true
    } catch (error) {
      console.error(`❌ Cache mset error:`, error)
      return false
    }
  }
  
  /**
   * Increment a counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key)
      if (ttl) {
        await this.redis.expire(key, ttl)
      }
      return result
    } catch (error) {
      console.error(`❌ Cache incr error for key ${key}:`, error)
      return 0
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory')
      const keyspace = await this.redis.info('keyspace')
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.redis.status === 'ready'
      }
    } catch (error) {
      console.error(`❌ Cache stats error:`, error)
      return null
    }
  }
}

// Global cache service instance
export const cache = new CacheService()

/**
 * Cache decorator for functions
 */
export function cached(ttl: number = CacheTTL.MEDIUM, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator(...args) : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`
      
      // Try to get from cache first
      const cached = await cache.get(key)
      if (cached !== null) {
        return cached
      }
      
      // Execute original method
      const result = await method.apply(this, args)
      
      // Cache the result
      await cache.set(key, result, ttl)
      
      return result
    }
  }
}

/**
 * Invalidate cache patterns
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const patterns = [
    CacheKeys.user(userId),
    CacheKeys.userProfile(userId),
    CacheKeys.userStats(userId),
    CacheKeys.userFollowers(userId),
    CacheKeys.userFollowing(userId),
    `user:posts:${userId}:*`,
    `feed:posts:${userId}:*`,
    `notifications:${userId}:*`,
    `notifications:unread:count:${userId}`,
  ]
  
  for (const pattern of patterns) {
    await cache.delPattern(pattern)
  }
}

export async function invalidatePostCache(postId: string, authorId?: string): Promise<void> {
  const patterns = [
    CacheKeys.post(postId),
    `posts:trending:*`,
  ]
  
  if (authorId) {
    patterns.push(`user:posts:${authorId}:*`)
    patterns.push(`feed:posts:${authorId}:*`)
  }
  
  for (const pattern of patterns) {
    await cache.delPattern(pattern)
  }
}

export async function invalidateLocationCache(locationId: string): Promise<void> {
  const patterns = [
    CacheKeys.location(locationId),
    `location:reviews:${locationId}:*`,
    `locations:nearby:*`,
  ]
  
  for (const pattern of patterns) {
    await cache.delPattern(pattern)
  }
}

/**
 * Health check for cache
 */
export async function checkCacheHealth(): Promise<boolean> {
  try {
    const redis = getRedisClient()
    const result = await redis.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('❌ Cache health check failed:', error)
    return false
  }
}
