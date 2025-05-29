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
    image?: string | null
    video?: string | null
    videoThumbnail?: string | null
    videoDuration?: number | null
    author: {
      id: string
      name: string
      avatar?: string
    }
    createdAt: string
    updatedAt?: string
    likeCount?: number
    commentCount?: number
    shareCount?: number
    saveCount?: number
    viewCount?: number
    engagementScore?: number
    isLiked?: boolean
    isSaved?: boolean
    isViewed?: boolean
    type?: "post" | "review" | "video" | "story" | "tip" | "recommendation"
    rating?: number | null
    location?: {
      id: string
      name: string
      coordinates?: {
        lat: number
        lng: number
      }
    }
    tags?: string[]
    mentions?: string[]
    isSponsored?: boolean
    priority?: "normal" | "high" | "urgent"
    mediaAspectRatio?: string
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
  