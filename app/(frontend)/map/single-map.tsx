"use client"

import dynamic from "next/dynamic"

// Import the actual map component dynamically to avoid SSR issues
const SimpleMapComponent = dynamic(() => import("./single-map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="w-8 h-8 border-4 border-[#4ECDC4] border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
})

interface SimpleMapProps {
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

export default function SimpleMap(props: SimpleMapProps) {
  return <SimpleMapComponent {...props} />
}
