export interface User {
    id: string
    name: string
    email?: string
    profileImage?: string
  }
  
  export interface SocialLink {
    platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
    url: string
  }
  
  export interface Location {
    city?: string
    state?: string
    country?: string
  }
  
  export interface Interest {
    interest: string
  }

  export interface UserProfile {
    id: string
    email: string
    name?: string
    createdAt?: string
    bio?: string
    location?: Location
    profileImage?: {
      url: string
    }
    interests?: Interest[]
    isCreator?: boolean
    creatorLevel?: "explorer" | "hunter" | "authority" | "expert"
    socialLinks?: SocialLink[]
    followerCount?: number
    followingCount?: number
    isFollowing?: boolean
    role?: string
  }
  