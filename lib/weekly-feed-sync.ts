/**
 * Weekly Feed Synchronization Utility
 * 
 * This utility handles cross-tab communication and real-time updates
 * for weekly features in the feed, ensuring a consistent user experience
 * across multiple browser tabs.
 * 
 * Based on cross-tab communication best practices from:
 * - https://blog.bitsrc.io/4-ways-to-communicate-across-browser-tabs-in-realtime-e4f5f6cbedca
 * - https://medium.com/@hasanmahira/understanding-and-managing-data-across-tabs-in-web-development-5dc7d35d73c1
 */

interface WeeklyFeatureData {
  id: string
  title: string
  theme: string
  weekNumber: number
  year: number
  lastUpdated: string
  content: {
    locations: any[]
    posts: any[]
    challenges: any[]
  }
  insights: {
    activeExplorers: number
    newDiscoveries: number
    trending: string[]
  }
}

interface WeeklySyncEvent {
  type: 'feature_updated' | 'insights_updated' | 'user_interaction' | 'content_refresh'
  data: any
  timestamp: string
  tabId: string
}

class WeeklyFeedSync {
  private channel: BroadcastChannel | null = null
  private tabId: string
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private lastFeatureData: WeeklyFeatureData | null = null
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.tabId = this.generateTabId()
    this.initializeBroadcastChannel()
    this.initializeStorageListener()
    this.startPeriodicSync()
  }

  /**
   * Generate unique tab ID for tracking
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Initialize BroadcastChannel for cross-tab communication
   */
  private initializeBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel('weekly-feed-sync')
        this.channel.addEventListener('message', (event) => {
          this.handleBroadcastMessage(event.data)
        })
        console.log('WeeklyFeedSync: BroadcastChannel initialized')
      } else {
        console.warn('WeeklyFeedSync: BroadcastChannel not supported, falling back to localStorage')
      }
    } catch (error) {
      console.warn('WeeklyFeedSync: Failed to initialize BroadcastChannel:', error)
    }
  }

  /**
   * Initialize localStorage event listener for fallback communication
   */
  private initializeStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'weekly-feed-sync') {
          try {
            const data = JSON.parse(event.newValue || '{}')
            this.handleBroadcastMessage(data)
          } catch (error) {
            console.error('WeeklyFeedSync: Error parsing storage event:', error)
          }
        }
      })
    }
  }

  /**
   * Handle incoming broadcast messages
   */
  private handleBroadcastMessage(event: WeeklySyncEvent) {
    // Ignore messages from the same tab
    if (event.tabId === this.tabId) return

    console.log('WeeklyFeedSync: Received broadcast message:', event.type)

    // Notify listeners based on event type
    const listeners = this.listeners.get(event.type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event.data)
        } catch (error) {
          console.error('WeeklyFeedSync: Error in listener:', error)
        }
      })
    }
  }

  /**
   * Broadcast message to other tabs
   */
  private broadcastMessage(type: string, data: any) {
    const event: WeeklySyncEvent = {
      type: type as any,
      data,
      timestamp: new Date().toISOString(),
      tabId: this.tabId
    }

    // Try BroadcastChannel first
    if (this.channel) {
      try {
        this.channel.postMessage(event)
      } catch (error) {
        console.warn('WeeklyFeedSync: BroadcastChannel failed, using localStorage:', error)
        this.broadcastViaStorage(event)
      }
    } else {
      // Fallback to localStorage
      this.broadcastViaStorage(event)
    }
  }

  /**
   * Broadcast via localStorage as fallback
   */
  private broadcastViaStorage(event: WeeklySyncEvent) {
    try {
      localStorage.setItem('weekly-feed-sync', JSON.stringify(event))
      // Remove the item after a short delay to trigger storage event
      setTimeout(() => {
        localStorage.removeItem('weekly-feed-sync')
      }, 100)
    } catch (error) {
      console.error('WeeklyFeedSync: Failed to broadcast via localStorage:', error)
    }
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync() {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.checkForUpdates()
    }, 5 * 60 * 1000)
  }

  /**
   * Check for weekly feature updates
   */
  private async checkForUpdates() {
    try {
      const response = await fetch('/api/weekly-features/current')
      if (response.ok) {
        const data = await response.json()
        const featureData = data.data?.feature

        if (featureData && this.hasFeatureChanged(featureData)) {
          this.lastFeatureData = this.normalizeFeatureData(featureData)
          this.broadcastMessage('feature_updated', this.lastFeatureData)
          this.notifyListeners('feature_updated', this.lastFeatureData)
        }
      }
    } catch (error) {
      console.error('WeeklyFeedSync: Error checking for updates:', error)
    }
  }

  /**
   * Check if feature data has changed
   */
  private hasFeatureChanged(newData: any): boolean {
    if (!this.lastFeatureData) return true

    const normalized = this.normalizeFeatureData(newData)
    return (
      normalized.id !== this.lastFeatureData.id ||
      normalized.lastUpdated !== this.lastFeatureData.lastUpdated
    )
  }

  /**
   * Normalize feature data for comparison
   */
  private normalizeFeatureData(data: any): WeeklyFeatureData {
    return {
      id: data.id,
      title: data.title,
      theme: data.theme,
      weekNumber: data.weekNumber,
      year: data.year,
      lastUpdated: data.updatedAt || data.createdAt,
      content: {
        locations: data.content?.locations || [],
        posts: data.content?.posts || [],
        challenges: data.content?.challenges || []
      },
      insights: data.content?.insights || {
        activeExplorers: 0,
        newDiscoveries: 0,
        trending: []
      }
    }
  }

  /**
   * Notify listeners of an event
   */
  private notifyListeners(type: string, data: any) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('WeeklyFeedSync: Error in listener:', error)
        }
      })
    }
  }

  /**
   * Subscribe to weekly feature events
   */
  public subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }

    this.listeners.get(type)!.add(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  /**
   * Broadcast user interaction
   */
  public broadcastInteraction(interactionType: string, data: any) {
    this.broadcastMessage('user_interaction', {
      type: interactionType,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Request content refresh from other tabs
   */
  public requestContentRefresh() {
    this.broadcastMessage('content_refresh', {
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Update insights data
   */
  public updateInsights(insights: any) {
    this.broadcastMessage('insights_updated', insights)
  }

  /**
   * Get current feature data
   */
  public getLastFeatureData(): WeeklyFeatureData | null {
    return this.lastFeatureData
  }

  /**
   * Cleanup resources
   */
  public destroy() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    this.listeners.clear()
  }
}

// Create singleton instance
let weeklyFeedSyncInstance: WeeklyFeedSync | null = null

export function getWeeklyFeedSync(): WeeklyFeedSync {
  if (!weeklyFeedSyncInstance) {
    weeklyFeedSyncInstance = new WeeklyFeedSync()
  }
  return weeklyFeedSyncInstance
}

export function destroyWeeklyFeedSync() {
  if (weeklyFeedSyncInstance) {
    weeklyFeedSyncInstance.destroy()
    weeklyFeedSyncInstance = null
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    destroyWeeklyFeedSync()
  })
}

export default WeeklyFeedSync 