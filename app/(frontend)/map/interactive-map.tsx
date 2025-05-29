"use client"
import type { Location } from "./map-data"
import dynamic from "next/dynamic"
import { memo } from "react"

// Import mapboxgl CSS
import "mapbox-gl/dist/mapbox-gl.css"

// We'll use a proper dynamic import approach for mapbox-gl
// This component will only be rendered on the client side
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
})

interface InteractiveMapProps {
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
  selectedLocation?: Location | null
  onViewDetail?: (location: Location) => void
}

const InteractiveMap = memo(function InteractiveMap(props: InteractiveMapProps) {
  // Wrap in a div to ensure proper container handling
  return (
    <div className="w-full h-full relative">
      <MapComponent {...props} />
    </div>
  )
})

export default InteractiveMap
