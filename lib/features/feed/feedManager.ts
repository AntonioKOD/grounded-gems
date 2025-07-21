import { store } from '../../store'
import { fetchFeedPosts, loadMorePosts, setFeedType, setSortBy, setCategory, setUserId } from './feedSlice'

// Global feed manager to coordinate API calls
class FeedManager {
  private static instance: FeedManager
  private isInitialized = false
  private userEventListeners: Record<string, number> = {}
  private refreshDebounceTimers: Record<string, NodeJS.Timeout> = {}

  private constructor() {}

  static getInstance(): FeedManager {
    if (!FeedManager.instance) {
      FeedManager.instance = new FeedManager()
    }
    return FeedManager.instance
  }

  // Initialize feed with user data
  initializeFeed(params: {
    feedType?: 'all' | 'personalized' | 'user'
    sortBy?: 'recent' | 'popular' | 'trending'
    userId?: string
    currentUserId?: string
    force?: boolean
  }) {
    if (this.isInitialized && !params.force) {
      console.log('🔄 Feed already initialized, skipping')
      return
    }

    console.log('🚀 Initializing feed manager:', params)
    
    const { feedType = 'all', sortBy = 'recent', userId, currentUserId, force = false } = params

    // Set feed settings
    store.dispatch(setFeedType(feedType))
    store.dispatch(setSortBy(sortBy))
    if (userId) store.dispatch(setUserId(userId))

    // Fetch initial data
    store.dispatch(fetchFeedPosts({ 
      feedType, 
      sortBy, 
      userId,
      currentUserId,
      force 
    }))

    this.isInitialized = true
  }

  // Fetch feed posts with deduplication
  async fetchPosts(params: {
    feedType?: 'all' | 'personalized' | 'user'
    sortBy?: 'recent' | 'popular' | 'trending'
    page?: number
    category?: string
    userId?: string
    currentUserId?: string
    force?: boolean
  }) {
    const { feedType = 'all', sortBy = 'recent', page = 1, category, userId, currentUserId, force = false } = params

    console.log('📡 FeedManager: Fetching posts:', { feedType, sortBy, page, category, force })

    // Update feed settings if needed
    const state = store.getState().feed
    if (state.feedType !== feedType) {
      store.dispatch(setFeedType(feedType))
    }
    if (state.sortBy !== sortBy) {
      store.dispatch(setSortBy(sortBy))
    }
    if (state.category !== category) {
      store.dispatch(setCategory(category))
    }
    if (state.userId !== userId) {
      store.dispatch(setUserId(userId))
    }

    // Dispatch fetch action
    return store.dispatch(fetchFeedPosts({ 
      feedType, 
      sortBy, 
      page,
      category,
      userId,
      currentUserId,
      force 
    }))
  }

  // Load more posts
  async loadMore(currentUserId?: string) {
    console.log('📄 FeedManager: Loading more posts')
    return store.dispatch(loadMorePosts({ currentUserId }))
  }

  // Refresh feed with debouncing
  refreshFeed(params: {
    feedType?: 'all' | 'personalized' | 'user'
    sortBy?: 'recent' | 'popular' | 'trending'
    userId?: string
    currentUserId?: string
  }, debounceMs = 500) {
    const cacheKey = `${params.feedType}-${params.sortBy}-${params.userId}-${params.currentUserId}`
    
    // Clear existing timer
    const existingTimer = this.refreshDebounceTimers[cacheKey]
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      console.log('🔄 FeedManager: Debounced refresh triggered')
      this.fetchPosts({ ...params, force: true })
      delete this.refreshDebounceTimers[cacheKey]
    }, debounceMs)

    this.refreshDebounceTimers[cacheKey] = timer
  }

  // Handle user events with deduplication
  handleUserEvent(eventType: 'user-updated' | 'user-login', userId: string) {
    const eventKey = `${eventType}-${userId}`
    
    if (this.userEventListeners[eventKey]) {
      console.log('🔄 User event already handled, skipping:', eventKey)
      return
    }

    console.log('👤 FeedManager: Handling user event:', eventType, userId)
    this.userEventListeners[eventKey] = Date.now()

    // Refresh feed with new user context
    this.refreshFeed({
      feedType: store.getState().feed.feedType,
      sortBy: store.getState().feed.sortBy,
      userId: store.getState().feed.userId,
      currentUserId: userId
    }, 1000) // Longer debounce for user events

    // Remove from object after a delay
    setTimeout(() => {
      delete this.userEventListeners[eventKey]
    }, 5000)
  }

  // Get current feed state
  getFeedState() {
    return store.getState().feed
  }

  // Check if feed is loading
  isLoading() {
    const state = store.getState().feed
    return state.isLoading || state.isLoadingMore || state.isRefreshing
  }

  // Clear all timers and listeners
  cleanup() {
    Object.values(this.refreshDebounceTimers).forEach(timer => clearTimeout(timer))
    this.refreshDebounceTimers = {}
    this.userEventListeners = {}
    this.isInitialized = false
  }
}

// Export singleton instance
export const feedManager = FeedManager.getInstance()

// Global event listeners (only set up once)
let globalListenersSetup = false

export const setupGlobalFeedListeners = () => {
  if (globalListenersSetup) {
    console.log('🔄 Global feed listeners already setup, skipping')
    return
  }

  console.log('🎧 Setting up global feed listeners')

  const handleUserUpdate = (event: CustomEvent) => {
    if (event.detail?.id) {
      feedManager.handleUserEvent('user-updated', event.detail.id)
    }
  }

  const handleUserLogin = (event: CustomEvent) => {
    if (event.detail?.id) {
      feedManager.handleUserEvent('user-login', event.detail.id)
    }
  }

  window.addEventListener('user-updated', handleUserUpdate as any)
  window.addEventListener('user-login', handleUserLogin as any)

  globalListenersSetup = true

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    feedManager.cleanup()
  })
} 