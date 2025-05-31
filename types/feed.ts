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
    caption: string
    author: {
      id: string
      name: string
      avatar?: string
      profileImage?: {
        url: string
      } | null
      profilePicture?: {
        url: string
      } | null
    }
    featuredImage?: {
      url: string
    } | null
    video?: {
      url: string
    } | null
    videoThumbnail?: {
      url: string
    } | null
    likeCount: number
    commentCount: number
    shareCount?: number
    saveCount?: number
    isLiked?: boolean
    isSaved?: boolean
    createdAt: string
    updatedAt: string
    location?: {
      id: string
      name: string
      address?: string
      coordinates?: {
        latitude: number
        longitude: number
      }
    }
    categories?: {
      id: string
      name: string
      slug: string
    }[]
    tags?: string[]
    type?: string
    rating?: number
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
  