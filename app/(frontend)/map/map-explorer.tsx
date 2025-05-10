/* eslint-disable @typescript-eslint/no-unused-vars */
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
import {
  Search,
  X,
  List,
  MapIcon,
  Loader2,
  Filter,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Share2,
  Navigation,
  ChevronUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"

export default function MapExplorer() {
  // Browser detection states
  const [isSafari, setIsSafari] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [browserInfo, setBrowserInfo] = useState<string>("")

  // Core states
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

  // UI states
  const [activeView, setActiveView] = useState<"map" | "list">("map")
  const [showDetail, setShowDetail] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileList, setShowMobileList] = useState(false)
  const [listHeight, setListHeight] = useState<"partial" | "full">("partial")
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [previewLocation, setPreviewLocation] = useState<Location | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [touchStarted, setTouchStarted] = useState(false)
  const [safariFixesApplied, setSafariFixesApplied] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [previewPosition, setPreviewPosition] = useState<[number, number] | null>(null)

  // Refs for container elements
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const detailContainerRef = useRef<HTMLDivElement>(null)
  const mobileListRef = useRef<HTMLDivElement>(null)
  const listScrollRef = useRef<HTMLDivElement>(null)
  const showListButtonRef = useRef<HTMLButtonElement>(null)

  // Helper function to extract coordinates from a location
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
      return [lat, lng]
    }

    return null
  }, [])

  // Browser detection
  useEffect(() => {
    // Detect Safari and iOS
    const ua = navigator.userAgent.toLowerCase()
    const isSafariBrowser = /safari/.test(ua) && !/chrome/.test(ua) && !/firefox/.test(ua) && !/edge/.test(ua)

    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    setIsSafari(isSafariBrowser)
    setIsIOS(isIOSDevice)

    // Set browser info for debugging
    setBrowserInfo(`${ua} | Safari: ${isSafariBrowser} | iOS: ${isIOSDevice}`)

    // Apply Safari-specific body styles
    if (isSafariBrowser || isIOSDevice) {
      document.documentElement.classList.add("safari-mobile")

      // Fix for Safari viewport height issues
      const setVH = () => {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty("--vh", `${vh}px`)
        setViewportHeight(window.innerHeight)
      }

      setVH()
      window.addEventListener("resize", setVH)
      window.addEventListener("orientationchange", setVH)

      return () => {
        window.removeEventListener("resize", setVH)
        window.removeEventListener("orientationchange", setVH)
        document.documentElement.classList.remove("safari-mobile")
      }
    }
  }, [])

  // Apply Safari-specific fixes after component mounts
  useEffect(() => {
    if ((isSafari || isIOS) && !safariFixesApplied) {
      // Force a repaint to fix Safari rendering issues
      setTimeout(() => {
        if (showListButtonRef.current) {
          showListButtonRef.current.style.display = "none"
          // Force a reflow
          void showListButtonRef.current.offsetHeight
          showListButtonRef.current.style.display = ""
        }

        // Force a window resize to recalculate layouts
        window.dispatchEvent(new Event("resize"))

        setSafariFixesApplied(true)
      }, 500)
    }
  }, [isSafari, isIOS, safariFixesApplied])

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
        setIsSearchExpanded(false)
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
          const coordinates = getLocationCoordinates(loc)
          if (coordinates) {
            console.log(
              `Setting initial map center to [${coordinates[0]}, ${coordinates[1]}] from location "${loc.name}"`,
            )
            setMapCenter(coordinates)
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
  }, [getLocationCoordinates])

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

  // Handle location selection with Safari-specific fixes
  const handleLocationSelect = useCallback(
    (location: Location) => {
      console.log("Selected location:", location)

      // Prevent multiple rapid selections
      if (isSelecting) return
      setIsSelecting(true)

      // Add a visual feedback for selection
      if (isSafari || isIOS) {
        // Flash the screen briefly to indicate selection on Safari
        const flashElement = document.createElement("div")
        flashElement.style.position = "fixed"
        flashElement.style.top = "0"
        flashElement.style.left = "0"
        flashElement.style.right = "0"
        flashElement.style.bottom = "0"
        flashElement.style.backgroundColor = "rgba(255,107,107,0.1)"
        flashElement.style.zIndex = "9999"
        flashElement.style.pointerEvents = "none"
        document.body.appendChild(flashElement)

        setTimeout(() => {
          document.body.removeChild(flashElement)
        }, 300)
      }

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

      // Center map on selected location
      const coordinates = getLocationCoordinates(location)
      if (coordinates) {
        console.log(`Centering map on [${coordinates[0]}, ${coordinates[1]}]`)
        setMapCenter(coordinates)
        setMapZoom(isMobile ? 15 : 14) // Zoom in a bit more on mobile for better visibility

        // Switch to map view when a location is selected on mobile list view
        if (activeView === "list" && isMobile) {
          setActiveView("map")
        }
      }

      // Set the preview location
      setPreviewLocation(location)
      setShowMobilePreview(true)

      // Hide the list drawer if it's showing
      if (showMobileList) {
        setShowMobileList(false)
      }

      // Reset selection state after a delay
      setTimeout(() => {
        setIsSelecting(false)
      }, 500) // Longer timeout for Safari
    },
    [isMobile, showMobileList, activeView, getLocationCoordinates, isSelecting, isSafari, isIOS],
  )

  // Handle view details from preview
  const handleViewDetails = useCallback(() => {
    if (previewLocation) {
      setSelectedLocation(previewLocation)
      setShowDetail(true)
      setShowMobilePreview(false)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, [previewLocation])

  // Handle map click
  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      // Ignore if touch just started (to prevent double-firing on Safari)
      if (touchStarted) return

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

      // Close mobile preview when clicking on map (but not on a marker)
      if (showMobilePreview) {
        setShowMobilePreview(false)
        setPreviewLocation(null)
        setPreviewPosition(null)
      }

      console.log("Map clicked at:", coords)
    },
    [showDetail, isMobile, isSearchExpanded, showMobileList, showMobilePreview, touchStarted],
  )

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
    setIsSearchExpanded(false)
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
    setPreviewPosition(null)
  }, [])

  // Handle tab change with Safari-specific fixes
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
        setPreviewPosition(null)
      }

      // Close mobile list drawer when switching to list view
      if (isMobile && value === "list" && showMobileList) {
        setShowMobileList(false)
      }

      // Safari-specific: force a repaint after view change
      if (isSafari || isIOS) {
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"))
        }, 100)
      }

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    },
    [isMobile, showDetail, showMobilePreview, showMobileList, isSafari, isIOS],
  )

  // Toggle search expansion on mobile
  const toggleSearch = useCallback(() => {
    setIsSearchExpanded(!isSearchExpanded)

    // Focus the input when expanding
    if (!isSearchExpanded) {
      setTimeout(() => {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement
        if (input) input.focus()
      }, 100)
    }
  }, [isSearchExpanded])

  // Toggle mobile list drawer with Safari-specific fixes
  const toggleMobileList = useCallback(() => {
    setShowMobileList((prev) => !prev)

    // Close mobile preview when toggling list
    if (showMobilePreview) {
      setShowMobilePreview(false)
      setPreviewLocation(null)
    }

    // Safari-specific: force a repaint after toggling list
    if ((isSafari || isIOS) && !showMobileList) {
      setTimeout(() => {
        if (mobileListRef.current) {
          mobileListRef.current.style.display = "none"
          // Force a reflow
          void mobileListRef.current.offsetHeight
          mobileListRef.current.style.display = ""
        }
      }, 50)
    }

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }, [showMobilePreview, isSafari, isIOS, showMobileList])

  // Toggle list height between partial and full
  const toggleListHeight = useCallback(() => {
    setListHeight((prev) => (prev === "partial" ? "full" : "partial"))

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }, [])

  // Handle touch events for mobile list drawer with Safari-specific fixes
  useEffect(() => {
    if (!isMobile || !mobileListRef.current) return

    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      setTouchStarted(true)

      // Reset touch started state after a delay
      setTimeout(() => {
        setTouchStarted(false)
      }, 300)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!mobileListRef.current) return

      const deltaY = e.touches[0].clientY - startY

      // If swiping down and list is in full mode, or swiping up and list is in partial mode
      if ((deltaY > 50 && listHeight === "full") || (deltaY < -50 && listHeight === "partial")) {
        // Only prevent default when actually toggling to avoid breaking scrolling
        e.preventDefault()
        toggleListHeight()
        startY = e.touches[0].clientY
      }
    }

    const element = mobileListRef.current

    // Use different event options for Safari
    const options = isSafari || isIOS ? { passive: false } : { passive: true }
    element.addEventListener("touchstart", handleTouchStart, options)
    element.addEventListener("touchmove", handleTouchMove, { passive: false })

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchmove", handleTouchMove)
    }
  }, [isMobile, listHeight, toggleListHeight, isSafari, isIOS])

  // Add orientation change handling with Safari-specific fixes
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

        // Safari-specific: force a repaint after orientation change
        if (isSafari || isIOS) {
          setTimeout(() => {
            // Force a reflow of the entire page
            document.body.style.display = "none"
            void document.body.offsetHeight
            document.body.style.display = ""

            // Update viewport height
            const vh = window.innerHeight * 0.01
            document.documentElement.style.setProperty("--vh", `${vh}px`)
            setViewportHeight(window.innerHeight)
          }, 300)
        }
      }
    }

    window.addEventListener("orientationchange", handleOrientationChange)
    window.addEventListener("resize", handleOrientationChange)

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange)
      window.removeEventListener("resize", handleOrientationChange)
    }
  }, [isMobile, showMobileList, isSafari, isIOS])

  // Handle scroll in list view to show/hide back to top button
  useEffect(() => {
    if (!listScrollRef.current) return

    const handleScroll = () => {
      if (!listScrollRef.current) return
      setShowBackToTop(listScrollRef.current.scrollTop > 300)
    }

    const element = listScrollRef.current
    element.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      element.removeEventListener("scroll", handleScroll)
    }
  }, [activeView])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close detail or preview on escape key
      if (e.key === "Escape") {
        if (showDetail) {
          closeDetail()
        } else if (showMobilePreview) {
          closeMobilePreview()
        } else if (isSearchExpanded) {
          setIsSearchExpanded(false)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [showDetail, showMobilePreview, isSearchExpanded, closeDetail, closeMobilePreview])

  // Share location function
  const shareLocation = useCallback((location: Location) => {
    const title = location.name
    const text = `Check out ${location.name}`
    const url = window.location.href

    if (navigator.share) {
      navigator
        .share({
          title,
          text,
          url,
        })
        .catch((err) => console.error("Error sharing:", err))
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard
        .writeText(`${text} - ${url}`)
        .then(() => alert("Location link copied to clipboard!"))
        .catch((err) => console.error("Error copying to clipboard:", err))
    }
  }, [])

  // Scroll to top function for list view
  const scrollToTop = useCallback(() => {
    if (listScrollRef.current) {
      listScrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }, [])

  // Get image URL helper function
  const getImageUrl = useCallback((location: Location): string => {
    if (typeof location.featuredImage === "string") {
      return location.featuredImage
    } else if (location.featuredImage?.url) {
      return location.featuredImage.url
    } else if (location.imageUrl) {
      return location.imageUrl
    }
    return "/abstract-location.png"
  }, [])

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
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-gray-50",
        isSafari || isIOS ? "safari-container" : "h-[calc(100vh-4rem)]",
      )}
      style={isSafari || isIOS ? { height: `calc(${viewportHeight}px - 4rem)` } : {}}
    >
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
            <div ref={listScrollRef} className="h-full overflow-y-auto">
              <LocationList
                locations={filteredLocations}
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                isLoading={isLoading}
              />
            </div>
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

          {/* User location button */}
          {userLocation && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setMapCenter(userLocation)
                setMapZoom(15)
              }}
              className="absolute top-4 right-4 z-10 bg-white text-gray-800 shadow-md hover:bg-gray-100 border border-gray-200"
              aria-label="Go to my location"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}

          {/* Mobile list toggle button with repositioned layout */}
          {isMobile && activeView === "map" && (
            <Button
              ref={showListButtonRef}
              variant="default"
              size="sm"
              onClick={toggleMobileList}
              onTouchEnd={(e) => {
                e.preventDefault()
                toggleMobileList()
              }}
              className={cn(
                "absolute z-30 bg-white text-gray-800 shadow-md hover:bg-gray-100 border border-gray-200",
                isSafari || isIOS ? "safari-button" : "top-4 left-4",
              )}
              style={
                isSafari || isIOS
                  ? {
                      top: "1rem",
                      left: "1rem",
                      position: "absolute",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 30,
                    }
                  : {}
              }
            >
              <List className="h-4 w-4 mr-2" />
              {showMobileList ? "Hide List" : "Show List"}
            </Button>
          )}

          {/* Mobile list drawer with Safari-specific fixes */}
          {isMobile && showMobileList && (
            <div
              ref={mobileListRef}
              className={cn(
                "absolute left-0 right-0 bg-white z-20 rounded-t-xl shadow-lg transition-all duration-300 ease-in-out",
                listHeight === "partial" ? "h-[40%]" : "h-[80%]",
                isSafari || isIOS ? "safari-drawer" : "bottom-0",
              )}
              style={
                isSafari || isIOS
                  ? {
                      bottom: 0,
                      position: "absolute",
                      zIndex: 20,
                      width: "100%",
                    }
                  : {}
              }
            >
              <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-white z-10">
                <h3 className="font-medium">Locations ({filteredLocations.length})</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={toggleListHeight}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      toggleListHeight()
                    }}
                  >
                    {listHeight === "partial" ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={toggleMobileList}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      toggleMobileList()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div
                ref={listScrollRef}
                className="overflow-y-auto overscroll-contain"
                style={{ height: `calc(100% - 49px)` }}
              >
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

          {/* Marker-anchored location preview */}
          {showMobilePreview && previewLocation && (
            <div
              className={cn(
                "fixed bg-white rounded-lg shadow-lg z-30 p-4 marker-preview",
                isMobile ? "w-[calc(100%-2rem)]" : "w-80",
              )}
              style={{
                left: "50%",
                transform: "translateX(-50%) translateY(-100%)",
                marginTop: "-15px", // Space for the pointer
                maxWidth: isMobile ? "calc(100% - 2rem)" : "320px",
              }}
            >
              {/* Preview arrow pointer */}
              <div className="absolute h-4 w-4 bg-white transform rotate-45 left-1/2 -ml-2 -bottom-2"></div>

              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={closeMobilePreview}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    closeMobilePreview()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-start mb-3">
                <div className="w-16 h-16 rounded-lg bg-gray-100 relative flex-shrink-0 overflow-hidden">
                  {previewLocation.imageUrl || previewLocation.featuredImage ? (
                    <div className="w-full h-full relative">
                      <Image
                        src={getImageUrl(previewLocation) || "/abstract-location.png"}
                        alt={previewLocation.name}
                        className="object-cover"
                        fill
                        sizes="64px"
                        priority
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
                <Button
                  className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                  onClick={handleViewDetails}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleViewDetails()
                  }}
                >
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

                    const coordinates = getLocationCoordinates(previewLocation)
                    if (coordinates) {
                      window.open(`https://maps.google.com/maps?q=${coordinates[0]},${coordinates[1]}`, "_blank")
                    } else if (address) {
                      window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, "_blank")
                    }
                  }}
                  aria-label="Open in Maps"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-none border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                  onClick={() => shareLocation(previewLocation)}
                  aria-label="Share Location"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
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
            <div ref={listScrollRef} className="h-full overflow-y-auto overscroll-contain">
              <LocationList
                locations={filteredLocations}
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                isLoading={isLoading}
              />

              {/* Back to top button */}
              {showBackToTop && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={scrollToTop}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    scrollToTop()
                  }}
                  className={cn(
                    "fixed right-4 z-10 bg-white text-gray-800 shadow-md hover:bg-gray-100 border border-gray-200 rounded-full h-10 w-10 p-0",
                    isSafari || isIOS ? "safari-back-to-top" : "bottom-20",
                  )}
                  style={isSafari || isIOS ? { bottom: "5rem" } : {}}
                  aria-label="Back to top"
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Detail panel */}
        {showDetail && selectedLocation && (
          <div
            ref={detailContainerRef}
            className="absolute inset-0 md:relative md:inset-auto md:w-96 bg-white z-30 md:border-l overflow-hidden animate-slide-in"
            style={{ height: isMobile ? "100%" : "calc(100% - 0px)" }}
          >
            {/* Mobile back button */}
            {isMobile && (
              <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeDetail}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    closeDetail()
                  }}
                  className="h-8 w-8 p-0 mr-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h3 className="font-medium truncate">{selectedLocation.name}</h3>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => shareLocation(selectedLocation)}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      shareLocation(selectedLocation)
                    }}
                    aria-label="Share Location"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="h-full overflow-auto" style={{ height: isMobile ? "calc(100% - 49px)" : "100%" }}>
              <LocationDetail location={selectedLocation} onCloseAction={closeDetail} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile view selector with Safari-specific fixes */}
      {isMobile && (
        <div
          className={cn(
            "border-t bg-white sticky z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]",
            isSafari || isIOS ? "safari-tabs" : "bottom-0",
          )}
          style={
            isSafari || isIOS
              ? {
                  bottom: 0,
                  position: "sticky",
                  zIndex: 20,
                }
              : {}
          }
        >
          <Tabs defaultValue={activeView} value={activeView} onValueChange={handleViewChange} className="w-full">
            <TabsList className="w-full grid grid-cols-2 p-1">
              <TabsTrigger
                value="map"
                className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white py-3 transition-all duration-200"
                onTouchEnd={(e) => {
                  if (activeView !== "map") {
                    e.preventDefault()
                    handleViewChange("map")
                  }
                }}
              >
                <MapIcon className="h-5 w-5 mr-2" />
                Map
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white py-3 transition-all duration-200"
                onTouchEnd={(e) => {
                  if (activeView !== "list") {
                    e.preventDefault()
                    handleViewChange("list")
                  }
                }}
              >
                <List className="h-5 w-5 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* View on map button when in list view with selected location */}
      {isMobile && activeView === "list" && selectedLocation && (
        <div
          className={cn("fixed left-0 right-0 mx-4 z-20", isSafari || isIOS ? "safari-view-on-map" : "bottom-20")}
          style={isSafari || isIOS ? { bottom: "5rem" } : {}}
        >
          <Button
            className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 shadow-lg"
            onClick={() => {
              setActiveView("map")
              // Center map on selected location
              const coordinates = getLocationCoordinates(selectedLocation)
              if (coordinates) {
                setMapCenter(coordinates)
                setMapZoom(15) // Zoom in for better visibility
              }

              // Show preview after a short delay to allow view transition
              setTimeout(() => {
                setPreviewLocation(selectedLocation)
                setShowMobilePreview(true)
              }, 300)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              setActiveView("map")
              // Center map on selected location
              const coordinates = getLocationCoordinates(selectedLocation)
              if (coordinates) {
                setMapCenter(coordinates)
                setMapZoom(15)
              }

              // Show preview after a short delay
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

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg">
            <Loader2 className="h-10 w-10 text-[#FF6B6B] animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Loading locations...</p>
          </div>
        </div>
      )}

      {/* Debug info for Safari issues - only visible in development */}
      {process.env.NODE_ENV === "development" && (isSafari || isIOS) && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-1 z-50">
          <details>
            <summary>Debug Info</summary>
            <p>Browser: {browserInfo}</p>
            <p>Safari: {isSafari ? "Yes" : "No"}</p>
            <p>iOS: {isIOS ? "Yes" : "No"}</p>
            <p>Viewport: {viewportHeight}px</p>
            <p>Fixes Applied: {safariFixesApplied ? "Yes" : "No"}</p>
          </details>
        </div>
      )}

      {/* Global styles for animations and Safari fixes */}
      <style jsx global>{`
        /* Animation keyframes */
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

        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }

        .tab-transition {
          transition: all 0.3s ease;
        }

        /* Safari-specific fixes */
        .safari-mobile {
          /* Use viewport height variable for more accurate height calculations */
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .safari-mobile body {
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .safari-mobile .absolute {
          position: absolute !important;
        }

        .safari-mobile button {
          -webkit-appearance: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Fix z-index stacking in Safari */
        .safari-mobile .z-20 {
          z-index: 20 !important;
        }

        .safari-mobile .z-30 {
          z-index: 30 !important;
        }

        /* Improve touch targets for Safari */
        @media (max-width: 767px) {
          .safari-mobile button {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Fix for Safari touch handling */
          .safari-mobile * {
            touch-action: manipulation;
          }
        }

        /* Use CSS variable for viewport height */
        .safari-container {
          height: calc(var(--vh, 1vh) * 100 - 4rem);
        }

        /* Ensure buttons are visible and clickable in Safari */
        .safari-button {
          transform: translateX(-50%) !important;
          -webkit-transform: translateX(-50%) !important;
          position: absolute !important;
          z-index: 30 !important;
          display: flex !important;
          visibility: visible !important;
        }

        /* Fix for Safari drawer positioning */
        .safari-drawer {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 20 !important;
        }

        /* Fix for Safari tabs positioning */
        .safari-tabs {
          position: sticky !important;
          bottom: 0 !important;
          z-index: 20 !important;
        }

        /* Fix for Safari preview positioning */
        .safari-preview {
          position: absolute !important;
          bottom: 5rem !important;
          z-index: 20 !important;
        }

        /* Fix for Safari back to top button */
        .safari-back-to-top {
          position: fixed !important;
          bottom: 5rem !important;
          z-index: 10 !important;
        }

        /* Fix for Safari view on map button */
        .safari-view-on-map {
          position: fixed !important;
          bottom: 5rem !important;
          z-index: 20 !important;
        }

        /* Enhanced mobile touch interaction styles */
        @media (max-width: 768px) {
          /* Prevent text selection during touch interactions */
          .map-container * {
            user-select: none;
            -webkit-user-select: none;
          }
          
          /* Increase touch targets */
          button, 
          .marker-container,
          .marker-pin {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Improve touch feedback */
          .marker-container:active {
            transform: scale(1.2);
          }
        }

        /* Marker preview styles */
        .marker-preview {
          position: fixed;
          top: 50%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          animation: fade-in-up 0.3s ease-out forwards;
          max-height: 40vh;
          overflow-y: auto;
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-90%);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(-100%);
          }
        }

        /* Safari-specific marker preview fixes */
        @supports (-webkit-touch-callout: none) {
          .marker-preview {
            transform: translateX(-50%) translateY(-100%) !important;
            -webkit-transform: translateX(-50%) translateY(-100%) !important;
            z-index: 999 !important;
          }
        }

        /* Ensure preview is visible on smaller screens */
        @media (max-width: 640px) {
          .marker-preview {
            max-height: 50vh;
          }
        }

        /* Adjust for landscape orientation */
        @media (max-width: 768px) and (orientation: landscape) {
          .marker-preview {
            max-height: 70vh;
            top: 40%;
          }
        }
      `}</style>
    </div>
  )
}
