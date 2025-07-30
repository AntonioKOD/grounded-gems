/* eslint-disable @typescript-eslint/no-explicit-any */
export interface EventParticipant {
  id: string
  userId: string
  eventId: string
  status: "going" | "interested" | "not_going" | "waitlist" | "invited"
  createdAt: string
  user?: {
    id: string
    name: string
    avatar?: string
  }
  invitedBy?: {
    id: string
    name: string
  }
  checkInTime?: string
  isCheckedIn?: boolean
}

export interface EventLocation {
  id: string
  name: string
  description?: string
  shortDescription?: string
  featuredImage?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  coordinates?: {
    latitude: number
    longitude: number
  }
  neighborhood?: string
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
    socialMedia?: {
      facebook?: string
      twitter?: string
      instagram?: string
      linkedin?: string
    }
  }
  businessHours?: Array<{
    day: string
    open?: string
    close?: string
    closed?: boolean
  }>
  priceRange?: string
  accessibility?: {
    wheelchairAccess?: boolean
    parking?: boolean
    other?: string
  }
  status?: string
  isVerified?: boolean
  isFeatured?: boolean
}

export type EventVisibility = "public" | "private" | "rsvp"

export interface EventTicketTier {
  name: string
  price: number
  priceId?: string
  quantity: number
}

export interface EventScheduleItem {
  time: string
  activity: string
}

export interface EventFAQ {
  question: string
  answer: string
}

export interface EventRecurringSchedule {
  frequency?: "daily" | "weekly" | "monthly" | "yearly"
  interval?: number
  byDay?: string[]
}

// Define the matchmaking preferences interface
export interface MatchmakingPreferences {
  enabled: boolean
  criteria?: string[]
  ageRange?: {
    min: number
    max: number
  }
  gender?: "male" | "female" | "any"
  skillLevel?: "beginner" | "intermediate" | "advanced" | "all-levels"
  experienceYears?: number
  interests?: string[]
  goals?: ("casual" | "competitive" | "learning" | "social")[]
  playStyle?: string
  availability?: {
    weekdays?: boolean
    weekends?: boolean
    mornings?: boolean
    afternoons?: boolean
    evenings?: boolean
  }
  locationPreference?: "indoor" | "outdoor" | "any"
  equipmentProvided?: boolean
}

export interface Event {
  updatedAt: any
  createdAt: any
  image: string | { url: string; alt?: string } | null
  id: string
  name: string
  slug: string
  description: string
  shortDescription?: string

  // Media
  featuredImage?: string | {url: string}
  gallery?: { image: string; caption?: string }[]

  // Taxonomy / tagging
  categories?: string[]
  tags?: string[]

  // Timing
  startDate: string
  endDate?: string
  isMultiDay?: boolean
  recurringSchedule?: EventRecurringSchedule
  timezone?: string

  // Location
  locationType: "physical" | "virtual" | "hybrid"
  location: EventLocation
  customLocation?: {
    description?: string
    virtualUrl?: string
    platform?: "zoom" | "youtube" | "teams" | "other"
  }

  // Core event metadata
  eventType:
    | "workshop"
    | "concert"
    | "meetup"
    | "webinar"
    | "social"
    | "other"
    | "sports_matchmaking"
    | "sports_tournament"
  category: "sports" | "education" | "entertainment" | "social" | "other"
  sportType?: string
  skillLevel?: "beginner" | "intermediate" | "advanced"

  // Capacity & ticketing
  capacity?: number
  ticketTiers?: EventTicketTier[]

  // Organizer
  organizer: {
    id: any
    name: string
    contactEmail?: string
    contactPhone?: string
    profileImage?: string
  }

  // System fields
  createdBy: {
    id: string
    name: string
    avatar?: string
  }
  status: "draft" | "published" | "cancelled" | "postponed"
  isFeatured?: boolean

  // Engagement metrics
  interestedCount?: number
  goingCount?: number
  participantCount?: number // Added this field

  // SEO & metadata
  meta?: {
    title: string
    description: string
    keywords: string
  }

  // Privacy
  privacy?: "public" | "private"
  privateAccess?: string[]
  invitedUsers?: string[]

  // RSVPs & participation
  participants?: EventParticipant[]
  rsvps?: string[]
}

export interface EventFormData {
  name: string
  slug: string
  description: string

  // Media
  image?: File | null

  // Taxonomy
  category: string
  eventType: string

  // Timing
  startDate: string
  endDate?: string
  durationMinutes?: number
  startTime?: string
  endTime?: string

  // Location
  location: string

  // Capacity
  capacity?: number

  // Pricing
  isFree?: boolean
  price?: number
  currency?: string

  // Event Settings
  requiresApproval?: boolean
  ageRestriction?: string
  isMatchmaking?: boolean
  matchmakingSettings?: any

  // Privacy
  privacy?: "public" | "private"
  privateAccess?: string[]

  // Organizer
  organizer: string

  // Status
  status?: string

  // Tags
  tags?: string[]

  // Meta
  meta?: {
    title?: string
    description?: string
  }
}



export interface AppEvent {
  id: string
  name: string
  description: string
  date: string             // ISO timestamp or formatted date
  location: {
    coordinates: {
      latitude: number
      longitude: number
    }
    address?: string
    city?: string
    state?: string
    country?: string
  }
  category?: string
  image?: string           // URL or path
  distance?: number        // if calculated client- or server-side
  attendeesCount?: number
}