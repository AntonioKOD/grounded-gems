import type { Location, Media } from "./map-data"

// Shared User interface
export interface User {
  avatar: string | undefined
  id: string
  name?: string
  email?: string
}

// Shared Review interface (enhanced version combining both files)
export interface ReviewItem {
  id: string
  title: string
  content: string
  rating: number
  author?: { 
    id: string
    name?: string
    profileImage?: { url: string }
  } | string
  visitDate?: string | Date
  createdAt: string | Date
  pros?: Array<{ pro: string }>
  cons?: Array<{ con: string }>
  tips?: string
  helpfulCount?: number
  unhelpfulCount?: number
  usersWhoMarkedHelpful?: string[]
  usersWhoMarkedUnhelpful?: string[]
}


// Shared props interfaces
export interface LocationDetailProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
  isMobile?: boolean
  cluster?: {
    locations: Location[]
    isCluster: boolean
  } | null
}

export interface LocationDetailMobileProps {
  location: Location | null
  isOpen: boolean
  onClose: () => void
}

// Modal props interfaces
export interface WriteReviewModalProps {
  isOpen: boolean
  onClose: () => void
  location: Location | null
  currentUser: User | null
  onSuccess: () => void
}


// Re-export Media type
export type { Media } from "./map-data" 