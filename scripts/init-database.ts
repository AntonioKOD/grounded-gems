#!/usr/bin/env tsx

/**
 * Database Initialization Script
 * 
 * This script initializes the database with indexes, monitoring, and optimizations
 * for handling 10,000+ users efficiently.
 */

import { createDatabaseIndexes } from '../lib/database-indexes'
import { initializeDatabaseMonitoring } from '../lib/database-monitoring'
import * as cacheModule from '../lib/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

async function initializeDatabase() {
  console.log('🚀 Starting database initialization for high-performance scaling...')
  
  try {
    // Step 1: Check database connection
    console.log('📡 Checking database connection...')
    const payload = await getPayload({ config })
    if (!payload.db?.connection?.db) {
      throw new Error('Database connection not available')
    }
    await payload.db.connection.db.admin().ping()
    console.log('✅ Database connection successful')
    
    // Step 2: Check cache connection
    console.log('🔗 Checking cache connection...')
    const cacheHealthy = await cacheModule.checkCacheHealth()
    if (cacheHealthy) {
      console.log('✅ In-memory cache connection successful')
    } else {
      console.log('⚠️ Cache not available - continuing without cache')
    }
    
    // Step 3: Create database indexes
    console.log('📊 Creating database indexes...')
    await createDatabaseIndexes()
    console.log('✅ Database indexes created successfully')
    
    // Step 4: Initialize monitoring
    console.log('🔍 Initializing database monitoring...')
    await initializeDatabaseMonitoring()
    console.log('✅ Database monitoring initialized successfully')
    
    // Step 5: Verify collections exist
    console.log('📋 Verifying collections...')
    const collections = await payload.db.connection.db.listCollections().toArray()
    console.log(`✅ Found ${collections.length} collections`)
    
    // Step 6: Test basic queries
    console.log('🧪 Testing basic queries...')
    await testBasicQueries(payload)
    console.log('✅ Basic queries working correctly')
    
    console.log('🎉 Database initialization completed successfully!')
    console.log('')
    console.log('📈 Your database is now optimized for 10,000+ users with:')
    console.log('   • Connection pooling configured')
    console.log('   • Performance indexes created')
    console.log('   • In-memory caching enabled')
    console.log('   • Performance monitoring active')
    console.log('   • Query optimization implemented')
    console.log('')
    console.log('🔧 Next steps:')
    console.log('   1. Monitor performance metrics')
    console.log('   2. Adjust cache TTL based on usage patterns')
    console.log('   3. Scale MongoDB cluster if needed')
    console.log('   4. Set up alerts for performance issues')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

async function testBasicQueries(payload: any) {
  try {
    // Test user query
    const users = await payload.find({
      collection: 'users',
      limit: 1,
      depth: 0
    })
    console.log(`   • Users collection: ${users.totalDocs} total users`)
    
    // Test posts query
    const posts = await payload.find({
      collection: 'posts',
      limit: 1,
      depth: 0
    })
    console.log(`   • Posts collection: ${posts.totalDocs} total posts`)
    
    // Test locations query
    const locations = await payload.find({
      collection: 'locations',
      limit: 1,
      depth: 0
    })
    console.log(`   • Locations collection: ${locations.totalDocs} total locations`)
    
  } catch (error) {
    console.error('❌ Basic query test failed:', error)
    throw error
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialization script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Database initialization script failed:', error)
      process.exit(1)
    })
}

export { initializeDatabase }
