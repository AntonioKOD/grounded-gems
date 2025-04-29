"use client"
import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { cn } from "@/lib/utils"
import type { Location } from "./map-data"

interface MapControlsProps {
  center: [number, number]
  zoom: number
  onMapMove: (center: [number, number], zoom: number) => void
  onMapClick: (latlng: { lat: number; lng: number }) => void
}

// Component to handle map events
function MapControls({ center, zoom, onMapMove, onMapClick }: MapControlsProps) {
  const map = useMap()

  // Update map when center or zoom props change
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  // Listen for map events
  useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      onMapMove([center.lat, center.lng], map.getZoom())
    },
    click: (e) => {
      onMapClick(e.latlng)
    },
  })

  return null
}

interface InteractiveMapProps {
  locations: Location[]
  userLocation: [number, number] | null
  center: [number, number]
  zoom: number
  onMarkerClickAction: (location: Location) => void
  onMapClickAction: (latlng: { lat: number; lng: number }) => void
  onMapMoveAction: (center: [number, number], zoom: number) => void
  searchRadius?: number
  className?: string
}

export default function InteractiveMap({
  locations,
  userLocation,
  center,
  zoom,
  onMarkerClickAction,
  onMapClickAction: onMapClickAction,
  onMapMoveAction: onMapMoveAction,
  searchRadius,
  className,
}: InteractiveMapProps) {
  const [isClient, setIsClient] = useState(false)

  // Fix for SSR
  useEffect(() => {
    setIsClient(true)

    // Fix Leaflet's default icon URLs
    delete (L.Icon.Default.prototype as { _getIconUrl?: () => void })._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/marker-icon-2x.png",
      iconUrl: "/marker-icon.png",
      shadowUrl: "/marker-shadow.png",
    })
  }, [])

  // Custom marker icon based on category
  const getMarkerIcon = (category: string) => {
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

  // Custom user location marker
  const userLocationIcon = L.divIcon({
    className: "user-location-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #4285F4;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: rgba(66, 133, 244, 0.2);
          animation: pulse 2s infinite;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  if (!isClient) {
    return (
      <div className={cn("bg-gray-100 flex items-center justify-center", className)} style={{ height: "100%" }}>
        <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className={cn("h-full w-full", className)}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        className="z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map controls */}
        <MapControls center={center} zoom={zoom} onMapMove={onMapMoveAction} onMapClick={onMapClickAction} />

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div className="p-2">
                <p className="font-medium">Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Location markers */}
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={getMarkerIcon(location.category)}
            eventHandlers={{
              click: () => onMarkerClickAction(location),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{location.name}</h3>
                <p className="text-xs text-gray-600">{location.category}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Search radius circle */}
        {searchRadius && (
          <Circle
            center={center}
            radius={searchRadius * 1000} // Convert km to meters
            pathOptions={{
              color: "#4ECDC4",
              fillColor: "#4ECDC4",
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "5, 5",
              opacity: 0.7,
            }}
          />
        )}
      </MapContainer>

      {/* Add CSS for the pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
        
        .leaflet-container {
          height: 100%;
          width: 100%;
          font-family: inherit;
          z-index: 10;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .leaflet-div-icon {
          background: transparent;
          border: none;
        }

        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
        }

        .leaflet-control-zoom a {
          border-radius: 4px !important;
          color: #555 !important;
        }

        .leaflet-control-zoom-in {
          border-bottom: 1px solid #f0f0f0 !important;
        }

        .leaflet-touch .leaflet-control-layers,
        .leaflet-touch .leaflet-bar {
          border: none !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </div>
  )
}
