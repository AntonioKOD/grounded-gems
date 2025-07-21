import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import userSlice from './features/user/userSlice'
import feedSlice from './features/feed/feedSlice'
import postsSlice from './features/posts/postsSlice'

// Combine reducers
const rootReducer = combineReducers({
  user: userSlice,
  feed: feedSlice,
  posts: postsSlice,
})

export const makeStore = () => {
  let finalReducer = rootReducer
  
  // Only use persistence on client side
  if (typeof window !== 'undefined') {
    const storage = require('redux-persist/lib/storage').default
    const persistConfig = {
      key: 'root',
      storage,
      whitelist: ['user', 'posts'], // Only persist user and posts state
      blacklist: ['feed'], // Don't persist feed state as it should be fresh on reload
    }
    finalReducer = persistReducer(persistConfig, rootReducer) as any
  }
  
  const store = configureStore({
    reducer: finalReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
          // Ignore these field paths in all actions
          ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
          // Ignore these paths in the state
          ignoredPaths: ['posts.loadingLikes', 'posts.loadingSaves', 'posts.loadingShares', 'posts.loadingComments', 'feed.pendingRequests'],
        },
      }),
  })
  
  return store
}

// Create and export store instance for global access
export const store = makeStore()

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch'] 