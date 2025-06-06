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

      // Skip fetch if we have recent data and not forcing
      const now = Date.now()
      if (!force && state.feed.posts.length > 0 && state.feed.lastFetched && (now - state.feed.lastFetched) < 30000) {
        return { posts: state.feed.posts, hasMore: state.feed.hasMore }
      }

      // Fetch posts using API endpoint
      const params = new URLSearchParams({
        type: feedType,
        sortBy: sortBy,
        page: page.toString(),
        limit: '10'
      })
      
      if (category) params.append('category', category)
      if (currentUserId) params.append('userId', currentUserId)

      const response = await fetch(`/api/feed?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`)
      }
      
      const data = await response.json()
      const posts: Post[] = data.posts || []

      return {
        posts,
        hasMore: posts.length >= 10,
        page,
        feedType,
        sortBy,
        category,
        userId,
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
      const { feedType, sortBy, category, userId, page } = state.feed
      const { currentUserId } = params
      const nextPage = page + 1

      // Fetch more posts using API endpoint
      const params = new URLSearchParams({
        type: feedType,
        sortBy: sortBy,
        page: nextPage.toString(),
        limit: '10'
      })
      
      if (category) params.append('category', category)
      if (currentUserId) params.append('userId', currentUserId)

      const response = await fetch(`/api/feed?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to load more posts: ${response.statusText}`)
      }
      
      const data = await response.json()
      const morePosts: Post[] = data.posts || []

      return {
        posts: morePosts,
        hasMore: morePosts.length >= 10,
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
    },
    setSortBy: (state, action: PayloadAction<'recent' | 'popular' | 'trending'>) => {
      state.sortBy = action.payload
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
    },
    setCategory: (state, action: PayloadAction<string | undefined>) => {
      state.category = action.payload
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
    },
    setUserId: (state, action: PayloadAction<string | undefined>) => {
      state.userId = action.payload
      state.posts = []
      state.page = 1
      state.hasMore = true
      state.lastFetched = null
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
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
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
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action) => {
        state.isLoading = false
        state.isRefreshing = false
        
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
        state.error = null
      })
      .addCase(fetchFeedPosts.rejected, (state, action) => {
        state.isLoading = false
        state.isRefreshing = false
        state.error = action.payload as string
      })
      // Load more posts cases
      .addCase(loadMorePosts.pending, (state) => {
        state.isLoadingMore = true
        state.error = null
      })
      .addCase(loadMorePosts.fulfilled, (state, action) => {
        state.isLoadingMore = false
        
        // Deduplicate posts to prevent duplicate keys
        const existingPostIds = new Set(state.posts.map(post => post.id))
        const newPosts = action.payload.posts.filter(post => !existingPostIds.has(post.id))
        
        state.posts = [...state.posts, ...newPosts]
        state.hasMore = action.payload.hasMore
        state.page = action.payload.page
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
} = feedSlice.actions

export default feedSlice.reducer 