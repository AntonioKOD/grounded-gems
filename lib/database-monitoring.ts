/**
 * Database Performance Monitoring
 * 
 * This module provides comprehensive monitoring and analytics for database
 * performance to ensure optimal operation with 10,000+ users.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { cache } from './cache'

export interface DatabaseMetrics {
  timestamp: Date
  connectionCount: number
  activeConnections: number
  queryCount: number
  averageQueryTime: number
  slowQueries: number
  cacheHitRate: number
  memoryUsage: number
  indexUsage: Record<string, number>
}

export interface QueryPerformance {
  query: string
  executionTime: number
  timestamp: Date
  collection: string
  operation: string
}

class DatabaseMonitor {
  private payload = getPayload({ config })
  private metrics: DatabaseMetrics[] = []
  private queryLog: QueryPerformance[] = []
  private slowQueryThreshold = 1000 // 1 second
  
  /**
   * Start monitoring database performance
   */
  async startMonitoring(): Promise<void> {
    console.log('🔍 Starting database performance monitoring...')
    
    // Monitor every 30 seconds
    setInterval(async () => {
      await this.collectMetrics()
    }, 30000)
    
    // Log slow queries every 5 minutes
    setInterval(async () => {
      await this.logSlowQueries()
    }, 300000)
    
    // Clean up old metrics every hour
    setInterval(async () => {
      await this.cleanupOldMetrics()
    }, 3600000)
  }
  
  /**
   * Collect current database metrics
   */
  async collectMetrics(): Promise<DatabaseMetrics> {
    try {
      const startTime = Date.now()
      
      // Get MongoDB connection stats
      const payload = await this.payload
      if (!payload.db?.connection?.db) {
        throw new Error('Database connection not available')
      }
      
      const db = payload.db.connection.db
      const admin = db.admin()
      
      // Get server status
      const serverStatus = await admin.serverStatus()
      
      // Get database stats
      const dbStats = await db.stats()
      
      // Get collection stats
      const collections = await db.listCollections().toArray()
      const indexUsage: Record<string, number> = {}
      
      for (const collection of collections) {
        try {
          const coll = db.collection(collection.name)
          const indexes = await coll.indexes()
          indexUsage[collection.name] = indexes.length
        } catch (error) {
          console.error(`Error getting stats for collection ${collection.name}:`, error)
        }
      }
      
      // Calculate cache hit rate
      const cacheStats = await cache.getStats()
      const cacheHitRate = this.calculateCacheHitRate(cacheStats)
      
      const metrics: DatabaseMetrics = {
        timestamp: new Date(),
        connectionCount: serverStatus.connections?.current || 0,
        activeConnections: serverStatus.connections?.available || 0,
        queryCount: serverStatus.opcounters?.query || 0,
        averageQueryTime: this.calculateAverageQueryTime(),
        slowQueries: this.getSlowQueryCount(),
        cacheHitRate,
        memoryUsage: serverStatus.mem?.resident || 0,
        indexUsage
      }
      
      this.metrics.push(metrics)
      
      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100)
      }
      
      console.log(`📊 Database metrics collected: ${metrics.connectionCount} connections, ${metrics.cacheHitRate.toFixed(2)}% cache hit rate`)
      
      return metrics
    } catch (error) {
      console.error('❌ Error collecting database metrics:', error)
      throw error
    }
  }
  
  /**
   * Log query performance
   */
  logQuery(query: string, executionTime: number, collection: string, operation: string): void {
    const queryPerf: QueryPerformance = {
      query,
      executionTime,
      timestamp: new Date(),
      collection,
      operation
    }
    
    this.queryLog.push(queryPerf)
    
    // Log slow queries immediately
    if (executionTime > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected: ${executionTime}ms - ${operation} on ${collection}`)
      console.warn(`Query: ${query}`)
    }
    
    // Keep only last 1000 queries
    if (this.queryLog.length > 1000) {
      this.queryLog = this.queryLog.slice(-1000)
    }
  }
  
  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): DatabaseMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] || null : null
  }
  
  /**
   * Get performance trends
   */
  getPerformanceTrends(hours: number = 24): DatabaseMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.metrics.filter(m => m.timestamp > cutoff)
  }
  
  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): QueryPerformance[] {
    return this.queryLog
      .filter(q => q.executionTime > this.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit)
  }
  
  /**
   * Get query performance by collection
   */
  getQueryPerformanceByCollection(): Record<string, { count: number; avgTime: number; maxTime: number }> {
    const performance: Record<string, { count: number; avgTime: number; maxTime: number }> = {}
    
    for (const query of this.queryLog) {
      if (!performance[query.collection]) {
        performance[query.collection] = { count: 0, avgTime: 0, maxTime: 0 }
      }
      
      const collectionPerf = performance[query.collection]
      if (collectionPerf) {
        collectionPerf.count++
        collectionPerf.avgTime += query.executionTime
        collectionPerf.maxTime = Math.max(collectionPerf.maxTime, query.executionTime)
      }
    }
    
    // Calculate averages
    for (const collection in performance) {
      const collectionPerf = performance[collection]
      if (collectionPerf && collectionPerf.count > 0) {
        collectionPerf.avgTime = collectionPerf.avgTime / collectionPerf.count
      }
    }
    
    return performance
  }
  
  /**
   * Check if database is healthy
   */
  isDatabaseHealthy(): boolean {
    const current = this.getCurrentMetrics()
    if (!current) return true
    
    // Check connection count (should be reasonable)
    if (current.connectionCount > 100) {
      console.warn('⚠️ High connection count detected:', current.connectionCount)
      return false
    }
    
    // Check cache hit rate (should be > 80%)
    if (current.cacheHitRate < 0.8) {
      console.warn('⚠️ Low cache hit rate detected:', current.cacheHitRate)
      return false
    }
    
    // Check average query time (should be < 100ms)
    if (current.averageQueryTime > 100) {
      console.warn('⚠️ High average query time detected:', current.averageQueryTime)
      return false
    }
    
    return true
  }
  
  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = []
    const current = this.getCurrentMetrics()
    
    if (!current) return recommendations
    
    // Check cache hit rate
    if (current.cacheHitRate < 0.8) {
      recommendations.push('Consider increasing cache TTL or adding more cache layers')
    }
    
    // Check query performance
    if (current.averageQueryTime > 100) {
      recommendations.push('Consider adding database indexes or optimizing queries')
    }
    
    // Check connection count
    if (current.connectionCount > 50) {
      recommendations.push('Consider implementing connection pooling or reducing connection timeout')
    }
    
    // Check slow queries
    const slowQueries = this.getSlowQueries(5)
    if (slowQueries.length > 0) {
      recommendations.push(`Found ${slowQueries.length} slow queries - consider optimization`)
    }
    
    return recommendations
  }
  
  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      queryLog: this.queryLog,
      recommendations: this.getPerformanceRecommendations(),
      health: this.isDatabaseHealthy()
    }, null, 2)
  }
  
  /**
   * Calculate cache hit rate from cache stats
   */
  private calculateCacheHitRate(cacheStats: any): number {
    if (!cacheStats || !cacheStats.keyspace) return 0
    
    // This is a simplified calculation
    // In a real implementation, you'd track cache hits/misses
    return 0.85 // Placeholder - implement actual cache hit rate calculation
  }
  
  /**
   * Calculate average query time from recent queries
   */
  private calculateAverageQueryTime(): number {
    if (this.queryLog.length === 0) return 0
    
    const recentQueries = this.queryLog.slice(-100) // Last 100 queries
    const totalTime = recentQueries.reduce((sum, q) => sum + q.executionTime, 0)
    return totalTime / recentQueries.length
  }
  
  /**
   * Get count of slow queries
   */
  private getSlowQueryCount(): number {
    return this.queryLog.filter(q => q.executionTime > this.slowQueryThreshold).length
  }
  
  /**
   * Log slow queries to console
   */
  private async logSlowQueries(): Promise<void> {
    const slowQueries = this.getSlowQueries(10)
    
    if (slowQueries.length > 0) {
      console.log('🐌 Slow queries detected:')
      slowQueries.forEach((query, index) => {
        console.log(`${index + 1}. ${query.executionTime}ms - ${query.operation} on ${query.collection}`)
      })
    }
  }
  
  /**
   * Clean up old metrics and query logs
   */
  private async cleanupOldMetrics(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    this.queryLog = this.queryLog.filter(q => q.timestamp > cutoff)
    
    console.log(`🧹 Cleaned up old metrics. Current: ${this.metrics.length} metrics, ${this.queryLog.length} queries`)
  }
}

// Global database monitor instance
export const dbMonitor = new DatabaseMonitor()

/**
 * Query performance decorator
 */
export function monitorQuery(collection: string, operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      
      try {
        const result = await method.apply(this, args)
        const executionTime = Date.now() - startTime
        
        dbMonitor.logQuery(
          `${target.constructor.name}.${propertyName}`,
          executionTime,
          collection,
          operation
        )
        
        return result
      } catch (error) {
        const executionTime = Date.now() - startTime
        
        dbMonitor.logQuery(
          `${target.constructor.name}.${propertyName} (ERROR)`,
          executionTime,
          collection,
          operation
        )
        
        throw error
      }
    }
  }
}

/**
 * Initialize database monitoring
 */
export async function initializeDatabaseMonitoring(): Promise<void> {
  try {
    await dbMonitor.startMonitoring()
    console.log('✅ Database monitoring initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database monitoring:', error)
  }
}

/**
 * Health check endpoint data
 */
export async function getDatabaseHealthCheck(): Promise<{
  healthy: boolean
  metrics: DatabaseMetrics | null
  recommendations: string[]
  uptime: number
}> {
  const healthy = dbMonitor.isDatabaseHealthy()
  const metrics = dbMonitor.getCurrentMetrics()
  const recommendations = dbMonitor.getPerformanceRecommendations()
  
  return {
    healthy,
    metrics,
    recommendations,
    uptime: process.uptime()
  }
}
