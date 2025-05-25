import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { 
  getFeedPosts, 
  getPersonalizedFeed, 
  getFeedPostsByUser,
  getDiscoverFeed,
  getPopularFeed,
  getLatestFeed,
  getSavedPostsFeed
} from '@/app/actions'
import type { Post } from '@/types/feed'

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

// Async thunk for fetching feed posts
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

      let posts: Post[] = []

      if (feedType === 'personalized' && currentUserId) {
        posts = (await getPersonalizedFeed(currentUserId, 10, (page - 1) * 10, category)) ?? []
      } else if (feedType === 'user' && userId) {
        posts = (await getFeedPostsByUser(userId, category)) as Post[]
      } else {
        // Use specialized algorithms based on category
        switch (category) {
          case 'discover':
            posts = await getDiscoverFeed(currentUserId, page, 10)
            break
          case 'trending':
            posts = await getPopularFeed(currentUserId, page, 10, '7d')
            break
          case 'recent':
            posts = await getLatestFeed(currentUserId, page, 10)
            break
          case 'bookmarks':
            if (currentUserId) {
              posts = await getSavedPostsFeed(currentUserId, page, 10)
            } else {
              posts = []
            }
            break
          default:
            posts = await getFeedPosts(feedType, sortBy, page, category, currentUserId)
        }
      }

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

      let morePosts: Post[] = []

      if (feedType === 'personalized' && currentUserId) {
        morePosts = (await getPersonalizedFeed(currentUserId, 10, nextPage * 10, category)) ?? []
      } else if (feedType === 'user' && userId) {
        morePosts = (await getFeedPostsByUser(userId, category)) as Post[]
      } else {
        // Use specialized algorithms based on category for load more
        switch (category) {
          case 'discover':
            morePosts = await getDiscoverFeed(currentUserId, nextPage, 10)
            break
          case 'trending':
            morePosts = await getPopularFeed(currentUserId, nextPage, 10, '7d')
            break
          case 'recent':
            morePosts = await getLatestFeed(currentUserId, nextPage, 10)
            break
          case 'bookmarks':
            if (currentUserId) {
              morePosts = await getSavedPostsFeed(currentUserId, nextPage, 10)
            } else {
              morePosts = []
            }
            break
          default:
            morePosts = await getFeedPosts(feedType, sortBy, nextPage, category, currentUserId)
        }
      }

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
      state.posts.unshift(action.payload)
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
        state.posts = action.payload.posts
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
        state.posts = [...state.posts, ...action.payload.posts]
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