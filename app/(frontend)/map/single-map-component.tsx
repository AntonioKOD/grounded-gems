"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Layers, Info } from "lucide-react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

// Set Mapbox access token
// HARDCODED TOKEN FOR TESTING - REMOVE BEFORE PRODUCTION  
mapboxgl.accessToken = "pk.eyJ1IjoiYW50b25pby1rb2RoZWxpIiwiYSI6ImNtYTQ3bTlibTAyYTUyanBzem5qZGV1ZzgifQ.cSUliejFuQnIHZ-DDinPRQ"
// mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "your-access-token-here"

interface SimpleMapComponentProps {
  className?: string
  height?: string
  center?: [number, number]
  zoom?: number
  markers?: Array<{
    id: string
    latitude: number
    longitude: number
    title: string
  }>
  showControls?: boolean
  interactive?: boolean
  isBackground?: boolean
  locations?: Array<{
    id: string
    name: string
    latitude: number
    longitude: number
    category: string
  }>
}

export default function SimpleMapComponent({
  className,
  height = "100%",
  // Use [lng, lat] by default (Boston)
  center = [-71.0589, 42.3601],
  zoom = 12,
  markers = [],
  showControls = true,
  interactive = true,
  isBackground = false,
  locations = [],
}: SimpleMapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [styleId, setStyleId] = useState("streets-v12")
  const [showStyles, setShowStyles] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isWebGLSupported, setIsWebGLSupported] = useState(true)

  // Valid Mapbox style options
  const styles = [
    { id: "streets-v12", name: "Streets" },
    { id: "light-v11", name: "Light" },
    { id: "dark-v11", name: "Dark" },
    { id: "satellite-v9", name: "Satellite" },
    { id: "satellite-streets-v12", name: "Satellite Streets" },
    { id: "outdoors-v12", name: "Outdoors" },
  ]

  // Choose category color
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

  // Fix the issue with the map refreshing continuously by stabilizing the dependencies
  // and preventing unnecessary re-renders

  // Replace the map initialization useEffect with this:
  useEffect(() => {
    const initializeMap = () => {
      if (mapRef.current || !mapContainer.current || !isWebGLSupported) return

      try {
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: `mapbox://styles/mapbox/${styleId}`,
          center,
          zoom,
          interactive,
          attributionControl: !isBackground,
          projection: { name: "mercator" },
          renderWorldCopies: true,
        })

        // On initial load or after setStyle, re-enable layers & controls
        const onLoad = () => {
          setMapLoaded(true)

          // 3D buildings layer
          if (!isBackground && map.getStyle().sources.composite) {
            try {
              map.addLayer({
                id: "3d-buildings",
                source: "composite",
                "source-layer": "building",
                filter: ["==", "extrude", "true"],
                type: "fill-extrusion",
                minzoom: 10,
                paint: {
                  "fill-extrusion-color": "#aaa",
                  "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 10, 0, 15, ["get", "height"]],
                  "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 10, 0, 15, ["get", "min_height"]],
                  "fill-extrusion-opacity": 0.6,
                },
              })
            } catch (error) {
              console.warn("Could not add 3D buildings layer:", error)
            }
          }

          // Controls: zoom only, no compass
          if (interactive && showControls) {
            map.addControl(new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }), "top-right")
            map.addControl(new mapboxgl.FullscreenControl(), "top-right")
            map.addControl(
              new mapboxgl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
              }),
              "top-right",
            )
          }
        }

        map.on("load", onLoad)
        map.on("style.load", onLoad) // Also handle style changes
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

  // Replace the style change useEffect with this:
  // Use a ref to track if the style has been applied
  const styleAppliedRef = useRef(false)

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    // Only apply the style if it hasn't been applied yet
    if (!styleAppliedRef.current) {
      mapRef.current.setStyle(`mapbox://styles/mapbox/${styleId}`)
      styleAppliedRef.current = true
    }
  }, [styleId, mapLoaded])

  // Replace the markers useEffect with this:
  // Use a ref to track if markers have been added
  const markersAddedRef = useRef(false)

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || markersAddedRef.current) return

    // Only add markers once
    markersAddedRef.current = true

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Combine props
    const all = [
      ...markers.map((m) => ({ ...m, category: "Default" })),
      ...locations.map((l) => ({
        id: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        title: l.name,
        category: l.category,
      })),
    ]

    // Add markers
    all.forEach((m) => {
      const el = document.createElement("div")
      const color = getCategoryColor(m.category)
      el.className = "custom-marker"
      Object.assign(el.style, {
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        backgroundColor: color,
        border: "2px solid white",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        fontSize: "12px",
        cursor: "pointer",
        position: "relative",
      })
      el.innerHTML = m.category.charAt(0)

      // Pulse effect (requires CSS keyframes)
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

      // Popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2">
          <h3 class="font-bold text-sm">${m.title}</h3>
          <p class="text-xs text-gray-600">${m.category}</p>
        </div>
      `)

      // Add to map
      const marker = new mapboxgl.Marker(el).setLngLat([m.longitude, m.latitude]).setPopup(popup).addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [markers, locations, mapLoaded, getCategoryColor])

  // Style selector handlers
  const toggleStyleSelector = useCallback(() => setShowStyles((v) => !v), [])
  const selectStyle = useCallback((id: string) => {
    setStyleId(id)
    setShowStyles(false)
  }, [])

  // Then modify the return statement to use the state instead of direct check
  if (!isWebGLSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
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
    <div className={cn("relative rounded-lg overflow-hidden", className)} style={{ height }}>
      <div ref={mapContainer} className="h-full w-full" />

      {/* Style toggle */}
      {interactive && showControls && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-md bg-white shadow-md border-none hover:bg-gray-50"
            onClick={toggleStyleSelector}
          >
            <Layers className="h-4 w-4 text-[#FF6B6B]" />
          </Button>
        </div>
      )}

      {/* Style selector dropdown */}
      {showStyles && (
        <div className="absolute top-12 right-4 bg-white rounded-lg shadow-lg p-2 z-10">
          <div className="text-sm font-medium text-gray-700 mb-2 px-2">Map Style</div>
          {styles.map((s) => (
            <button
              key={s.id}
              className={cn(
                "block w-full px-3 py-1 text-left text-sm rounded",
                s.id === styleId ? "bg-[#FF6B6B]/20 text-[#FF6B6B] font-medium" : "hover:bg-gray-100",
              )}
              onClick={() => selectStyle(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Attribution & Branding */}
      {!isBackground && (
        <>
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 flex items-center z-10">
            <div className="w-6 h-6 rounded-full bg-[#FF6B6B] flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xs">GG</span>
            </div>
            <span className="text-sm font-medium text-gray-800">Grounded Gems</span>
          </div>

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
        </>
      )}

      {/* Global CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
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
        
        .mapboxgl-ctrl-group {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          border: none;
        }
      `}</style>
    </div>
  )
}
