import MapExplorer from "./map-explorer"

export const metadata = {
  title: "Explore Map | Local Explorer",
  description: "Discover events and locations near you with our interactive map",
}

export default function MapPage() {
  return (
    <div className="min-h-screen h-screen bg-white">
      <MapExplorer />
    </div>
  )
}
