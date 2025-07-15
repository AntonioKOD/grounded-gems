"use client"
import type { Location } from "./map-data"
import { memo, useState, useEffect, useRef } from "react"
import MapComponent from "./map-component"

// Note: CSS is loaded dynamically in the map component to prevent SSR issues

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
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  showMobilePreview?: boolean
  forceRefresh?: number
  mapPadding?: { top: number; right: number; bottom: number; left: number }
  isDetailModalOpen?: boolean
}

const LoadingComponent = () => (
  <div className="h-full w-full flex items-center justify-center bg-gray-100">
    <div className="text-center space-y-4">
      <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-sm text-gray-600">Loading map...</p>
      <p className="text-xs text-gray-500">Please wait while we initialize the map</p>
    </div>
  </div>
)

const InteractiveMap = memo(function InteractiveMap(props: InteractiveMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [mapKey, setMapKey] = useState(0) // Key to force remount if needed
  const mountedRef = useRef(false)

  useEffect(() => {
    setIsClient(true)
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Handle navigation scenarios - force remount if locations change significantly
  useEffect(() => {
    if (isClient && props.locations.length > 0) {
      // Check if we need to force a remount (e.g., after navigation)
      const shouldRemount = !mountedRef.current
      if (shouldRemount) {
        console.log('🗺️ Forcing map remount after navigation')
        setMapKey(prev => prev + 1)
        mountedRef.current = true
      }
    }
  }, [props.locations.length, isClient])

  if (!isClient) {
    return <LoadingComponent />
  }

  const handleMarkerClick = (location: Location) => {
    console.log("🗺️ InteractiveMap: Marker clicked:", location?.name);
    props.onMarkerClick(location);
  };

  // Wrap in a div to ensure proper container handling with navigation key
  return (
    <div className="w-full h-full relative" key={`map-${mapKey}`}>
      <MapComponent {...props} onMarkerClick={handleMarkerClick} mapPadding={props.mapPadding} />
    </div>
  )
})

export default InteractiveMap
