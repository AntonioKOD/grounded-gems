"use client"

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Layers, Info, MapPin, Locate, X } from "lucide-react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Location } from "./map-data"
import { getCategoryColor } from "./category-utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// Set the Mapbox access token from env
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

// Validate latitude/longitude
const isValidCoordinate = (lat?: number | string | null, lng?: number | string | null): boolean => {
  const numLat = typeof lat === "string" ? Number.parseFloat(lat) : lat
  const numLng = typeof lng === "string" ? Number.parseFloat(lng) : lng

  return (
    numLat != null &&
    numLng != null &&
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    Math.abs(numLat) <= 90 &&
    Math.abs(numLng) <= 180
  )
}

// Extract coordinates from location
const getCoordinates = (location: Location): [number, number] | null => {
  // Try direct latitude/longitude properties
  if (isValidCoordinate(location.latitude, location.longitude)) {
    return [Number(location.latitude), Number(location.longitude)]
  }

  // Try coordinates object
  if (location.coordinates) {
    if (isValidCoordinate(location.coordinates.latitude, location.coordinates.longitude)) {
      return [Number(location.coordinates.latitude), Number(location.coordinates.longitude)]
    }
  }

  console.warn(`Invalid coordinates for location "${location.name}"`)
  return null
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

// Create a stable map styles array outside the component to prevent recreation on each render
const MAP_STYLES = [
  { id: "streets-v12", name: "Streets", icon: "🏙️" },
  { id: "light-v11", name: "Light", icon: "☀️" },
  { id: "dark-v11", name: "Dark", icon: "🌙" },
  { id: "satellite-v9", name: "Satellite", icon: "🛰️" },
  { id: "satellite-streets-v12", name: "Satellite Streets", icon: "🛣️" },
  { id: "outdoors-v12", name: "Outdoors", icon: "🏞️" },
]

// Use React.memo to prevent unnecessary re-renders
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
  // Refs to store objects that shouldn't trigger re-renders
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ marker: mapboxgl.Marker; location: Location; element: HTMLElement }[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const circleLayerId = useRef<string | null>(null)
  const brandingRef = useRef<HTMLDivElement | null>(null)
  const prevLocationsRef = useRef<Location[]>([])
  const prevSelectedLocationRef = useRef<Location | null>(null)
  const prevCenterRef = useRef<[number, number] | null>(null)
  const prevZoomRef = useRef<number | null>(null)
  const mapInitializedRef = useRef(false)
  const markersInitializedRef = useRef(false)

  // State that should trigger re-renders
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showStyles, setShowStyles] = useState(false)
  const [currentStyle, setCurrentStyle] = useState(mapStyle)
  const [webglSupported, setWebglSupported] = useState(true)
  const [showLegend, setShowLegend] = useState(false)
  const [showMiniPreview, setShowMiniPreview] = useState(false)
  const [previewLocation, setPreviewLocation] = useState<Location | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile - only run once on mount and on resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Detect WebGL support - only run once on mount
  useEffect(() => {
    setWebglSupported(mapboxgl.supported())
  }, [])

  // Memoize the locations array to detect actual changes
  const locationIds = useMemo(() => locations.map((loc) => loc.id).join(","), [locations])

  // Memoize the selected location ID for comparison
  const selectedLocationId = useMemo(() => selectedLocation?.id, [selectedLocation?.id])

  // Initialize map - only run once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !webglSupported || mapInitializedRef.current) return

    mapInitializedRef.current = true
    const defaultCenter: [number, number] = [40.7128, -74.006] // NYC

    // Validate center coordinates
    const mapCenter = isValidCoordinate(center[0], center[1])
      ? ([center[1], center[0]] as [number, number])
      : [defaultCenter[1], defaultCenter[0]]

    console.log("Initializing map with center:", mapCenter)

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: `mapbox://styles/mapbox/${currentStyle}`,
        center: mapCenter as [number, number],
        zoom: isMobile ? zoom - 0.5 : zoom,
        attributionControl: false, // We'll add custom attribution
        preserveDrawingBuffer: true,
        dragRotate: false, // Disable rotation for simpler mobile interaction
        pitchWithRotate: false,
        touchZoomRotate: true,
        maxTileCacheSize: 50, // Optimize for mobile
        renderWorldCopies: true,
      })

      map.on("load", () => {
        console.log("Map loaded")
        setMapLoaded(true)

        // Add 3D buildings on high zoom levels
        try {
          if (map.getStyle().sources?.composite) {
            map.addLayer({
              id: "3d-buildings",
              source: "composite",
              "source-layer": "building",
              filter: ["==", "extrude", "true"],
              type: "fill-extrusion",
              minzoom: 15,
              paint: {
                "fill-extrusion-color": "#aaa",
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "min_height"],
                "fill-extrusion-opacity": 0.6,
              },
            })
          }
        } catch (error) {
          console.warn("Could not add 3D buildings layer:", error)
        }
      })

      // Add map controls - position them differently for mobile
      const position = isMobile ? "bottom-right" : "top-right"
      map.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        position,
      )

      // Only add fullscreen on non-mobile
      if (!isMobile) {
        map.addControl(new mapboxgl.FullscreenControl(), position)
      }

      // Add geolocate control
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        position,
      )

      // Map event handlers with useCallback to prevent recreation
      map.on("click", (e) => {
        // Close any open popups when clicking on the map
        setShowMiniPreview(false)
        setPreviewLocation(null)
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      })

      map.on("moveend", () => {
        const c = map.getCenter()
        onMapMove([c.lat, c.lng], map.getZoom())
      })

      // Store map reference
      mapRef.current = map

      // Store initial center and zoom
      prevCenterRef.current = center
      prevZoomRef.current = zoom
    } catch (error) {
      console.error("Error initializing map:", error)
      setWebglSupported(false)
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      if (brandingRef.current && brandingRef.current.parentNode) {
        brandingRef.current.parentNode.removeChild(brandingRef.current)
        brandingRef.current = null
      }
      mapInitializedRef.current = false
    }
  }, [webglSupported]) // Empty dependency array to ensure map is only initialized once

  // Handle style changes - only run when style actually changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    try {
      mapRef.current.setStyle(`mapbox://styles/mapbox/${currentStyle}`)
    } catch (error) {
      console.warn("Error changing map style:", error)
    }
  }, [currentStyle, mapLoaded])

  // Handle center and zoom changes - only run when they actually change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    if (!isValidCoordinate(center[0], center[1])) return

    // Check if center or zoom has actually changed
    const centerChanged =
      !prevCenterRef.current ||
      Math.abs(prevCenterRef.current[0] - center[0]) > 0.0001 ||
      Math.abs(prevCenterRef.current[1] - center[1]) > 0.0001

    const zoomChanged = prevZoomRef.current === null || Math.abs(prevZoomRef.current - zoom) > 0.1

    if (centerChanged || zoomChanged) {
      try {
        map.flyTo({
          center: [center[1], center[0]],
          zoom,
          essential: true,
          duration: 1000,
        })

        // Update previous values
        prevCenterRef.current = center
        prevZoomRef.current = zoom
      } catch (error) {
        console.warn("Error flying to location:", error)
      }
    }
  }, [center[0], center[1], zoom, mapLoaded]) // Only depend on the actual values that matter

  // Update markers when locations change - use memoized locationIds to detect actual changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    // Skip if locations haven't actually changed
    if (prevLocationsRef.current === locations && markersInitializedRef.current) return

    // Remove existing markers
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current = []

    console.log(`Updating ${locations.length} location markers`)

    // Add new markers for each location
    locations.forEach((location) => {
      try {
        // Get coordinates
        const coords = getCoordinates(location)
        if (!coords) return // Skip if no valid coordinates

        const [lat, lng] = coords

        // Create marker element
        const el = document.createElement("div")

        // Get primary category and its color
        const primaryCategory = location.categories && location.categories.length > 0 ? location.categories[0] : null
        const color = getCategoryColor(primaryCategory) || "#888"

        // Fixed marker size regardless of zoom level
        const isSelected = selectedLocation && location.id === selectedLocation.id
        const baseMarkerSize = isSelected ? 40 : 32 // Slightly larger for selected marker

        // Create marker container with absolute positioning
        el.className = "mapboxgl-marker-container"
        Object.assign(el.style, {
          position: "absolute",
          transform: "translate(-50%, -50%)",
          width: `${baseMarkerSize}px`,
          height: `${baseMarkerSize}px`,
          cursor: "pointer",
          zIndex: isSelected ? "10" : "1",
        })

        // Create the actual marker element
        const markerDot = document.createElement("div")
        markerDot.className = "mapboxgl-marker-dot"
        Object.assign(markerDot.style, {
          width: "100%",
          height: "100%",
          backgroundColor: color,
          borderRadius: "50%",
          border: isSelected ? "3px solid #FF6B6B" : "3px solid white",
          boxShadow: isSelected
            ? "0 0 0 3px rgba(255, 107, 107, 0.7), 0 4px 8px rgba(0,0,0,0.4)"
            : "0 3px 6px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: `${baseMarkerSize * 0.4}px`,
          fontWeight: "bold",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          transformOrigin: "center center",
          position: "absolute",
          top: "0",
          left: "0",
        })

        // Add hover effect only for non-mobile devices
        if (!isMobile) {
          el.onmouseenter = () => {
            if (!isSelected) {
              markerDot.style.transform = "scale(1.1)"
              markerDot.style.boxShadow = "0 4px 8px rgba(0,0,0,0.4)"
              el.style.zIndex = "5"
            }
          }

          el.onmouseleave = () => {
            if (!isSelected) {
              markerDot.style.transform = "scale(1)"
              markerDot.style.boxShadow = "0 3px 6px rgba(0,0,0,0.3)"
              el.style.zIndex = "1"
            }
          }
        }

        // Get first letter of category name for marker label
        let categoryLabel = "C"
        if (primaryCategory) {
          if (typeof primaryCategory === "string") {
            categoryLabel = primaryCategory.charAt(0)
          } else if (primaryCategory.name) {
            categoryLabel = primaryCategory.name.charAt(0)
          }
        }

        markerDot.textContent = categoryLabel

        // Add pulse effect
        const pulse = document.createElement("div")
        pulse.className = "mapboxgl-marker-pulse"
        Object.assign(pulse.style, {
          position: "absolute",
          inset: "0",
          borderRadius: "50%",
          backgroundColor: `${color}20`,
          animation: "pulse 2s infinite",
          zIndex: "-1",
        })
        markerDot.appendChild(pulse)
        el.appendChild(markerDot)

        // Add click handler
        el.addEventListener("click", (e) => {
          e.stopPropagation()

          // On mobile, show mini preview first
          if (isMobile) {
            setPreviewLocation(location)
            setShowMiniPreview(true)
          } else {
            // On desktop, go directly to full detail view
            onMarkerClick(location)
          }
        })

        // Create marker
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([lng, lat])
          .addTo(map)

        // Store marker reference with its element
        markersRef.current.push({ marker, location, element: el })
      } catch (error) {
        console.warn(`Error adding marker for location "${location.name}":`, error)
      }
    })

    console.log(`Added ${markersRef.current.length} markers to map`)

    // Update refs to track changes
    prevLocationsRef.current = locations
    markersInitializedRef.current = true
  }, [locationIds, mapLoaded, isMobile, selectedLocationId]) // Only depend on the memoized values

  // Update selected marker state - only run when selected location changes
  useEffect(() => {
    if (!mapLoaded || prevSelectedLocationRef.current?.id === selectedLocation?.id) return

    markersRef.current.forEach(({ element, location }) => {
      const isSelected = selectedLocation && location.id === selectedLocation.id
      const markerDot = element.querySelector(".mapboxgl-marker-dot") as HTMLElement

      if (markerDot) {
        if (isSelected) {
          markerDot.style.border = "3px solid #FF6B6B"
          markerDot.style.boxShadow = "0 0 0 3px rgba(255, 107, 107, 0.7), 0 4px 8px rgba(0,0,0,0.4)"
          element.style.zIndex = "10"
        } else {
          markerDot.style.border = "3px solid white"
          markerDot.style.boxShadow = "0 3px 6px rgba(0,0,0,0.3)"
          element.style.zIndex = "1"
        }
      }
    })

    prevSelectedLocationRef.current = selectedLocation ?? null
  }, [selectedLocationId, mapLoaded])

  // Add user location marker - only run when user location changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !userLocation) return

    const [lat, lng] = userLocation
    if (!isValidCoordinate(lat, lng)) return

    try {
      // Remove existing user marker
      userMarkerRef.current?.remove()

      // Create user marker element
      const el = document.createElement("div")
      Object.assign(el.style, {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "#4285F4",
        border: "3px solid white",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        position: "absolute",
        transform: "translate(-50%, -50%)",
      })

      // Add pulse effect
      const pulse = document.createElement("div")
      Object.assign(pulse.style, {
        position: "absolute",
        inset: "0",
        borderRadius: "50%",
        backgroundColor: "rgba(66,133,244,0.2)",
        animation: "pulse 2s infinite",
        zIndex: "-1",
      })
      el.appendChild(pulse)

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2"><p class="font-medium">Your Location</p></div>`,
      )

      // Add marker to map
      userMarkerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)
    } catch (error) {
      console.warn("Error adding user location marker:", error)
    }
  }, [userLocation?.[0], userLocation?.[1], mapLoaded]) // Only depend on the actual coordinates

  // Add search radius circle - only run when search radius or center changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    try {
      // Remove existing circle
      if (circleLayerId.current) {
        if (map.getLayer(circleLayerId.current)) {
          map.removeLayer(circleLayerId.current)
        }
        if (map.getSource(circleLayerId.current)) {
          map.removeSource(circleLayerId.current)
        }
        circleLayerId.current = null
      }

      // Add new circle if search radius is provided
      if (searchRadius && isValidCoordinate(center[0], center[1])) {
        const id = `radius-${Date.now()}`
        circleLayerId.current = id

        map.addSource(id, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [center[1], center[0]],
            },
            properties: {},
          },
        })

        map.addLayer({
          id,
          type: "circle",
          source: id,
          paint: {
            "circle-radius": {
              stops: [
                [0, 0],
                [20, (searchRadius * 1000) / 0.075],
              ],
              base: 2,
            },
            "circle-color": "#4ECDC4",
            "circle-opacity": 0.1,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#4ECDC4",
            "circle-stroke-opacity": 0.7,
          },
        })
      }
    } catch (error) {
      console.warn("Error updating search radius circle:", error)
    }
  }, [searchRadius, center[0], center[1], mapLoaded])

  // Add branding overlay - only run once when map is loaded
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || brandingRef.current) return

    try {
      // Create branding element
      const box = document.createElement("div")
      box.className =
        "absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex items-center z-10"
      box.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-[#FF6B6B] flex items-center justify-center mr-2">
          <span class="text-white font-bold text-xs">GG</span>
        </div>
        <span class="text-sm font-medium text-gray-800">Grounded Gems</span>
      `

      // Add to map container
      map.getContainer().appendChild(box)
      brandingRef.current = box
    } catch (error) {
      console.warn("Error adding branding overlay:", error)
    }
  }, [mapLoaded])

  // Memoize callback functions to prevent recreation on each render
  const toggleStyles = useCallback(() => setShowStyles((s) => !s), [])

  const selectMapStyle = useCallback(
    (styleId: string) => {
      const map = mapRef.current
      if (!map || !mapLoaded) return

      try {
        setCurrentStyle(styleId)
        map.setStyle(`mapbox://styles/mapbox/${styleId}`)
        setShowStyles(false)
      } catch (error) {
        console.warn("Error changing map style:", error)
      }
    },
    [mapLoaded],
  )

  // Toggle legend
  const toggleLegend = useCallback(() => setShowLegend((prev) => !prev), [])

  // Handle mini preview actions
  const handleViewDetails = useCallback(() => {
    if (previewLocation) {
      onMarkerClick(previewLocation)
      setShowMiniPreview(false)
      setPreviewLocation(null)
    }
  }, [previewLocation, onMarkerClick])

  const closeMiniPreview = useCallback(() => {
    setShowMiniPreview(false)
    setPreviewLocation(null)
  }, [])

  // Fly to user location
  const flyToUserLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation[1], userLocation[0]],
        zoom: 15,
        essential: true,
      })
    }
  }, [userLocation])

  // Memoize the categories derived from locations to prevent recalculation
  const categories = useMemo(() => {
    return locations.reduce(
      (acc, location) => {
        if (location.categories && Array.isArray(location.categories)) {
          location.categories.forEach((category) => {
            const id = typeof category === "string" ? category : category.id
            const name = typeof category === "string" ? category : category.name || "Category"
            const color = getCategoryColor(category)

            if (id && !acc.some((c) => c.id === id)) {
              acc.push({ id, name, color })
            }
          })
        }
        return acc
      },
      [] as { id: string; name: string; color: string }[],
    )
  }, [locationIds])

  // No WebGL support fallback
  if (!webglSupported) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 h-full", className)}>
        <div className="text-center p-6">
          <div className="w-12 h-12 rounded-full bg-[#FF6B6B] mx-auto mb-4 flex items-center justify-center">
            <Info className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">WebGL Not Supported</h3>
          <p className="text-gray-600 max-w-md">Your browser does not support WebGL, which is required for maps.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div ref={containerRef} className="h-full w-full map-container" />

      {/* Map controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 md:top-4 md:right-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="bg-white shadow-md rounded-full h-10 w-10"
                onClick={toggleStyles}
              >
                <Layers className="h-5 w-5 text-[#FF6B6B]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Map Styles</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {userLocation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-white shadow-md rounded-full h-10 w-10"
                  onClick={flyToUserLocation}
                >
                  <Locate className="h-5 w-5 text-blue-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>My Location</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className={cn("bg-white shadow-md rounded-full h-10 w-10", showLegend && "bg-gray-100")}
                onClick={toggleLegend}
              >
                <Info className="h-5 w-5 text-gray-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Category Legend</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Style selector dropdown */}
      {showStyles && (
        <div className="absolute top-4 right-16 bg-white rounded-lg shadow-lg p-3 z-20 w-56">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-800 px-2">Map Style</h4>
            {isMobile && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleStyles}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {MAP_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => selectMapStyle(style.id)}
                className={cn(
                  "flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                  currentStyle === style.id ? "bg-[#FF6B6B]/10 text-[#FF6B6B] font-medium" : "hover:bg-gray-100",
                )}
              >
                <span className="mr-2">{style.icon}</span>
                {style.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category legend */}
      {showLegend && (
        <div className="absolute top-4 right-16 bg-white rounded-lg shadow-lg p-3 z-20 w-56">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-800 px-2">Categories</h4>
            {isMobile && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleLegend}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center px-2">
                <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                <span className="text-sm text-gray-700">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mini location preview for mobile */}
      {showMiniPreview && previewLocation && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg z-30 p-4 animate-slide-up">
          <div className="absolute top-2 right-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={closeMiniPreview}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-start mb-3">
            <div className="w-16 h-16 rounded-lg bg-gray-100 relative flex-shrink-0 overflow-hidden">
              {previewLocation.imageUrl || previewLocation.featuredImage ? (
                <div className="w-full h-full relative">
                  <img
                    src={
                      typeof previewLocation.featuredImage === "string"
                        ? previewLocation.featuredImage
                        : previewLocation.featuredImage?.url || previewLocation.imageUrl || "/placeholder.svg"
                    }
                    alt={previewLocation.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            <div className="ml-3 flex-1">
              <h3 className="font-medium text-gray-900 text-lg">{previewLocation.name}</h3>

              {/* Address */}
              {previewLocation.address && (
                <div className="flex items-center mt-1">
                  <MapPin className="h-3.5 w-3.5 text-gray-500 mr-1 flex-shrink-0" />
                  <p className="text-sm text-gray-500 truncate">
                    {typeof previewLocation.address === "string"
                      ? previewLocation.address
                      : Object.values(previewLocation.address).filter(Boolean).join(", ")}
                  </p>
                </div>
              )}

              {/* Categories */}
              {previewLocation.categories && previewLocation.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {previewLocation.categories.slice(0, 2).map((category, idx) => {
                    const color = getCategoryColor(category)
                    const name = typeof category === "string" ? category : category?.name || "Category"

                    return (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="px-2 py-0.5 h-5 text-[10px] font-medium rounded-full"
                        style={{
                          backgroundColor: `${color}10`,
                          color: color,
                          borderColor: `${color}30`,
                        }}
                      >
                        {name}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <Button className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90" onClick={handleViewDetails}>
            View Details
          </Button>
        </div>
      )}

      {/* No locations message */}
      {locations.length === 0 && mapLoaded && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 z-10 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-700 font-medium">No locations found</p>
          <p className="text-gray-500 text-sm mt-1">Adjust your filters or search</p>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 text-xs text-gray-600 z-10 md:bottom-4 md:right-4 bottom-24 right-2">
        ©{" "}
        <a
          href="https://www.mapbox.com/about/maps/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4ECDC4] hover:underline"
        >
          Mapbox
        </a>{" "}
        | ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4ECDC4] hover:underline"
        >
          OpenStreetMap
        </a>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes pulse { 0% {transform:scale(0.95);opacity:1} 70% {transform:scale(1.3);opacity:0} 100% {transform:scale(0.95);opacity:0} }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        
        .mapboxgl-popup-content {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          padding: 0;
          font-family: inherit;
          overflow: hidden;
        }
        
        .mapboxgl-popup-close-button {
          font-size: 18px;
          color: #666;
          padding: 4px 8px;
          background: transparent;
          border: none;
          z-index: 2;
        }
        
        .mapboxgl-popup-close-button:hover {
          background: rgba(0,0,0,0.05);
          color: #333;
        }
        
        .mapboxgl-ctrl-bottom-right {
          bottom: 70px !important;
          right: 12px;
        }
        
        .mapboxgl-ctrl-group {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          border: none;
        }
        
        .mapboxgl-ctrl-group button {
          width: 32px;
          height: 32px;
        }
        
        .mapboxgl-ctrl-group button:focus {
          box-shadow: none;
        }
        
        @media (max-width: 768px) {
          .mapboxgl-popup-content {
            max-width: 90vw;
          }
        }

        .mapboxgl-popup {
          z-index: 10;
        }

        @media (max-width: 768px) {
          .mapboxgl-popup-content {
            max-width: 90vw;
            width: 90vw;
          }
          
          .mapboxgl-ctrl-group {
            margin-bottom: 60px;
          }
          
          .mapboxgl-ctrl-group button {
            width: 36px;
            height: 36px;
          }
        }

        /* Fix for full height on mobile */
        @media (max-width: 768px) {
          .map-container {
            position: absolute !important;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            height: 100% !important;
            width: 100% !important;
          }
        }

        /* Marker clustering and overlapping styles */
        .mapboxgl-marker {
          will-change: transform;
        }

        /* Fix for marker hover effect */
        .mapboxgl-marker-container {
          transform-origin: center bottom !important;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .mapboxgl-marker-dot {
          transform-origin: center center !important;
        }
      `}</style>
    </div>
  )
})

export default MapComponent
