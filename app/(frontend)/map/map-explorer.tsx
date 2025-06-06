/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Filter, X, List, Map as MapIcon, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { addedLocations } from "./map-data"
import { searchLocations, locationMatchesCategories } from "./search-utils"
import InteractiveMap from "./interactive-map"
import LocationList from "./location-list"
import LocationDetail from "./location-detail"
import LocationDetailMobile from "./location-detail-mobile"
import LocationBottomSheet from "./location-bottom-sheet"
import type { Location } from "./map-data"

// Simple mobile detection
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768
}

// Helper function to calculate distance (Haversine formula)
// This should ideally be in a utility file and imported.
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
}

export default function MapExplorer() {
  // Core states only
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; email?: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([-71.0589, 42.3601]) // Boston
  const [mapZoom, setMapZoom] = useState(12)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  
  // UI states
  const [activeView, setActiveView] = useState<"map" | "list">("map")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapPadding, setMapPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0}); // New state for map padding

  // Mobile preview states
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [previewLocation, setPreviewLocation] = useState<Location | null>(null)
  const [clusterPreviewData, setClusterPreviewData] = useState<{
    locations: Location[];
    isCluster: boolean;
    center?: [number, number]; 
  } | null>(null)
  const [showClusterBottomSheet, setShowClusterBottomSheet] = useState(false)

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(isMobileDevice())
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load locations - simplified
  useEffect(() => {
    let isMounted = true

    const loadLocations = async () => {
      try {
        console.log("🔄 Loading locations...")
        setLocationsLoading(true)
        setError(null)

        const locations = await addedLocations()

        if (!isMounted) return

        console.log(`✅ Loaded ${locations.length} locations`)
        setAllLocations(locations)
        setFilteredLocations(locations)

        // Extract categories
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

        if (isMounted) {
          setCategories(Array.from(uniqueCategories.values()))
        }
      } catch (err) {
        console.error("Error loading locations:", err)
        if (isMounted) {
          setError("Failed to load locations. Please try again.")
        }
      } finally {
        if (isMounted) {
          setLocationsLoading(false)
        }
      }
    }

    loadLocations()
    
    return () => {
      isMounted = false
    }
  }, [])

  // Load current user - simplified and optional
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const userData = await response.json()
          setCurrentUser(userData.user)
        }
        // Ignore errors - user auth is optional for map viewing
      } catch (error) {
        // Ignore errors - user auth is optional for map viewing
        console.log('User not authenticated (optional)')
      }
    }

    loadCurrentUser()
  }, [])

  // Auto-request user location on load
  useEffect(() => {
    console.log('🎯 Auto-requesting user location on page load...')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(location)
          // Set map center to user's location once obtained
          setMapCenter([position.coords.longitude, position.coords.latitude]); // Mapbox expects [lng, lat]
          setMapZoom(14); // Zoom in a bit more when user location is available
          console.log(`📍 Got user location: [${location[0]}, ${location[1]}] - Set map center.`)
        },
        (error) => {
          console.log('📍 Could not get user location:', error.message)
          // Continue without user location, map will use default center
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
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
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      results = results.filter((loc) => locationMatchesCategories(loc, selectedCategories))
    }

    setFilteredLocations(results)

    // Reset selected location if it's no longer in filtered results
    if (selectedLocation && !results.find((loc) => loc.id === selectedLocation.id)) {
      setSelectedLocation(null)
      setIsDetailOpen(false)
      setPreviewLocation(null)
      setShowMobilePreview(false)
    }
  }, [searchQuery, selectedCategories, allLocations, selectedLocation])

  // Helper function to extract coordinates
  const getLocationCoordinates = useCallback((location: Location): [number, number] | null => {
    let lat, lng

    if (location.latitude != null && location.longitude != null) {
      lat = Number(location.latitude)
      lng = Number(location.longitude)
    } else if (location.coordinates?.latitude != null && location.coordinates?.longitude != null) {
      lat = Number(location.coordinates.latitude)
      lng = Number(location.coordinates.longitude)
    }

    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      return [lng, lat] // Return in [lng, lat] format for Mapbox
    }

    return null
  }, [])

  // Handle location selection
  const handleLocationSelect = useCallback((location: Location) => {
    console.log("📍 MapExplorer: handleLocationSelect triggered for:", location?.name);
    console.log("📍 MapExplorer: Current isMobile state:", isMobile);
    console.log("📍 MapExplorer: Current showClusterBottomSheet state:", showClusterBottomSheet);

    // If a cluster preview is open, close it first
    if (showClusterBottomSheet) {
      setShowClusterBottomSheet(false);
      setClusterPreviewData(null);
    }

    setSelectedLocation(location)

    if (isMobile) {
      // For mobile, directly open the full detail view (LocationDetailMobile)
      // instead of an intermediate simple preview.
      setIsDetailOpen(true); 
      // Center map on selected location for mobile
      const coordinates = getLocationCoordinates(location);
      if (coordinates) {
        setMapCenter(coordinates);
        setMapZoom(15); 
      }
    } else {
      // For desktop, only set selected location and open detail view.
      setIsDetailOpen(true); 
    }
  }, [getLocationCoordinates, isMobile, showClusterBottomSheet])

  // This is called when "View Details" is clicked on the simple mobile preview
  // OR when a location is picked from the LocationBottomSheet (cluster view)
  const handleViewDetailsFromPreview = useCallback((locationToView: Location) => {
    if (showClusterBottomSheet) {
        setShowClusterBottomSheet(false);
        setClusterPreviewData(null);
    }
    if (showMobilePreview) {
        setShowMobilePreview(false);
        setPreviewLocation(null);
    }

    setSelectedLocation(locationToView);
    setIsDetailOpen(true);
    
    // Center map for mobile when full details are shown
    if (isMobile) {
        const coordinates = getLocationCoordinates(locationToView);
        if (coordinates) {
            setMapCenter(coordinates);
            setMapZoom(15); 
        }
    }
  }, [showMobilePreview, showClusterBottomSheet, isMobile, getLocationCoordinates]);

  // Handle map events
  const handleMapClick = useCallback((coords: { lat: number; lng: number }) => {
    if (showMobilePreview) {
      setShowMobilePreview(false)
      setPreviewLocation(null)
    }
  }, [showMobilePreview])

  const handleMapMove = useCallback((newCenter: [number, number], newZoom: number) => {
    const TILE_SIZE = 512; // Standard Mapbox tile size
    const earthCircumference = 40075016.686; // In meters

    // Calculate the distance in meters for one pixel at the current zoom level at the equator
    const metersPerPixel = earthCircumference * Math.cos(newCenter[1] * Math.PI / 180) / (TILE_SIZE * Math.pow(2, newZoom));

    // Define a threshold for center change (e.g., 10 pixels)
    const centerChangeThresholdMeters = 10 * metersPerPixel;

    const distanceMoved = calculateDistance(
      mapCenter[1], // current lat
      mapCenter[0], // current lng
      newCenter[1], // new lat
      newCenter[0]  // new lng
    );

    const zoomChanged = Math.abs(newZoom - mapZoom) > 0.01; // Threshold for zoom change

    if (distanceMoved > centerChangeThresholdMeters || zoomChanged) {
      // console.log(`🗺️ Map moved: New Center [${newCenter[0].toFixed(4)}, ${newCenter[1].toFixed(4)}], New Zoom ${newZoom.toFixed(2)}`);
      // console.log(`Distance moved: ${distanceMoved.toFixed(2)}m, Zoom changed: ${zoomChanged}`);
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    } else {
      // console.log(`🗺️ Map move event ignored (below threshold): Dist ${distanceMoved.toFixed(2)}m, ZoomDiff ${Math.abs(newZoom - mapZoom).toFixed(3)}`);
    }
  }, [mapCenter, mapZoom]);

  // Search functions
  const toggleSearch = () => setIsSearchExpanded(!isSearchExpanded)
  const clearSearch = () => {
    setSearchQuery("")
    setIsSearchExpanded(false)
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Mobile simple preview close (for single location preview)
  const closeMobileSimplePreview = () => {
    setShowMobilePreview(false)
    setPreviewLocation(null)
    setSelectedLocation(null) // Also clear selected location if preview is closed
  }

  // Cluster BottomSheet close
  const closeClusterBottomSheet = () => {
    setShowClusterBottomSheet(false);
    setClusterPreviewData(null);
    setSelectedLocation(null); // Clear selection when cluster preview closes
    setMapPadding({ top: 0, right: 0, bottom: 0, left: 0 }); // Reset map padding
  }

  // Listen for mobile marker events from MapComponent
  useEffect(() => {
    const handleMarkerMobilePreviewEvent = (e: CustomEvent) => {
      console.log('🎉 MapExplorer: Received markerMobilePreview event', {
        isMobile,
        eventDetail: e.detail,
        hasLocation: !!e.detail?.location
      })
      
      const { location: primaryLocationFromEvent, cluster, isCluster, coordinates } = e.detail
      
      if (isMobile && primaryLocationFromEvent) {
        if (isCluster && cluster && cluster.locations.length > 1) {
          console.log("MapExplorer: Cluster marker tapped on mobile", cluster);
          setClusterPreviewData({ 
            locations: cluster.locations, 
            isCluster: true,
            center: cluster.center // Pass cluster center 
          });
          setShowClusterBottomSheet(true);
          // When showing bottom sheet for cluster, adjust map padding
          setMapPadding({ top: 0, right: 0, bottom: window.innerHeight * 0.5, left: 0 }); // Pad by 50% of viewport height
          setShowMobilePreview(false); // Ensure simple preview is hidden
          setPreviewLocation(null);
          setSelectedLocation(null); // Don't pre-select a location when showing cluster list
        } else {
          // Single location tapped on map - use LocationBottomSheet
          console.log("MapExplorer: Single marker tapped on mobile, using LocationBottomSheet", primaryLocationFromEvent);
          setClusterPreviewData({ // Use clusterPreviewData to pass single location to LocationBottomSheet
            locations: [primaryLocationFromEvent],
            isCluster: false, // Explicitly false for single
            // center: coordinates ? [coordinates.lng, coordinates.lat] : getLocationCoordinates(primaryLocationFromEvent) // Use tapped coords or location's coords
          });
          setShowClusterBottomSheet(true); // Show the bottom sheet
          // When showing bottom sheet for single location, adjust map padding
          setMapPadding({ top: 0, right: 0, bottom: window.innerHeight * 0.5, left: 0 }); // Pad by 50% of viewport height
          setShowMobilePreview(false); // Ensure simple preview is hidden
          setPreviewLocation(null); // Clear simple preview state
          setSelectedLocation(primaryLocationFromEvent); // Select it for the map highlight
        }
        
        // Center map on the tapped item (single or cluster center)
        if (coordinates) { // coordinates = { lat, lng }
          setMapCenter([coordinates.lng, coordinates.lat]);
          setMapZoom(15);
        } else if (isCluster && cluster?.center) {
          setMapCenter(cluster.center); // cluster.center is [lng, lat]
          setMapZoom(15);
        }
      }
    }

    window.addEventListener('markerMobilePreview', handleMarkerMobilePreviewEvent as EventListener)
    
    return () => {
      window.removeEventListener('markerMobilePreview', handleMarkerMobilePreviewEvent as EventListener)
    }
  }, [isMobile, getLocationCoordinates])

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
    <div className="flex flex-col overflow-hidden bg-gray-50 h-[calc(100vh-4rem)]">
      {/* Header with search */}
      <div className={cn(
        "border-b bg-white shadow-sm transition-all duration-200 z-20 sticky top-0",
        isMobile && isSearchExpanded ? "p-4 pb-6" : "p-4",
      )}>
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
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={clearSearch}
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
                  <h1 className="text-lg font-semibold flex-1 text-center">{filteredLocations.length} Locations</h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "border-gray-200 relative",
                          selectedCategories.length > 0 && "bg-[#FF6B6B]/10 border-[#FF6B6B]",
                        )}
                      >
                        <Filter
                          className={cn("h-4 w-4", selectedCategories.length > 0 ? "text-[#FF6B6B]" : "text-gray-500")}
                        />
                        {selectedCategories.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-[#FF6B6B] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {selectedCategories.length}
                          </span>
                        )}
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
                              readOnly
                            />
                            <span>{category.name || category.id}</span>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </>
          ) : (
            // Desktop header
            <div className="flex items-center gap-4 w-full">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-gray-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/10"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "border-gray-200",
                      selectedCategories.length > 0 && "bg-[#FF6B6B]/10 border-[#FF6B6B]",
                    )}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Categories {selectedCategories.length > 0 && `(${selectedCategories.length})`}
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
                          readOnly
                        />
                        <span>{category.name || category.id}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge variant="secondary" className="bg-white border">
                {filteredLocations.length} locations
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {isMobile ? (
          // Mobile layout
          <>
            <div className="h-full">
              {activeView === "map" ? (
                <>
                  <InteractiveMap
                    locations={filteredLocations}
                    userLocation={userLocation}
                    center={mapCenter}
                    zoom={mapZoom}
                    mapStyle="streets-v12"
                    onMarkerClick={handleLocationSelect}
                    onMapClick={handleMapClick}
                    onMapMove={handleMapMove}
                    selectedLocation={selectedLocation}
                    showMobilePreview={showMobilePreview || showClusterBottomSheet}
                    forceRefresh={0}
                    mapPadding={mapPadding}
                    isDetailModalOpen={isDetailOpen}
                  />
                  
                  {/* Mobile SIMPLE preview for SINGLE locations - REMOVED */}
                  {/* 
                  {showMobilePreview && previewLocation && !showClusterBottomSheet && (
                    <div className=\"absolute bottom-0 left-0 right-0 z-30\">
                      <div className=\"bg-white border-t border-gray-200 shadow-2xl p-4 rounded-t-xl\">
                        <div className=\"flex items-center justify-between mb-3\">
                          <h3 className=\"font-semibold text-lg truncate flex-1 mr-2\">
                            {previewLocation.name}
                          </h3>
                          <Button
                            variant=\"ghost\"
                            size=\"sm\"
                            onClick={closeMobileSimplePreview}
                            className=\"p-1 h-8 w-8\"
                          >
                            <X className=\"h-4 w-4\" />
                          </Button>
                        </div>
                        <div className=\"flex gap-2\">
                          <Button
                            onClick={() => handleViewDetailsFromPreview(previewLocation)}
                            className=\"flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90\"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  */}
                </>
              ) : (
                <LocationList
                  locations={filteredLocations}
                  selectedLocation={selectedLocation}
                  onLocationSelect={handleLocationSelect}
                  searchQuery={searchQuery}
                  isLoading={locationsLoading}
                  currentUser={currentUser}
                  onViewDetail={handleViewDetailsFromPreview}
                />
              )}
            </div>

            {/* Mobile view toggle button */}
            <div className="absolute bottom-4 right-4 z-20">
              <Button
                onClick={() => setActiveView(activeView === "map" ? "list" : "map")}
                className="rounded-full w-12 h-12 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 shadow-lg"
              >
                {activeView === "map" ? <List className="h-5 w-5" /> : <MapIcon className="h-5 w-5" />}
              </Button>
            </div>
          </>
        ) : (
          // Desktop layout
          <div className="h-full flex">
            {/* LocationList is now always visible on desktop */}
            <div className="w-96 border-r bg-white overflow-y-auto">
              <LocationList
                locations={filteredLocations}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
                searchQuery={searchQuery}
                isLoading={locationsLoading}
                currentUser={currentUser}
                onViewDetail={handleViewDetailsFromPreview}
              />
            </div>
            
            <div className="flex-1">
              <InteractiveMap
                locations={filteredLocations}
                userLocation={userLocation}
                center={mapCenter}
                zoom={mapZoom}
                mapStyle="streets-v12"
                onMarkerClick={handleLocationSelect}
                onMapClick={handleMapClick}
                onMapMove={handleMapMove}
                selectedLocation={selectedLocation}
                onViewDetail={handleViewDetailsFromPreview}
                showMobilePreview={false}
                forceRefresh={0}
                mapPadding={mapPadding}
                isDetailModalOpen={isDetailOpen}
              />
            </div>
          </div>
        )}
      </div>

      {/* Location Detail Dialog (Mobile and Desktop) */}
      <LocationDetail
        location={selectedLocation}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedLocation(null)
        }}
        cluster={null}
      />

      {/* Render LocationBottomSheet for CLUSTER preview on mobile */}
      {isMobile && showClusterBottomSheet && clusterPreviewData && (
        <LocationBottomSheet
          location={clusterPreviewData.isCluster ? null : clusterPreviewData.locations[0]} // Pass single location if not a cluster
          isOpen={showClusterBottomSheet}
          onClose={closeClusterBottomSheet}
          onViewDetails={handleViewDetailsFromPreview} // This opens LocationDetailMobile
          isMobile={true}
          cluster={clusterPreviewData.isCluster ? clusterPreviewData : undefined} // Pass cluster data only if it's a cluster
        />
      )}
    </div>
  )
}

