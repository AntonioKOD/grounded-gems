export interface User {
    id: string
    name: string
    avatar?: string
    bio?: string
    followerCount?: number
    followingCount?: number
    isFollowing?: boolean
  }
  
  export interface Location {
    id: string
    name: string
    address?: string
    image?: string
  }
  
  export interface Post {
    id: string
    author: User
    title?: string
    content: string
    createdAt: string
    image?: string
    likeCount?: number
    commentCount?: number
    isLiked?: boolean
    type: "post" | "review" | "recommendation"
    rating?: number
    location?: Location
    likes?: number
  }
  
  export interface Comment {
    id: string
    author: User
    content: string
    createdAt: string
    likeCount?: number
    isLiked?: boolean
  }
  