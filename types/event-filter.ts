/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Comprehensive type for event filtering options
 */
export interface EventFilterOptions {
    // Basic filters
    category?: string
    eventType?: string
    sportType?: string
    skillLevel?: "beginner" | "intermediate" | "advanced"
  
    // Status filters
    status?: "draft" | "published" | "cancelled" | "postponed"
    isMatchmaking?: boolean
    isFeatured?: boolean
  
    // Date filters
    startDate?: {
      from?: string // ISO date string
      to?: string // ISO date string
    }
    upcoming?: boolean // Events in the future
    past?: boolean // Events that have already occurred
  
    // Location filters
    radiusKm?: number
    coordinates?: {
      latitude: number | null
      longitude: number | null
    }
    locationType?: "physical" | "virtual" | "hybrid"
  
    // User-specific filters
    userId?: string // The user to filter by
    isCreator?: boolean // Events created by the user
    isParticipant?: boolean // Events the user is attending
    isInterested?: boolean // Events the user is interested in
  
    // Visibility filters
    visibility?: "public" | "private" | "rsvp"
  
    // Search
    searchQuery?: string
  
    // Pagination
    limit?: number
    offset?: number
    page?: number
  
    // Sorting
    sort?: "startDate" | "createdAt" | "name" | "popularity"
    sortDirection?: "asc" | "desc"
  }
  
  /**
   * Type for the response from event filtering operations
   */
  export interface EventFilterResponse {
    events: any[] // Replace with your Event type
    totalEvents: number
    totalPages: number
    currentPage: number
    hasMore: boolean
  }
  
  /**
   * Type for nearby events with distance information
   */
  export interface NearbyEventResult {
    event: any // Replace with your Event type
    distance?: number // Distance in kilometers
    distanceText?: string // Formatted distance (e.g., "2.5 km")
  }
  
  /**
   * Type for event search parameters
   */
  export interface EventSearchParams {
    query: string
    filters?: Partial<EventFilterOptions>
    limit?: number
    offset?: number
  }
  
  /**
   * Type for the My Events tab filters
   */
  export interface MyEventsFilterOptions {
    upcoming?: boolean
    past?: boolean
    category?: string
    status?: "draft" | "published" | "cancelled" | "postponed"
  }
  