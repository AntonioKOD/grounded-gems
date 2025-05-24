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
      <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
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
}

const InteractiveMap = memo(function InteractiveMap(props: InteractiveMapProps) {
  return <MapComponent {...props} />
})

export default InteractiveMap
