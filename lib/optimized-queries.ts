/**
 * Optimized Database Query Helpers
 * 
 * This module provides optimized query functions with proper pagination,
 * caching, and performance monitoring for handling 10,000+ users.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { cache, CacheKeys, CacheTTL } from './cache'
import { Where } from 'payload'

export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
  depth?: number
}

export interface QueryResult<T> {
  docs: T[]
  totalDocs: number
  limit: number
  page?: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage?: number | null
  prevPage?: number | null
}

/**
 * Optimized user queries
 */
export class OptimizedUserQueries {
  private static payload = getPayload({ config })
  
  /**
   * Get user by ID with caching
   */
  static async getUserById(userId: string, useCache: boolean = true): Promise<any | null> {
    const cacheKey = CacheKeys.user(userId)
    
    if (useCache) {
      const cached = await cache.get<any>(cacheKey)
      if (cached) return cached
    }
    
    try {
      const payload = await this.payload
      const user = await payload.findByID({
        collection: 'users',
        id: userId,
        depth: 1
      })
      
      if (user && useCache) {
        await cache.set(cacheKey, user, CacheTTL.USER_PROFILE)
      }
      
      return user
    } catch (error) {
      console.error(`❌ Error fetching user ${userId}:`, error)
      return null
    }
  }
  
  /**
   * Get user profile with stats (cached)
   */
  static async getUserProfile(userId: string): Promise<any | null> {
    const cacheKey = CacheKeys.userProfile(userId)
    const cached = await cache.get<any>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const user = await payload.findByID({
        collection: 'users',
        id: userId,
        depth: 2
      })
      
      if (user) {
        // Get user stats
        const [postsCount, followersCount, followingCount] = await Promise.all([
          this.getUserPostsCount(userId),
          this.getUserFollowersCount(userId),
          this.getUserFollowingCount(userId)
        ])
        
        const profile = {
          ...user,
          stats: {
            postsCount,
            followersCount,
            followingCount
          }
        }
        
        await cache.set(cacheKey, profile, CacheTTL.USER_PROFILE)
        return profile
      }
      
      return null
    } catch (error) {
      console.error(`❌ Error fetching user profile ${userId}:`, error)
      return null
    }
  }
  
  /**
   * Get user posts with pagination and caching
   */
  static async getUserPosts(
    userId: string, 
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20, sort = '-createdAt' } = options
    const cacheKey = CacheKeys.userPosts(userId, page)
    
    const cached = await cache.get<QueryResult<any>>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: userId },
          status: { equals: 'published' }
        },
        page,
        limit,
        sort,
        depth: 2
      })
      
      await cache.set(cacheKey, result, CacheTTL.POSTS)
      return result
    } catch (error) {
      console.error(`❌ Error fetching user posts for ${userId}:`, error)
      throw error
    }
  }
  
  /**
   * Get user followers with pagination
   */
  static async getUserFollowers(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 50 } = options
    
    try {
      const payload = await this.payload
      return await payload.find({
        collection: 'usersubscriptions',
        where: {
          following: { equals: userId }
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
    } catch (error) {
      console.error(`❌ Error fetching followers for ${userId}:`, error)
      throw error
    }
  }
  
  /**
   * Get user following with pagination
   */
  static async getUserFollowing(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 50 } = options
    
    try {
      const payload = await this.payload
      return await payload.find({
        collection: 'usersubscriptions',
        where: {
          follower: { equals: userId }
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
    } catch (error) {
      console.error(`❌ Error fetching following for ${userId}:`, error)
      throw error
    }
  }
  
  /**
   * Get user stats (cached)
   */
  private static async getUserPostsCount(userId: string): Promise<number> {
    const cacheKey = `user:posts:count:${userId}`
    const cached = await cache.get<number>(cacheKey)
    if (cached !== null) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.count({
        collection: 'posts',
        where: {
          author: { equals: userId },
          status: { equals: 'published' }
        }
      })
      
      await cache.set(cacheKey, result.totalDocs, CacheTTL.USER_STATS)
      return result.totalDocs
    } catch (error) {
      console.error(`❌ Error counting posts for ${userId}:`, error)
      return 0
    }
  }
  
  private static async getUserFollowersCount(userId: string): Promise<number> {
    const cacheKey = `user:followers:count:${userId}`
    const cached = await cache.get<number>(cacheKey)
    if (cached !== null) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.count({
        collection: 'usersubscriptions',
        where: {
          following: { equals: userId }
        }
      })
      
      await cache.set(cacheKey, result.totalDocs, CacheTTL.USER_STATS)
      return result.totalDocs
    } catch (error) {
      console.error(`❌ Error counting followers for ${userId}:`, error)
      return 0
    }
  }
  
  private static async getUserFollowingCount(userId: string): Promise<number> {
    const cacheKey = `user:following:count:${userId}`
    const cached = await cache.get<number>(cacheKey)
    if (cached !== null) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.count({
        collection: 'usersubscriptions',
        where: {
          follower: { equals: userId }
        }
      })
      
      await cache.set(cacheKey, result.totalDocs, CacheTTL.USER_STATS)
      return result.totalDocs
    } catch (error) {
      console.error(`❌ Error counting following for ${userId}:`, error)
      return 0
    }
  }
}

/**
 * Optimized post queries
 */
export class OptimizedPostQueries {
  private static payload = getPayload({ config })
  
  /**
   * Get feed posts with caching and pagination
   */
  static async getFeedPosts(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20 } = options
    const cacheKey = CacheKeys.feedPosts(userId, page)
    
    const cached = await cache.get<QueryResult<any>>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      // Get user's following list
      const followingResult = await payload.find({
        collection: 'usersubscriptions',
        where: {
          follower: { equals: userId }
        },
        limit: 1000, // Get all following
        depth: 0
      })
      
      const followingIds = followingResult.docs.map(sub => sub.following)
      
      // Build where clause for posts
      const where: Where = {
        status: { equals: 'published' },
        or: [
          { author: { in: followingIds } },
          { author: { equals: userId } } // Include user's own posts
        ]
      }
      
      const result = await payload.find({
        collection: 'posts',
        where,
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
      
      await cache.set(cacheKey, result, CacheTTL.POSTS)
      return result
    } catch (error) {
      console.error(`❌ Error fetching feed posts for ${userId}:`, error)
      throw error
    }
  }
  
  /**
   * Get trending posts with caching
   */
  static async getTrendingPosts(limit: number = 20): Promise<any[]> {
    const cacheKey = CacheKeys.trendingPosts(limit)
    const cached = await cache.get<any[]>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          createdAt: {
            greater_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        sort: '-likes',
        limit,
        depth: 2
      })
      
      await cache.set(cacheKey, result.docs, CacheTTL.POSTS)
      return result.docs
    } catch (error) {
      console.error(`❌ Error fetching trending posts:`, error)
      return []
    }
  }
  
  /**
   * Get nearby posts with geospatial query
   */
  static async getNearbyPosts(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20 } = options
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          'location.coordinates': {
            near: {
              latitude,
              longitude,
              maxDistance: radiusKm * 1000 // Convert to meters
            }
          }
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
      
      return result
    } catch (error) {
      console.error(`❌ Error fetching nearby posts:`, error)
      throw error
    }
  }
}

/**
 * Optimized location queries
 */
export class OptimizedLocationQueries {
  private static payload = getPayload({ config })
  
  /**
   * Get nearby locations with caching
   */
  static async getNearbyLocations(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20 } = options
    const cacheKey = CacheKeys.nearbyLocations(latitude, longitude, radiusKm)
    
    const cached = await cache.get<QueryResult<any>>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'locations',
        where: {
          status: { equals: 'published' },
          privacy: { equals: 'public' },
          coordinates: {
            near: {
              latitude,
              longitude,
              maxDistance: radiusKm * 1000 // Convert to meters
            }
          }
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
      
      await cache.set(cacheKey, result, CacheTTL.LOCATIONS)
      return result
    } catch (error) {
      console.error(`❌ Error fetching nearby locations:`, error)
      throw error
    }
  }
  
  /**
   * Get location by ID with caching
   */
  static async getLocationById(locationId: string): Promise<any | null> {
    const cacheKey = CacheKeys.location(locationId)
    const cached = await cache.get<any>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const location = await payload.findByID({
        collection: 'locations',
        id: locationId,
        depth: 2
      })
      
      if (location) {
        await cache.set(cacheKey, location, CacheTTL.LOCATIONS)
      }
      
      return location
    } catch (error) {
      console.error(`❌ Error fetching location ${locationId}:`, error)
      return null
    }
  }
  
  /**
   * Get location reviews with pagination
   */
  static async getLocationReviews(
    locationId: string,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20 } = options
    const cacheKey = CacheKeys.locationReviews(locationId, page)
    
    const cached = await cache.get<QueryResult<any>>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'reviews',
        where: {
          location: { equals: locationId }
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
      
      await cache.set(cacheKey, result, CacheTTL.MEDIUM)
      return result
    } catch (error) {
      console.error(`❌ Error fetching reviews for location ${locationId}:`, error)
      throw error
    }
  }
}

/**
 * Optimized notification queries
 */
export class OptimizedNotificationQueries {
  private static payload = getPayload({ config })
  
  /**
   * Get user notifications with pagination and caching
   */
  static async getUserNotifications(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20 } = options
    const cacheKey = CacheKeys.userNotifications(userId, page)
    
    const cached = await cache.get<QueryResult<any>>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'notifications',
        where: {
          recipient: { equals: userId }
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
      
      await cache.set(cacheKey, result, CacheTTL.NOTIFICATIONS)
      return result
    } catch (error) {
      console.error(`❌ Error fetching notifications for ${userId}:`, error)
      throw error
    }
  }
  
  /**
   * Get unread notification count (cached)
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    const cacheKey = CacheKeys.unreadNotificationCount(userId)
    const cached = await cache.get<number>(cacheKey)
    if (cached !== null) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.count({
        collection: 'notifications',
        where: {
          recipient: { equals: userId },
          read: { equals: false }
        }
      })
      
      await cache.set(cacheKey, result.totalDocs, CacheTTL.NOTIFICATIONS)
      return result.totalDocs
    } catch (error) {
      console.error(`❌ Error counting unread notifications for ${userId}:`, error)
      return 0
    }
  }
}

/**
 * Search queries with caching
 */
export class OptimizedSearchQueries {
  private static payload = getPayload({ config })
  
  /**
   * Search posts with caching
   */
  static async searchPosts(
    query: string,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20 } = options
    const cacheKey = CacheKeys.searchResults(query, 'posts', page)
    
    const cached = await cache.get<QueryResult<any>>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          or: [
            { caption: { like: query } },
            { tags: { in: [query] } }
          ]
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
      
      await cache.set(cacheKey, result, CacheTTL.SEARCH_RESULTS)
      return result
    } catch (error) {
      console.error(`❌ Error searching posts:`, error)
      throw error
    }
  }
  
  /**
   * Search locations with caching
   */
  static async searchLocations(
    query: string,
    options: PaginationOptions = {}
  ): Promise<QueryResult<any>> {
    const { page = 1, limit = 20 } = options
    const cacheKey = CacheKeys.searchResults(query, 'locations', page)
    
    const cached = await cache.get<QueryResult<any>>(cacheKey)
    if (cached) return cached
    
    try {
      const payload = await this.payload
      const result = await payload.find({
        collection: 'locations',
        where: {
          status: { equals: 'published' },
          privacy: { equals: 'public' },
          or: [
            { name: { like: query } },
            { description: { like: query } },
            { 'address.city': { like: query } }
          ]
        },
        page,
        limit,
        sort: '-createdAt',
        depth: 2
      })
      
      await cache.set(cacheKey, result, CacheTTL.SEARCH_RESULTS)
      return result
    } catch (error) {
      console.error(`❌ Error searching locations:`, error)
      throw error
    }
  }
}
