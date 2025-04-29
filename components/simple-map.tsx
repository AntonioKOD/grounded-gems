"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { cn } from "@/lib/utils"

export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  category?: string
  description?: string
}

interface SimpleMapProps {
  locations: Location[]
  center?: [number, number]
  zoom?: number
  height?: string
  className?: string
  isBackground?: boolean // Flag for when used as background
  showControls?: boolean
  interactive?: boolean
}

export default function SimpleMap({
  locations,
  center = [40.7128, -74.006], // Default to NYC
  zoom = 12,
  height = "300px",
  className,
  isBackground = false,
  showControls = true,
  interactive = true,
}: SimpleMapProps) {
  const [isClient, setIsClient] = useState(false)

  // Fix for SSR
  useEffect(() => {
    setIsClient(true)

    // Fix Leaflet's default icon URLs
    delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/marker-icon-2x.png",
      iconUrl: "/marker-icon.png",
      shadowUrl: "/marker-shadow.png",
    })
  }, [])

  // Filter out any entries without valid numeric coords
  const validLocations = locations.filter(
    (loc): loc is Location => Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
  )

  // Custom marker icon based on category
  const getMarkerIcon = (category?: string) => {
    const colors: Record<string, string> = {
      Music: "#FF6B6B",
      Art: "#4ECDC4",
      Food: "#FFE66D",
      Tech: "#6B66FF",
      Wellness: "#66FFB4",
      Entertainment: "#FF66E3",
      Default: "#FF6B6B",
    }

    const color = category && colors[category] ? colors[category] : colors.Default

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
          animation: pulse 2s infinite;
        ">
          ${category ? category.charAt(0) : "L"}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    })
  }

  if (!isClient) {
    return (
      <div className={cn("bg-gray-100 flex items-center justify-center", className)} style={{ height }}>
        <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={showControls}
        attributionControl={!isBackground}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        scrollWheelZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
      >
        <TileLayer
          attribution={!isBackground ? "&copy; OpenStreetMap contributors" : ""}
          url={
            isBackground
              ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // Lighter style for background
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          opacity={isBackground ? 0.7 : 1}
        />
        {validLocations.map((loc) => (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={getMarkerIcon(loc.category)}>
            <Popup className="custom-popup">
              <div className="p-1">
                <h3 className="font-bold text-sm text-gray-900">{loc.name}</h3>
                {loc.description && <p className="text-xs text-gray-600 mt-1">{loc.description}</p>}
                {loc.category && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-xs rounded-full text-gray-700">
                    {loc.category}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        {showControls && !isBackground && <ZoomControl position="bottomright" />}
      </MapContainer>

      {/* Overlay for background use */}
      {isBackground && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/60 pointer-events-none" />
      )}

      {/* Add CSS for the pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .custom-popup .leaflet-popup-tip {
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .leaflet-container {
          font-family: inherit;
        }
        
        .leaflet-control-attribution {
          font-size: 9px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
}
