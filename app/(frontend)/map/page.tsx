"use client"

import MapExplorer from './map-explorer'

// Prevent static generation
export const dynamic = 'force-dynamic' 

export default function MapPage() {
  return (
    <div className="fullscreen-with-navbar bg-white overflow-hidden">
      <MapExplorer />
    </div>
  )
}
