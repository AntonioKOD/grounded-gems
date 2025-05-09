"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Layers, Info, MapPin } from 'lucide-react'
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Location } from "./map-data"
import { getCategoryColor } from "./category-utils"

// Set the Mapbox access token from env
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

// Validate latitude/longitude
const isValidCoordinate = (lat?: number | string | null, lng?: number | string | null): boolean => {
  const numLat = typeof lat === 'string' ? parseFloat(lat) : lat
  const numLng = typeof lng === 'string' ? parseFloat(lng) : lng
  
  return numLat != null && 
         numLng != null && 
         !isNaN(numLat) && 
         !isNaN(numLng) && 
         Math.abs(numLat) <= 90 && 
         Math.abs(numLng) <= 180
}

// Extract coordinates from location
const getCoordinates = (location: Location): [number, number] | null => {
  // Try direct latitude/longitude properties
  if (isValidCoordinate(location.latitude, location.longitude)) {
    return [
      Number(location.latitude),
      Number(location.longitude)
    ]
  }
  
  // Try coordinates object
  if (location.coordinates) {
    if (isValidCoordinate(location.coordinates.latitude, location.coordinates.longitude)) {
      return [
        Number(location.coordinates.latitude),
        Number(location.coordinates.longitude)
      ]
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
}

export default function MapComponent({
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
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ marker: mapboxgl.Marker, location: Location }[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const circleLayerId = useRef<string | null>(null)
  const brandingRef = useRef<HTMLDivElement | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showStyles, setShowStyles] = useState(false)
  const [currentStyle, setCurrentStyle] = useState(mapStyle)
  const [webglSupported, setWebglSupported] = useState(true)

  const styles = [
    { id: "streets-v12", name: "Streets" },
    { id: "light-v11", name: "Light" },
    { id: "dark-v11", name: "Dark" },
    { id: "satellite-v9", name: "Satellite" },
    { id: "satellite-streets-v12", name: "Satellite Streets" },
    { id: "outdoors-v12", name: "Outdoors" },
  ]

  // Detect WebGL support
  useEffect(() => {
    setWebglSupported(mapboxgl.supported())
  }, [])

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !webglSupported) return

    const isMobile = window.innerWidth < 768
    const defaultCenter: [number, number] = [40.7128, -74.006] // NYC
    
    // Validate center coordinates
    const mapCenter = isValidCoordinate(center[0], center[1]) 
      ? [center[1], center[0]] as [number, number]
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

      // Add map controls
      const position = isMobile ? "bottom-right" : "top-right"
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), position)
      map.addControl(new mapboxgl.FullscreenControl(), position)
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        position
      )

      // Map event handlers
      map.on("click", (e) => onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
      map.on("moveend", () => {
        const c = map.getCenter()
        onMapMove([c.lat, c.lng], map.getZoom())
      })

      // Store map reference
      mapRef.current = map
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
    }
  }, []) // Empty dependency array to initialize map only once

  // Update map center and zoom when props change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    if (!isValidCoordinate(center[0], center[1])) return

    try {
      const currentCenter = map.getCenter()
      const currentZoom = map.getZoom()
      
      // Only fly to new location if it's significantly different
      const centerChanged = 
        Math.abs(currentCenter.lat - center[0]) > 0.0001 || 
        Math.abs(currentCenter.lng - center[1]) > 0.0001
      
      const zoomChanged = Math.abs(currentZoom - zoom) > 0.1
      
      if (centerChanged || zoomChanged) {
        map.flyTo({ 
          center: [center[1], center[0]], 
          zoom, 
          essential: true,
          duration: 1000
        })
      }
    } catch (error) {
      console.warn("Error flying to location:", error)
    }
  }, [center, zoom, mapLoaded])

  // Update map style when prop changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || currentStyle === mapStyle) return

    try {
      setCurrentStyle(mapStyle)
      mapRef.current.setStyle(`mapbox://styles/mapbox/${mapStyle}`)
    } catch (error) {
      console.warn("Error changing map style:", error)
    }
  }, [mapStyle, mapLoaded])

  // Update markers when locations change
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    console.log(`Updating ${locations.length} location markers`)

    // Remove existing markers
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current = []

    // Add new markers for each location
    locations.forEach((location) => {
      try {
        // Get coordinates
        const coords = getCoordinates(location)
        if (!coords) return // Skip if no valid coordinates
        
        const [lat, lng] = coords
        
        // Create marker element
        const el = document.createElement("div")
        const isMobile = window.innerWidth < 768

        // Get primary category and its color
        const primaryCategory = location.categories && location.categories.length > 0 
          ? location.categories[0] 
          : null
          
        const color = getCategoryColor(primaryCategory) || "#888"

        // Style the marker
        Object.assign(el.style, {
          width: isMobile ? "40px" : "30px",
          height: isMobile ? "40px" : "30px",
          backgroundColor: color,
          borderRadius: "50%",
          border: "3px solid white",
          boxShadow: "0 3px 6px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: isMobile ? "16px" : "12px",
          fontWeight: "bold",
          cursor: "pointer",
          position: "relative",
        })

        // Get first letter of category name for marker label
        let categoryLabel = "C"
        if (primaryCategory) {
          if (typeof primaryCategory === "string") {
            categoryLabel = primaryCategory.charAt(0)
          } else if (primaryCategory.name) {
            categoryLabel = primaryCategory.name.charAt(0)
          }
        }

        el.textContent = categoryLabel

        // Add pulse effect
        const pulse = document.createElement("div")
        Object.assign(pulse.style, {
          position: "absolute",
          inset: "0",
          borderRadius: "50%",
          backgroundColor: `${color}20`,
          animation: "pulse 2s infinite",
          zIndex: "-1",
        })
        el.appendChild(pulse)

        // Add click handler
        el.addEventListener("click", (e) => {
          e.stopPropagation()
          onMarkerClick(location)
        })

        // Format address for popup
        let address = ""
        if (typeof location.address === "string") {
          address = location.address
        } else if (location.address) {
          address = [
            location.address.street, 
            location.address.city, 
            location.address.state, 
            location.address.zip, 
            location.address.country
          ]
            .filter(Boolean)
            .join(", ")
        }

        // Create popup with location info
        const popup = new mapboxgl.Popup({ 
          offset: isMobile ? 30 : 25, 
          closeButton: false,
          maxWidth: "300px"
        }).setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-sm">${location.name}</h3>
            ${address ? `<p class="text-xs text-gray-600 mt-1">${address}</p>` : ""}
            ${
              location.categories && location.categories.length > 0
                ? `
              <div class="flex flex-wrap gap-1 mt-1">
                ${location.categories
                  .slice(0, 3)
                  .map((cat) => {
                    const catName = typeof cat === "string" ? cat : cat.name || "Category"
                    const catColor = getCategoryColor(cat)
                    return `<span class="text-xs px-1.5 py-0.5 rounded" style="background-color: ${catColor}20; color: ${catColor}">
                    ${catName}
                  </span>`
                  })
                  .join("")}
              </div>
            `
                : ""
            }
          </div>
        `)

        // Add marker to map
        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map)
          
        // Store marker reference
        markersRef.current.push({ marker, location })
        
      } catch (error) {
        console.warn(`Error adding marker for location "${location.name}":`, error)
      }
    })
    
    console.log(`Added ${markersRef.current.length} markers to map`)
    
  }, [locations, mapLoaded, onMarkerClick])

  // Add user location marker
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
        position: "relative",
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
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)
        
    } catch (error) {
      console.warn("Error adding user location marker:", error)
    }
  }, [userLocation, mapLoaded])

  // Add search radius circle
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
  }, [searchRadius, center, mapLoaded])

  // Add branding overlay
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    try {
      // Remove existing branding
      if (brandingRef.current && brandingRef.current.parentNode) {
        brandingRef.current.parentNode.removeChild(brandingRef.current)
      }
      
      // Create branding element
      const box = document.createElement("div")
      box.className = "absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex items-center z-10"
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

  // Style selector handlers
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
      <div ref={containerRef} className="h-full w-full" />

      {/* Style selector button */}
      <div className="absolute top-4 right-4 z-10">
        <Button size="icon" variant="outline" className="bg-white shadow-md" onClick={toggleStyles}>
          <Layers className="h-4 w-4 text-[#FF6B6B]" />
        </Button>
      </div>

      {/* Style selector dropdown */}
      {showStyles && (
        <div className="absolute top-14 right-4 bg-white rounded-lg shadow-lg p-3 z-10 w-48">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Map Style</h4>
          <div className="space-y-1">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => selectMapStyle(style.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                  currentStyle === style.id ? "bg-[#FF6B6B]/10 text-[#FF6B6B] font-medium" : "hover:bg-gray-100",
                )}
              >
                {style.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No locations message */}
      {locations.length === 0 && mapLoaded && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 z-10 text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-700 font-medium">No locations found</p>
          <p className="text-gray-500 text-sm">Adjust your filters or search</p>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-1 text-xs text-gray-600 z-10">
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
        @keyframes pulse { 0% {transform:scale(0.5);opacity:1} 100% {transform:scale(1.5);opacity:0} }
        .mapboxgl-popup-content {
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 0;
          font-family: inherit;
        }
        .mapboxgl-popup-close-button {
          font-size: 16px;
          color: #666;
          padding: 4px 8px;
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
        @media (max-width: 768px) {
          .mapboxgl-popup-content {
            max-width: 90vw;
          }
        }
      `}</style>
    </div>
  )
}
