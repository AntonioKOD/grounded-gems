import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface UserData {
  id: string
  email: string
  name?: string
  avatar?: string
  profileImage?: {
    url: string
    alt?: string
    filename?: string
    sizes?: { [key: string]: string }
  }
  location?: {
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  role?: string
  savedPosts?: string[]
  likedPosts?: string[]
}

interface UserState {
  user: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  lastFetched: number | null
}

const initialState: UserState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  lastFetched: null,
}

// Request deduplication - prevent multiple simultaneous requests
let currentFetchPromise: Promise<any> | null = null

// Async thunk for fetching user data
export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (options?: { force?: boolean }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { user: UserState }
      const now = Date.now()
      
      // Reduced cache time for faster updates - but not too aggressive in production
      const cacheTime = process.env.NODE_ENV === 'production' ? 30000 : 10000 // 30s in prod, 10s in dev
      if (!options?.force && state.user.user && state.user.lastFetched && (now - state.user.lastFetched) < cacheTime) {
        return state.user.user
      }

      // Request deduplication - if there's already a request in flight, wait for it
      if (currentFetchPromise && !options?.force) {
        console.log('Deduplicating user fetch request')
        return await currentFetchPromise
      }

      // Create the fetch promise
      const fetchPromise = (async () => {
        // Optimized fetch with production-appropriate timeout
        const controller = new AbortController()
        const timeout = process.env.NODE_ENV === 'production' ? 8000 : 3000 // Longer timeout in production
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch('/api/users/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 401) {
            console.log('User not authenticated (401)')
            return null // User not authenticated
          }
          if (response.status === 503) {
            console.log('Service temporarily unavailable (503)')
            // Return cached user if available, don't clear auth state
            return state.user.user
          }
          if (response.status === 307 || response.status === 308) {
            console.error('Redirect detected on /api/users/me - this should not happen')
            throw new Error('Authentication endpoint is redirecting - check middleware configuration')
          }
          throw new Error(`Failed to fetch user: ${response.status}`)
        }

        const data = await response.json()
        console.log('User fetch successful:', data.user ? 'User found' : 'No user')
        if (data.user) {
          console.log('🖼️ [userSlice] Profile image data received:', {
            profileImage: data.user.profileImage,
            profileImageStructure: data.user.profileImage ? {
              id: data.user.profileImage.id,
              url: data.user.profileImage.url,
              filename: data.user.profileImage.filename,
              sizes: data.user.profileImage.sizes ? Object.keys(data.user.profileImage.sizes) : null
            } : null,
            avatar: data.user.avatar,
            name: data.user.name,
            id: data.user.id
          })
        }
        return data.user || null
      })()

      // Store the promise for deduplication
      currentFetchPromise = fetchPromise

      const result = await fetchPromise

      // Clear the promise when done
      currentFetchPromise = null

      return result
    } catch (error) {
      // Clear the promise on error
      currentFetchPromise = null

      if (error instanceof Error && error.name === 'AbortError') {
        console.log('User fetch timed out - using cached data if available')
        const state = getState() as { user: UserState }
        // Return cached user instead of failing completely
        return state.user.user || null
      }
      
      console.error('Error fetching user:', error)
      
      // Don't reject with value for network errors in production
      // This prevents the auth state from being cleared on temporary network issues
      if (process.env.NODE_ENV === 'production') {
        const state = getState() as { user: UserState }
        return state.user.user || null
      }
      
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user')
    }
  }
)

// Async thunk for logging out
export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      return true
    } catch (error) {
      console.error('Logout error:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Logout failed')
    }
  }
)

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserData | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
      state.lastFetched = Date.now()
      state.error = null
    },
    updateUser: (state, action: PayloadAction<Partial<UserData>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        state.lastFetched = Date.now()
      }
    },
    clearUser: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.lastFetched = null
      state.error = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user cases
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = !!action.payload
        state.lastFetched = Date.now()
        state.error = null
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        // Don't clear user on network errors, only on explicit 401s
        if (action.payload === 'Failed to fetch user: 401') {
          state.user = null
          state.isAuthenticated = false
        }
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.lastFetched = null
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setUser, updateUser, clearUser, setLoading, setError } = userSlice.actions
export default userSlice.reducer 