/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useState, useCallback, memo } from "react"
import { MapPin, AlertCircle, Maximize2, Minimize2, Locate, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { getCategoryInfo } from "./category-utils"
import type { Location } from "./map-data"

// Import Mapbox CSS explicitly
import "mapbox-gl/dist/mapbox-gl.css"

// Add Mapbox types
declare global {
  interface Window {
    mapboxgl: any;
    handleLocationDetailClick?: (locationId: string) => void;
  }
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

// Detect mobile device with more robust detection
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  
  // Check multiple indicators for mobile
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = window.innerWidth <= 768
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  
  // Multiple checks for better accuracy
  return isMobileUA || (isTouchDevice && isSmallScreen) || hasCoarsePointer
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
  showMobilePreview?: boolean // Add prop to track mobile preview state
  forceRefresh?: number // Add prop to trigger map refresh
  mapPadding?: { top: number; right: number; bottom: number; left: number } // New prop
  isDetailModalOpen?: boolean // New prop to indicate if the main detail modal is open
}

const MapComponent = memo<MapComponentProps>(function MapComponent({
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
  showMobilePreview = true,
  forceRefresh,
  mapPadding = { top: 0, right: 0, bottom: 0, left: 0 }, // Default padding
  isDetailModalOpen = false, // Default to false
}: MapComponentProps) {
  
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, MapboxMarker>>(new globalThis.Map())
  const userMarkerRef = useRef<any>(null)
  const radiusCircleRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInitializedRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(false)
  
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [markerClusters, setMarkerClusters] = useState<MarkerCluster[]>([])

  // Track mount state for React 18 concurrent rendering safety
  useEffect(() => {
    isMountedRef.current = true;
    // Explicitly set isLoading to true here initially,
    // to ensure loading UI shows until map attempts to initialize.
    setIsLoading(true); 
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle mobile detection and resize events with debouncing
  useEffect(() => {
    const initialMobile = isMobileDevice()
    console.log('📱 Initial mobile detection:', {
      isMobileDevice: initialMobile,
      userAgent: navigator.userAgent,
      innerWidth: window.innerWidth
    })
    
    setIsMobile(initialMobile)
    
    let resizeTimeout: NodeJS.Timeout
    
    const handleResize = () => {
      // Clear any existing timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      
      // Debounce the resize handler
      resizeTimeout = setTimeout(() => {
        const newMobile = isMobileDevice()
        const hasChanged = newMobile !== isMobile
        
        if (hasChanged) {
          console.log('📱 Mobile detection changed on resize:', {
            isMobileDevice: newMobile,
            innerWidth: window.innerWidth,
            changed: hasChanged
          })
          
          setIsMobile(newMobile)
        }
        
        // Resize map if it exists
        if (mapRef.current && mapInitializedRef.current) {
          requestAnimationFrame(() => {
            mapRef.current?.resize()
          })
        }
      }, 100) // Debounce for 100ms
    }
    
    window.addEventListener('resize', handleResize, { passive: true })
    
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [isMobile]) // Add isMobile as dependency to track changes

  // Load Mapbox script
  const loadMapboxScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.mapboxgl) {
        console.log('🗺️ Mapbox GL already loaded');
        resolve();
        return;
      }
      
      console.log('🗺️ Loading Mapbox GL script...');
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.async = true;
      script.onload = () => {
        console.log('🗺️ Mapbox GL script loaded successfully');
        // Wait a brief moment to ensure mapboxgl is truly available on window
        setTimeout(() => {
          if (!isMountedRef.current) {
            console.warn('🗺️ Component unmounted during script load timeout');
            reject(new Error('Component unmounted during script load'));
            return;
          }
          
          if (window.mapboxgl) {
            console.log('🗺️ Mapbox GL available on window object after script load');
            resolve();
          } else {
            console.error('🗺️ Mapbox GL not available on window after script load and timeout');
            reject(new Error('Mapbox not available after script load'));
          }
        }, 50); // Short delay
      };
      script.onerror = (error) => {
        console.error('🗺️ Failed to load Mapbox script:', error);
        setMapError('Failed to load Mapbox GL script. Check network or ad-blockers.');
        setIsLoading(false); // Stop loading on script error
        reject(new Error('Failed to load Mapbox script'));
      };
      document.head.appendChild(script);
      
      // CSS is now handled by direct import, so no need to load it dynamically here.
      // if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      //   console.log('🗺️ Loading Mapbox GL CSS...');
      //   const link = document.createElement('link');
      //   link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      //   link.rel = 'stylesheet';
      //   link.onload = () => console.log('🗺️ Mapbox GL CSS loaded successfully');
      //   link.onerror = () => console.warn('🗺️ Failed to load Mapbox GL CSS');
      //   document.head.appendChild(link);
      // }
    });
  }, []);

  // Initialize map
  useEffect(() => {
    console.log('🔍 Map initialization useEffect triggered with dependencies:', {
      center,
      zoom, 
      mapStyle,
      hasContainer: !!mapContainerRef.current,
      isClient: typeof window !== 'undefined',
      mapInitialized: mapInitializedRef.current,
      hasMap: !!mapRef.current
    })
    
    // Don't initialize if we're not in browser or if we don't have a container
    if (typeof window === 'undefined') {
      console.log('🔍 Skipping map init: not in browser')
      return
    }
    
    if (!mapContainerRef.current) {
      console.log('🔍 Skipping map init: no container ref')
      return
    }
    
    // Reset initialization state if map was previously cleaned up
    if (!mapRef.current && mapInitializedRef.current) {
      console.log('🗺️ Resetting map initialization state after cleanup')
      mapInitializedRef.current = false
      setMapLoaded(false)
      setMapReady(false)
    }
    
    // Skip if already initialized and map exists
    if (mapInitializedRef.current && mapRef.current) {
      console.log('🗺️ Map already initialized, skipping')
      return
    }
    
    console.log('🗺️ Map initialization starting...')
    console.log('🗺️ Container ref available:', !!mapContainerRef.current)
    console.log('🗺️ Mount state:', isMountedRef.current)
    console.log('🗺️ Previous init state:', mapInitializedRef.current)
    
    const initializeMap = async () => {
      // Ensure isLoading is true at the start of any initialization attempt
      setIsLoading(true);
      setMapError(null);

      if (!isMountedRef.current) {
        console.warn('🗺️ Component unmounted before map initialization could start.');
        setIsLoading(false); // Ensure loading stops if component is already unmounted
        return;
      }

      if (!mapContainerRef.current) {
        console.warn('🗺️ Map container ref not available yet. Will retry if dependencies change or component re-renders.');
        // setIsLoading(true) is already called, so loading UI persists.
        return;
      }

      // Reset initialization state if map was previously cleaned up
      if (!mapRef.current && mapInitializedRef.current) {
        console.log('🗺️ Resetting map initialization state after cleanup');
        mapInitializedRef.current = false;
        setMapLoaded(false);
        setMapReady(false);
      }
      
      // Skip if already initialized and map exists
      if (mapInitializedRef.current && mapRef.current) {
        console.log('🗺️ Map already initialized and instance exists, ensuring loading is false.');
        setIsLoading(false); // If map exists, should not be loading.
        return;
      }
      
      console.log('🗺️ Map initialization starting...');
      
      try {
        // Load Mapbox if not available
        if (!window.mapboxgl) {
          console.log('🗺️ Mapbox GL not found on window, attempting to load script...');
          await loadMapboxScript(); // This will reject if script fails to load
        }
        
        // Double check after script loading attempt
        if (!window.mapboxgl) {
          console.error('🗺️ Mapbox GL still not available after attempting to load script.');
          setMapError('Mapbox GL JS could not be loaded. Please check your internet connection and try again.');
          setIsLoading(false);
          return;
        }

        if (!isMountedRef.current || !mapContainerRef.current) {
          console.warn('🗺️ Component unmounted or container ref became null during pre-init checks.');
          setIsLoading(false);
          return;
        }
        
        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!accessToken) {
          console.error('🗺️ Mapbox access token missing!')
          console.error('🗺️ NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here')
          console.error('🗺️ Add it to your .env.local file')
          
          setMapError('Mapbox access token is required. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env.local file.')
          setIsLoading(false)
          return
        }
        
        console.log('🗺️ Creating map with access token:', accessToken.substring(0, 10) + '...')
        console.log('🗺️ Map style:', `mapbox://styles/mapbox/${mapStyle}`)
        console.log('🗺️ Container element:', mapContainerRef.current)
        console.log('🗺️ Container dimensions:', {
          width: mapContainerRef.current.clientWidth,
          height: mapContainerRef.current.clientHeight,
          offsetWidth: mapContainerRef.current.offsetWidth,
          offsetHeight: mapContainerRef.current.offsetHeight
        })
        
        // Ensure container has proper dimensions before creating map
        if (mapContainerRef.current.clientWidth === 0 || mapContainerRef.current.clientHeight === 0) {
          console.warn('🗺️ Container has zero dimensions, forcing proper sizing...')
          mapContainerRef.current.style.width = '100%'
          mapContainerRef.current.style.height = '100%'
          
          // Wait a frame for DOM update
          await new Promise(resolve => requestAnimationFrame(resolve))
          
          console.log('🗺️ Updated container dimensions:', {
            width: mapContainerRef.current.clientWidth,
            height: mapContainerRef.current.clientHeight,
          })
        }
        
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
          style: `mapbox://styles/mapbox/${mapStyle}`,
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
          // Add performance optimizations
          preserveDrawingBuffer: false,
          antialias: !isMobile, // Disable on mobile for better performance
        })
        
        console.log('🗺️ Map instance created with center:', center, 'zoom:', zoom)
        
        mapRef.current = map
        mapInitializedRef.current = true
        
        let styleInitiallyReady = false;

        map.on('styledata', () => {
          console.log('🗺️ Map style data loaded/changed');
          if (!isMountedRef.current || !mapRef.current) { // Check mapRef.current too
            console.warn('🗺️ Component unmounted or map removed during map styledata');
            return;
          }

          if (!styleInitiallyReady && mapRef.current.isStyleLoaded()) {
            styleInitiallyReady = true;
            console.log('🗺️ Map style is initially ready!');
            
            setTimeout(() => {
              if (mapRef.current && isMountedRef.current) {
                mapRef.current.resize();
                console.log('🗺️ Map size recalculated after style ready');
              }
            }, 50);

            setMapReady(true);
            setIsLoading(false); // Key: Stop loading spinner here
            console.log('🗺️ setIsLoading(false) called from styledata');

            if (userLocation) {
              addUserLocationMarker(userLocation);
            }
            if (searchRadius && userLocation) {
              addSearchRadius(userLocation, searchRadius);
            }
          }
        });
        
        map.on('load', () => {
          console.log('🗺️ Map fully loaded (all resources)!');
          
          if (!isMountedRef.current || !mapRef.current) {
            console.warn('🗺️ Component unmounted or map removed during map load');
            return;
          }
          
          setTimeout(() => {
            if (mapRef.current && isMountedRef.current) {
              mapRef.current.resize();
              console.log('🗺️ Map size recalculated after full load');
            }
          }, 100);
          
          setMapLoaded(true);

          if (isLoading) { // Check component's isLoading state
             setIsLoading(false);
             console.warn("🗺️ isLoading was still true at 'load' event, setting to false (fallback).");
          }
          if (!mapReady) { // Check component's mapReady state
            setMapReady(true);
            console.warn("🗺️ mapReady was still false at 'load' event, setting to true (fallback).");
            if (userLocation && !userMarkerRef.current) {
              addUserLocationMarker(userLocation);
            }
            if (searchRadius && userLocation && !radiusCircleRef.current) {
              addSearchRadius(userLocation, searchRadius);
            }
          }
          
          // Only show success toast if it hasn't been shown due to an earlier error or different state
          if (!mapError) {
            // toast.success('Map loaded successfully!');
          }
        });
        
        map.on('error', (e: any) => {
          console.error('🗺️ Map error:', e)
          setMapError('Failed to load map. Please try again.')
          setIsLoading(false)
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
        
      } catch (error: any) { // Explicitly type error
        console.error('🗺️ Map initialization error:', error);
        setMapError(error.message || 'Failed to initialize map. Please try again.');
        setIsLoading(false);
      }
    }
    
    initializeMap()
    
    return () => {
      console.log('🗺️ Cleaning up map...')
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (error) {
          console.warn('🗺️ Error removing map:', error)
        }
        mapRef.current = null
      }
      // Reset initialization flag for next mount
      mapInitializedRef.current = false
      setMapLoaded(false)
      setMapReady(false)
      setIsLoading(false)
      setMapError(null)
    }
  }, [center, zoom, mapStyle, loadMapboxScript]) // Add dependencies to reinitialize on key changes

  // Handle force refresh requests from parent
  useEffect(() => {
    if (forceRefresh && mapRef.current && mapReady) {
      console.log('🗺️ Force refresh requested, calling map.resize()')
      try {
        mapRef.current.resize()
        
        // Also invalidate size after a short delay to ensure proper rendering
        setTimeout(() => {
          if (mapRef.current && isMountedRef.current) {
            mapRef.current.resize()
            console.log('🗺️ Map size invalidated after force refresh')
          }
        }, 100)
      } catch (error) {
        console.warn('🗺️ Error during force refresh:', error)
      }
    }
  }, [forceRefresh, mapReady])

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
    
    const marker = new window.mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
      offset: [0, 0]
    })
      .setLngLat([lng, lat])
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
      isSelected ? 'z-50' : 'z-40 hover:z-50',
      'absolute select-none'
    )
    
    // Set absolute positioning to prevent movement
    markerEl.style.position = 'absolute'
    markerEl.style.transform = 'translate(-50%, -100%)'
    markerEl.style.transformOrigin = 'center bottom'
    
    // Set custom z-index for better layering
    markerEl.style.zIndex = isSelected ? '60' : isClusterMarker ? '45' : '40'
    
    // Cluster marker (multiple locations)
    if (isClusterMarker && cluster && cluster.locations.length > 1) {
      markerEl.innerHTML = `
        <div class="relative">
          <!-- Cluster marker with count using app branding colors (made smaller) -->
          <div class="w-8 h-8 relative drop-shadow-lg">
            <div class="w-full h-full bg-primary border-2 border-background rounded-full flex items-center justify-center shadow-lg">
              <span class="text-primary-foreground font-bold text-xs">${cluster.locations.length}</span>
            </div>
            <!-- Pulse ring for cluster using brand color -->
            <div class="absolute inset-0 w-8 h-8 bg-primary/30 rounded-full animate-ping"></div>
          </div>
          
          <!-- Enhanced cluster preview tooltip - Desktop hover -->
          <div class="cluster-preview absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 ${isMobile ? 'hidden' : ''}">
            <div class="bg-background rounded-xl shadow-2xl border border-border p-4 w-80 max-w-sm">
              <!-- Preview arrow -->
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-background"></div>
              
              <div class="space-y-3">
                <h3 class="font-semibold text-foreground text-base">${cluster.locations.length} Locations Here</h3>
                
                <!-- Show all locations as clickable items -->
                <div class="space-y-2 max-h-48 overflow-y-auto">
                  ${cluster.locations.map(loc => `
                    <div class="location-item flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer" data-location-id="${loc.id}">
                      <img 
                        src="${getLocationImageUrl(loc)}" 
                        alt="${loc.name}"
                        class="w-10 h-10 object-cover rounded-lg"
                      />
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-foreground truncate">${loc.name}</p>
                        ${loc.averageRating ? `
                          <div class="flex items-center gap-1">
                            <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <span class="text-xs text-muted-foreground">${loc.averageRating.toFixed(1)}</span>
                          </div>
                        ` : ''}
                      </div>
                      <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  `).join('')}
                </div>
                
                <p class="text-xs text-muted-foreground text-center py-2">
                  Click on any location above to view details
                </p>
              </div>
            </div>
          </div>
        </div>
      `
    } else {
      // Single location marker (made smaller and added preview tooltip)
      markerEl.innerHTML = `
        <div class="relative">
          <!-- Main marker pin with enhanced styling (made smaller) -->
          <div class="w-7 h-10 relative drop-shadow-lg">
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
            <div class="absolute inset-0 flex items-center justify-center" style="top: -4px;">
              <svg class="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
            </div>
            
            <!-- Clickable area expansion -->
            <div class="absolute -inset-3 rounded-full" style="background: transparent;"></div>
          </div>
          
          <!-- Pulse animation for selected marker -->
          ${isSelected ? `
            <div class="absolute inset-0 w-7 h-7 rounded-full border-2 border-[#FF6B6B] animate-ping opacity-75" style="top: 1px; left: 0;"></div>
          ` : ''}
          
          <!-- Rating badge (made smaller) -->
          ${location.averageRating ? `
            <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-md z-10">
              <div class="flex items-center gap-0.5">
                <svg class="w-2.5 h-2.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span class="text-xs font-medium text-gray-700">${location.averageRating.toFixed(1)}</span>
              </div>
            </div>
          ` : ''}

          <!-- Single location preview tooltip - Desktop hover -->
          <div class="location-preview absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 ${isMobile ? 'hidden' : ''}">
            <div class="bg-background rounded-xl shadow-2xl border border-border p-4 w-72 max-w-sm">
              <!-- Preview arrow -->
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-background"></div>
              
              <div class="space-y-3">
                <!-- Location image -->
                <div class="w-full h-32 rounded-lg overflow-hidden">
                  <img 
                    src="${getLocationImageUrl(location)}" 
                    alt="${location.name}"
                    class="w-full h-full object-cover"
                  />
                </div>
                
                <!-- Location info -->
                <div class="space-y-2">
                  <h3 class="font-semibold text-foreground text-sm">${location.name}</h3>
                  
                  ${location.shortDescription || location.description ? `
                    <p class="text-xs text-muted-foreground line-clamp-2">
                      ${location.shortDescription || location.description}
                    </p>
                  ` : ''}
                  
                  <!-- Category badge -->
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" style="background-color: ${categoryInfo.color}"></div>
                    <span class="text-xs text-muted-foreground">${categoryInfo.name}</span>
                  </div>
                  
                  <!-- Rating -->
                  ${location.averageRating ? `
                    <div class="flex items-center gap-1">
                      <div class="flex items-center">
                        ${Array.from({length: 5}, (_, i) => `
                          <svg class="w-3 h-3 ${i < Math.floor(location.averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        `).join('')}
                      </div>
                      <span class="text-xs font-medium text-foreground">${location.averageRating.toFixed(1)}</span>
                      ${location.reviewCount ? `
                        <span class="text-xs text-muted-foreground">(${location.reviewCount})</span>
                      ` : ''}
                    </div>
                  ` : ''}
                  
                  <!-- Address -->
                  ${location.address ? `
                    <p class="text-xs text-muted-foreground">
                      ${typeof location.address === "string" 
                        ? location.address 
                        : Object.values(location.address).filter(Boolean).join(", ")
                      }
                    </p>
                  ` : ''}
                </div>
                
                <!-- Action buttons -->
                <div class="grid grid-cols-2 gap-2 pt-2">
                  <button class="location-preview-btn view-details-btn px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                    View Details
                  </button>
                  <button class="location-preview-btn directions-btn px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors">
                    Directions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }
    
    // Enhanced event listeners for marker interactions
    let touchStartTime = 0
    let touchStartPos = { x: 0, y: 0 }
    let hasMoved = false
    
    // Mouse/touch events for better interaction
    markerEl.addEventListener('mouseenter', (e) => {
      if (!isMobile) {
        e.stopPropagation()
        markerEl.style.zIndex = '65'
        const preview = markerEl.querySelector('.location-preview, .cluster-preview');
        if (preview) {
          // Explicitly show for desktop hover if it was hidden
          // This might be redundant if CSS handles group-hover correctly but can be a safeguard
           (preview as HTMLElement).classList.remove('invisible', 'opacity-0');
           (preview as HTMLElement).classList.add('visible', 'opacity-100');
        }
      }
    })
    
    markerEl.addEventListener('mouseleave', (e) => {
      if (!isMobile) {
        e.stopPropagation()
        markerEl.style.zIndex = isSelected ? '60' : isClusterMarker ? '45' : '40'
         const preview = markerEl.querySelector('.location-preview, .cluster-preview');
        if (preview) {
          // Explicitly hide for desktop mouse leave
           (preview as HTMLElement).classList.add('invisible', 'opacity-0');
           (preview as HTMLElement).classList.remove('visible', 'opacity-100');
        }
      }
    })
    
    // Enhanced touch handling for mobile
    markerEl.addEventListener('touchstart', (e) => {
      if (isMobile) {
        e.stopPropagation()
        touchStartTime = Date.now()
        const touch = e.touches[0]
        touchStartPos = { x: touch.clientX, y: touch.clientY }
        hasMoved = false
        
        // Visual feedback for touch - use scale without changing position
        markerEl.style.transform = 'translate(-50%, -100%) scale(1.1)'
        markerEl.style.transition = 'transform 0.1s ease'
      }
    }, { passive: false })
    
    markerEl.addEventListener('touchmove', (e) => {
      if (isMobile) {
        const touch = e.touches[0]
        const moveDistance = Math.sqrt(
          Math.pow(touch.clientX - touchStartPos.x, 2) + 
          Math.pow(touch.clientY - touchStartPos.y, 2)
        )
        
        // Consider it a move if finger moved more than 10px
        if (moveDistance > 10) {
          hasMoved = true
          // Reset visual feedback if moved
          markerEl.style.transform = isSelected ? 'translate(-50%, -100%) scale(1.1)' : 'translate(-50%, -100%) scale(1)'
        }
      }
    }, { passive: true })
    
    markerEl.addEventListener('touchend', (e) => {
      if (isMobile) {
        e.preventDefault()
        e.stopPropagation()
        
        const touchDuration = Date.now() - touchStartTime
        
        // Reset visual feedback
        setTimeout(() => {
          markerEl.style.transform = isSelected ? 'translate(-50%, -100%) scale(1.1)' : 'translate(-50%, -100%) scale(1)'
        }, 100)
        
        // Only trigger if it's a tap (not a move) and reasonable duration
        if (!hasMoved && touchDuration < 1000) {
          // Handle individual location clicks in cluster preview
          const locationItem = (e.target as HTMLElement).closest('.location-item')
          if (locationItem && cluster) {
            const locationId = locationItem.getAttribute('data-location-id')
            const selectedLocation = cluster.locations.find(loc => loc.id === locationId)
            if (selectedLocation) {
              onViewDetail?.(selectedLocation)
              return
            }
          }
          
          // Handle cluster marker tap for mobile
          if (isClusterMarker && cluster && cluster.locations.length > 1) {
            console.log('🔥 Mobile cluster tapped, firing markerMobilePreview event', {
              clusterSize: cluster.locations.length,
              locations: cluster.locations.map(l => l.name)
            })
            
            // Create and dispatch mobile preview event for cluster
            const clusterPreviewEvent = new CustomEvent('markerMobilePreview', {
              detail: {
                location: cluster.locations[0], // Use first location as primary
                cluster: cluster,
                isCluster: true,
                coordinates: { lat: cluster.center[1], lng: cluster.center[0] } // Note: cluster.center is [lng, lat]
              },
              bubbles: true
            })
            
            // Dispatch cluster preview event
            markerEl.dispatchEvent(clusterPreviewEvent)
            window.dispatchEvent(clusterPreviewEvent)
            
            // Trigger vibration for cluster interaction
            if (navigator.vibrate) {
              navigator.vibrate([50, 50, 50]) // Triple vibration for cluster
            }
            return
          }
          
          console.log('🔥 Mobile marker tapped, firing markerMobilePreview event', {
            location: location.name,
            isMobile,
            isCluster: false,
            touchDuration,
            hasMoved
          })
          
          // Create and dispatch mobile preview event for single location
          const previewEvent = new CustomEvent('markerMobilePreview', {
            detail: {
              location: location,
              cluster: cluster,
              isCluster: false,
              coordinates: { lat: location.latitude, lng: location.longitude }
            },
            bubbles: true
          })
          
          // Dispatch on both the element and window for broader coverage
          markerEl.dispatchEvent(previewEvent)
          window.dispatchEvent(previewEvent)
          
          // Also trigger vibration on supported devices for tactile feedback
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
        }
      }
    }, { passive: false })
    
    markerEl.addEventListener('touchcancel', () => {
      if (isMobile) {
        touchStartTime = 0
        hasMoved = false
        // Reset visual feedback
        markerEl.style.transform = isSelected ? 'translate(-50%, -100%) scale(1.1)' : 'translate(-50%, -100%) scale(1)'
      }
    })
    
    // Desktop click handling for preview buttons
    markerEl.addEventListener('click', (e) => {
      // Only handle desktop clicks if not mobile
      if (!isMobile) {
        e.stopPropagation()
        
        const target = e.target as HTMLElement
        
        // Handle preview button clicks
        if (target.classList.contains('view-details-btn')) {
          e.preventDefault()
          e.stopPropagation()
          onViewDetail?.(location)
          return
        }
        
        if (target.classList.contains('directions-btn')) {
          e.preventDefault()
          e.stopPropagation()
          if (location.address) {
            const address = typeof location.address === "string"
              ? location.address
              : Object.values(location.address).filter(Boolean).join(", ")
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
            window.open(mapsUrl, "_blank")
          }
          return
        }
        
        // Handle individual location clicks in cluster preview
        const locationItem = target.closest('.location-item')
        if (locationItem && cluster) {
          e.preventDefault()
          e.stopPropagation()
          const locationId = locationItem.getAttribute('data-location-id')
          const selectedLocation = cluster.locations.find(loc => loc.id === locationId)
          if (selectedLocation) {
            console.log(`📍 Cluster item clicked: ${selectedLocation.name}`)
            onViewDetail?.(selectedLocation)
            return
          }
        }
        
        // Handle cluster marker click (when clicking the cluster marker itself)
        if (isClusterMarker && cluster && cluster.locations.length > 1) {
          console.log(`🎯 Desktop cluster clicked with ${cluster.locations.length} locations`, 
            cluster.locations.map(l => l.name))
          
          // For desktop, just highlight the cluster (the hover tooltip shows the options)
          // Do not flyTo here to prevent map re-render from view change.
          // The selection will be handled by onMarkerClick, which updates selectedLocation prop.
          // if (mapRef.current) {
          //   mapRef.current.flyTo({
          //     center: cluster.center,
          //     zoom: Math.min(mapRef.current.getZoom() + 1, 18), // Zoom in slightly
          //     duration: 500
          //   })
          // }
          
          // Call onMarkerClick with the primary location for consistency
          // This will trigger handleLocationSelect in MapExplorer, which updates selectedLocation
          onMarkerClick(location) 
          return
        }
        
        console.log(`Desktop marker clicked for ${location.name} at [${location.longitude}, ${location.latitude}]`)
        onMarkerClick(location)
        
        // Add click animation without changing position
        markerEl.style.transform = 'translate(-50%, -100%) scale(0.95)'
        setTimeout(() => {
          markerEl.style.transform = isSelected ? 'translate(-50%, -100%) scale(1.1)' : 'translate(-50%, -100%) scale(1)'
        }, 150)
      }
    })
    
    return markerEl
  }, [onMarkerClick, onViewDetail, isMobile])

  // Detect overlapping markers and create clusters
  const detectMarkerClusters = useCallback((locations: Location[], zoomLevel: number): MarkerCluster[] => {
    if (!locations.length) return []
    
    // More generous distance threshold for clustering - starts larger and scales down with zoom
    // This ensures 2+ locations cluster together more easily
    const baseThreshold = 100 // Base distance in meters
    const zoomFactor = Math.max(0.5, 800 / Math.pow(2, zoomLevel - 8)) // More generous scaling
    const distanceThreshold = Math.max(baseThreshold, zoomFactor)
    
    console.log(`🎯 Clustering with threshold: ${distanceThreshold.toFixed(0)}m at zoom ${zoomLevel}`)
    
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
      
      // Always create cluster, even for single locations (for consistency)
      const centerLat = nearbyLocations.reduce((sum, loc) => sum + loc.latitude, 0) / nearbyLocations.length
      const centerLng = nearbyLocations.reduce((sum, loc) => sum + loc.longitude, 0) / nearbyLocations.length
      
      clusters.push({
        id: nearbyLocations.length > 1 ? `cluster-${centerLat}-${centerLng}` : `single-${location.id}`,
        locations: nearbyLocations,
        center: [centerLng, centerLat],
      })
      
      if (nearbyLocations.length > 1) {
        console.log(`📍 Created cluster with ${nearbyLocations.length} locations:`, 
          nearbyLocations.map(l => l.name).join(', '))
      }
    })
    
    return clusters
  }, [])

  // Update markers when locations change - optimized to prevent infinite loops
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
    clusters.forEach((cluster: MarkerCluster) => {
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
        const isSelected = cluster.locations.some((loc: Location) => selectedLocation?.id === loc.id)
        
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
  }, [locations, mapLoaded, selectedLocation?.id, zoom]) // Removed function dependencies to prevent infinite loops

  // Update clusters when zoom changes - fixed dependency array
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !locations.length) return
    
    const newClusters = detectMarkerClusters(locations, zoom)
    
    // Check if clustering changed significantly
    const clusteringChanged = newClusters.length !== markerClusters.length ||
      newClusters.some((newCluster: MarkerCluster, index: number) => {
        const oldCluster = markerClusters[index]
        return !oldCluster || newCluster.locations.length !== oldCluster.locations.length
      })
    
    if (clusteringChanged) {
      setMarkerClusters(newClusters)
    }
  }, [zoom, locations, mapLoaded]) // Removed markerClusters and detectMarkerClusters from deps to prevent infinite loops

  // Update marker selection states and handle mobile preview collisions - optimized
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    const map = mapRef.current
    const markers = markersRef.current

    // Update marker styles based on selection
    markers.forEach((markerData, locationId) => {
      const isSelected = selectedLocation?.id === locationId
      const element = markerData.element
      
      if (element) {
        element.style.zIndex = isSelected ? '1000' : '999'
        element.style.transform = isSelected ? 'scale(1.2)' : 'scale(1)'
        element.style.transition = 'all 0.2s ease-in-out'
      }
    })
  }, [selectedLocation?.id, mapLoaded]) // Simplified dependencies

  // Force refresh effect - optimized
  useEffect(() => {
    if (!forceRefresh || !mapRef.current) return

    console.log('🔄 Force refreshing map...')
    
    const timeoutId = setTimeout(() => {
      if (mapRef.current && isMountedRef.current) {
        try {
          mapRef.current.resize()
          console.log('✅ Map force refresh completed')
        } catch (error) {
          console.warn('⚠️ Map force refresh failed:', error)
        }
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [forceRefresh])

  // Cleanup effect - improved memory management
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up MapComponent...')
      
      // Clear all markers
      if (markersRef.current) {
        markersRef.current.forEach((markerData) => {
          try {
            if (markerData.cleanup) {
              markerData.cleanup()
            }
            if (markerData.marker && typeof markerData.marker.remove === 'function') {
              markerData.marker.remove()
            }
          } catch (error) {
            console.warn('Failed to cleanup marker:', error)
          }
        })
        markersRef.current.clear()
      }

      // Clear user marker
      if (userMarkerRef.current && typeof userMarkerRef.current.remove === 'function') {
        try {
          userMarkerRef.current.remove()
          userMarkerRef.current = null
        } catch (error) {
          console.warn('Failed to cleanup user marker:', error)
        }
      }

      // Clear radius circle
      if (radiusCircleRef.current && mapRef.current) {
        try {
          const map = mapRef.current
          if (map.getLayer && map.getLayer('radius-circle')) {
            map.removeLayer('radius-circle')
          }
          if (map.getSource && map.getSource('radius-circle')) {
            map.removeSource('radius-circle')
          }
          radiusCircleRef.current = null
        } catch (error) {
          console.warn('Failed to cleanup radius circle:', error)
        }
      }

      // Cleanup map instance
      if (mapRef.current && typeof mapRef.current.remove === 'function') {
        try {
          mapRef.current.off() // Remove all event listeners
          mapRef.current.remove()
          mapRef.current = null
        } catch (error) {
          console.warn('Failed to cleanup map instance:', error)
        }
      }

      // Reset state
      mapInitializedRef.current = false
      isMountedRef.current = false
    }
  }, []) // Empty dependency array for cleanup on unmount only

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

  // Apply map padding when it changes or map becomes ready
  useEffect(() => {
    if (mapRef.current && mapReady && isMountedRef.current) {
      console.log('🗺️ Applying map padding:', mapPadding);
      try {
        mapRef.current.easeTo({
          padding: mapPadding,
          duration: 300 // Smooth transition for padding change
        });
      } catch (error) {
        console.warn('🗺️ Error applying map padding:', error);
        // Fallback to direct set if easeTo fails (e.g. map not fully interactive yet)
        try {
          mapRef.current.setPadding(mapPadding);
        } catch (setPaddingError) {
          console.error('🗺️ Critical error setting map padding:', setPaddingError);
        }
      }
    }
  }, [mapPadding, mapReady]);

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
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log(`Got user location: [${lat}, ${lng}]`);
            
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [lng, lat], // Mapbox expects [longitude, latitude]
                zoom: 15,
                duration: 2000
              });
              
              // Add user location marker if not already added
              if (!userMarkerRef.current) {
                addUserLocationMarker([lat, lng]); // Pass as [lat, lng] to function
              }
              
              // toast.success('Found your location!');
            }
          },
          (error) => {
            console.error('Error getting user location:', error);
            // toast.error('Unable to get your location. Please enable location services.');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        // toast.error('Geolocation is not supported by this browser.');
      }
      return;
    }
    
    // userLocation is [lat, lng] but Mapbox needs [lng, lat]
    const lng = userLocation[1];
    const lat = userLocation[0];
    
    console.log(`Flying to user location: [${lng}, ${lat}]`);
    
    mapRef.current.flyTo({
      center: [lng, lat], // Mapbox expects [longitude, latitude]
      zoom: 15,
      duration: 2000
    });
    
    // toast.success('Showing your location');
  }, [userLocation, addUserLocationMarker]);

  // Error state
  if (mapError) {
    const isTokenError = mapError.includes('access token')
    
    return (
      <div className={cn("relative w-full h-full bg-muted flex items-center justify-center", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 p-6 max-w-md"
        >
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              {isTokenError ? 'Mapbox Setup Required' : 'Map Error'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{mapError}</p>
            
            {isTokenError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                <h4 className="font-medium text-blue-900 mb-2">Quick Setup:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Mapbox Access Tokens</a></li>
                  <li>Create a new token or copy an existing one</li>
                  <li>Create a file called <code className="bg-blue-100 px-1 rounded">.env.local</code> in your project root</li>
                  <li>Add: <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here</code></li>
                  <li>Restart your development server</li>
                </ol>
              </div>
            )}
            
            <Button onClick={retryMapInit} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <RotateCcw className="w-4 h-4 mr-2" />
              {isTokenError ? 'Check Again' : 'Retry'}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden map-wrapper", className)}>
      {/* Map container with explicit sizing */}
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0 map-container"
        style={{ 
          minHeight: '200px',
          width: '100%',
          height: '100%',
          position: 'relative' // Ensure proper positioning for Mapbox
        }}
      />

      {/* Mobile preview collision safe zone */}
      {isMobile && showMobilePreview && (
        <div 
          className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-25"
          style={{ zIndex: 25 }}
        />
      )}

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
          className="bg-background/90 backdrop-blur-sm border border-border shadow-md text-foreground"
        >
          <MapPin className="w-3 h-3 mr-1" />
          {locations.length} locations
        </Badge>
      </div>
    </div>
  )
})

export default MapComponent