interface FoursquarePlace {
  fsq_id: string
  name: string
  description?: string
  tel?: string
  website?: string
  email?: string
  geocodes: {
    main: {
      latitude: number
      longitude: number
    }
  }
  location: {
    address?: string
    address_extended?: string
    locality?: string
    region?: string
    postcode?: string
    country?: string
    formatted_address?: string
    neighborhood?: string[]
  }
  categories: Array<{
    id: number
    name: string
    short_name: string
    plural_name: string
    icon: {
      prefix: string
      suffix: string
    }
  }>
  hours?: {
    open_now?: boolean
    regular?: Array<{
      day: number
      open: string
      close: string
    }>
  }
  price?: number
  rating?: number
  stats?: {
    total_photos?: number
    total_ratings?: number
    total_tips?: number
  }
  photos?: Array<{
    id: string
    created_at: string
    prefix: string
    suffix: string
    width: number
    height: number
  }>
  tips?: Array<{
    id: string
    created_at: string
    text: string
  }>
  verified?: boolean
}

interface FoursquarePhoto {
  id: string
  created_at: string
  prefix: string
  suffix: string
  width: number
  height: number
  classifications?: string[]
  tip?: {
    id: string
    created_at: string
    text: string
  }
  user?: {
    id: string
    first_name?: string
    last_name?: string
    photo?: {
      prefix: string
      suffix: string
    }
  }
}

interface FoursquarePhotosResponse {
  photos: FoursquarePhoto[]
}

interface FoursquareSearchParams {
  query?: string
  ll?: string // latitude,longitude
  near?: string // location name
  categories?: string // comma-separated category IDs
  radius?: number // in meters
  limit?: number
  sort?: 'DISTANCE' | 'POPULARITY' | 'RATING' | 'RELEVANCE'
  fields?: string
}

interface FoursquareSearchResponse {
  results: FoursquarePlace[]
  context?: {
    geo_bounds?: {
      circle?: {
        center: {
          latitude: number
          longitude: number
        }
        radius: number
      }
    }
  }
}

class FoursquareAPI {
  private apiKey: string
  private baseUrl = 'https://api.foursquare.com/v3'

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Foursquare API key is required. Please set FOURSQUARE_API_KEY environment variable.')
    }
    this.apiKey = apiKey
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Foursquare API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        error: errorText
      })
      throw new Error(`Foursquare API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Search for places
   */
  async searchPlaces(params: FoursquareSearchParams): Promise<FoursquareSearchResponse> {
    const searchParams = {
      ...params,
      // Use a more conservative set of fields that are guaranteed to exist
      fields: params.fields || 'fsq_id,name,description,tel,website,email,geocodes,location,categories,hours,price,rating,stats,photos,verified'
    }

    return this.makeRequest<FoursquareSearchResponse>('/places/search', searchParams)
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(fsqId: string): Promise<FoursquarePlace> {
    const fields = 'fsq_id,name,description,tel,website,email,geocodes,location,categories,hours,price,rating,stats,photos,verified'
    return this.makeRequest<FoursquarePlace>(`/places/${fsqId}`, { fields })
  }

  /**
   * Get photos for a place
   */
  async getPlacePhotos(fsqId: string, limit: number = 10): Promise<FoursquarePhotosResponse> {
    return this.makeRequest<FoursquarePhotosResponse>(`/places/${fsqId}/photos`, { limit })
  }

  /**
   * Get place photos for a place with detailed metadata
   */
  async getPlacePhotosDetailed(fsqId: string, limit: number = 20): Promise<{
    photos: Array<{
      id: string
      url: string
      highResUrl: string
      mediumResUrl: string
      thumbnailUrl: string
      width: number
      height: number
      caption?: string
      user?: string
    }>
    total: number
  }> {
    try {
      const response = await this.getPlacePhotos(fsqId, limit)
      
      if (!response.photos || response.photos.length === 0) {
        return { photos: [], total: 0 }
      }

      const detailedPhotos = response.photos.map(photo => ({
        id: photo.id,
        url: `${photo.prefix}original${photo.suffix}`,
        highResUrl: `${photo.prefix}1000x1000${photo.suffix}`,
        mediumResUrl: `${photo.prefix}500x500${photo.suffix}`,
        thumbnailUrl: `${photo.prefix}200x200${photo.suffix}`,
        width: photo.width,
        height: photo.height,
        caption: photo.tip?.text,
        user: photo.user ? `${photo.user.first_name} ${photo.user.last_name}`.trim() : undefined
      }))

      return {
        photos: detailedPhotos,
        total: detailedPhotos.length
      }
    } catch (error) {
      console.error('Error fetching detailed photos:', error)
      return { photos: [], total: 0 }
    }
  }

  /**
   * Get tips for a place
   */
  async getPlaceTips(fsqId: string, limit: number = 10): Promise<any> {
    return this.makeRequest(`/places/${fsqId}/tips`, { limit })
  }

  /**
   * Search for places near coordinates
   */
  async searchNearby(latitude: number, longitude: number, radius: number = 1000, limit: number = 50): Promise<FoursquareSearchResponse> {
    return this.searchPlaces({
      ll: `${latitude},${longitude}`,
      radius,
      limit,
      sort: 'DISTANCE'
    })
  }

  /**
   * Search for places by category
   */
  async searchByCategory(category: string, location: string, limit: number = 50): Promise<FoursquareSearchResponse> {
    return this.searchPlaces({
      categories: category,
      near: location,
      limit,
      sort: 'POPULARITY'
    })
  }

  /**
   * Map Foursquare place data to Sacavia location format
   */
  mapToSacaviaLocation(place: FoursquarePlace): any {
    // Map price range
    const mapPriceRange = (price?: number): string => {
      if (!price) return 'moderate'
      switch (price) {
        case 1: return 'budget'
        case 2: return 'moderate'
        case 3: return 'expensive'
        case 4: return 'luxury'
        default: return 'moderate'
      }
    }

    // Map business hours with all days
    const mapBusinessHours = (hours?: FoursquarePlace['hours']) => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const defaultHours = dayNames.map(day => ({
        day,
        open: '',
        close: '',
        closed: true
      }))

      if (!hours?.regular) return defaultHours
      
      // Update default hours with actual data
      hours.regular.forEach(hour => {
        if (hour.day >= 0 && hour.day < 7) {
          defaultHours[hour.day] = {
            day: dayNames[hour.day],
            open: hour.open,
            close: hour.close,
            closed: false
          }
        }
      })

      return defaultHours
    }

    // Generate slug from name
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-')
        .substring(0, 50)
    }

    // Extract photos
    const processPhotos = (photos?: FoursquarePlace['photos']) => {
      if (!photos || photos.length === 0) return []
      
      return photos.map((photo, index) => ({
        image: `${photo.prefix}original${photo.suffix}`,
        caption: `${place.name} - Photo ${index + 1} (via Foursquare)`,
        metadata: {
          foursquarePhotoId: photo.id,
          width: photo.width,
          height: photo.height,
          createdAt: photo.created_at,
          originalUrl: `${photo.prefix}original${photo.suffix}`,
          mediumUrl: `${photo.prefix}800x600${photo.suffix}`,
          thumbnailUrl: `${photo.prefix}300x300${photo.suffix}`
        }
      }))
    }

    // Extract insider tips (safely handle missing tips)
    const extractInsiderTips = (tips?: FoursquarePlace['tips']): string => {
      if (!tips || tips.length === 0) return ''
      return tips.slice(0, 3).map(tip => tip.text).join(' | ')
    }

    // Extract best time to visit based on category
    const getBestTimeToVisit = (categories?: FoursquarePlace['categories']) => {
      if (!categories || categories.length === 0) return []
      
      // Simple logic based on category types
      const outdoor = ['park', 'beach', 'hiking', 'outdoor']
      const hasOutdoor = categories.some(cat => 
        outdoor.some(term => cat.name.toLowerCase().includes(term))
      )
      
      if (hasOutdoor) {
        return [{ season: 'Spring' }, { season: 'Summer' }, { season: 'Fall' }]
      }
      
      return [{ season: 'Year-round' }]
    }

    return {
      name: place.name,
      slug: generateSlug(place.name),
      description: place.description || `Discover ${place.name} - a local gem worth visiting. Located in ${place.location.locality || 'the area'}, this ${place.categories?.[0]?.name.toLowerCase() || 'location'} offers a unique experience for visitors.`,
      shortDescription: place.description?.substring(0, 100) || `Visit ${place.name} for a great experience.`,
      
      // Address
      address: {
        street: place.location.address || place.location.address_extended || '',
        city: place.location.locality || '',
        state: place.location.region || '',
        zip: place.location.postcode || '',
        country: place.location.country || 'USA'
      },
      
      // Coordinates
      coordinates: {
        latitude: place.geocodes.main.latitude,
        longitude: place.geocodes.main.longitude
      },
      
      // Neighborhood
      neighborhood: place.location.neighborhood?.[0] || place.location.locality || '',
      
      // Contact Information
      contactInfo: {
        phone: place.tel || '',
        website: place.website || '',
        email: place.email || '',
        socialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        }
      },
      
      // Business Hours
      businessHours: mapBusinessHours(place.hours),
      
      // Price and Rating
      priceRange: mapPriceRange(place.price),
      averageRating: place.rating || 0,
      reviewCount: place.stats?.total_ratings || 0,
      
      // Status and Verification
      isVerified: place.verified || false,
      isFeatured: false,
      status: 'review', // Import as review status by default for approval
      
      // Categories (will be resolved to actual category IDs during import)
      categories: place.categories?.map(cat => cat.name) || [],
      
      // Foursquare-specific data
      foursquareId: place.fsq_id,
      
      // Gallery
      gallery: processPhotos(place.photos),
      
      // Visitor Information
      bestTimeToVisit: getBestTimeToVisit(place.categories),
      insiderTips: extractInsiderTips(place.tips),
      
      // Accessibility (default values that can be edited)
      accessibility: {
        wheelchairAccess: false, // Can be edited after import
        parking: false, // Can be edited after import
        other: 'Accessibility information not available from Foursquare. Please verify and update.'
      },
      
      // Tags
      tags: place.categories?.map(cat => ({ tag: cat.short_name })) || [],
      
      // SEO Meta
      meta: {
        title: `${place.name} | Sacavia`,
        description: place.description || `Discover ${place.name} on Sacavia - your local guide to amazing places in ${place.location.locality || 'the area'}.`,
        keywords: place.categories?.map(cat => cat.name).join(', ') || ''
      },
      
      // Partnership (can be edited after import)
      hasBusinessPartnership: false,
      partnershipDetails: {
        partnerName: '',
        partnerContact: '',
        details: ''
      },
      
      // Visit verification
      visitVerificationCount: 0
    }
  }

  /**
   * Get Foursquare venue categories (for Personalization API)
   */
  async getVenueCategories(): Promise<{
    categories: Array<{
      id: string
      name: string
      pluralName: string
      shortName: string
      icon: {
        prefix: string
        suffix: string
      }
      parents?: string[]
      mapIcon?: string
    }>
  }> {
    return this.makeRequest<{
      categories: Array<{
        id: string
        name: string
        pluralName: string
        shortName: string
        icon: {
          prefix: string
          suffix: string
        }
        parents?: string[]
        mapIcon?: string
      }>
    }>('/venues/categories')
  }

  /**
   * Fetch all categories and organize them hierarchically
   */
  async getCategoriesHierarchical(): Promise<{
    mainCategories: Array<{
      id: string
      name: string
      pluralName: string
      shortName: string
      icon: {
        prefix: string
        suffix: string
      }
      subcategories: Array<{
        id: string
        name: string
        pluralName: string
        shortName: string
        icon: {
          prefix: string
          suffix: string
        }
      }>
    }>
  }> {
    try {
      const response = await this.getVenueCategories()
      
      // Create a map for quick lookup
      const categoryMap = new Map(response.categories.map(cat => [cat.id, cat]))
      
      // Group categories by their parents
      const mainCategories: any[] = []
      const subcategoriesMap = new Map<string, any[]>()
      
      response.categories.forEach(category => {
        if (!category.parents || category.parents.length === 0) {
          // This is a main category
          mainCategories.push({
            ...category,
            subcategories: []
          })
        } else {
          // This is a subcategory
          category.parents.forEach(parentId => {
            if (!subcategoriesMap.has(parentId)) {
              subcategoriesMap.set(parentId, [])
            }
            subcategoriesMap.get(parentId)!.push(category)
          })
        }
      })
      
      // Attach subcategories to their parents
      mainCategories.forEach(mainCategory => {
        mainCategory.subcategories = subcategoriesMap.get(mainCategory.id) || []
      })
      
      return { mainCategories }
    } catch (error) {
      console.error('Error fetching hierarchical categories:', error)
      return { mainCategories: [] }
    }
  }
}

// Popular Foursquare category IDs (updated for Places API v3)
export const FOURSQUARE_CATEGORIES = {
  // Food & Drink
  RESTAURANT: '13065',
  CAFE: '13035',
  BAR: '13003',
  FAST_FOOD: '13145',
  PIZZA: '13064',
  COFFEE: '13035',
  BREWERY: '13116',
  
  // Arts & Entertainment  
  MUSEUM: '12026',
  ART_GALLERY: '12020',
  THEATER: '12038',
  MUSIC_VENUE: '12054',
  MOVIE_THEATER: '12017',
  
  // Outdoors & Recreation
  PARK: '16032',
  BEACH: '16001',
  HIKING_TRAIL: '16019',
  SPORTS_COMPLEX: '18069',
  GYM: '18008',
  
  // Shopping
  SHOPPING_MALL: '17069',
  BOOKSTORE: '17014',
  CLOTHING_STORE: '17024',
  MARKET: '17053',
  
  // Services
  HOTEL: '19014',
  GAS_STATION: '17069',
  BANK: '17006',
  
  // Nightlife
  NIGHTCLUB: '13116',
  LOUNGE: '13116',
  
  // Travel & Transportation
  TOURIST_ATTRACTION: '16000',
  LANDMARK: '16026'
}

// Initialize the API client
// Create function to get FoursquareAPI instance dynamically
export function getFoursquareAPI(): FoursquareAPI | null {
  try {
    if (process.env.FOURSQUARE_API_KEY) {
      return new FoursquareAPI(process.env.FOURSQUARE_API_KEY)
    }
    return null
  } catch (error) {
    console.warn('Foursquare API initialization failed:', error)
    return null
  }
}

// Legacy export for backward compatibility - but prefer getFoursquareAPI()
let foursquareAPI: FoursquareAPI | null = null

try {
  if (process.env.FOURSQUARE_API_KEY) {
    foursquareAPI = new FoursquareAPI(process.env.FOURSQUARE_API_KEY)
  }
} catch (error) {
  console.warn('Foursquare API not initialized:', error)
}

export { foursquareAPI, FoursquareAPI }
export type { FoursquarePlace, FoursquareSearchParams, FoursquareSearchResponse } 