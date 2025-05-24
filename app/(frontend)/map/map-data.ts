/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const parts = [
    raw.street,
    raw.city,
    raw.state,
    raw.zip,
    raw.country,
  ].filter(Boolean)
  return parts.join(", ")
}

function extractImageUrl(raw: any): string | undefined {
  if (!raw) return undefined
  if (typeof raw === "string") return raw
  return raw.url
}

// --- Fetch & Process Locations -----------------------------------------------

// Global cache to prevent duplicate requests
let locationsCache: Location[] | null = null
let locationsCacheTime = 0
let activeRequest: Promise<Location[]> | null = null

export const addedLocations = async (): Promise<Location[]> => {
  try {
    console.log("📍 [MAP-DATA] Starting addedLocations function...")
    
    // Check cache first (cache for 30 seconds)
    const now = Date.now()
    if (locationsCache && (now - locationsCacheTime) < 30000) {
      console.log("📍 [MAP-DATA] Returning cached locations")
      return locationsCache
    }
    
    // If there's already an active request, wait for it
    if (activeRequest) {
      console.log("📍 [MAP-DATA] Waiting for existing request...")
      return await activeRequest
    }
    
    console.log("📍 [MAP-DATA] Making new API request...")
    
    // Create new request
    activeRequest = fetch('/api/locations/all')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        return data.locations || []
      })
      .then((locations: Location[]) => {
        console.log(`✅ [MAP-DATA] Retrieved ${locations.length} locations from API`)
        
        // Cache the results
        locationsCache = locations
        locationsCacheTime = now
        activeRequest = null // Clear active request
        
        return locations
      })
      .catch((error) => {
        console.error("❌ [MAP-DATA] Error fetching locations:", error)
        activeRequest = null // Clear active request on error
        return locationsCache || [] // Return cached data if available, otherwise empty array
      })
    
    return await activeRequest
    
  } catch (error) {
    console.error("❌ [MAP-DATA] Unexpected error:", error)
    activeRequest = null
    return locationsCache || []
  }
}

// --- Search ------------------------------------------------------------------

export function searchLocations(
  locations: Location[],
  query: string
): Location[] {
  const q = query.trim().toLowerCase()
  if (!q) return locations

  return locations.filter((loc) => {
    if (loc.name.toLowerCase().includes(q)) return true
    const addr = (typeof loc.address === "string" ? loc.address : "")!
    if (addr.toLowerCase().includes(q)) return true
    if (loc.neighborhood?.toLowerCase().includes(q)) return true
    if (
      Array.isArray(loc.categories) &&
      loc.categories.some((cat) =>
        (typeof cat === "string"
          ? cat
          : cat.name || ""
        )
          .toLowerCase()
          .includes(q)
      )
    )
      return true
    if (Array.isArray(loc.tags)) {
      if (
        loc.tags.some((t) => t.tag.toLowerCase().includes(q))
      )
        return true
    }
    if (loc.description?.toLowerCase().includes(q)) return true
    if (loc.shortDescription?.toLowerCase().includes(q)) return true
    return false
  })
}

// --- Fetch & Process Categories ----------------------------------------------

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const res = await getCategories()
    const docs = Array.isArray(res?.docs) ? res.docs : []

    return docs.map((cat: any) => ({
      id: cat.id,
      name: cat.name || "Unnamed Category",
      slug: cat.slug,
      type: cat.type,
      description: cat.description,
      color: cat.color,
      icon: cat.icon,
      featuredImage: cat.featuredImage,
      parent: cat.parent,
      isActive: cat.isActive !== false,
      order: cat.order ?? 0,
    }))
  } catch (err) {
    console.error("Error in fetchCategories:", err)
    return []
  }
}