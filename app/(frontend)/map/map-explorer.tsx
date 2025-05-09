/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { cn } from "@/lib/utils"

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
import { Search, X, List, MapIcon, Loader2, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

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

    // On mobile, switch to map view when selecting a location
    if (isMobile && activeView === "list") {
      setActiveView("map")
    }

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

    // Close search on mobile when clicking map
    if (isMobile && isSearchExpanded) {
      setIsSearchExpanded(false)
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

    // Close detail view when switching to list on mobile
    if (isMobile && value === "list" && showDetail) {
      setShowDetail(false)
    }
  }

  // Toggle search expansion on mobile
  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <X className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-500 max-w-md mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with search */}
      <div
        className={cn(
          "border-b bg-white shadow-sm transition-all duration-200",
          isMobile && isSearchExpanded ? "p-4 pb-6" : "p-4",
        )}
      >
        <div className="flex items-center gap-2">
          {isMobile ? (
            <>
              {isSearchExpanded ? (
                <div className="w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search locations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 border-gray-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={toggleSearch}
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="icon" className="border-gray-200" onClick={toggleSearch}>
                    <Search className="h-4 w-4 text-gray-500" />
                  </Button>
                  <h1 className="text-lg font-semibold flex-1 text-center">Grounded Gems</h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "border-gray-200",
                          selectedCategories.length > 0 && "bg-[#FF6B6B]/10 border-[#FF6B6B]",
                        )}
                      >
                        <Filter
                          className={cn("h-4 w-4", selectedCategories.length > 0 ? "text-[#FF6B6B]" : "text-gray-500")}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {categories.map((category) => (
                          <DropdownMenuItem
                            key={category.id}
                            className="flex items-center gap-2 cursor-pointer"
                            onSelect={(e) => {
                              e.preventDefault()
                              toggleCategory(category.id)
                            }}
                          >
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={() => toggleCategory(category.id)}
                            />
                            <span>{category.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      {selectedCategories.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="justify-center text-[#FF6B6B] font-medium cursor-pointer"
                            onSelect={(e) => {
                              e.preventDefault()
                              clearFilters()
                            }}
                          >
                            Clear All Filters
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </>
          ) : (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 border-gray-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/10"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "border-gray-200",
                      selectedCategories.length > 0 && "bg-[#FF6B6B]/10 border-[#FF6B6B]",
                    )}
                  >
                    <Filter
                      className={cn("h-4 w-4", selectedCategories.length > 0 ? "text-[#FF6B6B]" : "text-gray-500")}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {categories.map((category) => (
                      <DropdownMenuItem
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer"
                        onSelect={(e) => {
                          e.preventDefault()
                          toggleCategory(category.id)
                        }}
                      >
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                        <span>{category.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  {selectedCategories.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="justify-center text-[#FF6B6B] font-medium cursor-pointer"
                        onSelect={(e) => {
                          e.preventDefault()
                          clearFilters()
                        }}
                      >
                        Clear All Filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Active filters */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedCategories.map((categoryId) => {
              const category = categories.find((c) => c.id === categoryId)
              return (
                <Badge
                  key={categoryId}
                  variant="secondary"
                  className="bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20 border-none"
                >
                  {category?.name || categoryId}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleCategory(categoryId)} />
                </Badge>
              )
            })}
            <Button
              variant="link"
              className="text-xs text-gray-500 h-5 px-2 hover:text-[#FF6B6B]"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* List view - now on the left */}
        <div
          className={`${
            activeView === "list" ? "block" : "hidden"
          } md:block w-full md:w-96 border-r overflow-hidden flex-shrink-0 bg-white z-10`}
        >
          <LocationList
            locations={filteredLocations}
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
            isLoading={isLoading}
          />
        </div>

        {/* Map view */}
        <div className={`${activeView === "map" ? "block" : "hidden"} md:block flex-1 relative h-full`}>
          <MapComponent
            locations={filteredLocations}
            userLocation={userLocation}
            center={mapCenter}
            zoom={mapZoom}
            onMarkerClickAction={handleLocationSelect}
            onMapClickAction={handleMapClick}
            onMapMoveAction={handleMapMove}
            className="h-full w-full"
            selectedLocation={selectedLocation}
          />
        </div>

        {/* Detail panel */}
        {showDetail && selectedLocation && (
          <div className="absolute inset-0 md:relative md:inset-auto md:w-96 bg-white z-30 md:border-l overflow-auto">
            <LocationDetail location={selectedLocation} onCloseAction={closeDetail} />
          </div>
        )}
      </div>

      {/* Mobile view selector */}
      <div className="md:hidden border-t bg-white sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Tabs value={activeView} onValueChange={handleViewChange} className="w-full">
          <TabsList className="w-full grid grid-cols-2 p-1">
            <TabsTrigger value="map" className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white py-3">
              <MapIcon className="h-5 w-5 mr-2" />
              Map
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white py-3">
              <List className="h-5 w-5 mr-2" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg">
            <Loader2 className="h-10 w-10 text-[#FF6B6B] animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Loading locations...</p>
          </div>
        </div>
      )}
    </div>
  )
}
