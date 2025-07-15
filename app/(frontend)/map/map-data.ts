import { getLocations, getCategories } from "@/app/actions"

// --- Interfaces ----------------------------------------------------------------

export interface Media {
  id: string
  url?: string
  alt?: string
  filename?: string
}

export interface Category {
  id: string
  name: string
  slug?: string
  type?: "location" | "event" | "special" | "general"
  description?: string
  parent?: string | Category
  icon?: Media
  featuredImage?: Media
  color?: string
  order?: number
  isActive?: boolean
  isFeatured?: boolean
}

export interface Address {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

export interface Coordinates {
  latitude?: number
  longitude?: number
}

export interface ContactInfo {
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

export interface BusinessHour {
  day:
    | "Sunday"
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
  open?: string
  close?: string
  closed?: boolean
}

export interface Accessibility {
  wheelchairAccess?: boolean
  parking?: boolean
  other?: string
}

export interface Location {
  id: string
  name: string
  slug?: string
  description?: string
  shortDescription?: string

  // Media
  featuredImage?: Media | string
  gallery?: Array<{ image: Media; caption?: string }>

  // Taxonomy
  categories?: Array<Category | string>
  tags?: Array<{ tag: string }>

  // Address + coords
  address?: Address | string
  coordinates?: Coordinates
  latitude: number
  longitude: number

  // Other optional fields
  neighborhood?: string
  contactInfo?: ContactInfo
  businessHours?: BusinessHour[]
  priceRange?: "free" | "budget" | "moderate" | "expensive" | "luxury"
  bestTimeToVisit?: Array<{ season: string }>
  insiderTips?: string
  accessibility?: Accessibility

  // Partnership fields
  hasBusinessPartnership?: boolean
  partnershipDetails?: {
    partnerName?: string
    details?: string
  }

  // Status / meta
  status?: "draft" | "review" | "published" | "archived"
  isFeatured?: boolean
  isVerified?: boolean

  averageRating?: number
  reviewCount?: number

  // Computed
  imageUrl?: string
}

// --- Helpers ------------------------------------------------------------------

function formatAddress(raw: any): string {
  if (!raw) return ""
  if (typeof raw === "string") return raw

  const parts = []
  if (raw.street) parts.push(raw.street)
  if (raw.city) parts.push(raw.city)
  if (raw.state) parts.push(raw.state)
  if (raw.zip) parts.push(raw.zip)
  if (raw.country) parts.push(raw.country)

  return parts.join(", ")
}

function extractImageUrl(raw: any): string | undefined {
  if (!raw) return undefined
  if (typeof raw === "string") return raw
  if (raw.url) return raw.url
  if (raw.src) return raw.src
  return undefined
}

// --- Fetch & Process Locations -----------------------------------------------

// Global cache to prevent duplicate requests
let locationsCache: Location[] | null = null
let locationsCacheTime = 0
let activeRequest: Promise<Location[]> | null = null
let errorOccurredDuringFetch = false

export const addedLocations = async (): Promise<Location[]> => {
  try {
    console.log("🔄 [MAP-DATA] Starting to fetch locations...")
    
    const response = await fetch("/api/locations/all", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Ensure fresh data
    })

    console.log("🔄 [MAP-DATA] Response status:", response.status)

    if (!response.ok) {
      console.error("❌ [MAP-DATA] Failed to fetch locations:", response.status, response.statusText)
      // Return test data instead of empty array to prevent map from breaking
      return getTestLocations()
    }

    const data = await response.json()
    console.log("📊 [MAP-DATA] Raw response data:", data)

    // Handle different response formats
    let rawLocations = []
    if (data.docs) {
      rawLocations = data.docs // Payload CMS format
    } else if (Array.isArray(data)) {
      rawLocations = data // Direct array
    } else if (data.locations) {
      rawLocations = data.locations // Nested format
    } else {
      console.warn("⚠️ [MAP-DATA] Unexpected data format:", data)
      return getTestLocations()
    }

    console.log(`📍 [MAP-DATA] Processing ${rawLocations.length} raw locations...`)

    // Debug: log the first raw location to see its structure
    if (rawLocations.length > 0) {
      console.log("🔍 [MAP-DATA] First raw location structure:", JSON.stringify(rawLocations[0], null, 2))
    }

    // Transform raw data to our Location interface
    const locations: Location[] = rawLocations
      .map((raw: any, index: number) => {
        try {
          console.log(`🔍 [MAP-DATA] Processing location ${index + 1}: "${raw.name}"`)
          
          // Extract coordinates with multiple fallback options
          let latitude: number | null = null
          let longitude: number | null = null

          // Try different coordinate formats
          if (raw.coordinates && raw.coordinates.latitude != null && raw.coordinates.longitude != null) {
            latitude = Number(raw.coordinates.latitude)
            longitude = Number(raw.coordinates.longitude)
            console.log(`✅ [MAP-DATA] Found coordinates in raw.coordinates: [${latitude}, ${longitude}]`)
          } else if (raw.latitude != null && raw.longitude != null) {
            latitude = Number(raw.latitude)
            longitude = Number(raw.longitude)
            console.log(`✅ [MAP-DATA] Found coordinates in raw.latitude/longitude: [${latitude}, ${longitude}]`)
          } else if (raw.lat != null && raw.lng != null) {
            latitude = Number(raw.lat)
            longitude = Number(raw.lng)
            console.log(`✅ [MAP-DATA] Found coordinates in raw.lat/lng: [${latitude}, ${longitude}]`)
          } else if (raw.location) {
            // Sometimes coordinates are nested under 'location'
            if (raw.location.latitude != null && raw.location.longitude != null) {
              latitude = Number(raw.location.latitude)
              longitude = Number(raw.location.longitude)
              console.log(`✅ [MAP-DATA] Found coordinates in raw.location: [${latitude}, ${longitude}]`)
            } else if (raw.location.lat != null && raw.location.lng != null) {
              latitude = Number(raw.location.lat)
              longitude = Number(raw.location.lng)
              console.log(`✅ [MAP-DATA] Found coordinates in raw.location.lat/lng: [${latitude}, ${longitude}]`)
            }
          }

          // Skip locations without valid coordinates (check for null/undefined/NaN, but allow 0)
          if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
            console.warn(`⚠️ [MAP-DATA] Skipping location "${raw.name}" - invalid coordinates:`, { latitude, longitude, rawCoords: raw.coordinates })
            return null
          }

          // Validate coordinate ranges
          if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.warn(`⚠️ [MAP-DATA] Skipping location "${raw.name}" - coordinates out of range:`, { latitude, longitude })
            return null
          }

          const location: Location = {
            id: raw.id || raw._id || `loc_${Date.now()}_${Math.random()}`,
            name: raw.name || "Unnamed Location",
            slug: raw.slug,
            description: raw.description,
            shortDescription: raw.shortDescription,
            latitude,
            longitude,
            address: formatAddress(raw.address),
            coordinates: { latitude, longitude },
            neighborhood: raw.neighborhood,
            contactInfo: raw.contactInfo,
            businessHours: raw.businessHours,
            priceRange: raw.priceRange,
            bestTimeToVisit: raw.bestTimeToVisit,
            insiderTips: raw.insiderTips,
            accessibility: raw.accessibility,
            status: raw.status || "published",
            isFeatured: raw.isFeatured || false,
            isVerified: raw.isVerified || false,
            averageRating: raw.averageRating ? Number(raw.averageRating) : undefined,
            reviewCount: raw.reviewCount ? Number(raw.reviewCount) : undefined,
            categories: raw.categories || [],
            tags: raw.tags || [],
            featuredImage: extractImageUrl(raw.featuredImage),
            gallery: raw.gallery || [],
            imageUrl: extractImageUrl(raw.featuredImage) || extractImageUrl(raw.imageUrl) || "/placeholder.svg",
          }

          console.log(`✅ [MAP-DATA] Successfully processed location: ${location.name} at [${latitude}, ${longitude}]`)
          return location
        } catch (error) {
          console.error(`❌ [MAP-DATA] Error processing location "${raw.name}":`, error)
          return null
        }
      })
      .filter((loc: Location | null): loc is Location => loc !== null) // Remove null entries

    console.log(`✅ [MAP-DATA] Successfully processed ${locations.length} valid locations`)

    // If no locations found, return an empty array (real data is empty)
    // Only use test data if there was a fetch error earlier.
    if (locations.length === 0 && !errorOccurredDuringFetch) { // Assume errorOccurredDuringFetch is a new boolean flag
      console.log("✅ [MAP-DATA] No locations found, returning empty array as real data.")
      return []
    }

    // If an error occurred during fetch, and locations are still empty, then use test data
    if (locations.length === 0 && errorOccurredDuringFetch) {
      console.log("⚠️ [MAP-DATA] No locations found after fetch error, returning test data...")
      return getTestLocations()
    }

    return locations
  } catch (error) {
    console.error("❌ [MAP-DATA] Fatal error fetching locations:", error)
    // Set the flag here
    errorOccurredDuringFetch = true; 
    // Return test data as fallback instead of empty array
    console.log("🔄 [MAP-DATA] Using fallback test data due to error")
    return getTestLocations()
  }
}

// Helper function to get test locations
function getTestLocations(): Location[] {
  return [
    {
      id: "test-1",
      name: "Boston Common",
      description: "Historic public park in downtown Boston. America's oldest public park, featuring beautiful gardens, walking paths, and seasonal activities.",
      shortDescription: "Historic public park in downtown Boston",
      latitude: 42.3601,
      longitude: -71.0589,
      address: "139 Tremont St, Boston, MA 02111",
      coordinates: { latitude: 42.3601, longitude: -71.0589 },
      categories: [{ id: "park", name: "Park", color: "#48CAE4" }],
      averageRating: 4.5,
      reviewCount: 1250,
      imageUrl: "/placeholder.svg",
      status: "published",
      isFeatured: true,
      isVerified: true,
      contactInfo: {
        website: "https://www.boston.gov/parks/boston-common",
        phone: "(617) 635-4505"
      },
      priceRange: "free"
    },
    {
      id: "test-2", 
      name: "Fenway Park",
      description: "Home of the Boston Red Sox. America's Most Beloved Ballpark featuring the iconic Green Monster wall.",
      shortDescription: "Home of the Boston Red Sox",
      latitude: 42.3467,
      longitude: -71.0972,
      address: "4 Yawkey Way, Boston, MA 02215",
      coordinates: { latitude: 42.3467, longitude: -71.0972 },
      categories: [{ id: "sports", name: "Sports", color: "#FF6B6B" }],
      averageRating: 4.8,
      reviewCount: 2150,
      imageUrl: "/placeholder.svg",
      status: "published",
      isFeatured: true,
      isVerified: true,
      contactInfo: {
        website: "https://www.mlb.com/redsox/ballpark",
        phone: "(617) 267-9440"
      },
      priceRange: "expensive"
    },
    {
      id: "test-3",
      name: "Harvard University",
      description: "Prestigious Ivy League university founded in 1636. Historic campus with beautiful architecture and world-class museums.",
      shortDescription: "Prestigious Ivy League university",
      latitude: 42.3770,
      longitude: -71.1167,
      address: "Cambridge, MA 02138",
      coordinates: { latitude: 42.3770, longitude: -71.1167 },
      categories: [{ id: "education", name: "Education", color: "#B794F6" }],
      averageRating: 4.7,
      reviewCount: 890,
      imageUrl: "/placeholder.svg",
      status: "published",
      isFeatured: false,
      isVerified: true,
      contactInfo: {
        website: "https://www.harvard.edu",
        phone: "(617) 495-1000"
      },
      priceRange: "free"
    },
    {
      id: "test-4",
      name: "Freedom Trail",
      description: "A 2.5-mile-long path through downtown Boston that passes by 16 locations significant to the history of the United States.",
      shortDescription: "Historic walking trail through Boston",
      latitude: 42.3603,
      longitude: -71.0565,
      address: "Boston National Historical Park, Boston, MA",
      coordinates: { latitude: 42.3603, longitude: -71.0565 },
      categories: [{ id: "attraction", name: "Attraction", color: "#4ECDC4" }],
      averageRating: 4.6,
      reviewCount: 3200,
      imageUrl: "/placeholder.svg",
      status: "published",
      isFeatured: true,
      isVerified: true,
      contactInfo: {
        website: "https://www.thefreedomtrail.org",
      },
      priceRange: "free"
    },
    {
      id: "test-5",
      name: "Quincy Market",
      description: "Historic market building featuring over 50 shops and restaurants. A popular destination for food and shopping.",
      shortDescription: "Historic market with shops and restaurants",
      latitude: 42.3598,
      longitude: -71.0546,
      address: "206 S Market St, Boston, MA 02109",
      coordinates: { latitude: 42.3598, longitude: -71.0546 },
      categories: [{ id: "shopping", name: "Shopping", color: "#96CEB4" }],
      averageRating: 4.3,
      reviewCount: 1800,
      imageUrl: "/placeholder.svg",
      status: "published",
      isFeatured: false,
      isVerified: true,
      contactInfo: {
        website: "https://faneuilhallmarketplace.com",
        phone: "(617) 523-1300"
      },
      businessHours: [
        { day: "Monday", open: "10:00", close: "21:00" },
        { day: "Tuesday", open: "10:00", close: "21:00" },
        { day: "Wednesday", open: "10:00", close: "21:00" },
        { day: "Thursday", open: "10:00", close: "21:00" },
        { day: "Friday", open: "10:00", close: "21:00" },
        { day: "Saturday", open: "10:00", close: "21:00" },
        { day: "Sunday", open: "12:00", close: "18:00" }
      ],
      priceRange: "moderate"
    }
  ]
}

// --- Search ------------------------------------------------------------------

export function searchLocations(
  locations: Location[],
  query: string
): Location[] {
  if (!query.trim()) return locations

  const searchTerm = query.toLowerCase().trim()

  return locations.filter((location) => {
    // Search in name
    if (location.name.toLowerCase().includes(searchTerm)) return true

    // Search in description
    if (location.description?.toLowerCase().includes(searchTerm)) return true
    if (location.shortDescription?.toLowerCase().includes(searchTerm)) return true

    // Search in address
    if (typeof location.address === "string" && location.address.toLowerCase().includes(searchTerm)) return true

    // Search in neighborhood
    if (location.neighborhood?.toLowerCase().includes(searchTerm)) return true

    // Search in categories
    if (location.categories?.some((cat) => {
      const categoryName = typeof cat === "string" ? cat : cat.name
      return categoryName?.toLowerCase().includes(searchTerm)
    })) return true

    // Search in tags
    if (location.tags?.some((tag) => tag.tag.toLowerCase().includes(searchTerm))) return true

    return false
  })
}

// --- Fetch & Process Categories ----------------------------------------------

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    console.log("🔄 [MAP-DATA] Fetching categories...")
    
    const response = await fetch("/api/categories", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error("❌ [MAP-DATA] Failed to fetch categories:", response.status)
      return []
    }

    const data = await response.json()
    console.log("📊 [MAP-DATA] Categories data:", data)

    // Handle different response formats
    let categories = []
    if (data.docs) {
      categories = data.docs
    } else if (Array.isArray(data)) {
      categories = data
    } else if (data.categories) {
      categories = data.categories
    }

    console.log(`✅ [MAP-DATA] Fetched ${categories.length} categories`)
    return categories
  } catch (error) {
    console.error("❌ [MAP-DATA] Error fetching categories:", error)
    return []
  }
}