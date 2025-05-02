"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Layers, Info, MapPin } from "lucide-react"
import type { Location } from "./map-data"

// This file will only be loaded on the client side
// We can safely import mapbox-gl here
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

// Set the access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

interface MapComponentProps {
  locations: Location[]
  userLocation: [number, number] | null
  center: [number, number]
  zoom: number
  mapStyle: string
  onMarkerClick: (location: Location) => void
  onMapClick: (latlng: { lat: number; lng: number }) => void
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
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ marker: mapboxgl.Marker; location: Location }[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const radiusCircleId = useRef<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showStyles, setShowStyles] = useState(false)
  const [currentStyle, setCurrentStyle] = useState(mapStyle)
  const [isWebGLSupported, setIsWebGLSupported] = useState(true)

  // Available Mapbox styles
  const styles = [
    { id: "streets-v12", name: "Streets" },
    { id: "light-v11", name: "Light" },
    { id: "dark-v11", name: "Dark" },
    { id: "satellite-v9", name: "Satellite" },
    { id: "satellite-streets-v12", name: "Satellite Streets" },
    { id: "outdoors-v12", name: "Outdoors" },
  ]

  // Get category color
  const getCategoryColor = useCallback((category: string): string => {
    const colors: Record<string, string> = {
      Music: "#FF6B6B",
      Art: "#4ECDC4",
      Food: "#FFE66D",
      Tech: "#6B66FF",
      Wellness: "#66FFB4",
      Entertainment: "#FF66E3",
      Default: "#FF6B6B",
    }
    return colors[category] || colors.Default
  }, [])

  // Check for WebGL support
  useEffect(() => {
    setIsWebGLSupported(mapboxgl.supported())
  }, [])

  // Initialize map
  useEffect(() => {
    const initializeMap = () => {
      if (!mapContainer.current || mapRef.current || !isWebGLSupported) return

      try {
        // Detect if we're on mobile
        const isMobile = window.innerWidth < 768

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: `mapbox://styles/mapbox/${currentStyle}`,
          center: [center[1], center[0]], // Mapbox uses [lng, lat] format
          zoom: isMobile ? zoom - 0.5 : zoom, // Slightly zoom out on mobile for better context
          projection: { name: "mercator" }, // Explicitly set projection for v3
          renderWorldCopies: true, // Show multiple copies of the world
          attributionControl: true,
          dragRotate: false, // Disable rotation for simpler mobile interaction
          touchZoomRotate: true, // Enable pinch zoom
          maxBounds: undefined, // Allow panning anywhere
        })

        // Add touch-friendly controls for mobile
        if (isMobile) {
          // Increase the size of controls for better touch interaction
          const style = document.createElement("style")
          style.textContent = `
          .mapboxgl-ctrl-group button {
            width: 44px !important;
            height: 44px !important;
          }
          .mapboxgl-ctrl-icon {
            transform: scale(1.3);
          }
          .mapboxgl-popup-content {
            padding: 15px !important;
            font-size: 14px !important;
          }
        `
          document.head.appendChild(style)
        }

        // Setup map load handler
        const onLoad = () => {
          setMapLoaded(true)

          // Try to add 3D buildings layer
          try {
            if (map.getStyle().sources.composite) {
              map.addLayer({
                id: "3d-buildings",
                source: "composite",
                "source-layer": "building",
                filter: ["==", "extrude", "true"],
                type: "fill-extrusion",
                minzoom: 15,
                paint: {
                  "fill-extrusion-color": "#aaa",
                  "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 15, 0, 18, ["get", "height"]],
                  "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 15, 0, 18, ["get", "min_height"]],
                  "fill-extrusion-opacity": 0.6,
                },
              })
            }
          } catch (error) {
            console.warn("Could not add 3D buildings layer:", error)
          }
        }

        map.on("load", onLoad)

        // Add navigation controls - position differently on mobile
        const controlPosition = isMobile ? "bottom-right" : "top-right"

        // Add minimal controls on mobile
        if (isMobile) {
          map.addControl(
            new mapboxgl.NavigationControl({
              showCompass: false,
              visualizePitch: false,
            }),
            controlPosition,
          )
        } else {
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), controlPosition)
          map.addControl(new mapboxgl.FullscreenControl(), controlPosition)
        }

        // Add geolocation control
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
          }),
          controlPosition,
        )

        // Add click handler
        map.on("click", (e) => {
          onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        })

        // Add move handler - use a debounced version to prevent too many updates
        let moveTimeout: NodeJS.Timeout | null = null
        map.on("moveend", () => {
          if (!map) return

          // Clear any existing timeout
          if (moveTimeout) clearTimeout(moveTimeout)

          // Set a new timeout to debounce the move event
          moveTimeout = setTimeout(() => {
            const center = map.getCenter()
            onMapMove([center.lat, center.lng], map.getZoom())
          }, 300)
        })

        // Store map reference
        mapRef.current = map
      } catch (error) {
        console.error("Error initializing map:", error)
        setIsWebGLSupported(false)
      }
    }

    initializeMap()

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only initialize once - don't include dependencies that would cause re-initialization
  }, [isWebGLSupported])

  // Update map center and zoom when props change
  // Use a ref to track the previous values to avoid unnecessary updates
  const prevCenterRef = useRef(center)
  const prevZoomRef = useRef(zoom)

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    // Only update if center or zoom has actually changed
    const centerChanged = prevCenterRef.current[0] !== center[0] || prevCenterRef.current[1] !== center[1]

    const zoomChanged = prevZoomRef.current !== zoom

    if (centerChanged || zoomChanged) {
      mapRef.current.flyTo({
        center: [center[1], center[0]], // Mapbox uses [lng, lat] format
        zoom: zoom,
        essential: true,
      })

      // Update the refs
      prevCenterRef.current = center
      prevZoomRef.current = zoom
    }
  }, [center, zoom, mapLoaded])

  // Update map style when mapStyle changes
  // Use a ref to track the previous style to avoid unnecessary updates
  const prevStyleRef = useRef(mapStyle)

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || currentStyle === mapStyle) return

    // Only update if the style has actually changed
    if (prevStyleRef.current !== mapStyle) {
      setCurrentStyle(mapStyle)
      mapRef.current.setStyle(`mapbox://styles/mapbox/${mapStyle}`)
      prevStyleRef.current = mapStyle
    }
  }, [mapStyle, mapLoaded, currentStyle])

  // Add location markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current = []

    // Add new markers
    locations.forEach((location) => {
      // Create custom marker element
      const el = document.createElement("div")
      const color = getCategoryColor(location.category)

      // Style the marker
      el.className = "custom-marker"
      // Check if we're on mobile for larger touch targets
      const isMobile = window.innerWidth < 768
      Object.assign(el.style, {
        width: isMobile ? "40px" : "30px",
        height: isMobile ? "40px" : "30px",
        borderRadius: "50%",
        backgroundColor: color,
        border: "3px solid white",
        boxShadow: "0 3px 6px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: isMobile ? "16px" : "12px",
        cursor: "pointer",
        position: "relative",
        // Add a larger touch target for mobile
        touchAction: "manipulation",
      })
      el.innerHTML = location.category.charAt(0)

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

      // Create popup - make it more mobile friendly
      const popup = new mapboxgl.Popup({
        offset: isMobile ? 30 : 25,
        closeButton: false,
        maxWidth: isMobile ? "300px" : "200px",
        className: isMobile ? "mobile-popup" : "",
      }).setHTML(`
      <div class="p-2">
        <h3 class="font-bold text-sm">${location.name}</h3>
        <p class="text-xs text-gray-600">${location.category}</p>
        ${location.address ? `<p class="text-xs text-gray-600 mt-1">${location.address}</p>` : ""}
      </div>
    `)

      // Create and add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!)

      // Add click handler
      const markerElement = marker.getElement()
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation() // Prevent map click
        onMarkerClick(location)
      })

      // Store marker reference
      markersRef.current.push({ marker, location })
    })
  }, [locations, mapLoaded, onMarkerClick, getCategoryColor])

  // Add user location marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !userLocation) return

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }

    // Create user location marker
    const el = document.createElement("div")
    el.className = "user-location-marker"
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
      backgroundColor: "rgba(66, 133, 244, 0.2)",
      animation: "pulse 2s infinite",
      zIndex: "-1",
    })
    el.appendChild(pulse)

    // Create popup
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="p-2">
        <p class="font-medium">Your Location</p>
      </div>
    `)

    // Add marker
    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([userLocation[1], userLocation[0]])
      .setPopup(popup)
      .addTo(mapRef.current)
  }, [userLocation, mapLoaded])

  // Add search radius circle
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    // Remove existing circle
    if (radiusCircleId.current) {
      try {
        if (mapRef.current.getLayer(radiusCircleId.current)) {
          mapRef.current.removeLayer(radiusCircleId.current)
        }
        if (mapRef.current.getSource(radiusCircleId.current)) {
          mapRef.current.removeSource(radiusCircleId.current)
        }
      } catch (error) {
        console.warn("Error removing radius circle:", error)
      }
      radiusCircleId.current = null
    }

    // Add new circle if search radius is provided
    if (searchRadius && mapRef.current) {
      const circleId = `radius-circle-${Date.now()}`
      radiusCircleId.current = circleId

      try {
        // Create a GeoJSON source with a single-point geometry
        mapRef.current.addSource(circleId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [center[1], center[0]], // [lng, lat]
            },
            properties: {},
          },
        })

        // Add a circle layer using the source
        mapRef.current.addLayer({
          id: circleId,
          type: "circle",
          source: circleId,
          paint: {
            "circle-radius": {
              stops: [
                [0, 0],
                [20, (searchRadius * 1000) / 0.075], // Convert km to pixels based on zoom level
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
      } catch (error) {
        console.warn("Error adding radius circle:", error)
      }
    }
  }, [center, searchRadius, mapLoaded])

  // Add Grounded Gems branding
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    // Add branding element to the map
    const brandingContainer = document.createElement("div")
    brandingContainer.className =
      "absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex items-center z-10"
    brandingContainer.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-[#FF6B6B] flex items-center justify-center mr-2">
        <span class="text-white font-bold text-xs">GG</span>
      </div>
      <span class="text-sm font-medium text-gray-800">Grounded Gems</span>
    `

    mapRef.current.getContainer().appendChild(brandingContainer)

    return () => {
      if (mapRef.current) {
        const container = mapRef.current.getContainer()
        if (container.contains(brandingContainer)) {
          container.removeChild(brandingContainer)
        }
      }
    }
  }, [mapLoaded])

  // Style selector handlers
  const toggleStyleSelector = useCallback(() => {
    setShowStyles((prev) => !prev)
  }, [])

  const selectStyle = useCallback(
    (id: string) => {
      if (!mapRef.current || !mapLoaded) return
      setCurrentStyle(id)
      mapRef.current.setStyle(`mapbox://styles/mapbox/${id}`)
      setShowStyles(false)
    },
    [mapLoaded],
  )

  if (!isWebGLSupported) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 h-full", className)}>
        <div className="text-center p-6">
          <div className="w-12 h-12 rounded-full bg-[#FF6B6B] flex items-center justify-center mx-auto mb-4">
            <Info className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">WebGL Not Supported</h3>
          <p className="text-gray-600 max-w-md">
            Your browser or device doesn&apos;t support WebGL, which is required for displaying maps.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div ref={mapContainer} className="h-full w-full" />

      {/* Style selector button */}
      <div className="absolute top-20 right-4 z-10">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-md bg-white shadow-md border-none hover:bg-gray-50"
          onClick={toggleStyleSelector}
        >
          <Layers className="h-4 w-4 text-[#FF6B6B]" />
        </Button>
      </div>

      {/* Style selector dropdown */}
      {showStyles && (
        <div className="absolute top-20 right-16 bg-white rounded-lg shadow-lg p-2 z-10">
          <div className="text-sm font-medium text-gray-700 mb-2 px-2">Map Style</div>
          {styles.map((style) => (
            <button
              key={style.id}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                currentStyle === style.id ? "bg-[#FF6B6B]/10 text-[#FF6B6B] font-medium" : "hover:bg-gray-100",
              )}
              onClick={() => selectStyle(style.id)}
            >
              {style.name}
            </button>
          ))}
        </div>
      )}

      {/* No locations indicator */}
      {locations.length === 0 && mapLoaded && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 z-10 text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-700 font-medium">No locations found</p>
          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Custom attribution */}
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

      {/* CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .mapboxgl-popup-content {
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 12px;
          font-family: inherit;
        }
        
        .mapboxgl-popup-close-button {
          font-size: 16px;
          color: #666;
          padding: 4px 8px;
        }
        
        .mapboxgl-ctrl-bottom-right {
          bottom: 70px !important; /* Move controls up to avoid overlap with mobile nav */
          right: 12px;
        }
        
        .mapboxgl-ctrl-group {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          border: none;
        }
        
        .mobile-popup .mapboxgl-popup-content {
          font-size: 16px;
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
