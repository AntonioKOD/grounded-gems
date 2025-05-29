/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useState, useCallback, memo } from "react"
import { Navigation, X, MapPin, Loader2, AlertCircle, Maximize2, Minimize2, Locate, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { getCategoryInfo, getCategoryName } from "./category-utils"

// Import Mapbox CSS explicitly
import "mapbox-gl/dist/mapbox-gl.css"

// Add Mapbox types
declare global {
  interface Window {
    mapboxgl: any;
    handleLocationDetailClick?: (locationId: string) => void;
  }
}

// Enhanced Location interface
interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  address?: string | { street?: string; city?: string; state?: string; country?: string }
  averageRating?: number
  reviewCount?: number
  categories?: Array<string | { id: string; name: string; color?: string }>
  image?: string
  featuredImage?: string | { url: string }
  imageUrl?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  description?: string
  shortDescription?: string
  priceRange?: 'free' | 'budget' | 'moderate' | 'expensive' | 'luxury'
  isOpen?: boolean
  distance?: number
}

interface MapboxMarker {
  marker: any;
  element: HTMLElement;
  cleanup: () => void;
  location?: Location;
  isSpiderified?: boolean;
  originalPosition?: [number, number];
  spiderGroup?: string;
}

interface MarkerCluster {
  id: string;
  locations: Location[];
  center: [number, number]; // [lng, lat]
}

// Detect mobile device
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768
}

// Check if coordinates are valid
const isValidCoordinate = (lat?: number | string | null, lng?: number | string | null): boolean => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false
  
  const numLat = typeof lat === "string" ? parseFloat(lat) : lat
  const numLng = typeof lng === "string" ? parseFloat(lng) : lng
  
  return !isNaN(numLat) && !isNaN(numLng) && 
         numLat >= -90 && numLat <= 90 && 
         numLng >= -180 && numLng <= 180
}

// Calculate distance between two points in meters
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lng2-lng1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

// Get image URL from location object
const getLocationImageUrl = (location: Location): string => {
  if (typeof location.featuredImage === "string") {
    return location.featuredImage
  } else if (location.featuredImage?.url) {
    return location.featuredImage.url
  } else if (location.imageUrl) {
    return location.imageUrl
  }
  return "/placeholder.svg"
}

interface MapComponentProps {
  locations: Location[]
  userLocation: [number, number] | null // [lat, lng] format
  center: [number, number] // [lng, lat] format for Mapbox
  zoom: number
  mapStyle?: string
  onMarkerClick: (location: Location) => void
  onMapClick: (coords: { lat: number; lng: number }) => void
  onMapMove: (center: [number, number], zoom: number) => void // Returns [lng, lat]
  searchRadius?: number
  className?: string
  selectedLocation?: Location | null
  onViewDetail?: (location: Location) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const MapComponent = memo(function MapComponent({
  locations,
  userLocation,
  center,
  zoom,
  mapStyle = "streets-v12",
  onMarkerClick,
  onMapClick,
  onMapMove,
  searchRadius,
  className,
  selectedLocation,
  onViewDetail,
  isFullscreen = false,
  onToggleFullscreen,
}: MapComponentProps) {
  
  const mapRef = useRef<any>(null)
  const mapboxRef = useRef<any>(null)
  const markersRef = useRef<Map<string, MapboxMarker>>(new globalThis.Map())
  const userMarkerRef = useRef<any>(null)
  const radiusCircleRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInitializedRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(false)
  
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [currentStyle, setCurrentStyle] = useState(mapStyle)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [markerClusters, setMarkerClusters] = useState<MarkerCluster[]>([])

  // Track mount state for React 18 concurrent rendering safety
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice())
    
    const handleResize = () => {
      setIsMobile(isMobileDevice())
      if (mapRef.current && mapInitializedRef.current) {
        requestAnimationFrame(() => {
          mapRef.current?.resize()
        })
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Detect overlapping markers and create clusters
  const detectMarkerClusters = useCallback((locations: Location[], zoomLevel: number): MarkerCluster[] => {
    if (!locations.length) return []
    
    // Distance threshold based on zoom level (closer zoom = smaller threshold)
    const distanceThreshold = Math.max(50, 500 / Math.pow(2, zoomLevel - 10)) // meters
    const clusters: MarkerCluster[] = []
    const processed = new Set<string>()
    
    locations.forEach((location, index) => {
      if (processed.has(location.id)) return
      
      const nearbyLocations = [location]
      processed.add(location.id)
      
      // Find nearby locations
      locations.forEach((otherLocation, otherIndex) => {
        if (index === otherIndex || processed.has(otherLocation.id)) return
        
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          otherLocation.latitude,
          otherLocation.longitude
        )
        
        if (distance <= distanceThreshold) {
          nearbyLocations.push(otherLocation)
          processed.add(otherLocation.id)
        }
      })
      
      // Create cluster if multiple locations are close
      if (nearbyLocations.length > 1) {
        const centerLat = nearbyLocations.reduce((sum, loc) => sum + loc.latitude, 0) / nearbyLocations.length
        const centerLng = nearbyLocations.reduce((sum, loc) => sum + loc.longitude, 0) / nearbyLocations.length
        
        clusters.push({
          id: `cluster-${centerLat}-${centerLng}`,
          locations: nearbyLocations,
          center: [centerLng, centerLat],
        })
      } else {
        // Single location cluster
        clusters.push({
          id: `single-${location.id}`,
          locations: [location],
          center: [location.longitude, location.latitude],
        })
      }
    })
    
    return clusters
  }, [])

  // Calculate spiderify positions for clustered markers
  const calculateSpiderPositions = useCallback((
    cluster: MarkerCluster, 
    radiusPixels: number = 60
  ): Array<{ location: Location; position: [number, number] }> => {
    const { locations, center } = cluster
    
    if (locations.length === 1) {
      return [{ location: locations[0], position: center }]
    }
    
    const positions: Array<{ location: Location; position: [number, number] }> = []
    const angleStep = (2 * Math.PI) / locations.length
    
    // Convert pixel radius to coordinate offset (approximate)
    const metersPerPixel = 156543.03392 * Math.cos(center[1] * Math.PI / 180) / Math.pow(2, zoom)
    const radiusMeters = radiusPixels * metersPerPixel
    
    locations.forEach((location, index) => {
      const angle = index * angleStep
      const offsetLng = (radiusMeters / 111320) * Math.cos(angle) / Math.cos(center[1] * Math.PI / 180)
      const offsetLat = (radiusMeters / 110540) * Math.sin(angle)
      
      positions.push({
        location,
        position: [center[0] + offsetLng, center[1] + offsetLat]
      })
    })
    
    return positions
  }, [zoom])

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || mapInitializedRef.current) return
    
    console.log('🗺️ Map initialization starting...')
    console.log('🗺️ Container ref available:', !!mapContainerRef.current)
    console.log('🗺️ Mount state:', isMountedRef.current)
    
    const initializeMap = async () => {
      setIsLoading(true)
      setMapError(null)
      
      try {
        // Load Mapbox if not available
        if (!window.mapboxgl) {
          console.log('🗺️ Loading Mapbox script...')
          await loadMapboxScript()
        }
        
        // Check if component is still mounted and container is still available
        if (!isMountedRef.current || !mapContainerRef.current) {
          console.warn('🗺️ Component unmounted or container ref is null during initialization')
          setIsLoading(false)
          return
        }
        
        // Create map
        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        if (!accessToken) {
          throw new Error('Mapbox access token is required')
        }
        
        console.log('🗺️ Creating map with access token:', accessToken.substring(0, 10) + '...')
        console.log('🗺️ Container element:', mapContainerRef.current)
        console.log('🗺️ Container dimensions:', {
          width: mapContainerRef.current.clientWidth,
          height: mapContainerRef.current.clientHeight,
          offsetWidth: mapContainerRef.current.offsetWidth,
          offsetHeight: mapContainerRef.current.offsetHeight
        })
        
        window.mapboxgl.accessToken = accessToken
        
        // Double-check component is still mounted and container is still available right before map creation
        if (!isMountedRef.current || !mapContainerRef.current) {
          console.warn('🗺️ Component unmounted or container ref became null during initialization')
          setIsLoading(false)
          return
        }
        
        console.log('🗺️ Initializing Mapbox GL Map...')
        
        const map = new window.mapboxgl.Map({
          container: mapContainerRef.current,
          style: `mapbox://styles/mapbox/${currentStyle}`,
          center: [center[0], center[1]], // center is already [lng, lat] format
          zoom: zoom,
          attributionControl: false,
          logoPosition: 'bottom-left',
          pitchWithRotate: false,
          dragRotate: false,
          touchZoomRotate: false,
          // Mobile optimizations
          cooperativeGestures: isMobile,
          touchPitch: false,
          maxTileCacheSize: isMobile ? 50 : 200,
          localIdeographFontFamily: false,
        })
        
        console.log('🗺️ Map instance created with center:', center)
        
        mapRef.current = map
        mapInitializedRef.current = true
        
        // Add map event listeners
        map.on('load', () => {
          console.log('🗺️ Map loaded successfully!')
          
          // Check if component is still mounted
          if (!isMountedRef.current || !mapContainerRef.current) {
            console.warn('🗺️ Component unmounted during map load')
            return
          }
          
          setMapLoaded(true)
          setIsLoading(false)
          setMapReady(true)
          
          // Add user location if available
          if (userLocation) {
            addUserLocationMarker(userLocation)
          }
          
          // Add search radius if provided
          if (searchRadius && userLocation) {
            addSearchRadius(userLocation, searchRadius)
          }
          
          toast.success('Map loaded successfully!')
        })
        
        map.on('error', (e: any) => {
          console.error('🗺️ Map error:', e)
          setMapError('Failed to load map. Please try again.')
          setIsLoading(false)
        })
        
        map.on('styledata', () => {
          console.log('🗺️ Map style loaded')
        })
        
        map.on('sourcedata', () => {
          console.log('🗺️ Map source data loaded')
        })
        
        map.on('move', () => {
          if (mapReady && isMountedRef.current && mapContainerRef.current) {
            const mapCenter = map.getCenter()
            const mapZoom = map.getZoom()
            // Pass coordinates in the format expected by the parent component [lng, lat]
            onMapMove([mapCenter.lng, mapCenter.lat], mapZoom)
          }
        })
        
        map.on('click', (e: any) => {
          if (isMountedRef.current && mapContainerRef.current) {
            console.log(`Map clicked at [${e.lngLat.lng}, ${e.lngLat.lat}]`)
            onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })
          }
        })
        
        // Add navigation controls
        const nav = new window.mapboxgl.NavigationControl({
          showCompass: !isMobile,
          showZoom: true,
          visualizePitch: false
        })
        map.addControl(nav, 'top-right')
        
        // Add geolocation control
        const geolocate = new window.mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: false,
          showUserHeading: false,
          showAccuracyCircle: false
        })
        map.addControl(geolocate, 'top-right')
        
      } catch (error) {
        console.error('🗺️ Map initialization error:', error)
        setMapError(error instanceof Error ? error.message : 'Failed to initialize map')
        setIsLoading(false)
      }
    }
    
    initializeMap()
    
    return () => {
      console.log('🗺️ Cleaning up map...')
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        mapInitializedRef.current = false
        setMapReady(false)
      }
    }
  }, [])

  // Load Mapbox script
  const loadMapboxScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.mapboxgl) {
        resolve()
        return
      }
      
      const script = document.createElement('script')
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js'
      script.async = true
      script.onload = () => {
        setTimeout(() => {
          // Check if component is still mounted before resolving
          if (!isMountedRef.current) {
            reject(new Error('Component unmounted during script load'))
            return
          }
          
          if (window.mapboxgl) {
            resolve()
          } else {
            reject(new Error('Mapbox not available after script load'))
          }
        }, 100)
      }
      script.onerror = () => reject(new Error('Failed to load Mapbox script'))
      document.head.appendChild(script)
      
      // Add CSS
      if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
        const link = document.createElement('link')
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }
    })
  }, [])

  // Add user location marker
  const addUserLocationMarker = useCallback((location: [number, number]) => {
    if (!mapRef.current || userMarkerRef.current || !isMountedRef.current) return
    
    // location is [lat, lng] but Mapbox needs [lng, lat]
    const lng = location[1]
    const lat = location[0]
    
    console.log(`Adding user location marker at [${lng}, ${lat}]`)
    
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.innerHTML = `
      <div class="relative">
        <!-- Outer pulse ring -->
        <div class="absolute inset-0 w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
        <!-- Middle ring -->
        <div class="absolute inset-0 w-5 h-5 bg-blue-500/50 rounded-full animate-pulse" style="top: 2px; left: 2px;"></div>
        <!-- Inner dot -->
        <div class="w-6 h-6 bg-blue-500 border-3 border-white rounded-full shadow-lg relative z-10">
          <div class="absolute inset-1 bg-blue-600 rounded-full"></div>
        </div>
      </div>
    `
    
    const marker = new window.mapboxgl.Marker(el)
      .setLngLat([lng, lat]) // Mapbox expects [longitude, latitude]
      .addTo(mapRef.current)
    
    userMarkerRef.current = marker
  }, [])

  // Add search radius
  const addSearchRadius = useCallback((center: [number, number], radiusKm: number) => {
    if (!mapRef.current || radiusCircleRef.current || !isMountedRef.current) return
    
    const circle = createGeoJSONCircle([center[1], center[0]], radiusKm)
    
    mapRef.current.addSource('search-radius', {
      type: 'geojson',
      data: circle
    })
    
    mapRef.current.addLayer({
      id: 'search-radius',
      type: 'fill',
      source: 'search-radius',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.1
      }
    })
    
    mapRef.current.addLayer({
      id: 'search-radius-border',
      type: 'line',
      source: 'search-radius',
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
        'line-opacity': 0.8
      }
    })
    
    radiusCircleRef.current = true
  }, [])

  // Create GeoJSON circle
  const createGeoJSONCircle = useCallback((center: [number, number], radiusInKm: number) => {
    const points = 64
    const km = radiusInKm
    const ret = []
    const distanceX = km / (111.32 * Math.cos(center[1] * (Math.PI / 180)))
    const distanceY = km / 110.54

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI)
      const x = distanceX * Math.cos(theta)
      const y = distanceY * Math.sin(theta)
      ret.push([center[0] + x, center[1] + y])
    }
    ret.push(ret[0])

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ret]
        }
      }]
    }
  }, [])

  // Create marker element
  const createMarkerElement = useCallback((
    location: Location, 
    isSelected: boolean = false, 
    cluster?: MarkerCluster,
    isClusterMarker: boolean = false
  ) => {
    const categoryInfo = getCategoryInfo(location.categories)
    
    const markerEl = document.createElement('div')
    markerEl.className = cn(
      'location-marker group cursor-pointer transition-all duration-300 transform-gpu',
      isSelected ? 'z-50 scale-110' : 'z-40 hover:z-50 hover:scale-105',
      'absolute select-none'
    )
    
    // Set custom z-index for better layering
    markerEl.style.zIndex = isSelected ? '60' : isClusterMarker ? '45' : '40'
    
    // Cluster marker (multiple locations)
    if (isClusterMarker && cluster && cluster.locations.length > 1) {
      markerEl.innerHTML = `
        <div class="relative">
          <!-- Cluster marker with count using app branding colors -->
          <div class="w-12 h-12 relative drop-shadow-lg">
            <div class="w-full h-full bg-gradient-to-br from-[#FF6B6B] to-[#ff5252] border-3 border-white rounded-full flex items-center justify-center shadow-lg">
              <span class="text-white font-bold text-sm">${cluster.locations.length}</span>
            </div>
            <!-- Pulse ring for cluster using brand color -->
            <div class="absolute inset-0 w-12 h-12 bg-[#FF6B6B]/30 rounded-full animate-ping"></div>
          </div>
          
          <!-- Enhanced cluster preview tooltip - No expand button -->
          <div class="cluster-preview absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 ${isMobile ? 'hidden' : ''}">
            <div class="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-80 max-w-sm">
              <!-- Preview arrow -->
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white"></div>
              
              <div class="space-y-3">
                <h3 class="font-semibold text-gray-900 text-base">${cluster.locations.length} Locations Here</h3>
                
                <!-- Show all locations as clickable items -->
                <div class="space-y-2 max-h-48 overflow-y-auto">
                  ${cluster.locations.map(loc => `
                    <div class="location-item flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-[#FF6B6B]/10 transition-colors cursor-pointer" data-location-id="${loc.id}">
                      <img 
                        src="${getLocationImageUrl(loc)}" 
                        alt="${loc.name}"
                        class="w-10 h-10 object-cover rounded-lg"
                      />
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-900 truncate">${loc.name}</p>
                        ${loc.averageRating ? `
                          <div class="flex items-center gap-1">
                            <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <span class="text-xs text-gray-600">${loc.averageRating.toFixed(1)}</span>
                          </div>
                        ` : ''}
                      </div>
                      <svg class="w-4 h-4 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  `).join('')}
                </div>
                
                <p class="text-xs text-gray-500 text-center py-2">
                  Click on any location above to view details
                </p>
              </div>
            </div>
          </div>
        </div>
      `
    } else {
      // Single location marker (enhanced with better tooltip)
      markerEl.innerHTML = `
        <div class="relative">
          <!-- Main marker pin with enhanced styling -->
          <div class="w-10 h-14 relative drop-shadow-lg">
            <!-- Pin background with gradient -->
            <svg viewBox="0 0 24 36" class="w-full h-full filter drop-shadow-md">
              <defs>
                <linearGradient id="gradient-${location.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:${isSelected ? '#FF6B6B' : categoryInfo.color};stop-opacity:1" />
                  <stop offset="100%" style="stop-color:${isSelected ? '#ff5252' : categoryInfo.color}CC;stop-opacity:1" />
                </linearGradient>
              </defs>
              <path d="M12 0C5.383 0 0 5.383 0 12c0 12 12 24 12 24s12-12 12-24C24 5.383 18.617 0 12 0z" 
                    fill="url(#gradient-${location.id})" 
                    stroke="white" 
                    stroke-width="2"/>
            </svg>
            
            <!-- Icon inside pin -->
            <div class="absolute inset-0 flex items-center justify-center" style="top: -6px;">
              <svg class="w-5 h-5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
            </div>
            
            <!-- Clickable area expansion -->
            <div class="absolute -inset-3 rounded-full" style="background: transparent;"></div>
          </div>
          
          <!-- Pulse animation for selected marker -->
          ${isSelected ? `
            <div class="absolute inset-0 w-10 h-10 rounded-full border-2 border-[#FF6B6B] animate-ping opacity-75" style="top: 2px; left: 0;"></div>
          ` : ''}
          
          <!-- Rating badge -->
          ${location.averageRating ? `
            <div class="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-200 rounded-full px-2 py-1 shadow-lg z-10">
              <div class="flex items-center gap-1">
                <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span class="text-xs font-medium text-gray-700">${location.averageRating.toFixed(1)}</span>
              </div>
            </div>
          ` : ''}
          
          <!-- Enhanced preview popup on hover - ALWAYS shown on desktop -->
          <div class="marker-preview absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 ${isMobile ? 'hidden' : ''}">
            <div class="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-80 max-w-sm">
              <!-- Preview arrow -->
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white"></div>
              
              <!-- Location image with better aspect ratio -->
              <div class="w-full h-40 bg-gray-200 rounded-xl mb-4 overflow-hidden">
                <img 
                  src="${getLocationImageUrl(location)}" 
                  alt="${location.name}"
                  class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </div>
              
              <!-- Location info -->
              <div class="space-y-3">
                <div>
                  <h3 class="font-bold text-gray-900 text-lg leading-tight mb-2">${location.name}</h3>
                  
                  ${location.shortDescription || location.description ? `
                    <p class="text-sm text-gray-600 line-clamp-2 leading-relaxed">${(location.shortDescription || location.description || '').substring(0, 120)}${(location.shortDescription || location.description || '').length > 120 ? '...' : ''}</p>
                  ` : ''}
                </div>
                
                <!-- Rating and category row -->
                <div class="flex items-center justify-between">
                  ${location.averageRating ? `
                    <div class="flex items-center gap-2">
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span class="text-sm font-semibold text-gray-800">${location.averageRating.toFixed(1)}</span>
                      </div>
                      ${location.reviewCount ? `<span class="text-xs text-gray-500">(${location.reviewCount} reviews)</span>` : ''}
                    </div>
                  ` : ''}
                  
                  <span class="text-xs px-3 py-1 rounded-full text-white font-medium" style="background-color: ${categoryInfo.color}">
                    ${getCategoryName(location.categories?.[0])}
                  </span>
                </div>
                
                <!-- Price range -->
                ${location.priceRange ? `
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clip-rule="evenodd"/>
                    </svg>
                    <span class="text-sm text-gray-700 font-medium capitalize">${location.priceRange}</span>
                  </div>
                ` : ''}
                
                <!-- Action button - always show View Details -->
                <div class="pt-2">
                  <button class="view-details-btn w-full bg-gradient-to-r from-[#FF6B6B] to-[#ff5252] hover:from-[#ff5252] hover:to-[#ff4444] text-white text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md">
                    <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }
    
    // Enhanced event listeners with cluster support
    let clickTimeout: NodeJS.Timeout
    let isLongPress = false
    
    // Mouse/touch events for better interaction
    markerEl.addEventListener('mouseenter', (e) => {
      if (!isMobile) {
        e.stopPropagation()
        markerEl.style.zIndex = '65'
      }
    })
    
    markerEl.addEventListener('mouseleave', (e) => {
      if (!isMobile) {
        e.stopPropagation()
        markerEl.style.zIndex = isSelected ? '60' : isClusterMarker ? '45' : '40'
      }
    })
    
    // Enhanced click handling with cluster support
    markerEl.addEventListener('click', (e) => {
      e.stopPropagation()
      
      const target = e.target as HTMLElement
      
      // Handle individual location clicks in cluster preview
      const locationItem = target.closest('.location-item')
      if (locationItem && cluster) {
        const locationId = locationItem.getAttribute('data-location-id')
        const selectedLocation = cluster.locations.find(loc => loc.id === locationId)
        if (selectedLocation) {
          onViewDetail?.(selectedLocation)
          return
        }
      }
      
      // Handle view details button click
      if (target.classList.contains('view-details-btn')) {
        onViewDetail?.(location)
        return
      }
      
      // Handle directions button click
      if (target.classList.contains('directions-btn')) {
        if (location.address) {
          const address = typeof location.address === "string"
            ? location.address
            : Object.values(location.address).filter(Boolean).join(", ")
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
          window.open(mapsUrl, "_blank")
        }
        return
      }
      
      console.log(`Marker clicked for ${location.name} at [${location.longitude}, ${location.latitude}]`)
      onMarkerClick(location)
      
      // Add click animation
      markerEl.style.transform = 'scale(0.95)'
      setTimeout(() => {
        markerEl.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)'
      }, 150)
    })
    
    // Touch events for mobile
    markerEl.addEventListener('touchstart', (e) => {
      if (isMobile) {
        e.stopPropagation()
        isLongPress = false
        clickTimeout = setTimeout(() => {
          isLongPress = true
          onViewDetail?.(location)
        }, 500)
      }
    })
    
    markerEl.addEventListener('touchend', (e) => {
      if (isMobile) {
        e.stopPropagation()
        clearTimeout(clickTimeout)
        
        if (!isLongPress) {
          if (isClusterMarker && cluster && cluster.locations.length > 1) {
            // For clusters on mobile, just trigger marker click (shows cluster info)
            onMarkerClick(location)
          } else {
            onMarkerClick(location)
          }
        }
      }
    })
    
    markerEl.addEventListener('touchcancel', () => {
      if (isMobile) {
        clearTimeout(clickTimeout)
        isLongPress = false
      }
    })
    
    return markerEl
  }, [onMarkerClick, onViewDetail, isMobile])

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !isMountedRef.current) return
    
    // Clear existing markers
    markersRef.current.forEach((markerData) => {
      markerData.marker.remove()
      markerData.cleanup()
    })
    markersRef.current.clear()
    
    // Detect clusters based on current zoom level
    const clusters = detectMarkerClusters(locations, zoom)
    setMarkerClusters(clusters)
    
    // Create markers for each cluster
    clusters.forEach((cluster) => {
      if (!isMountedRef.current) return // Check again in the loop
      
      if (cluster.locations.length === 1) {
        // Single location - create normal marker
        const location = cluster.locations[0]
        const lng = location.longitude
        const lat = location.latitude
        
        if (!isValidCoordinate(lat, lng)) {
          console.warn(`Invalid coordinates for location ${location.name}:`, { lat, lng })
          return
        }
        
        console.log(`Creating single marker for ${location.name} at [${lng}, ${lat}]`)
        
        const isSelected = selectedLocation?.id === location.id
        const markerEl = createMarkerElement(location, isSelected)
        
        if (isSelected) {
          markerEl.classList.add('selected')
        }
        
        const marker = new window.mapboxgl.Marker({
          element: markerEl,
          anchor: 'bottom',
          offset: [0, 0]
        })
          .setLngLat([lng, lat])
          .addTo(mapRef.current)
        
        markersRef.current.set(location.id, {
          marker,
          element: markerEl,
          location,
          cleanup: () => {
            markerEl.removeEventListener('mouseenter', () => {})
            markerEl.removeEventListener('mouseleave', () => {})
            markerEl.removeEventListener('click', () => {})
            markerEl.removeEventListener('touchstart', () => {})
            markerEl.removeEventListener('touchend', () => {})
            markerEl.removeEventListener('touchcancel', () => {})
          }
        })
      } else {
        // Multiple locations - always create cluster marker (no expansion)
        const primaryLocation = cluster.locations[0]
        const isSelected = cluster.locations.some(loc => selectedLocation?.id === loc.id)
        
        console.log(`Creating cluster marker for ${cluster.locations.length} locations at [${cluster.center[0]}, ${cluster.center[1]}]`)
        
        const markerEl = createMarkerElement(primaryLocation, isSelected, cluster, true)
        
        const marker = new window.mapboxgl.Marker({
          element: markerEl,
          anchor: 'bottom',
          offset: [0, 0]
        })
          .setLngLat(cluster.center)
          .addTo(mapRef.current)
        
        markersRef.current.set(`cluster-${cluster.id}`, {
          marker,
          element: markerEl,
          location: primaryLocation,
          spiderGroup: cluster.id,
          cleanup: () => {
            markerEl.removeEventListener('mouseenter', () => {})
            markerEl.removeEventListener('mouseleave', () => {})
            markerEl.removeEventListener('click', () => {})
            markerEl.removeEventListener('touchstart', () => {})
            markerEl.removeEventListener('touchend', () => {})
            markerEl.removeEventListener('touchcancel', () => {})
          }
        })
      }
    })
  }, [locations, mapLoaded, selectedLocation?.id, zoom, createMarkerElement, detectMarkerClusters])

  // Update clusters when zoom changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !locations.length) return
    
    const newClusters = detectMarkerClusters(locations, zoom)
    
    // Check if clustering changed significantly
    const clusteringChanged = newClusters.length !== markerClusters.length ||
      newClusters.some((newCluster, index) => {
        const oldCluster = markerClusters[index]
        return !oldCluster || newCluster.locations.length !== oldCluster.locations.length
      })
    
    if (clusteringChanged) {
      setMarkerClusters(newClusters)
    }
  }, [zoom, locations, markerClusters, detectMarkerClusters])

  // Simplified clustering - no expansion functionality needed
  
  // Update marker selection states when selected location changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    
    markersRef.current.forEach((markerData, locationId) => {
      const isSelected = selectedLocation?.id === locationId || 
        (markerData.spiderGroup && 
         markerClusters.find(c => c.id === markerData.spiderGroup)?.locations.some(loc => loc.id === selectedLocation?.id))
      
      const markerEl = markerData.element
      
      if (isSelected) {
        markerEl.classList.add('selected')
        markerEl.style.zIndex = '60'
      } else {
        markerEl.classList.remove('selected')
        markerEl.style.zIndex = markerData.spiderGroup ? '45' : '40'
      }
    })
  }, [selectedLocation?.id, mapLoaded, markerClusters])

  // Update map center and zoom
  useEffect(() => {
    if (!mapRef.current || !mapReady || !isMountedRef.current) return
    
    console.log('🗺️ Flying to new center:', center, 'zoom:', zoom)
    
    mapRef.current.flyTo({
      center: [center[0], center[1]], // center is [lng, lat] format for Mapbox
      zoom: zoom,
      duration: 1000
    })
  }, [center, zoom, mapReady])

  // Retry map initialization
  const retryMapInit = useCallback(() => {
    setMapError(null)
    setIsLoading(true)
    setMapLoaded(false)
    setMapReady(false)
    mapInitializedRef.current = false
    
    // Re-initialize map
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }, [])

  // Go to user location
  const goToUserLocation = useCallback(() => {
    if (!userLocation || !mapRef.current || !isMountedRef.current) {
      // Try to get user location if not available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude
            const lng = position.coords.longitude
            console.log(`Got user location: [${lat}, ${lng}]`)
            
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [lng, lat], // Mapbox expects [longitude, latitude]
                zoom: 15,
                duration: 2000
              })
              
              // Add user location marker if not already added
              if (!userMarkerRef.current) {
                addUserLocationMarker([lat, lng]) // Pass as [lat, lng] to function
              }
              
              toast.success('Found your location!')
            }
          },
          (error) => {
            console.error('Error getting user location:', error)
            toast.error('Unable to get your location. Please enable location services.')
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        )
      } else {
        toast.error('Geolocation is not supported by this browser.')
      }
      return
    }
    
    // userLocation is [lat, lng] but Mapbox needs [lng, lat]
    const lng = userLocation[1]
    const lat = userLocation[0]
    
    console.log(`Flying to user location: [${lng}, ${lat}]`)
    
    mapRef.current.flyTo({
      center: [lng, lat], // Mapbox expects [longitude, latitude]
      zoom: 15,
      duration: 2000
    })
    
    toast.success('Showing your location')
  }, [userLocation, addUserLocationMarker])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("relative w-full h-full bg-gray-100 flex items-center justify-center", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto rounded-full border-4 border-gray-300 border-t-blue-500"
          />
          <div>
            <h3 className="font-semibold text-gray-900">Loading Map</h3>
            <p className="text-sm text-gray-600">Setting up your location experience...</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (mapError) {
    return (
      <div className={cn("relative w-full h-full bg-gray-100 flex items-center justify-center", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 p-6"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Map Error</h3>
            <p className="text-sm text-gray-600 mb-4">{mapError}</p>
            <Button onClick={retryMapInit} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0"
        style={{ 
          minHeight: '200px',
          width: '100%',
          height: '100%'
        }}
      />

      {/* Map controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Fullscreen toggle (desktop only) */}
        {!isMobile && onToggleFullscreen && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onToggleFullscreen}
                  className="bg-white/90 backdrop-blur-sm border shadow-md hover:bg-white"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Go to user location */}
        {userLocation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={goToUserLocation}
                  className="bg-white/90 backdrop-blur-sm border shadow-md hover:bg-white"
                >
                  <Locate className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Go to your location
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Location count badge */}
      <div className="absolute top-4 right-4 z-10">
        <Badge 
          variant="secondary" 
          className="bg-white/90 backdrop-blur-sm border shadow-md text-gray-700"
        >
          <MapPin className="w-3 h-3 mr-1" />
          {locations.length} locations
        </Badge>
      </div>
    </div>
  )
})

export default MapComponent
