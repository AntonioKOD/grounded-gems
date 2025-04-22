/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SimpleMapProps {
  className?: string
  height?: string
  zoom?: number
  center?: [number, number]
}

export default function SimpleMap({
  className,
  height = "300px",
  zoom = 13,
  center = [40.7128, -74.006],
}: SimpleMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className={cn("bg-gray-100 flex items-center justify-center", className)} style={{ height }}>
        <div className="w-8 h-8 border-4 border-[#4ECDC4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // This is a simplified map component that doesn't use Leaflet
  // It's a placeholder that shows a basic map-like interface
  return (
    <div className={cn("relative bg-gray-100 overflow-hidden", className)} style={{ height }}>
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="border border-gray-200"></div>
        ))}
      </div>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute -top-1 -left-1 w-6 h-6 bg-[#FF6B6B] rounded-full opacity-30 animate-ping"></div>
          <div className="relative z-10 w-4 h-4 bg-[#FF6B6B] rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute bottom-2 right-2 text-xs text-gray-500">Map data placeholder</div>
    </div>
  )
}
