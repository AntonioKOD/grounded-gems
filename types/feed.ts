export interface User {
    id: string
    name: string
    avatar?: string
    bio?: string
    followerCount?: number
    followingCount?: number
    isFollowing?: boolean
    status?: string
  }
  
  export interface Location {
    id: string
    name: string
    address?: string
    image?: string
  }
  
  export interface Post {
    id: string
    title?: string
    content: string
    image?: string
    createdAt: string
    updatedAt: string
    author: {
      id: string
      name: string
      avatar?: string
    }
    type?: 'post' | 'review' | 'recommendation'
    location?: {
      id: string
      name: string
    }
    rating?: number
    likeCount?: number
    commentCount?: number
    shareCount?: number
    saveCount?: number
    isLiked?: boolean
    isSaved?: boolean
  }
  
  export interface Comment {
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
  }
  