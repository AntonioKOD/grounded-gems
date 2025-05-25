import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface UserData {
  id: string
  email: string
  name?: string
  avatar?: string
  profileImage?: {
    url: string
    alt?: string
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

// Async thunk for fetching user data
export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (options?: { force?: boolean }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { user: UserState }
      const now = Date.now()
      
      // Skip fetch if we have recent data and not forcing
      if (!options?.force && state.user.user && state.user.lastFetched && (now - state.user.lastFetched) < 30000) {
        return state.user.user
      }

      const response = await fetch('/api/users/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return null // User not authenticated
        }
        throw new Error(`Failed to fetch user: ${response.status}`)
      }

      const data = await response.json()
      return data.user || null
    } catch (error) {
      console.error('Error fetching user:', error)
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