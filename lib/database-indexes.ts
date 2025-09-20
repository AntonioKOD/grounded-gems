/**
 * Database Indexes Configuration for High-Performance Scaling
 * 
 * This file defines all the database indexes needed to handle 10,000+ users
 * efficiently. Indexes are crucial for query performance at scale.
 */

import { getPayload } from 'payload'
import config from '../payload.config'

export interface IndexDefinition {
  collection: string
  index: Record<string, 1 | -1 | 'text' | '2dsphere'>
  options?: {
    unique?: boolean
    sparse?: boolean
    background?: boolean
    name?: string
    partialFilterExpression?: Record<string, any>
  }
}

// Define all indexes for optimal performance
export const DATABASE_INDEXES: IndexDefinition[] = [
  // Users collection indexes
  {
    collection: 'users',
    index: { email: 1 },
    options: { unique: true, name: 'users_email_unique' }
  },
  {
    collection: 'users',
    index: { username: 1 },
    options: { unique: true, sparse: true, name: 'users_username_unique' }
  },
  {
    collection: 'users',
    index: { 'location.coordinates': '2dsphere' },
    options: { name: 'users_location_2dsphere' }
  },
  {
    collection: 'users',
    index: { createdAt: -1 },
    options: { name: 'users_createdAt_desc' }
  },
  {
    collection: 'users',
    index: { role: 1 },
    options: { name: 'users_role' }
  },
  {
    collection: 'users',
    index: { isActive: 1 },
    options: { name: 'users_isActive' }
  },

  // Posts collection indexes
  {
    collection: 'posts',
    index: { author: 1, createdAt: -1 },
    options: { name: 'posts_author_createdAt' }
  },
  {
    collection: 'posts',
    index: { status: 1, createdAt: -1 },
    options: { name: 'posts_status_createdAt' }
  },
  {
    collection: 'posts',
    index: { 'location.coordinates': '2dsphere' },
    options: { name: 'posts_location_2dsphere' }
  },
  {
    collection: 'posts',
    index: { likes: -1, createdAt: -1 },
    options: { name: 'posts_likes_createdAt' }
  },
  {
    collection: 'posts',
    index: { tags: 1 },
    options: { name: 'posts_tags' }
  },
  {
    collection: 'posts',
    index: { 
      caption: 'text',
      tags: 'text'
    },
    options: { name: 'posts_text_search' }
  },

  // Locations collection indexes
  {
    collection: 'locations',
    index: { 'coordinates': '2dsphere' },
    options: { name: 'locations_coordinates_2dsphere' }
  },
  {
    collection: 'locations',
    index: { name: 1 },
    options: { name: 'locations_name' }
  },
  {
    collection: 'locations',
    index: { status: 1, createdAt: -1 },
    options: { name: 'locations_status_createdAt' }
  },
  {
    collection: 'locations',
    index: { privacy: 1 },
    options: { name: 'locations_privacy' }
  },
  {
    collection: 'locations',
    index: { createdBy: 1 },
    options: { name: 'locations_createdBy' }
  },
  {
    collection: 'locations',
    index: { categories: 1 },
    options: { name: 'locations_categories' }
  },
  {
    collection: 'locations',
    index: { 
      name: 'text',
      description: 'text',
      'address.city': 'text'
    },
    options: { name: 'locations_text_search' }
  },

  // Notifications collection indexes
  {
    collection: 'notifications',
    index: { recipient: 1, createdAt: -1 },
    options: { name: 'notifications_recipient_createdAt' }
  },
  {
    collection: 'notifications',
    index: { recipient: 1, read: 1 },
    options: { name: 'notifications_recipient_read' }
  },
  {
    collection: 'notifications',
    index: { type: 1, createdAt: -1 },
    options: { name: 'notifications_type_createdAt' }
  },

  // UserSubscriptions collection indexes
  {
    collection: 'usersubscriptions',
    index: { follower: 1, following: 1 },
    options: { unique: true, name: 'usersubscriptions_follower_following_unique' }
  },
  {
    collection: 'usersubscriptions',
    index: { follower: 1, createdAt: -1 },
    options: { name: 'usersubscriptions_follower_createdAt' }
  },
  {
    collection: 'usersubscriptions',
    index: { following: 1, createdAt: -1 },
    options: { name: 'usersubscriptions_following_createdAt' }
  },

  // Reviews collection indexes
  {
    collection: 'reviews',
    index: { location: 1, createdAt: -1 },
    options: { name: 'reviews_location_createdAt' }
  },
  {
    collection: 'reviews',
    index: { author: 1, createdAt: -1 },
    options: { name: 'reviews_author_createdAt' }
  },
  {
    collection: 'reviews',
    index: { rating: -1, createdAt: -1 },
    options: { name: 'reviews_rating_createdAt' }
  },

  // Events collection indexes
  {
    collection: 'events',
    index: { 'location.coordinates': '2dsphere' },
    options: { name: 'events_location_2dsphere' }
  },
  {
    collection: 'events',
    index: { startDate: 1, status: 1 },
    options: { name: 'events_startDate_status' }
  },
  {
    collection: 'events',
    index: { createdBy: 1, createdAt: -1 },
    options: { name: 'events_createdBy_createdAt' }
  },

  // SavedLocations collection indexes
  {
    collection: 'savedlocations',
    index: { user: 1, location: 1 },
    options: { unique: true, name: 'savedlocations_user_location_unique' }
  },
  {
    collection: 'savedlocations',
    index: { user: 1, createdAt: -1 },
    options: { name: 'savedlocations_user_createdAt' }
  },

  // LocationInteractions collection indexes
  {
    collection: 'locationinteractions',
    index: { user: 1, location: 1, type: 1 },
    options: { unique: true, name: 'locationinteractions_user_location_type_unique' }
  },
  {
    collection: 'locationinteractions',
    index: { location: 1, type: 1, createdAt: -1 },
    options: { name: 'locationinteractions_location_type_createdAt' }
  },

  // Analytics collection indexes
  {
    collection: 'analytics',
    index: { userId: 1, eventType: 1, timestamp: -1 },
    options: { name: 'analytics_userId_eventType_timestamp' }
  },
  {
    collection: 'analytics',
    index: { eventType: 1, timestamp: -1 },
    options: { name: 'analytics_eventType_timestamp' }
  },

  // DeviceTokens collection indexes
  {
    collection: 'devicetokens',
    index: { userId: 1 },
    options: { name: 'devicetokens_userId' }
  },
  {
    collection: 'devicetokens',
    index: { token: 1 },
    options: { unique: true, sparse: true, name: 'devicetokens_token_unique' }
  },

  // Reports collection indexes
  {
    collection: 'reports',
    index: { reportedBy: 1, createdAt: -1 },
    options: { name: 'reports_reportedBy_createdAt' }
  },
  {
    collection: 'reports',
    index: { status: 1, createdAt: -1 },
    options: { name: 'reports_status_createdAt' }
  },

  // UserBlocks collection indexes
  {
    collection: 'userblocks',
    index: { blocker: 1, blocked: 1 },
    options: { unique: true, name: 'userblocks_blocker_blocked_unique' }
  },
  {
    collection: 'userblocks',
    index: { blocker: 1, createdAt: -1 },
    options: { name: 'userblocks_blocker_createdAt' }
  }
]

/**
 * Create all database indexes
 * This should be run during application startup or as a migration
 */
export async function createDatabaseIndexes(): Promise<void> {
  const payload = await getPayload({ config })
  
  console.log('🚀 Creating database indexes for high-performance scaling...')
  
  for (const indexDef of DATABASE_INDEXES) {
    try {
      // Get the MongoDB collection directly
      if (!(payload.db as any).connection?.db) {
        console.error(`❌ Database connection not available for ${indexDef.collection}`)
        continue
      }
      
      const collection = (payload.db as any).connection.db.collection(indexDef.collection)
      
      // Create the index
      await collection.createIndex(indexDef.index, indexDef.options)
      
      console.log(`✅ Created index: ${indexDef.options?.name || 'unnamed'} on ${indexDef.collection}`)
    } catch (error) {
      console.error(`❌ Failed to create index on ${indexDef.collection}:`, error)
      // Don't throw - continue with other indexes
    }
  }
  
  console.log('🎉 Database indexes creation completed!')
}

/**
 * Drop all custom indexes (useful for testing or reset)
 */
export async function dropDatabaseIndexes(): Promise<void> {
  const payload = await getPayload({ config })
  
  console.log('🗑️ Dropping custom database indexes...')
  
  for (const indexDef of DATABASE_INDEXES) {
    try {
      if (!(payload.db as any).connection?.db) {
        console.error(`❌ Database connection not available for ${indexDef.collection}`)
        continue
      }
      
      const collection = (payload.db as any).connection.db.collection(indexDef.collection)
      
      if (indexDef.options?.name) {
        await collection.dropIndex(indexDef.options.name)
        console.log(`✅ Dropped index: ${indexDef.options.name} from ${indexDef.collection}`)
      }
    } catch (error) {
      console.error(`❌ Failed to drop index from ${indexDef.collection}:`, error)
    }
  }
  
  console.log('🎉 Database indexes cleanup completed!')
}

/**
 * Check if indexes exist and are being used
 */
export async function checkIndexUsage(): Promise<void> {
  const payload = await getPayload({ config })
  
  console.log('🔍 Checking database index usage...')
  
  for (const indexDef of DATABASE_INDEXES) {
    try {
      if (!(payload.db as any).connection?.db) {
        console.error(`❌ Database connection not available for ${indexDef.collection}`)
        continue
      }
      
      const collection = (payload.db as any).connection.db.collection(indexDef.collection)
      const indexes = await collection.indexes()
      
      console.log(`📊 Indexes for ${indexDef.collection}:`, indexes.length, 'indexes found')
    } catch (error) {
      console.error(`❌ Failed to get index stats for ${indexDef.collection}:`, error)
    }
  }
}
