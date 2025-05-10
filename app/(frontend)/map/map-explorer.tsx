/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { cn } from "@/lib/utils"

import { useState, useEffect, useRef, useCallback } from "react"
import { addedLocations, searchLocations, type Location } from "./map-data"
import { locationMatchesCategories } from "./category-utils"
import MapComponent from "./map-component"
import LocationList from "./location-list"
import LocationDetail from "./location-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, X, List, MapIcon, Loader2, Filter, ArrowLeft, Maximize2, Minimize2 } from "lucide-react"
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
  const [showMobileList, setShowMobileList] = useState(false)
  const [listHeight, setListHeight] = useState<"partial" | "full">("partial")
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [previewLocation, setPreviewLocation] = useState<Location | null>(null)

  // Refs for container elements
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const detailContainerRef = useRef<HTMLDivElement>(null)
  const mobileListRef = useRef<HTMLDivElement>(null)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)

      // Reset mobile-specific states when switching between mobile and desktop
      if (!isMobileDevice) {
        setShowMobileList(false)
        setListHeight("partial")
        setShowMobilePreview(false)
        setPreviewLocation(null)
      }
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
      setPreviewLocation(null)
      setShowMobilePreview(false)
    }
  }, [searchQuery, selectedCategories, allLocations, selectedLocation])

  // Handle location selection
  const handleLocationSelect = useCallback(
    (location: Location) => {
      console.log("Selected location:", location)

      // On mobile, show preview first
      if (isMobile) {
        setPreviewLocation(location)
        setShowMobilePreview(true)

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
          setMapZoom(15) // Zoom in a bit more on mobile for better visibility

          // Switch to map view when a location is selected on mobile list view
          if (activeView === "list") {
            setActiveView("map")

            // Add a small delay to allow the view to switch before showing the preview
            setTimeout(() => {
              setShowMobilePreview(true)
            }, 300)
          }
        }

        // Hide the list drawer if it's showing
        if (showMobileList) {
          setShowMobileList(false)
        }

        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      } else {
        // On desktop, go directly to detail view
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
    },
    [isMobile, showMobileList, activeView],
  )

  // Handle view details from preview
  const handleViewDetails = useCallback(() => {
    if (previewLocation) {
      setSelectedLocation(previewLocation)
      setShowDetail(true)
      setShowMobilePreview(false)
    }
  }, [previewLocation])

  // Handle map click
  const handleMapClick = useCallback(() => {
    // Close detail view when clicking on map
    if (showDetail) {
      setShowDetail(false)
      setSelectedLocation(null)
    }

    // Close search on mobile when clicking map
    if (isMobile && isSearchExpanded) {
      setIsSearchExpanded(false)
    }

    // Close mobile list drawer when clicking on map
    if (isMobile && showMobileList) {
      setShowMobileList(false)
    }

    // Close mobile preview when clicking on map
    if (isMobile && showMobilePreview) {
      setShowMobilePreview(false)
      setPreviewLocation(null)
    }
  }, [showDetail, isMobile, isSearchExpanded, showMobileList, showMobilePreview])

  // Handle map move
  const handleMapMove = useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center)
    setMapZoom(zoom)
  }, [])

  // Toggle category selection
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }, [])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("")
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setSelectedCategories([])
  }, [])

  // Close detail view
  const closeDetail = useCallback(() => {
    setShowDetail(false)
    setSelectedLocation(null)
  }, [])

  // Close mobile preview
  const closeMobilePreview = useCallback(() => {
    setShowMobilePreview(false)
    setPreviewLocation(null)
  }, [])

  // Handle tab change
  const handleViewChange = useCallback(
    (value: string) => {
      setActiveView(value as "map" | "list")

      // Close detail view when switching to list on mobile
      if (isMobile && value === "list" && showDetail) {
        setShowDetail(false)
      }

      // Close mobile preview when switching views
      if (isMobile && showMobilePreview) {
        setShowMobilePreview(false)
        setPreviewLocation(null)
      }

      // Close mobile list drawer when switching to list view
      if (isMobile && value === "list" && showMobileList) {
        setShowMobileList(false)
      }

      // Add haptic feedback if available
      if (isMobile && navigator.vibrate) {
        navigator.vibrate(50)
      }
    },
    [isMobile, showDetail, showMobilePreview, showMobileList],
  )

  // Toggle search expansion on mobile
  const toggleSearch = useCallback(() => {
    setIsSearchExpanded(!isSearchExpanded)
  }, [isSearchExpanded])

  // Toggle mobile list drawer
  const toggleMobileList = useCallback(() => {
    setShowMobileList((prev) => !prev)

    // Close mobile preview when toggling list
    if (showMobilePreview) {
      setShowMobilePreview(false)
      setPreviewLocation(null)
    }
  }, [showMobilePreview])

  // Toggle list height between partial and full
  const toggleListHeight = useCallback(() => {
    setListHeight((prev) => (prev === "partial" ? "full" : "partial"))
  }, [])

  // Handle touch events for mobile list drawer
  useEffect(() => {
    if (!isMobile || !mobileListRef.current) return

    let startY = 0
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let currentHeight = 0

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      currentHeight = mobileListRef.current?.offsetHeight || 0
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!mobileListRef.current) return

      const deltaY = e.touches[0].clientY - startY
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const windowHeight = window.innerHeight

      // If dragging down and list is in full mode, or dragging up and list is in partial mode
      if ((deltaY > 50 && listHeight === "full") || (deltaY < -50 && listHeight === "partial")) {
        e.preventDefault()
        toggleListHeight()
        startY = e.touches[0].clientY
      }
    }

    const element = mobileListRef.current
    element.addEventListener("touchstart", handleTouchStart)
    element.addEventListener("touchmove", handleTouchMove)

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchmove", handleTouchMove)
    }
  }, [isMobile, listHeight, toggleListHeight])

  // Add orientation change handling
  useEffect(() => {
    const handleOrientationChange = () => {
      // Recalculate layout on orientation change
      if (isMobile) {
        // Close any open panels that might cause layout issues
        if (showMobileList) {
          setShowMobileList(false)
        }

        // Reset list height to partial on orientation change
        setListHeight("partial")

        // Force map to recalculate size
        if (mapContainerRef.current) {
          const event = new Event("resize")
          window.dispatchEvent(event)
        }
      }
    }

    window.addEventListener("orientationchange", handleOrientationChange)

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange)
    }
  }, [isMobile, showMobileList])

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
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-gray-50">
      {/* Header with search */}
      <div
        className={cn(
          "border-b bg-white shadow-sm transition-all duration-200 z-20 sticky top-0",
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
        {/* Desktop list view - always on the left on desktop */}
        {!isMobile && (
          <div
            ref={listContainerRef}
            className="hidden md:block w-96 border-r overflow-hidden flex-shrink-0 bg-white z-10"
            style={{ height: "calc(100% - 0px)" }}
          >
            <LocationList
              locations={filteredLocations}
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Map view - always visible on desktop, conditionally on mobile */}
        <div
          ref={mapContainerRef}
          className={cn("flex-1 relative", isMobile && activeView === "list" ? "hidden" : "block")}
          style={{ height: "calc(100% - 0px)" }}
        >
          <MapComponent
            locations={filteredLocations}
            userLocation={userLocation}
            center={mapCenter}
            zoom={mapZoom}
            onMarkerClick={handleLocationSelect}
            onMapClick={handleMapClick}
            onMapMove={handleMapMove}
            className="h-full w-full"
            selectedLocation={selectedLocation}
          />

          {/* Mobile location preview */}
          {isMobile && showMobilePreview && previewLocation && (
            <div className="absolute bottom-20 left-0 right-0 mx-4 bg-white rounded-lg shadow-lg z-20 p-4 animate-slide-up">
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={closeMobilePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-start mb-3">
                <div className="w-16 h-16 rounded-lg bg-gray-100 relative flex-shrink-0 overflow-hidden">
                  {previewLocation.imageUrl || previewLocation.featuredImage ? (
                    <div className="w-full h-full relative">
                      <img
                        src={
                          typeof previewLocation.featuredImage === "string"
                            ? previewLocation.featuredImage
                            : previewLocation.featuredImage?.url || previewLocation.imageUrl || "/placeholder.svg"
                        }
                        alt={previewLocation.name}
                        className="object-cover w-full h-full"
                        loading="eager"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="ml-3 flex-1">
                  <h3 className="font-medium text-gray-900 text-lg">{previewLocation.name}</h3>

                  {/* Address */}
                  {previewLocation.address && (
                    <div className="flex items-center mt-1">
                      <MapIcon className="h-3.5 w-3.5 text-gray-500 mr-1 flex-shrink-0" />
                      <p className="text-sm text-gray-500 truncate">
                        {typeof previewLocation.address === "string"
                          ? previewLocation.address
                          : Object.values(previewLocation.address).filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Categories */}
                  {previewLocation.categories && previewLocation.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {previewLocation.categories.slice(0, 2).map((category, idx) => {
                        const name = typeof category === "string" ? category : category?.name || "Category"
                        return (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20 border-none text-xs"
                          >
                            {name}
                          </Badge>
                        )
                      })}
                      {previewLocation.categories.length > 2 && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-none text-xs">
                          +{previewLocation.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90" onClick={handleViewDetails}>
                  View Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-none border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                  onClick={() => {
                    // Open in maps app if available
                    const address =
                      typeof previewLocation.address === "string"
                        ? previewLocation.address
                        : Object.values(previewLocation.address || {})
                            .filter(Boolean)
                            .join(", ")

                    let lat, lng
                    if (previewLocation.latitude != null && previewLocation.longitude != null) {
                      lat = Number(previewLocation.latitude)
                      lng = Number(previewLocation.longitude)
                    } else if (
                      previewLocation.coordinates?.latitude != null &&
                      previewLocation.coordinates?.longitude != null
                    ) {
                      lat = Number(previewLocation.coordinates.latitude)
                      lng = Number(previewLocation.coordinates.longitude)
                    }

                    if (lat && lng) {
                      window.open(`https://maps.google.com/maps?q=${lat},${lng}`, "_blank")
                    } else if (address) {
                      window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, "_blank")
                    }
                  }}
                >
                  <MapIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Mobile list toggle button */}
          {isMobile && activeView === "map" && (
            <Button
              variant="default"
              size="sm"
              onClick={toggleMobileList}
              className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 bg-white text-gray-800 shadow-md hover:bg-gray-100 border border-gray-200"
            >
              <List className="h-4 w-4 mr-2" />
              {showMobileList ? "Hide List" : "Show List"}
            </Button>
          )}

          {/* Mobile list drawer */}
          {isMobile && showMobileList && (
            <div
              ref={mobileListRef}
              className={cn(
                "absolute bottom-0 left-0 right-0 bg-white z-20 rounded-t-xl shadow-lg transition-all duration-300 ease-in-out",
                listHeight === "partial" ? "h-[40%]" : "h-[80%]",
              )}
            >
              <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-white z-10">
                <h3 className="font-medium">Locations ({filteredLocations.length})</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleListHeight}>
                    {listHeight === "partial" ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleMobileList}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ height: `calc(100% - 49px)` }}>
                <LocationList
                  locations={filteredLocations}
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={selectedLocation}
                  isLoading={isLoading}
                />
              </div>

              {/* Drag handle indicator */}
              <div className="absolute top-0 left-0 right-0 flex justify-center">
                <div className="w-12 h-1 bg-gray-300 rounded-full mt-2 mb-1"></div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile list view */}
        {isMobile && activeView === "list" && (
          <div
            ref={listContainerRef}
            className="w-full overflow-hidden flex-shrink-0 bg-white z-10 animate-fade-in"
            style={{ height: "calc(100% - 0px)" }}
          >
            <LocationList
              locations={filteredLocations}
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Detail panel */}
        {showDetail && selectedLocation && (
          <div
            ref={detailContainerRef}
            className="absolute inset-0 md:relative md:inset-auto md:w-96 bg-white z-30 md:border-l overflow-hidden"
            style={{ height: isMobile ? "100%" : "calc(100% - 0px)" }}
          >
            {/* Mobile back button */}
            {isMobile && (
              <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center">
                <Button variant="ghost" size="sm" onClick={closeDetail} className="h-8 w-8 p-0 mr-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h3 className="font-medium truncate">{selectedLocation.name}</h3>
              </div>
            )}
            <div className="h-full overflow-auto" style={{ height: isMobile ? "calc(100% - 49px)" : "100%" }}>
              <LocationDetail location={selectedLocation} onCloseAction={closeDetail} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile view selector */}
      {isMobile && (
        <div className="border-t bg-white sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <Tabs defaultValue={activeView} value={activeView} onValueChange={handleViewChange} className="w-full">
            <TabsList className="w-full grid grid-cols-2 p-1">
              <TabsTrigger
                value="map"
                className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white py-3 transition-all duration-200"
              >
                <MapIcon className="h-5 w-5 mr-2" />
                Map
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white py-3 transition-all duration-200"
              >
                <List className="h-5 w-5 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg">
            <Loader2 className="h-10 w-10 text-[#FF6B6B] animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Loading locations...</p>
          </div>
        </div>
      )}

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        
        .tab-transition {
          transition: all 0.3s ease;
        }
      `}</style>
      {isMobile && activeView === "list" && selectedLocation && (
        <div className="fixed bottom-20 left-0 right-0 mx-4 z-20">
          <Button
            className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 shadow-lg"
            onClick={() => {
              setActiveView("map")
              // Center map on selected location
              let lat, lng
              if (selectedLocation.latitude != null && selectedLocation.longitude != null) {
                lat = Number(selectedLocation.latitude)
                lng = Number(selectedLocation.longitude)
              } else if (
                selectedLocation.coordinates?.latitude != null &&
                selectedLocation.coordinates?.longitude != null
              ) {
                lat = Number(selectedLocation.coordinates.latitude)
                lng = Number(selectedLocation.coordinates.longitude)
              }
              if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
                setMapCenter([lat, lng])
                setMapZoom(15) // Zoom in for better visibility
              }

              // Show preview after a short delay to allow view transition
              setTimeout(() => {
                setPreviewLocation(selectedLocation)
                setShowMobilePreview(true)
              }, 300)
            }}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            View on Map
          </Button>
        </div>
      )}
    </div>
  )
}
