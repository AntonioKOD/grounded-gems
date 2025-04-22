"use client"

import { useState, useEffect } from "react"
import { MapPin } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function EventMap({ coordinates }: { coordinates: { lat: number; lng: number } }) {
  const [mapLoaded, setMapLoaded] = useState(false)

  // Simulate map loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapLoaded(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative h-full w-full bg-gray-100 rounded-lg overflow-hidden">
      {mapLoaded ? (
        <div className="h-full w-full">
          {/* This would be a real Map component in production */}
          <div className="relative h-full w-full bg-[#f8f8f8] overflow-hidden">
            {/* Simulated map with grid lines */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="border border-gray-200"></div>
              ))}
            </div>

            {/* Simulated marker */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 bg-[#FF6B6B] rounded-full opacity-30 animate-ping"></div>
                <div className="relative z-10 w-4 h-4 bg-[#FF6B6B] rounded-full flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
