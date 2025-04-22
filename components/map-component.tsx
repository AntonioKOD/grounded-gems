"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

// Sample event data for map markers
const EVENTS = [
  { id: 1, lat: 40.7128, lng: -74.006, title: "NYC Music Festival", category: "Music" },
  { id: 2, lat: 40.7138, lng: -74.013, title: "Central Park Art Show", category: "Art" },
  { id: 3, lat: 40.7118, lng: -74.009, title: "Food & Wine Festival", category: "Food" },
  { id: 4, lat: 40.7148, lng: -74.003, title: "Tech Conference 2023", category: "Tech" },
  { id: 5, lat: 40.7108, lng: -74.016, title: "Yoga in the Park", category: "Wellness" },
  { id: 6, lat: 40.7158, lng: -74.008, title: "Comedy Night", category: "Entertainment" },
]

interface MapComponentProps {
  className?: string
  height?: string
  zoom?: number
  center?: [number, number]
  events?: Array<{
    id: number
    lat: number
    lng: number
    title: string
    category: string
  }>
}

// Create a placeholder component for when the map is loading
const MapPlaceholder = ({ height }: { height: string }) => (
  <div className="h-full w-full flex items-center justify-center bg-gray-100" style={{ height }}>
    <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
  </div>
)

// Create a client-side only version of the map component
function MapWithNoSSR({
  className,
  height = "75vh",
  zoom = 13,
  center = [40.7128, -74.006],
  events = EVENTS,
}: MapComponentProps) {
  // Removed unused selectedEvent state
  const mapRef = useRef(null)
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false)
  const [leafletModules, setLeafletModules] = useState<{
    MapContainer: typeof import("react-leaflet").MapContainer
    TileLayer: typeof import("react-leaflet").TileLayer
    Marker: typeof import("react-leaflet").Marker
    Popup: typeof import("react-leaflet").Popup
    L: typeof import("leaflet")
  } | null>(null)

  // Load Leaflet modules
  useEffect(() => {
    async function loadLeaflet() {
      try {
        // Import CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement("link")
            link.rel = "stylesheet"
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            link.crossOrigin = ""
            document.head.appendChild(link)
          }

        // Import modules
        const leaflet = await import("leaflet")
        const reactLeaflet = await import("react-leaflet")

        // Fix Leaflet marker icon issue
        // Removed unnecessary deletion of _getIconUrl as it is not required
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: "/marker-icon-2x.png",
          iconUrl: "/marker-icon.png",
          shadowUrl: "/marker-shadow.png",
        })

        setLeafletModules({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          L: leaflet,
        })

        setIsLeafletLoaded(true)
      } catch (error) {
        console.error("Error loading Leaflet:", error)
      }
    }

    loadLeaflet()
  }, [])

  // If Leaflet isn't loaded yet, show a loading placeholder
  if (!isLeafletLoaded || !leafletModules) {
    return <MapPlaceholder height={height} />
  }

  // Custom marker icon based on category
  const getMarkerIcon = (category: string) => {
    const { L } = leafletModules

    const colors: Record<string, string> = {
      Music: "#FF6B6B",
      Art: "#4ECDC4",
      Food: "#FFE66D",
      Tech: "#6B66FF",
      Wellness: "#66FFB4",
      Entertainment: "#FF66E3",
      Default: "#FF6B6B",
    }

    const color = colors[category] || colors.Default

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">
          ${category.charAt(0)}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })
  }

  const { MapContainer, TileLayer, Marker, Popup } = leafletModules

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%", zIndex: 1 }} ref={mapRef}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={getMarkerIcon(event.category)}
            eventHandlers={{
              click: () => {
                // Removed unused selectedEvent state update
              },
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-sm">{event.title}</h3>
                <p className="text-xs text-gray-600">{event.category}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

// Create a wrapper component that dynamically imports the map component
const MapComponent = dynamic(() => Promise.resolve(MapWithNoSSR), {
  ssr: false,
  loading: () => <MapPlaceholder height="75vh" />,
})

export default MapComponent
