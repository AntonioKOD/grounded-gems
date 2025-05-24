/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef, useState, useCallback, memo } from "react"
import { Navigation, X } from "lucide-react"
import { Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Location } from "./map-data"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Add Mapbox types
declare global {
  interface Window {
    mapboxgl: any;
    handleLocationDetailClick?: (locationId: string) => void;
  }
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

// Extract coordinates from a location object
const getCoordinates = (location: Location): [number, number] | null => {
  let lat, lng

  if (location.latitude != null && location.longitude != null) {
    lat = Number(location.latitude)
    lng = Number(location.longitude)
  } else if (location.coordinates?.latitude != null && location.coordinates?.longitude != null) {
    lat = Number(location.coordinates.latitude)
    lng = Number(location.coordinates.longitude)
  }

  if (isValidCoordinate(lat, lng)) {
    return [lat!, lng!]
  }

  return null
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
  userLocation: [number, number] | null
  center: [number, number]
  zoom: number
  mapStyle?: string
  onMarkerClick: (location: Location) => void
  onMapClick: (coords: { lat: number; lng: number }) => void
  onMapMove: (center: [number, number], zoom: number) => void
  searchRadius?: number
  className?: string
  selectedLocation?: Location | null
}

interface MapboxMarker {
  marker: any;
  element: HTMLElement;
  cleanup: () => void;
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
}: MapComponentProps) {
    // Removed excessive console logging to improve performance
  
  const mapRef = useRef<any>(null)
  const mapboxRef = useRef<any>(null)
  const markersRef = useRef<Map<string, MapboxMarker>>(new globalThis.Map())
  const userMarkerRef = useRef<any>(null)
  const radiusCircleRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInitializedRef = useRef<boolean>(false)
  const lastLocationsRef = useRef<Location[]>([])
  const lastSelectedLocationRef = useRef<Location | null>(null)
  
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [currentStyle, setCurrentStyle] = useState(mapStyle)
  const [activeTooltip, setActiveTooltip] = useState<{
    location: Location
    position: { x: number; y: number }
  } | null>(null)

    // Handle map resize
  useEffect(() => {
    const handleResize = () => {
      // Resize map container if map is initialized
      if (mapRef.current && mapInitializedRef.current) {
        console.log("Resizing map")
        mapRef.current.resize()
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load Mapbox script dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapInitializedRef.current) return // Prevent re-initialization
    
    const loadMapboxScript = () => {
      // Check if Mapbox is already available
      if (window.mapboxgl) {
        console.log("Mapbox already available globally")
        return Promise.resolve()
      }
      
      if (document.querySelector('script[src*="mapbox-gl"]')) {
        console.log("Mapbox script already in DOM, waiting for load...")
        // Wait for it to be available
        return new Promise<void>((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (window.mapboxgl) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
          
          // Timeout after 10 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            if (!window.mapboxgl) {
              reject(new Error('Mapbox script timeout'))
            }
          }, 10000)
        })
      }
      
      console.log("Loading Mapbox script dynamically")
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
        script.async = true
        script.onload = () => {
          console.log("Mapbox script loaded successfully")
          // Wait a bit for the global to be available
          setTimeout(() => {
            if (window.mapboxgl) {
              resolve()
            } else {
              reject(new Error('Mapbox global not available after load'))
            }
          }, 100)
        }
        script.onerror = () => {
          console.error("Failed to load Mapbox script")
          reject(new Error('Failed to load Mapbox script'))
        }
        document.head.appendChild(script)
        
        // Also add CSS if not present
        if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
          const link = document.createElement('link')
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
          link.rel = 'stylesheet'
          document.head.appendChild(link)
        }
      })
    }

    const initializeMap = async () => {
      if (mapInitializedRef.current || !mapContainerRef.current) return
      
      console.log("Initializing map...")
      
      try {
        await loadMapboxScript()
        
        // Wait for mapbox to be available globally
        if (!window.mapboxgl) {
          console.error("Mapbox GL JS failed to load - window.mapboxgl is undefined")
          setMapError("Failed to load map. Please refresh the page.")
          return
        }

        console.log("Mapbox available, creating map...")
        
        // Store mapbox reference
        mapboxRef.current = window.mapboxgl
        
        // Add error handling for Mapbox
        if (!mapboxRef.current.supported()) {
          console.error("Mapbox GL JS is not supported by this browser")
          setMapError("Mapbox GL JS is not supported by this browser. Please try a different browser.")
          return
        }
        
        // Set access token
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYW50b25pby1rb2RoZWxpIiwiYSI6ImNtYTQ3bTlibTAyYTUyanBzem5qZGV1ZzgifQ.cSUliejFuQnIHZ-DDinPRQ'
        mapboxRef.current.accessToken = token
        
        // Check if container exists and has dimensions
        if (!mapContainerRef.current) {
          console.error("Map container ref is null")
          setMapError("Map container not available.")
          return
        }
        
        // Ensure the map container is visible
        mapContainerRef.current.style.height = '100%'
        mapContainerRef.current.style.width = '100%'
        mapContainerRef.current.style.minHeight = '400px'
        mapContainerRef.current.style.display = 'block'
        
        // Create map instance only once
        if (!mapRef.current) {
          console.log("Creating new map instance...")
          
          mapRef.current = new mapboxRef.current.Map({
            container: mapContainerRef.current,
            style: `mapbox://styles/mapbox/streets-v12`, // Use fixed style for now
            center: [center[1], center[0]], // Mapbox uses [lng, lat] format
            zoom,
            pitchWithRotate: false,
            renderWorldCopies: false,
            maxZoom: 19,
            trackResize: true,
            attributionControl: false
          })
          
          // Set initialization flag immediately to prevent double creation
          mapInitializedRef.current = true
          
          // Map events - with debounced move handler
          let moveTimeout: NodeJS.Timeout
          mapRef.current.on('moveend', () => {
            clearTimeout(moveTimeout)
            moveTimeout = setTimeout(() => {
              if (mapRef.current) {
                const center = mapRef.current.getCenter()
                const zoom = mapRef.current.getZoom()
                onMapMove([center.lat, center.lng], zoom)
              }
            }, 300) // Debounce to prevent excessive calls
          })
          
          mapRef.current.on('click', (e: any) => {
            onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })
          })
          
          mapRef.current.on('load', () => {
            console.log("Map loaded successfully")
            setMapLoaded(true)
            setMapError(null)
            
            // Add markers immediately when map loads (if locations are available)
            if (locations.length > 0) {
              console.log(`Adding ${locations.length} markers to map`)
              addMarkers()
            }
            
            // Add user location marker if available
            if (userLocation) {
              addUserLocationMarker(userLocation)
            }
            
            // Add search radius if available
            if (searchRadius && userLocation) {
              addRadiusCircle(userLocation, searchRadius)
            }
          })
          
          mapRef.current.on('error', (e: any) => {
            console.error("Map error:", e)
            setMapError("Map error occurred. Please refresh the page.")
          })
        }
        
      } catch (error) {
        console.error("Error initializing map:", error)
        setMapError("Failed to initialize map. Please refresh the page.")
      }
    }

    // Only initialize once
    const timer = setTimeout(initializeMap, 100)
    return () => clearTimeout(timer)
  }, []) // Empty dependency array to prevent re-initialization

  // Update map style
  useEffect(() => {
    if (mapRef.current && mapInitializedRef.current && mapStyle !== currentStyle) {
      mapRef.current.setStyle(`mapbox://styles/mapbox/${mapStyle}`)
      setCurrentStyle(mapStyle)
    }
  }, [mapStyle, currentStyle])

  // Update map center and zoom - optimize this to prevent unnecessary refreshes
  // Use a ref to track the last external update to avoid updating on every interaction
  const lastExternalUpdateRef = useRef({ center, zoom })
  
  useEffect(() => {
    if (mapRef.current && mapInitializedRef.current) {
      // Only update if this is genuinely an external change, not from user interaction
      const prevCenter = lastExternalUpdateRef.current.center
      const prevZoom = lastExternalUpdateRef.current.zoom
      
      const centerChanged = 
        Math.abs(prevCenter[0] - center[0]) > 0.01 || 
        Math.abs(prevCenter[1] - center[1]) > 0.01;
      
      const zoomChanged = Math.abs(prevZoom - zoom) > 1;
      
      if (centerChanged || zoomChanged) {
        // Make a copy of center to avoid mutation issues
        const centerCopy: [number, number] = [...center]
        
        mapRef.current.flyTo({
          center: [centerCopy[1], centerCopy[0]], // Mapbox uses [lng, lat] format
          zoom,
          essential: true,
          animate: true,
          duration: 1000
        })
        
        // Update the ref to track this external change
        lastExternalUpdateRef.current = { center, zoom }
      }
    }
  }, [center, zoom])

    // Add and update markers for locations - stabilized with proper dependencies
  const addMarkers = useCallback(() => {
    if (!mapRef.current || !mapInitializedRef.current || !mapboxRef.current) {
      console.log('Cannot add markers - map not ready:', { 
        mapRef: !!mapRef.current, 
        initialized: mapInitializedRef.current, 
        mapbox: !!mapboxRef.current 
      })
      return
    }

    console.log(`🗺️ Adding ${locations.length} markers to map`)

    // Clear existing markers
    markersRef.current.forEach((marker: MapboxMarker) => {
      marker.marker.remove()
    })
    markersRef.current.clear()

    // Add new markers
    locations.forEach((location) => {
      const coords = getCoordinates(location)
      if (!coords) return

      // Create a simple circular marker
      const el = document.createElement('div')
      el.className = 'google-maps-marker'
      el.setAttribute('data-location-id', location.id)
      
      // Check if this is the selected location
      const isSelected = selectedLocation?.id === location.id
      
      // Apply styles based on selection
      const locationImage = getLocationImageUrl(location)
      
      // Check if this marker should show tooltip
      const showTooltip = activeTooltip?.location.id === location.id
      
      // Add tooltip class to marker if showing tooltip
      if (showTooltip) {
        el.classList.add('has-tooltip')
      }
      
      // Create a simple circular marker with just the image and white background
      el.innerHTML = `
        <div class="marker-container ${isSelected ? 'selected' : ''}">
          <div class="marker-image-only">
            <img 
              src="${locationImage}" 
              alt="${location.name}"
              style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
              onerror="this.style.display='none'; this.parentElement.classList.add('fallback-icon');"
            />
          </div>
          ${isSelected ? '<div class="marker-pulse"></div>' : ''}
          ${showTooltip ? `
            <div class="marker-tooltip">
              <div class="tooltip-content">
                <div class="tooltip-image">
                  <img src="${locationImage}" alt="${location.name}" />
                </div>
                <div class="tooltip-info">
                  <h3>${location.name}</h3>
                  ${location.address ? `
                    <div class="tooltip-address">
                      <span class="address-icon">📍</span>
                      <span>${typeof location.address === 'string' ? location.address : location.address.city || 'Address not available'}</span>
                    </div>
                  ` : ''}
                  ${location.averageRating ? `
                    <div class="tooltip-rating">
                      <span class="rating-star">⭐</span>
                      <span>${location.averageRating.toFixed(1)}</span>
                    </div>
                  ` : ''}
                  <button class="tooltip-button" onclick="window.handleLocationDetailClick && window.handleLocationDetailClick('${location.id}')">
                    View Details
                  </button>
                </div>
                <div class="tooltip-arrow"></div>
              </div>
            </div>
          ` : ''}
        </div>
      `

      // Set z-index for selected markers
      if (isSelected) {
        el.style.zIndex = '10'
      } else {
        el.style.zIndex = '1'
      }

      // Add event listener for marker click
      const handleMarkerClick = (e: Event) => {
        e.stopPropagation()
        
        // Show tooltip or toggle if already showing for this location
        if (activeTooltip?.location.id === location.id) {
          setActiveTooltip(null)
        } else {
          setActiveTooltip({
            location,
            position: { x: 0, y: 0 } // Position will be handled by CSS
          })
        }
        
        // Also trigger onMarkerClick immediately for responsiveness
        onMarkerClick(location)
      }
      
      el.addEventListener('click', handleMarkerClick)

      // Create and store the marker
      const marker = new mapboxRef.current.Marker(el)
        .setLngLat([coords[1], coords[0]])
        .addTo(mapRef.current)

      markersRef.current.set(location.id, { 
        marker, 
        element: el,
        cleanup: () => {
          el.removeEventListener('click', handleMarkerClick)
        }
      })
    })

    // Set up global handler for view details button once
    window.handleLocationDetailClick = (locationId: string) => {
      const loc = locations.find(l => l.id === locationId)
      if (loc) {
        // Close tooltip
        setActiveTooltip(null)
        
        // Trigger the same view details functionality as location list
        onMarkerClick(loc)
        
        // Create a custom event to trigger opening the location detail modal
        const event = new CustomEvent('openLocationDetail', {
          detail: { location: loc }
        })
        document.dispatchEvent(event)
      }
    }
  }, [locations, selectedLocation?.id, activeTooltip?.location.id, onMarkerClick])

  // Update markers when locations or selected location changes
  useEffect(() => {
    // Prevent unnecessary updates by checking if data actually changed
    const locationsLength = locations.length
    const lastLocationsLength = lastLocationsRef.current.length
    const selectedLocationId = selectedLocation?.id
    const lastSelectedLocationId = lastSelectedLocationRef.current?.id
    const activeTooltipLocationId = activeTooltip?.location.id
    
    // Only update if locations count changed, selected location changed, or tooltip changed
    if (locationsLength === lastLocationsLength && 
        selectedLocationId === lastSelectedLocationId && 
        !activeTooltipLocationId) {
      return
    }
    
    // Update refs
    lastLocationsRef.current = locations
    lastSelectedLocationRef.current = selectedLocation || null
    
    // Add markers if map is loaded and we have locations
    if (mapRef.current && mapInitializedRef.current && mapLoaded) {
      console.log(`Updating markers: ${locationsLength} locations, map loaded: ${mapLoaded}`)
      addMarkers()
    }
    
    // Cleanup event listeners when component unmounts
    return () => {
      markersRef.current.forEach(({ cleanup }: { cleanup: () => void }) => cleanup())
    }
  }, [locations.length, selectedLocation?.id, activeTooltip?.location.id, addMarkers, mapLoaded])

  // Add user location marker
  const addUserLocationMarker = useCallback((coords: [number, number]) => {
    if (!mapRef.current || !mapInitializedRef.current || !mapboxRef.current) return
    
    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
    
    // Create user marker element
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.style.width = '16px'
    el.style.height = '16px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#4338ca' 
    el.style.border = '2px solid #ffffff'
    el.style.boxShadow = '0 0 0 2px rgba(67, 56, 202, 0.5)'
    el.style.position = 'absolute'
    el.style.transform = 'translate(-50%, -50%)'
    el.style.zIndex = '10'
    
    // Add pulse effect
    const pulse = document.createElement('div')
    pulse.className = 'user-location-pulse'
    pulse.style.position = 'absolute'
    pulse.style.width = '32px'
    pulse.style.height = '32px'
    pulse.style.borderRadius = '50%'
    pulse.style.backgroundColor = 'rgba(67, 56, 202, 0.15)'
    pulse.style.border = '1px solid rgba(67, 56, 202, 0.3)'
    pulse.style.animation = 'pulse 2s infinite'
    pulse.style.transform = 'translate(-25%, -25%)'
    el.appendChild(pulse)
    
    // Create and store the marker
    userMarkerRef.current = new mapboxRef.current.Marker(el)
      .setLngLat([coords[1], coords[0]])
      .addTo(mapRef.current)

    // Add accuracy circle if supported
    if (navigator.geolocation) {
      try {
        // Add a circle showing approximate location accuracy
        if (mapRef.current.getSource('accuracy-circle')) {
          mapRef.current.removeLayer('accuracy-circle');
          mapRef.current.removeSource('accuracy-circle');
        }
        
        // Add a subtle accuracy circle (100m radius)
        const accuracyGeoJSON = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [coords[1], coords[0]]
            },
            properties: {
              radius: 100 // meters
            }
          }]
        };
        
        if (mapRef.current.loaded()) {
          mapRef.current.addSource('accuracy-circle', {
            type: 'geojson',
            data: accuracyGeoJSON
          });
          
          mapRef.current.addLayer({
            id: 'accuracy-circle',
            source: 'accuracy-circle',
            type: 'circle',
            paint: {
              'circle-radius': ['get', 'radius'],
              'circle-color': 'rgba(67, 56, 202, 0.1)',
              'circle-stroke-width': 1,
              'circle-stroke-color': 'rgba(67, 56, 202, 0.3)',
              'circle-pitch-alignment': 'map'
            }
          });
        }
      } catch (error) {
        console.error("Error adding accuracy circle:", error);
      }
    }
  }, [])

  // Update user location marker
  useEffect(() => {
    if (mapRef.current && mapInitializedRef.current && userLocation) {
      addUserLocationMarker(userLocation)
    }
  }, [userLocation, addUserLocationMarker])

  // Add radius circle
  const addRadiusCircle = useCallback((center: [number, number], radiusKm: number) => {
    if (!mapRef.current || !mapInitializedRef.current || !mapboxRef.current) return
    
    // Remove existing circle
    if (radiusCircleRef.current) {
      if (mapRef.current.getLayer('radius-circle')) {
        mapRef.current.removeLayer('radius-circle')
      }
      if (mapRef.current.getSource('radius-circle')) {
        mapRef.current.removeSource('radius-circle')
      }
      radiusCircleRef.current = null
    }
    
    // Create a circle
    const createGeoJSONCircle = (center: [number, number], radiusInKm: number) => {
      const points = 64
      const coords = {
        latitude: center[0],
        longitude: center[1]
      }
      
      const km = radiusInKm
      const ret = []
      const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180))
      const distanceY = km / 110.574
      
      let theta, x, y
      for (let i = 0; i < points; i++) {
        theta = (i / points) * (2 * Math.PI)
        x = distanceX * Math.cos(theta)
        y = distanceY * Math.sin(theta)
        
        ret.push([coords.longitude + x, coords.latitude + y])
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
    }
    
    // Wait for map to be loaded
    if (mapRef.current.loaded()) {
      const circleGeoJSON = createGeoJSONCircle([center[0], center[1]], radiusKm)
      
      // Add the circle to the map
      if (!mapRef.current.getSource('radius-circle')) {
        mapRef.current.addSource('radius-circle', {
          type: 'geojson',
          data: circleGeoJSON
        })
      } else {
        mapRef.current.getSource('radius-circle').setData(circleGeoJSON)
      }
      
      // Add circle layer if it doesn't exist
      if (!mapRef.current.getLayer('radius-circle')) {
        mapRef.current.addLayer({
          id: 'radius-circle',
          type: 'fill',
          source: 'radius-circle',
          layout: {},
          paint: {
            'fill-color': '#4338ca',
            'fill-opacity': 0.1,
            'fill-outline-color': '#4338ca'
          }
        })
      }
      
      radiusCircleRef.current = true
    } else {
      // If map is not loaded yet, wait for it
      mapRef.current.on('load', () => {
        addRadiusCircle(center, radiusKm)
      })
    }
  }, [])

  // Update radius circle
  useEffect(() => {
    if (mapRef.current && mapInitializedRef.current && userLocation && searchRadius) {
      addRadiusCircle(userLocation, searchRadius)
    }
  }, [userLocation, searchRadius, addRadiusCircle])

  // Listen for view details events
  useEffect(() => {
    const handleViewDetails = (e: CustomEvent) => {
      const { locationId } = e.detail
      const location = locations.find(loc => loc.id === locationId)
      if (location) {
        onMarkerClick(location)
      }
    }
    
    document.addEventListener('viewLocationDetails', handleViewDetails as EventListener)
    return () => {
      document.removeEventListener('viewLocationDetails', handleViewDetails as EventListener)
    }
  }, [locations, onMarkerClick])

  // Add map controls when map is initialized
  useEffect(() => {
    if (mapRef.current && mapInitializedRef.current && mapboxRef.current) {
      // Add navigation controls (zoom in/out buttons)
      if (!mapRef.current.hasControl('NavigationControl')) {
        const navigationControl = new mapboxRef.current.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: false
        });
        mapRef.current.addControl(navigationControl, 'top-right');
      }
      
      // Add scale control
      if (!mapRef.current.hasControl('ScaleControl')) {
        const scaleControl = new mapboxRef.current.ScaleControl({
          maxWidth: 100,
          unit: 'metric'
        });
        mapRef.current.addControl(scaleControl, 'bottom-left');
      }
      
      // Add fullscreen control
      if (!mapRef.current.hasControl('FullscreenControl')) {
        const fullscreenControl = new mapboxRef.current.FullscreenControl();
        mapRef.current.addControl(fullscreenControl, 'top-right');
      }
    }
  }, [mapLoaded]);

  // Style for map container
  const containerStyle = {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    pointerEvents: 'auto' as const,
    display: 'block', // Ensure the container is displayed
    minHeight: '400px' // Ensure minimum height for visibility
  }

  // Add keyboard navigation for accessibility
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mapRef.current || !mapInitializedRef.current) return;
      
      // Only handle events when the map container is focused
      if (document.activeElement !== mapContainerRef.current) return;
      
      const step = e.shiftKey ? 50 : 10; // Larger steps with shift key
      const zoom = mapRef.current.getZoom();
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          mapRef.current.panBy([0, -step]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          mapRef.current.panBy([0, step]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          mapRef.current.panBy([-step, 0]);
          break;
        case 'ArrowRight':
          e.preventDefault();
          mapRef.current.panBy([step, 0]);
          break;
        case '+':
        case '=':
          e.preventDefault();
          mapRef.current.setZoom(zoom + 0.5);
          break;
        case '-':
        case '_':
          e.preventDefault();
          mapRef.current.setZoom(zoom - 0.5);
          break;
        case 'Home':
          e.preventDefault();
          if (userLocation) {
            mapRef.current.flyTo({
              center: [userLocation[1], userLocation[0]],
              zoom: 14,
              essential: true
            });
          }
          break;
      }
    };
    
    // Make the map container focusable
    mapContainerRef.current.tabIndex = 0;
    
    // Add focus indicator styles
    mapContainerRef.current.addEventListener('focus', () => {
      if (mapContainerRef.current) {
        mapContainerRef.current.style.outline = '2px solid #4338ca';
      }
    });
    
    mapContainerRef.current.addEventListener('blur', () => {
      if (mapContainerRef.current) {
        mapContainerRef.current.style.outline = 'none';
      }
    });
    
    // Add keyboard event listener
    mapContainerRef.current.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (mapContainerRef.current) {
        mapContainerRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [userLocation]);
  
  // Add performance optimizations
  useEffect(() => {
    if (!mapRef.current || !mapInitializedRef.current) return;
    
    // Function to handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Pause animations and non-essential operations when tab is not visible
        console.log('Map: page is hidden, optimizing performance');
      } else {
        // Resume normal operation when tab becomes visible again
        console.log('Map: page is visible, resuming normal operation');
        
        // Force a repaint to ensure map is displayed correctly
        if (mapRef.current) {
          mapRef.current.resize();
        }
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mapLoaded]);



  if (mapError) {
    return (
      <div className={cn("map-container relative", className)} style={containerStyle}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center p-4">
            <X className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Map Error</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{mapError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reload Page
            </Button>
          </div>
        </div>      
      </div>
    )
  }

  // Note: getLocationImageUrl is defined earlier in the file and used in marker HTML templates

  return (
    <div className={cn("map-container relative", className)} style={containerStyle}>
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <MapIcon className="h-10 w-10 text-gray-400 mx-auto mb-2 animate-pulse" />
            <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        </div>
      )}
      
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {userLocation && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="absolute bottom-4 right-4 z-10 bg-white text-gray-800 shadow-md hover:bg-gray-100"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (mapRef.current && userLocation) {
                    mapRef.current.flyTo({
                      center: [userLocation[1], userLocation[0]],
                      zoom: 14,
                      essential: true
                    })
                  }
                }}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go to my location</p>
            </TooltipContent>
          </Tooltip>
                </TooltipProvider>
      )}
      


      </div>
    )
  }, (prevProps, nextProps) => {
  // Aggressive comparison function to prevent unnecessary rerenders
  // Only re-render if there are significant changes
  
  // Check locations - only care about length and IDs, not deep equality
  if (prevProps.locations.length !== nextProps.locations.length) {
    return false
  }
  
  // Check if location IDs have changed (lightweight check)
  const prevLocationIds = prevProps.locations.map(l => l.id).sort()
  const nextLocationIds = nextProps.locations.map(l => l.id).sort()
  if (prevLocationIds.join(',') !== nextLocationIds.join(',')) {
    return false
  }
  
  // Check selected location
  if (prevProps.selectedLocation?.id !== nextProps.selectedLocation?.id) {
    return false
  }
  
  // Check center with tolerance for small movements (prevent micro-movements from re-rendering)
  const centerThreshold = 0.01 // ~1km tolerance
  if (Math.abs(prevProps.center[0] - nextProps.center[0]) > centerThreshold ||
      Math.abs(prevProps.center[1] - nextProps.center[1]) > centerThreshold) {
    return false
  }
  
  // Check zoom with tolerance
  const zoomThreshold = 1
  if (Math.abs(prevProps.zoom - nextProps.zoom) > zoomThreshold) {
    return false
  }
  
  // Check other props for exact equality
  if (prevProps.mapStyle !== nextProps.mapStyle ||
      prevProps.searchRadius !== nextProps.searchRadius ||
      prevProps.className !== nextProps.className) {
    return false
  }
  
  // Check user location with tolerance
  if (prevProps.userLocation !== nextProps.userLocation) {
    if (prevProps.userLocation === null || nextProps.userLocation === null) {
      return false
    }
    if (Math.abs(prevProps.userLocation[0] - nextProps.userLocation[0]) > centerThreshold ||
        Math.abs(prevProps.userLocation[1] - nextProps.userLocation[1]) > centerThreshold) {
      return false
    }
  }
  
  // If we get here, props are similar enough to skip re-render
  return true
})

export default MapComponent
