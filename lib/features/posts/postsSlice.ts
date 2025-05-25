import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { likePost, sharePost, addComment, getCommentsByPostId, addCommentReply, likeCommentOrReply, getCommentsWithReplies } from '@/app/actions'
import { fetchUser } from '../user/userSlice'

interface CommentData {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  likeCount?: number
  isLiked?: boolean
  replies?: CommentData[]
  replyCount?: number
  parentCommentId?: string
  isReply?: boolean
}

interface PostInteractionState {
  likedPosts: string[]
  savedPosts: string[]
  likedComments: string[] // Track liked comments by commentId
  loadingLikes: string[]
  loadingSaves: string[]
  loadingShares: string[]
  loadingComments: string[]
  commentsData: Record<string, CommentData[]> // Store comments by postId
  loadingCommentsData: string[] // Track which posts are loading comments
  loadingReplies: string[] // Track which comments are getting replies
  loadingCommentLikes: string[] // Track which comments are being liked
  commentInteractions: Record<string, { liked: boolean; likeCount: number }> // Track comment interactions
  error: string | null
}

const initialState: PostInteractionState = {
  likedPosts: [],
  savedPosts: [],
  likedComments: [],
  loadingLikes: [],
  loadingSaves: [],
  loadingShares: [],
  loadingComments: [],
  commentsData: {},
  loadingCommentsData: [],
  loadingReplies: [],
  loadingCommentLikes: [],
  commentInteractions: {},
  error: null,
}

// Async thunk for liking a post
export const likePostAsync = createAsyncThunk(
  'posts/likePost',
  async (
    params: { postId: string; shouldLike: boolean; userId: string },
    { rejectWithValue }
  ) => {
    try {
      await likePost(params.postId, params.shouldLike, params.userId)
      return params
    } catch (error) {
      console.error('Error liking post:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to like post')
    }
  }
)

// Async thunk for saving a post
export const savePostAsync = createAsyncThunk(
  'posts/savePost',
  async (
    params: { postId: string; shouldSave: boolean; userId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await fetch(`/api/posts/${params.postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          shouldSave: params.shouldSave,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save post')
      }

      const result = await response.json()
      
      // Refresh user data to get updated saved posts
      dispatch(fetchUser({ force: true }))
      
      return { ...params, saveCount: result.saveCount }
    } catch (error) {
      console.error('Error saving post:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save post')
    }
  }
)

// Async thunk for sharing a post
export const sharePostAsync = createAsyncThunk(
  'posts/sharePost',
  async (
    params: { postId: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await sharePost(params.postId, params.userId)
      return { ...params, shareCount: result.shareCount }
    } catch (error) {
      console.error('Error sharing post:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to share post')
    }
  }
)

// Async thunk for adding a comment
export const addCommentAsync = createAsyncThunk(
  'posts/addComment',
  async (
    params: { postId: string; content: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      await addComment(params.postId, params.content, params.userId)
      return params
    } catch (error) {
      console.error('Error adding comment:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add comment')
    }
  }
)

// Async thunk for adding a comment reply
export const addCommentReplyAsync = createAsyncThunk(
  'posts/addCommentReply',
  async (
    params: { postId: string; parentCommentId: string; content: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      const reply = await addCommentReply(params.postId, params.parentCommentId, params.content, params.userId)
      return { ...params, reply }
    } catch (error) {
      console.error('Error adding comment reply:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add reply')
    }
  }
)

// Async thunk for liking a comment or reply
export const likeCommentAsync = createAsyncThunk(
  'posts/likeComment',
  async (
    params: { postId: string; commentId: string; shouldLike: boolean; userId: string; isReply?: boolean },
    { rejectWithValue }
  ) => {
    try {
      await likeCommentOrReply(params.postId, params.commentId, params.shouldLike, params.userId, params.isReply)
      return params
    } catch (error) {
      console.error('Error liking comment:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to like comment')
    }
  }
)

// Enhanced async thunk for fetching comments with replies
export const fetchCommentsAsync = createAsyncThunk(
  'posts/fetchComments',
  async (
    params: { postId: string; currentUserId?: string },
    { rejectWithValue }
  ) => {
    try {
      const comments = await getCommentsWithReplies(params.postId, params.currentUserId)
      return { postId: params.postId, comments }
    } catch (error) {
      console.error('Error fetching comments:', error)
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch comments')
    }
  }
)

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Optimistic updates
    toggleLikeOptimistic: (state, action: PayloadAction<{ postId: string; isLiked: boolean }>) => {
      const { postId, isLiked } = action.payload
      if (isLiked) {
        if (!state.likedPosts.includes(postId)) {
          state.likedPosts.push(postId)
        }
      } else {
        state.likedPosts = state.likedPosts.filter(id => id !== postId)
      }
    },
    toggleSaveOptimistic: (state, action: PayloadAction<{ postId: string; isSaved: boolean }>) => {
      const { postId, isSaved } = action.payload
      if (isSaved) {
        if (!state.savedPosts.includes(postId)) {
          state.savedPosts.push(postId)
        }
      } else {
        state.savedPosts = state.savedPosts.filter(id => id !== postId)
      }
    },
    // Optimistic comment like update
    toggleCommentLikeOptimistic: (state, action: PayloadAction<{ 
      postId: string; 
      commentId: string; 
      isLiked: boolean; 
      isReply?: boolean;
      parentCommentId?: string;
    }>) => {
      const { postId, commentId, isLiked, isReply, parentCommentId } = action.payload
      const comments = state.commentsData[postId]
      
      if (comments) {
        if (isReply && parentCommentId) {
          // Update reply like status
          const parentComment = comments.find(c => c.id === parentCommentId)
          if (parentComment && parentComment.replies) {
            const reply = parentComment.replies.find(r => r.id === commentId)
            if (reply) {
              reply.isLiked = isLiked
              reply.likeCount = isLiked ? (reply.likeCount || 0) + 1 : Math.max((reply.likeCount || 0) - 1, 0)
            }
          }
        } else {
          // Update comment like status
          const comment = comments.find(c => c.id === commentId)
          if (comment) {
            comment.isLiked = isLiked
            comment.likeCount = isLiked ? (comment.likeCount || 0) + 1 : Math.max((comment.likeCount || 0) - 1, 0)
          }
        }
      }
      
      // Track interaction state
      state.commentInteractions[commentId] = {
        liked: isLiked,
        likeCount: state.commentInteractions[commentId]?.likeCount || 0
      }
    },
    // Add optimistic reply
    addReplyOptimistic: (state, action: PayloadAction<{
      postId: string;
      parentCommentId: string;
      reply: CommentData;
    }>) => {
      const { postId, parentCommentId, reply } = action.payload
      const comments = state.commentsData[postId]
      
      if (comments) {
        const parentComment = comments.find(c => c.id === parentCommentId)
        if (parentComment) {
          if (!parentComment.replies) {
            parentComment.replies = []
          }
          parentComment.replies.unshift(reply)
          parentComment.replyCount = (parentComment.replyCount || 0) + 1
        }
      }
    },
    // Initialize user's liked and saved posts
    initializeLikedPosts: (state, action: PayloadAction<string[]>) => {
      state.likedPosts = action.payload
    },
    initializeSavedPosts: (state, action: PayloadAction<string[]>) => {
      state.savedPosts = action.payload
      console.log('Redux: Initialized savedPosts with:', action.payload)
    },
    initializeLikedComments: (state, action: PayloadAction<string[]>) => {
      state.likedComments = action.payload
      console.log('Redux: Initialized likedComments with:', action.payload)
    },
    // Clear all post interactions (on logout)
    clearPostInteractions: (state) => {
      state.likedPosts = []
      state.savedPosts = []
      state.likedComments = []
      state.loadingLikes = []
      state.loadingSaves = []
      state.loadingShares = []
      state.loadingComments = []
      state.commentsData = {}
      state.loadingCommentsData = []
      state.loadingReplies = []
      state.loadingCommentLikes = []
      state.commentInteractions = {}
      state.error = null
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Like post cases
      .addCase(likePostAsync.pending, (state, action) => {
        const postId = action.meta.arg.postId
        if (!state.loadingLikes.includes(postId)) {
          state.loadingLikes.push(postId)
        }
        state.error = null
      })
      .addCase(likePostAsync.fulfilled, (state, action) => {
        const { postId, shouldLike } = action.payload
        state.loadingLikes = state.loadingLikes.filter(id => id !== postId)
        if (shouldLike) {
          if (!state.likedPosts.includes(postId)) {
            state.likedPosts.push(postId)
          }
        } else {
          state.likedPosts = state.likedPosts.filter(id => id !== postId)
        }
      })
      .addCase(likePostAsync.rejected, (state, action) => {
        const postId = action.meta.arg.postId
        state.loadingLikes = state.loadingLikes.filter(id => id !== postId)
        state.error = action.payload as string
        // Revert optimistic update
        const shouldLike = action.meta.arg.shouldLike
        if (shouldLike) {
          state.likedPosts = state.likedPosts.filter(id => id !== postId)
        } else {
          if (!state.likedPosts.includes(postId)) {
            state.likedPosts.push(postId)
          }
        }
      })
      // Save post cases
      .addCase(savePostAsync.pending, (state, action) => {
        const postId = action.meta.arg.postId
        if (!state.loadingSaves.includes(postId)) {
          state.loadingSaves.push(postId)
        }
        state.error = null
      })
      .addCase(savePostAsync.fulfilled, (state, action) => {
        const { postId, shouldSave } = action.payload
        state.loadingSaves = state.loadingSaves.filter(id => id !== postId)
        if (shouldSave) {
          if (!state.savedPosts.includes(postId)) {
            state.savedPosts.push(postId)
          }
        } else {
          state.savedPosts = state.savedPosts.filter(id => id !== postId)
        }
        console.log('Redux: Updated savedPosts after save operation:', state.savedPosts)
      })
      .addCase(savePostAsync.rejected, (state, action) => {
        const postId = action.meta.arg.postId
        state.loadingSaves = state.loadingSaves.filter(id => id !== postId)
        state.error = action.payload as string
        // Revert optimistic update
        const shouldSave = action.meta.arg.shouldSave
        if (shouldSave) {
          state.savedPosts = state.savedPosts.filter(id => id !== postId)
        } else {
          if (!state.savedPosts.includes(postId)) {
            state.savedPosts.push(postId)
          }
        }
      })
      // Share post cases
      .addCase(sharePostAsync.pending, (state, action) => {
        const postId = action.meta.arg.postId
        if (!state.loadingShares.includes(postId)) {
          state.loadingShares.push(postId)
        }
        state.error = null
      })
      .addCase(sharePostAsync.fulfilled, (state, action) => {
        state.loadingShares = state.loadingShares.filter(id => id !== action.payload.postId)
      })
      .addCase(sharePostAsync.rejected, (state, action) => {
        state.loadingShares = state.loadingShares.filter(id => id !== action.meta.arg.postId)
        state.error = action.payload as string
      })
      // Add comment cases
      .addCase(addCommentAsync.pending, (state, action) => {
        const postId = action.meta.arg.postId
        if (!state.loadingComments.includes(postId)) {
          state.loadingComments.push(postId)
        }
        state.error = null
      })
      .addCase(addCommentAsync.fulfilled, (state, action) => {
        state.loadingComments = state.loadingComments.filter(id => id !== action.payload.postId)
      })
      .addCase(addCommentAsync.rejected, (state, action) => {
        state.loadingComments = state.loadingComments.filter(id => id !== action.meta.arg.postId)
        state.error = action.payload as string
      })
      // Add comment reply cases
      .addCase(addCommentReplyAsync.pending, (state, action) => {
        const commentId = action.meta.arg.parentCommentId
        if (!state.loadingReplies.includes(commentId)) {
          state.loadingReplies.push(commentId)
        }
        state.error = null
      })
      .addCase(addCommentReplyAsync.fulfilled, (state, action) => {
        const { parentCommentId } = action.payload
        state.loadingReplies = state.loadingReplies.filter(id => id !== parentCommentId)
      })
      .addCase(addCommentReplyAsync.rejected, (state, action) => {
        const commentId = action.meta.arg.parentCommentId
        state.loadingReplies = state.loadingReplies.filter(id => id !== commentId)
        state.error = action.payload as string
      })
      // Like comment cases
      .addCase(likeCommentAsync.pending, (state, action) => {
        const commentId = action.meta.arg.commentId
        if (!state.loadingCommentLikes.includes(commentId)) {
          state.loadingCommentLikes.push(commentId)
        }
        state.error = null
      })
      .addCase(likeCommentAsync.fulfilled, (state, action) => {
        const { commentId, shouldLike } = action.payload
        state.loadingCommentLikes = state.loadingCommentLikes.filter(id => id !== commentId)
        
        // Update liked comments state
        if (shouldLike) {
          if (!state.likedComments.includes(commentId)) {
            state.likedComments.push(commentId)
          }
        } else {
          state.likedComments = state.likedComments.filter(id => id !== commentId)
        }
      })
      .addCase(likeCommentAsync.rejected, (state, action) => {
        const commentId = action.meta.arg.commentId
        state.loadingCommentLikes = state.loadingCommentLikes.filter(id => id !== commentId)
        state.error = action.payload as string
        
        // Revert optimistic update
        const shouldLike = action.meta.arg.shouldLike
        if (shouldLike) {
          state.likedComments = state.likedComments.filter(id => id !== commentId)
        } else {
          if (!state.likedComments.includes(commentId)) {
            state.likedComments.push(commentId)
          }
        }
      })
      // Fetch comments cases
      .addCase(fetchCommentsAsync.pending, (state, action) => {
        const postId = action.meta.arg.postId
        if (!state.loadingCommentsData.includes(postId)) {
          state.loadingCommentsData.push(postId)
        }
        state.error = null
      })
      .addCase(fetchCommentsAsync.fulfilled, (state, action) => {
        const { postId, comments } = action.payload
        state.loadingCommentsData = state.loadingCommentsData.filter(id => id !== postId)
        state.commentsData[postId] = comments
      })
      .addCase(fetchCommentsAsync.rejected, (state, action) => {
        const postId = action.meta.arg.postId
        state.loadingCommentsData = state.loadingCommentsData.filter(id => id !== postId)
        state.error = action.payload as string
      })
      // Listen for user data updates to sync saved posts
      .addCase(fetchUser.fulfilled, (state, action) => {
        if (action.payload && action.payload.savedPosts) {
          const newSavedPosts = Array.isArray(action.payload.savedPosts) ? action.payload.savedPosts : []
          console.log('Redux: Syncing savedPosts from user data:', newSavedPosts)
          state.savedPosts = newSavedPosts
        }
        if (action.payload && action.payload.likedPosts) {
          const newLikedPosts = Array.isArray(action.payload.likedPosts) ? action.payload.likedPosts : []
          console.log('Redux: Syncing likedPosts from user data:', newLikedPosts)
          state.likedPosts = newLikedPosts
        }
      })
  },
})

export const {
  toggleLikeOptimistic,
  toggleSaveOptimistic,
  toggleCommentLikeOptimistic,
  addReplyOptimistic,
  initializeLikedPosts,
  initializeSavedPosts,
  initializeLikedComments,
  clearPostInteractions,
  setError,
} = postsSlice.actions

export default postsSlice.reducer 