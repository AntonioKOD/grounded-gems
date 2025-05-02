"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, MapPin, X, ChevronLeft, ChevronRight, Compass, Circle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import InteractiveMap from "./interactive-map"
import LocationList from "./location-list"
import LocationDetail from "./location-detail"
import { mockLocations, searchLocations, type Location } from "./map-data"
import Link from "next/link"

export default function MapExplorer() {
  // State for search and locations
  const [searchQuery, setSearchQuery] = useState("")
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [locations] = useState<Location[]>(mockLocations)
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(mockLocations)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.006]) // Default to NYC
  const [mapZoom, setMapZoom] = useState(13)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<"text" | "area">("text")
  const [radiusKm, setRadiusKm] = useState(5)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState("streets-v12")

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          // Optionally center map on user location
          // setMapCenter([latitude, longitude])
        },
        (error) => {
          console.error("Error getting user location:", error)
          setErrorMessage("Unable to access your location. Using default location instead.")
          // Keep the default location
        },
      )
    } else {
      setErrorMessage("Geolocation is not supported by your browser. Using default location instead.")
    }
  }, [])

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    // Generate search suggestions (in a real app, this would call an API)
    if (query.length > 2) {
      // Simulate API call delay
      setIsLoading(true)
      setTimeout(() => {
        const suggestions = mockLocations
          .filter(
            (loc) =>
              loc.name.toLowerCase().includes(query.toLowerCase()) ||
              loc.address.toLowerCase().includes(query.toLowerCase()),
          )
          .map((loc) => loc.name)
          .slice(0, 5)
        setSearchSuggestions(suggestions)
        setIsLoading(false)
      }, 300)
    } else {
      setSearchSuggestions([])
    }
  }

  // Handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (searchQuery.trim() === "") {
      setFilteredLocations(locations)
      return
    }

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      const results = searchLocations(locations, searchQuery)
      setFilteredLocations(results)

      // Center map on first result if available
      if (results.length > 0) {
        setMapCenter([results[0].latitude, results[0].longitude])
        setMapZoom(14)
      }

      setIsLoading(false)
      setSearchSuggestions([])
    }, 500)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSearchSuggestions([])

    // Trigger search
    const results = searchLocations(locations, suggestion)
    setFilteredLocations(results)

    // Center map on first result if available
    if (results.length > 0) {
      setMapCenter([results[0].latitude, results[0].longitude])
      setMapZoom(14)
    }
  }

  // Handle marker click
  const handleMarkerClick = (location: Location) => {
    setSelectedLocation(location)
    setIsDetailOpen(true)
  }

  // Handle area search
  const handleAreaSearch = (center: [number, number], radiusInKm: number) => {
    // Filter locations within the radius
    const filtered = locations.filter((location) => {
      const distance = calculateDistance(center[0], center[1], location.latitude, location.longitude)
      return distance <= radiusInKm
    })

    setFilteredLocations(filtered)
  }

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
  }

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180)
  }

  // Handle category filter change
  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories)

    // Apply category filter
    if (categories.length === 0) {
      // If no categories selected, show all locations
      setFilteredLocations(locations)
    } else {
      // Filter locations by selected categories
      const filtered = locations.filter((location) => categories.includes(location.category))
      setFilteredLocations(filtered)
    }
  }

  // Handle map style change
  const handleMapStyleChange = (style: string) => {
    setMapStyle(style)
  }

  // Get unique categories from locations
  const categories = Array.from(new Set(locations.map((loc) => loc.category)))

  return (
    <div className="flex flex-col h-screen">
      {/* Header with back button and title */}
      <header className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
              <ChevronLeft className="h-5 w-5 mr-1" />
              <span>Back</span>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Explore Map</h1>
          </div>

          <div className="flex items-center gap-2">
            {userLocation && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setMapCenter(userLocation)
                  setMapZoom(15)
                }}
                title="Center on my location"
              >
                <Compass className="h-4 w-4 text-[#4ECDC4]" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        {/* Mobile View Controls */}
        <div className="md:hidden fixed bottom-4 left-0 right-0 z-40 flex justify-center">
          <div className="bg-white rounded-full shadow-lg p-1.5 flex space-x-1.5">
            <Button
              variant={!isSidebarOpen && !isDetailOpen ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full h-10 px-4",
                !isSidebarOpen && !isDetailOpen ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90" : "",
              )}
              onClick={() => {
                setIsSidebarOpen(false)
                setIsDetailOpen(false)
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Map
            </Button>
            <Button
              variant={isSidebarOpen ? "default" : "outline"}
              size="sm"
              className={cn("rounded-full h-10 px-4", isSidebarOpen ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90" : "")}
              onClick={() => {
                setIsSidebarOpen(true)
                setIsDetailOpen(false)
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {selectedLocation && (
              <Button
                variant={isDetailOpen ? "default" : "outline"}
                size="sm"
                className={cn("rounded-full h-10 px-4", isDetailOpen ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90" : "")}
                onClick={() => {
                  setIsSidebarOpen(false)
                  setIsDetailOpen(true)
                }}
              >
                <Info className="h-4 w-4 mr-2" />
                Details
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div
          className={cn(
            "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
            "md:w-full md:max-w-md",
            "fixed md:relative inset-0 h-[calc(100%-4rem)] md:h-auto pt-0 pb-16 md:pb-0", // Add padding at bottom for mobile nav
            isSidebarOpen
              ? "translate-x-0 z-30"
              : "translate-x-[-100%] md:translate-x-0 md:w-0 md:max-w-0 md:opacity-0 md:overflow-hidden z-0 md:z-10",
          )}
        >
          {/* Search and filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4 md:hidden">
              <h2 className="text-lg font-bold">Search & Filters</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <Tabs defaultValue="text" onValueChange={(value) => setSearchMode(value as "text" | "area")}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="text">Text Search</TabsTrigger>
                <TabsTrigger value="area">Area Search</TabsTrigger>
              </TabsList>

              {searchMode === "text" ? (
                <div className="space-y-4">
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search locations or events..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pr-10 h-10" // Increase height for better touch target
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="absolute right-0 top-0 h-full rounded-l-none bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                    >
                      <Search className="h-4 w-4 text-white" />
                    </Button>

                    {/* Search suggestions */}
                    {searchSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center" // Increase padding for touch
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <MapPin className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </form>

                  <div>
                    <p className="text-sm font-medium mb-2">Filter by Category</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <Badge
                          key={category}
                          variant={selectedCategories.includes(category) ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer py-1.5", // Increase padding for touch
                            selectedCategories.includes(category)
                              ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/80"
                              : "hover:bg-gray-100",
                          )}
                          onClick={() => {
                            if (selectedCategories.includes(category)) {
                              setSelectedCategories(selectedCategories.filter((c) => c !== category))
                            } else {
                              setSelectedCategories([...selectedCategories, category])
                            }
                            handleCategoryChange(
                              selectedCategories.includes(category)
                                ? selectedCategories.filter((c) => c !== category)
                                : [...selectedCategories, category],
                            )
                          }}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Map Style</p>
                    <Select value={mapStyle} onValueChange={handleMapStyleChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select map style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="streets-v12">Streets</SelectItem>
                        <SelectItem value="light-v11">Light</SelectItem>
                        <SelectItem value="dark-v11">Dark</SelectItem>
                        <SelectItem value="outdoors-v12">Outdoors</SelectItem>
                        <SelectItem value="satellite-v9">Satellite</SelectItem>
                        <SelectItem value="satellite-streets-v12">Satellite Streets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Search Radius</p>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[radiusKm]}
                        min={1}
                        max={50}
                        step={1}
                        onValueChange={(value) => setRadiusKm(value[0])}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-16 text-right">{radiusKm} km</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Search from map center</p>
                    <Button
                      onClick={() => handleAreaSearch(mapCenter, radiusKm)}
                      className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                    >
                      <Circle className="h-4 w-4 mr-2" />
                      Apply Radius
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Click on the map to set the center point for your area search, then click &quot;Apply Radius&quot; to find
                      locations within the specified radius.
                    </p>
                  </div>
                </div>
              )}
            </Tabs>
          </div>

          {/* Location list */}
          <div className="flex-1 overflow-y-auto">
            <LocationList
              locations={filteredLocations}
              onLocationSelect={(location) => {
                handleMarkerClick(location)
                // On mobile, switch to detail view when a location is selected
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(false)
                  setIsDetailOpen(true)
                }
              }}
              selectedLocation={selectedLocation}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Location detail panel */}
        <div
          className={cn(
            "bg-white border-l border-gray-200 transition-all duration-300",
            "md:w-full md:max-w-md",
            "fixed md:relative inset-0 h-[calc(100%-4rem)] md:h-auto pt-0 pb-16 md:pb-0", // Add padding at bottom for mobile nav
            isDetailOpen
              ? "translate-x-0 z-30"
              : "translate-x-[100%] md:translate-x-0 md:w-0 md:max-w-0 md:opacity-0 md:overflow-hidden z-0 md:z-10",
          )}
        >
          {selectedLocation && (
            <LocationDetail
              location={selectedLocation}
              onCloseAction={() => {
                setIsDetailOpen(false)
                setSelectedLocation(null)
                // On mobile, go back to map view when closing details
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(false)
                }
              }}
            />
          )}
        </div>

        {/* Map container */}
        <div className="flex-1 relative h-full">
          <InteractiveMap
            locations={filteredLocations}
            userLocation={userLocation}
            center={mapCenter}
            zoom={mapZoom}
            mapStyle={mapStyle}
            onMarkerClick={(location) => {
              handleMarkerClick(location)
              // On mobile, switch to detail view when a marker is clicked
              if (window.innerWidth < 768) {
                setIsSidebarOpen(false)
                setIsDetailOpen(true)
              }
            }}
            onMapClick={(latlng) => setMapCenter([latlng.lat, latlng.lng])}
            onMapMove={(center, zoom) => {
              setMapCenter(center)
              setMapZoom(zoom)
            }}
            searchRadius={searchMode === "area" ? radiusKm : undefined}
          />

          {/* Toggle sidebar button (desktop) */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 left-4 rounded-full bg-white shadow-md hidden md:flex z-20"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {/* Mobile search button */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute top-4 left-4 rounded-full bg-white shadow-md md:hidden z-20",
              isSidebarOpen || isDetailOpen ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
            onClick={() => {
              setIsSidebarOpen(true)
              setIsDetailOpen(false)
            }}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Error message */}
          {errorMessage && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-md shadow-md px-4 py-2 border-l-4 border-amber-500 flex items-center z-20">
              <span className="text-sm text-gray-700">{errorMessage}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setErrorMessage(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
