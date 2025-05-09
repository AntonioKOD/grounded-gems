/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { addedLocations, searchLocations, type Location } from "./map-data"
import { locationMatchesCategories } from "./category-utils"
import MapComponent from "./map-component"
import LocationList from "./location-list"
import LocationDetail from "./location-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, X, List, MapIcon, Loader2 } from "lucide-react"

export default function MapExplorer() {
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.006]) // Default to NYC
  const [mapZoom, setMapZoom] = useState(12)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"map" | "list">("map")
  const [showDetail, setShowDetail] = useState(false)

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      try {
        setIsLoading(true)
        setError(null)

        console.log("Fetching locations...")
        const locations = await addedLocations()
        
        console.log(`Fetched ${locations.length} locations:`, locations)

        setAllLocations(locations)
        setFilteredLocations(locations)

        // Extract unique categories
        const uniqueCategories: Map<string, any> = new Map()
        locations.forEach((loc) => {
          if (loc.categories && Array.isArray(loc.categories)) {
            loc.categories.forEach((cat: string | { id: string; name?: string }) => {
              if (typeof cat === "string") {
                uniqueCategories.set(cat, { id: cat, name: cat })
              } else if (cat && cat.id) {
                uniqueCategories.set(cat.id, cat)
              }
            })
          }
        })

        const categoryArray = Array.from(uniqueCategories.values())
        console.log("Extracted categories:", categoryArray)
        setCategories(categoryArray)

        // Set initial map center based on first location with valid coordinates
        for (const loc of locations) {
          let lat, lng

          if (loc.latitude != null && loc.longitude != null) {
            lat = Number(loc.latitude)
            lng = Number(loc.longitude)
          } else if (loc.coordinates?.latitude != null && loc.coordinates?.longitude != null) {
            lat = Number(loc.coordinates.latitude)
            lng = Number(loc.coordinates.longitude)
          }

          if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
            console.log(`Setting initial map center to [${lat}, ${lng}] from location "${loc.name}"`)
            setMapCenter([lat, lng])
            break
          }
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error loading locations:", err)
        setError("Failed to load locations. Please try again.")
        setIsLoading(false)
      }
    }

    loadLocations()

    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
          console.log("Got user location:", userCoords)
          setUserLocation(userCoords)
        },
        (err) => {
          console.warn("Error getting user location:", err)
        },
      )
    }
  }, [])

  // Filter locations when search or categories change
  useEffect(() => {
    if (!allLocations.length) return

    let results = allLocations

    // Apply search filter
    if (searchQuery) {
      results = searchLocations(results, searchQuery)
      console.log(`Search for "${searchQuery}" returned ${results.length} results`)
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      results = results.filter((loc) => locationMatchesCategories(loc, selectedCategories))
      console.log(`Category filter returned ${results.length} results`)
    }

    setFilteredLocations(results)

    // Reset selected location if it's no longer in filtered results
    if (selectedLocation && !results.find((loc) => loc.id === selectedLocation.id)) {
      setSelectedLocation(null)
      setShowDetail(false)
    }
  }, [searchQuery, selectedCategories, allLocations, selectedLocation])

  // Handle location selection
  const handleLocationSelect = (location: Location) => {
    console.log("Selected location:", location)
    setSelectedLocation(location)
    setShowDetail(true)

    // Center map on selected location
    let lat, lng

    if (location.latitude != null && location.longitude != null) {
      lat = Number(location.latitude)
      lng = Number(location.longitude)
    } else if (location.coordinates?.latitude != null && location.coordinates?.longitude != null) {
      lat = Number(location.coordinates.latitude)
      lng = Number(location.coordinates.longitude)
    }

    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      console.log(`Centering map on [${lat}, ${lng}]`)
      setMapCenter([lat, lng])
    }
  }

  // Handle map click
  const handleMapClick = () => {
    // Close detail view when clicking on map
    if (showDetail) {
      setShowDetail(false)
    }
  }

  // Handle map move
  const handleMapMove = (center: [number, number], zoom: number) => {
    setMapCenter(center)
    setMapZoom(zoom)
  }

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery("")
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategories([])
  }

  // Close detail view
  const closeDetail = () => {
    setShowDetail(false)
    setSelectedLocation(null)
  }

  // Handle tab change
  const handleViewChange = (value: string) => {
    setActiveView(value as "map" | "list")
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <X className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-500 max-w-md mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and filters */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="whitespace-nowrap"
            disabled={!searchQuery && selectedCategories.length === 0}
          >
            Clear Filters
          </Button>
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center space-x-2 bg-white border rounded-full px-3 py-1 text-sm cursor-pointer hover:bg-gray-50"
              >
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Mobile view selector */}
      <div className="md:hidden border-b">
        <Tabs value={activeView} onValueChange={handleViewChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="map" className="flex-1">
              <MapIcon className="h-4 w-4 mr-2" />
              Map
            </TabsTrigger>
            <TabsTrigger value="list" className="flex-1">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map view */}
        <div className={`${activeView === "map" ? "block" : "hidden"} md:block flex-1 relative h-full`}>
          <MapComponent
            locations={filteredLocations}
            userLocation={userLocation}
            center={mapCenter}
            zoom={mapZoom}
            onMarkerClick={handleLocationSelect}
            onMapClick={handleMapClick}
            onMapMove={handleMapMove}
            className="h-full w-full"
          />
        </div>

        {/* List view */}
        <div
          className={`${
            activeView === "list" ? "block" : "hidden"
          } md:block w-full md:w-96 border-l overflow-hidden flex-shrink-0`}
        >
          <LocationList
            locations={filteredLocations}
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
            isLoading={isLoading}
          />
        </div>

        {/* Detail panel */}
        {showDetail && selectedLocation && (
          <div className="absolute inset-0 md:relative md:inset-auto md:w-96 bg-white z-10 md:border-l overflow-auto">
            <LocationDetail location={selectedLocation} onCloseAction={closeDetail} />
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-[#FF6B6B] animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Loading locations...</p>
          </div>
        </div>
      )}
    </div>
  )
}
