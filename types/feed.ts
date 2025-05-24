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
    author: {
      id: string
      name: string
      avatar?: string
    }
    createdAt: string
    type: 'post' | 'review' | 'recommendation'
    image?: string
    likeCount?: number
    commentCount?: number
    shareCount?: number
    isLiked?: boolean
    location?: {
      id: string
      name: string
      address?: string
    }
    rating?: number
    categories?: string[]
    status?: 'draft' | 'published' | 'archived'
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
  