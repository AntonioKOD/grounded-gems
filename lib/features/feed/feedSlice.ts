import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { Post } from '../../../types/feed'

interface FeedState {
  posts: Post[]
  isLoading: boolean
  isLoadingMore: boolean
  isRefreshing: boolean
  hasMore: boolean
  page: number
  error: string | null
  feedType: 'all' | 'personalized' | 'user'
  sortBy: 'recent' | 'popular' | 'trending'
  category?: string
  userId?: string
  lastFetched: number | null
  // Add request tracking to prevent duplicate calls (serializable)
  pendingRequests: Record<string, number>
  cacheKey: string | null
}

const initialState: FeedState = {
  posts: [],
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  hasMore: true,
  page: 1,
  error: null,
  feedType: 'all',
  sortBy: 'recent',
  lastFetched: null,
  pendingRequests: {},
  cacheKey: null,
}

// Helper function to generate cache key
const generateCacheKey = (params: {
  feedType?: string
  sortBy?: string
  page?: number
  category?: string
  userId?: string
  currentUserId?: string
}) => {
  return `${params.feedType}-${params.sortBy}-${params.page}-${params.category}-${params.userId}-${params.currentUserId}`
}

// Async thunk for fetching feed posts using mobile API
export const fetchFeedPosts = createAsyncThunk(
  'feed/fetchPosts',
  async (
    params: {
      feedType?: 'all' | 'personalized' | 'user'
      sortBy?: 'recent' | 'popular' | 'trending'
      page?: number
      category?: string
      userId?: string
      currentUserId?: string
      force?: boolean
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { feed: FeedState }
      const {
        feedType = 'all',
        sortBy = 'recent',
        page = 1,
        category,
        userId,
        currentUserId,
        force = false
      } = params

      // Generate cache key for this request
      const cacheKey = generateCacheKey({ feedType, sortBy, page, category, userId, currentUserId })
      
      // Check if this exact request is already pending
      if (state.feed.pendingRequests[cacheKey]) {
        console.log('🔄 Feed request already pending, skipping:', cacheKey)
        return { posts: state.feed.posts, hasMore: state.feed.hasMore, skipped: true }
      }

      // Skip fetch if we have recent data and not forcing
      const now = Date.now()
      const cacheAge = state.feed.lastFetched ? now - state.feed.lastFetched : Infinity
      const cacheValid = cacheAge < 30000 // 30 seconds cache
      
      if (!force && state.feed.posts.length > 0 && cacheValid && state.feed.cacheKey === cacheKey) {
        console.log('📦 Using cached feed data, age:', cacheAge, 'ms')
        return { posts: state.feed.posts, hasMore: state.feed.hasMore, cached: true }
      }

      console.log('🚀 Fetching feed data:', { feedType, sortBy, page, category, force })

      // Fetch posts using mobile API endpoint with proper media URL processing
      const apiParams = new URLSearchParams({
        feedType: feedType === 'all' ? 'personalized' : feedType,
        sortBy: sortBy === 'recent' ? 'createdAt' : sortBy,
        page: page.toString(),
        limit: '10'
      })
      
      if (category) apiParams.append('category', category)

      const response = await fetch(`/api/v1/mobile/posts/feed?${apiParams}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`)
      }
      
      const data = await response.json()
      const posts: Post[] = data.data?.posts || data.posts || []

      return {
        posts,
        hasMore: posts.length >= 10,
        page,
        feedType,
        sortBy,
        category,
        userId,
        cacheKey,
      }
    } catch (error) {
      console.error('Error fetching feed posts:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch posts')
    }
  }
)

// Async thunk for loading more posts
export const loadMorePosts = createAsyncThunk(
  'feed/loadMore',
  async (
    params: {
      currentUserId?: string
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { feed: FeedState }
      const { currentUserId } = params
      
      const nextPage = state.feed.page + 1
      const cacheKey = generateCacheKey({
        feedType: state.feed.feedType,
        sortBy: state.feed.sortBy,
        page: nextPage,
        category: state.feed.category,
        userId: state.feed.userId,
        currentUserId
      })

      // Check if this request is already pending
      if (state.feed.pendingRequests[cacheKey]) {
        console.log('🔄 Load more request already pending, skipping')
        return { posts: [], hasMore: false, skipped: true }
      }

      console.log('📄 Loading more posts, page:', nextPage)

      const apiParams = new URLSearchParams({
        feedType: state.feed.feedType === 'all' ? 'personalized' : state.feed.feedType,
        sortBy: state.feed.sortBy === 'recent' ? 'createdAt' : state.feed.sortBy,
        page: nextPage.toString(),
        limit: '10'
      })
      
      if (state.feed.category) apiParams.append('category', state.feed.category)

      const response = await fetch(`/api/v1/mobile/posts/feed?${apiParams}`)
      if (!response.ok) {
        throw new Error(`Failed to load more posts: ${response.statusText}`)
      }
      
      const data = await response.json()
      const posts: Post[] = data.data?.posts || data.posts || []

      return {
        posts,
        hasMore: posts.length >= 10,
        page: nextPage,
      }
    } catch (error) {
      console.error('Error loading more posts:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load more posts')
    }
  }
)

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setFeedType: (state, action: PayloadAction<'all' | 'personalized' | 'user'>) => {
      state.feedType = action.payload
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
      state.cacheKey = null
    },
    setSortBy: (state, action: PayloadAction<'recent' | 'popular' | 'trending'>) => {
      state.sortBy = action.payload
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
      state.cacheKey = null
    },
    setCategory: (state, action: PayloadAction<string | undefined>) => {
      state.category = action.payload
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
      state.cacheKey = null
    },
    setUserId: (state, action: PayloadAction<string | undefined>) => {
      state.userId = action.payload
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
      state.cacheKey = null
    },
    updatePost: (state, action: PayloadAction<Post>) => {
      const index = state.posts.findIndex(post => post.id === action.payload.id)
      if (index !== -1) {
        state.posts[index] = action.payload
      }
    },
    addPost: (state, action: PayloadAction<Post>) => {
      // Check if post already exists to prevent duplicates
      const existsIndex = state.posts.findIndex(post => post.id === action.payload.id)
      if (existsIndex === -1) {
        state.posts.unshift(action.payload)
      }
    },
    removePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(post => post.id !== action.payload)
    },
    clearFeed: (state) => {
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
      state.error = null
      state.cacheKey = null
      state.pendingRequests = {}
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    // Add request tracking
    addPendingRequest: (state, action: PayloadAction<string>) => {
      state.pendingRequests[action.payload] = Date.now()
    },
    removePendingRequest: (state, action: PayloadAction<string>) => {
      delete state.pendingRequests[action.payload]
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch posts cases
      .addCase(fetchFeedPosts.pending, (state, action) => {
        if (action.meta.arg.page === 1) {
          state.isLoading = true
        }
        state.error = null
        
        // Track pending request
        const cacheKey = generateCacheKey(action.meta.arg)
        state.pendingRequests[cacheKey] = Date.now()
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action) => {
        state.isLoading = false
        state.isRefreshing = false
        
        // Remove pending request
        const cacheKey = generateCacheKey(action.meta.arg)
        delete state.pendingRequests[cacheKey]
        
        // Skip if this was a duplicate request
        if (action.payload.skipped) {
          return
        }
        
        // Deduplicate posts to ensure unique entries
        const uniquePosts = action.payload.posts.filter(
          (post, index, array) => array.findIndex(p => p.id === post.id) === index
        )
        
        state.posts = uniquePosts
        state.hasMore = action.payload.hasMore
        state.page = action.payload.page || 1
        state.feedType = action.payload.feedType || state.feedType
        state.sortBy = action.payload.sortBy || state.sortBy
        state.category = action.payload.category
        state.userId = action.payload.userId
        state.lastFetched = Date.now()
        state.cacheKey = action.payload.cacheKey || null
        state.error = null
      })
      .addCase(fetchFeedPosts.rejected, (state, action) => {
        state.isLoading = false
        state.isRefreshing = false
        
        // Remove pending request
        const cacheKey = generateCacheKey(action.meta.arg)
        delete state.pendingRequests[cacheKey]
        
        state.error = action.payload as string
      })
      // Load more posts cases
      .addCase(loadMorePosts.pending, (state) => {
        state.isLoadingMore = true
        state.error = null
      })
      .addCase(loadMorePosts.fulfilled, (state, action) => {
        state.isLoadingMore = false
        
        // Skip if this was a duplicate request
        if (action.payload.skipped) {
          return
        }
        
        // Deduplicate posts to prevent duplicate keys
        const existingPostIds = new Set(state.posts.map(post => post.id))
        const newPosts = action.payload.posts.filter(post => !existingPostIds.has(post.id))
        
        state.posts = [...state.posts, ...newPosts]
        state.hasMore = action.payload.hasMore
        state.page = action.payload.page || 1
        state.error = null
      })
      .addCase(loadMorePosts.rejected, (state, action) => {
        state.isLoadingMore = false
        state.error = action.payload as string
      })
  },
})

export const { 
  setFeedType, 
  setSortBy, 
  setCategory, 
  setUserId, 
  updatePost, 
  addPost, 
  removePost, 
  clearFeed, 
  setError,
  addPendingRequest,
  removePendingRequest
} = feedSlice.actions

export default feedSlice.reducer 