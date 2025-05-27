/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react"
import { cn } from "@/lib/utils"
import { addedLocations, searchLocations, type Location } from "./map-data"
import { locationMatchesCategories, getCategoryColor } from "./category-utils"
import InteractiveMap from "./interactive-map"
import LocationList from "./location-list"
import LocationDetail from "./location-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Copy } from "lucide-react"
import Image from "next/image"
import {
  Search,
  X,
  List,
  MapIcon,
  Loader2,
  Filter,
  Maximize2,
  Minimize2,
  Navigation,
  ChevronUp,
  Info,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import FilterBar from "@/components/filter-bar"
import { optimizedFetch, debounce, throttle } from "@/lib/api-cache"
import { mapPersistenceService } from "@/lib/map-persistence-service"
import type { PersistentMapState } from "@/lib/map-state-persistence"

export default function MapExplorer() {
  // Browser detection states
  const [isSafari, setIsSafari] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [browserInfo, setBrowserInfo] = useState<string>("")

  // UI states - moved up before map persistence initialization
  const [activeView, setActiveView] = useState<"map" | "list">("map")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
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
  const [showLegend, setShowLegend] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareData, setShareData] = useState<{
    url: string
    title: string
    text: string
    location: Location | null
  }>({
    url: "",
    title: "",
    text: "",
    location: null,
  })

  // Core states
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; email?: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([-71.0589, 42.3601]) // Default to Boston
  const [mapZoom, setMapZoom] = useState(12)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Refs for container elements
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const mobileListRef = useRef<HTMLDivElement>(null)
  const listScrollRef = useRef<HTMLDivElement>(null)
  const showListButtonRef = useRef<HTMLButtonElement>(null)
  const lastClickTimeRef = useRef<number>(0)

  // Initialize map persistence service
  useEffect(() => {
    // Load saved state
    const savedState = mapPersistenceService.initialize()
    
    // Apply saved state
    if (savedState) {
      setMapCenter(savedState.center)
      setMapZoom(savedState.zoom)
      setSearchQuery(savedState.searchQuery)
      setSelectedCategories(savedState.selectedCategories)
      setActiveView(savedState.activeView)
    }
  }, [])

  // Save map state when relevant states change
  useEffect(() => {
    mapPersistenceService.updateState({
      center: mapCenter,
      zoom: mapZoom,
      selectedLocationId: selectedLocation?.id || null,
      searchQuery,
      selectedCategories,
      activeView,
      filteredLocationIds: filteredLocations.map(loc => loc.id),
      markers: filteredLocations.map(loc => ({
        id: loc.id,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        category: (typeof loc.categories?.[0] === 'object' ? loc.categories[0]?.name : loc.categories?.[0]) || '',
        isSelected: loc.id === selectedLocation?.id
      })),
      lastUpdated: Date.now(),
      lastInteraction: 'update'
    })
  }, [
    mapCenter,
    mapZoom,
    selectedLocation?.id,
    searchQuery,
    selectedCategories,
    activeView,
    filteredLocations
  ])

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

  // Helper function to get image URL
  const getImageUrl = useCallback((location: Location): string => {
    if (typeof location.featuredImage === "string") {
      return location.featuredImage
    } else if (location.featuredImage?.url) {
      return location.featuredImage.url
    } else if (location.imageUrl) {
      return location.imageUrl
    }
    return "/placeholder.svg"
  }, [])

  // Add this useEffect near the top of your component, after your state declarations
  // but before other useEffects

  useEffect(() => {
    // Check for locationId in URL when the component mounts
    const handleInitialLocationId = async () => {
      if (typeof window !== "undefined") {
        try {
          const url = new URL(window.location.href)
          const locationId = url.searchParams.get("locationId")

          if (locationId && allLocations.length > 0) {
            // Find the location with the matching ID
            const location = allLocations.find((loc) => loc.id === locationId)

            if (location) {
              console.log("Opening location from URL parameter:", location.name)

              // Select the location
              setSelectedLocation(location)

              // Open the detail dialog
              setIsDetailOpen(true)

              // Center map on the location
              const coordinates = getLocationCoordinates(location)
              if (coordinates) {
                setMapCenter(coordinates)
                setMapZoom(14)
              }

              // Switch to map view if on mobile
              if (isMobile && activeView !== "map") {
                setActiveView("map")
              }
            }
          }
        } catch (error) {
          console.error('Failed to parse URL for location ID:', error)
          // Continue without location ID
        }
      }
    }

    // Only run this effect when allLocations are loaded
    if (allLocations.length > 0) {
      handleInitialLocationId()
    }
  }, [allLocations, getLocationCoordinates, isMobile, activeView])

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

  // Add state for location request status
  const [locationRequestStatus, setLocationRequestStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  // Function to request user location - removed dependency on locationRequestStatus to prevent infinite loop
  const requestUserLocation = useCallback(() => {
    console.log("🌍 Requesting user location...")
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error("❌ Geolocation is not supported by this browser")
      toast.error("Geolocation is not supported by this browser")
      setLocationRequestStatus('denied')
      return
    }

    // Check if we're on HTTPS or localhost (required for geolocation on most browsers)
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn("⚠️ Geolocation requires HTTPS or localhost in most browsers")
      toast.error("Location access requires a secure connection (HTTPS) or localhost")
      setLocationRequestStatus('denied')
      return
    }

    console.log("✅ Geolocation is supported, requesting position...")
    setLocationRequestStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
        console.log("✅ Got user location:", userCoords)
        console.log("📍 Accuracy:", position.coords.accuracy, "meters")
        console.log("🎯 Setting map center to user location")
        
        setUserLocation(userCoords)
        setLocationRequestStatus('granted')
        
        // Center map on user location
        setMapCenter(userCoords)
        setMapZoom(14) // Zoom in closer when centering on user
        
        toast.success(`Map centered on your location (±${Math.round(position.coords.accuracy)}m accuracy)`)
      },
      (err) => {
        console.error("❌ Error getting user location:", err)
        setLocationRequestStatus('denied')
        
        // Handle different types of geolocation errors
        let errorMessage = "Could not get your location"
        let toastMessage = ""
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location access denied by user"
            toastMessage = "Location access denied. You can use the location button to try again."
            console.log("❌ User denied location permission")
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable"
            toastMessage = "Location service unavailable. Using default map view."
            console.log("❌ Position unavailable")
            break
          case err.TIMEOUT:
            errorMessage = "Location request timed out"
            toastMessage = "Location request took too long. Click the location button to try again."
            console.log("❌ Location request timeout")
            break
          default:
            errorMessage = "Unknown geolocation error"
            toastMessage = "Unable to get location. You can browse locations manually."
            console.log("❌ Unknown geolocation error:", err)
        }
        
        console.log("Error details:", { code: err.code, message: err.message })
        
        // Only show error toast for manual requests, not auto-requests
        toast.error(toastMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Reduced timeout to 10 seconds for better UX
        maximumAge: 60000 // Accept cached position if less than 1 minute old
      }
    )
  }, []) // Remove dependency to prevent infinite loop

  // Auto-request user location on page load - only run once
  useEffect(() => {
    // Only run if we don't already have user location and haven't tried before
    if (userLocation || locationRequestStatus !== 'idle') return
    
    console.log("🎯 Auto-requesting user location on page load...")
    
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      requestUserLocation()
    }, 1000) // 1 second delay
    
    return () => clearTimeout(timer)
  }, []) // Empty dependency array - only run once on mount

  // Remove the auto-click fallback method as it's redundant and causes issues

  // Load locations
  useEffect(() => {
    let isMounted = true
    
    async function loadLocations() {
      try {
        console.log("🔄 [MAP-EXPLORER] Starting loadLocations function...")
        setLocationsLoading(true)
        setError(null)

        console.log("🔄 [MAP-EXPLORER] Calling addedLocations()...")
        const locations = await addedLocations()

        // Only update state if component is still mounted
        if (!isMounted) return

        console.log(`✅ [MAP-EXPLORER] Fetched ${locations.length} locations:`, locations)

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
        
        if (isMounted) {
          setCategories(categoryArray)
          setLocationsLoading(false)
        }
      } catch (err) {
        console.error("Error loading locations:", err)
        if (isMounted) {
          setError("Failed to load locations. Please try again.")
          setLocationsLoading(false)
        }
      }
    }

    // Only load once
    loadLocations()
    
    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array - only run once

  // Set default location on component mount
  useEffect(() => {
    console.log("🚀 Component mounted, setting default location...")
    
    // Set a default location immediately (Boston) so the map shows something
    console.log("🌍 Setting default location to Boston...")
    setMapCenter([-71.0589, 42.3601])
    setMapZoom(12)
  }, []) // Empty dependency array - only run once on mount

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
      setIsDetailOpen(false)
      setPreviewLocation(null)
      setShowMobilePreview(false)
    }
  }, [searchQuery, selectedCategories, allLocations, selectedLocation])

  // Handle location selection with Safari-specific fixes - optimized dependencies
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

      // Set the selected location
      setSelectedLocation(location)

      // Set the preview location for mobile
      if (isMobile) {
        setPreviewLocation(location)
        setShowMobilePreview(true)
      }

      // Hide the list drawer if it's showing
      if (showMobileList) {
        setShowMobileList(false)
      }

      // Reset selection state after a delay
      setTimeout(() => {
        setIsSelecting(false)
      }, 500) // Longer timeout for Safari
    },
    [getLocationCoordinates], // Minimize dependencies to reduce rerenders
  )

  // Handle view details from preview
  // Update the handleViewDetails function to use dialog-based detail view
  const handleViewDetails = useCallback(() => {
    if (previewLocation) {
      setSelectedLocation(previewLocation)
      setIsDetailOpen(true) // Open the dialog
      setShowMobilePreview(false)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, [previewLocation])

  // Handle map click - throttled to prevent excessive state updates
  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      // Ignore if touch just started (to prevent double-firing on Safari)
      if (touchStarted) return

      // Throttle rapid clicks
      const now = Date.now()
      if (now - lastClickTimeRef.current < 200) {
        return
      }
      lastClickTimeRef.current = now

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
    },
    [], // Remove most dependencies to reduce rerenders
  )

  // Handle map move - stabilized with ref to prevent re-renders
  const handleMapMove = useCallback((center: [number, number], zoom: number) => {
    // Use a more aggressive threshold to reduce state updates
    const positionThreshold = 0.001 // ~100m tolerance
    const zoomThreshold = 0.1
    
    // Batch state updates to prevent multiple rerenders
    setMapCenter(prevCenter => {
      if (Math.abs(prevCenter[0] - center[0]) > positionThreshold || 
          Math.abs(prevCenter[1] - center[1]) > positionThreshold) {
        return center
      }
      return prevCenter
    })
    
    setMapZoom(prevZoom => {
      if (Math.abs(prevZoom - zoom) > zoomThreshold) {
        return zoom
      }
      return prevZoom
    })
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
    setIsDetailOpen(false)
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

      // No need to close detail view when switching to list, dialog handles itself

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
    [isMobile, showMobilePreview, showMobileList, isSafari, isIOS],
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

  // Toggle category legend
  const toggleLegend = useCallback(() => {
    setShowLegend((prev) => !prev)
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
      // No need to handle Escape for detail dialog - it handles itself

      // Handle escape for preview and search
      if (e.key === "Escape") {
        if (showMobilePreview) {
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
  }, [showMobilePreview, isSearchExpanded, closeMobilePreview])

  // Share location function
  // Share location function with improved design and user experience
  const shareLocation = useCallback(
    (location: Location) => {
      if (!location) return

      // Create a properly formatted share URL with the location ID
      const createShareUrl = () => {
        const url = new URL(window.location.origin + window.location.pathname)
        // Add the location ID as a parameter
        url.searchParams.set("locationId", location.id)
        return url.toString()
      }

      const shareUrl = createShareUrl()
      const title = `Check out ${location.name} on Local Explorer`
      const text = location.description
        ? `${location.name} - ${location.description.substring(0, 100)}${location.description.length > 100 ? "..." : ""}`
        : `I found this interesting place called ${location.name}!`

      // Use the Web Share API if available (mobile devices)
      if (navigator.share) {
        navigator
          .share({
            title,
            text,
            url: shareUrl,
          })
          .then(() => {
            // Show success toast
            toast( "Location shared!", {
             
              description: "The location has been shared",
            })
          })
          .catch((err) => {
            // Only show error for actual errors, not user cancellations
            if (err.name !== "AbortError") {
              console.error("Error sharing:", err)
              toast("Share failed", {
               
                description: "Could not share this location",
               
              })
            }
          })
      } else {
        // For desktop browsers, show a share dialog with options
        setShareDialogOpen(true)
        setShareData({
          url: shareUrl,
          title,
          text,
          location,
        })
      }
    },
    [toast],
  )

  // Scroll to top function for list view
  const scrollToTop = useCallback(() => {
    if (listScrollRef.current) {
      listScrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }, [])

  // Add this function to your component, near your other handler functions:
  const openLocationById = useCallback(
    (locationId: string) => {
      const location = allLocations.find((loc) => loc.id === locationId)

      if (location) {
        // Select the location
        setSelectedLocation(location)

        // Open the detail dialog
        setIsDetailOpen(true)

        // Center map on the location
        const coordinates = getLocationCoordinates(location)
        if (coordinates) {
          setMapCenter(coordinates)
          setMapZoom(14)
        }

        // Switch to map view if on mobile
        if (isMobile && activeView !== "map") {
          setActiveView("map")
        }

        return true
      }

      return false
    },
    [allLocations, getLocationCoordinates, isMobile, activeView],
  )

  // Expose this function globally for deep linking
  useEffect(() => {
    if (typeof window !== "undefined" && allLocations.length > 0) {
      
      window.openLocationById = openLocationById
    }

    return () => {
      if (typeof window !== "undefined") {
        
        delete window.openLocationById
      }
    }
  }, [openLocationById, allLocations])

  // Add this useEffect after the other useEffects in the component
  useEffect(() => {
    const handleViewLocationDetails = (e: CustomEvent) => {
      const locationId = e.detail
      const location = allLocations.find((loc) => loc.id === locationId)
      if (location) {
        setSelectedLocation(location)
        setIsDetailOpen(true) // Open the dialog

        // Close any open popups or previews
        setShowMobilePreview(false)
        setPreviewLocation(null)
      }
    }

    const handleOpenLocationDetail = (e: CustomEvent) => {
      const { location } = e.detail
      if (location) {
        setSelectedLocation(location)
        setIsDetailOpen(true) // Open the dialog

        // Close any open popups or previews
        setShowMobilePreview(false)
        setPreviewLocation(null)
      }
    }

    document.addEventListener("viewLocationDetails", handleViewLocationDetails as EventListener)
    document.addEventListener("openLocationDetail", handleOpenLocationDetail as EventListener)

    return () => {
      document.removeEventListener("viewLocationDetails", handleViewLocationDetails as EventListener)
      document.removeEventListener("openLocationDetail", handleOpenLocationDetail as EventListener)
    }
  }, [allLocations])

  // Add this ShareDialog component just before the return statement of your component
  const ShareDialog = () => {
    if (!shareData.location) return null

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(shareData.url)
        toast( "Link copied!", {
         
          description: "Location link copied to clipboard",
        })
        setShareDialogOpen(false)
      } catch (err) {
        console.error("Error copying to clipboard:", err)
        toast( "Copy failed", {
         
          description: "Could not copy link to clipboard",
          
        })
      }
    }

    const shareViaEmail = () => {
      const subject = encodeURIComponent(shareData.title)
      const body = encodeURIComponent(`${shareData.text}\n\nCheck it out here: ${shareData.url}`)
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank")
      setShareDialogOpen(false)
    }

    const shareViaFacebook = () => {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`,
        "_blank",
        "width=600,height=400",
      )
      setShareDialogOpen(false)
    }

    const shareViaTwitter = () => {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`,
        "_blank",
        "width=600,height=400",
      )
      setShareDialogOpen(false)
    }

    const shareViaWhatsApp = () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`, "_blank")
      setShareDialogOpen(false)
    }

    return (
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this location</DialogTitle>
            <DialogDescription>Share {shareData.location.name} with friends and family</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Image
                src={getImageUrl(shareData.location) || "/placeholder.svg"}
                alt={shareData.location.name}
                width={60}
                height={60}
                className="rounded-md object-cover"
              />
              <div>
                <h3 className="font-medium">{shareData.location.name}</h3>
                <p className="text-sm text-gray-500 truncate max-w-[200px]">
                  {shareData.location.address
                    ? typeof shareData.location.address === "string"
                      ? shareData.location.address
                      : Object.values(shareData.location.address).filter(Boolean).join(", ")
                    : "No address available"}
                </p>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="relative">
                <Input value={shareData.url} readOnly className="pr-20" />
                <Button variant="ghost" size="sm" className="absolute right-1 top-1 h-7" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                onClick={shareViaFacebook}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z" />
                </svg>
                <span className="sr-only">Facebook</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-sky-400 hover:bg-sky-500 text-white"
                onClick={shareViaTwitter}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 5.8a8.49 8.49 0 0 1-2.36.64 4.13 4.13 0 0 0 1.81-2.27 8.21 8.21 0 0 1-2.61 1 4.1 4.1 0 0 0-7 3.74 11.64 11.64 0 0 1-8.45-4.29 4.16 4.16 0 0 0-.55 2.07 4.09 4.09 0 0 0 1.82 3.41 4.05 4.05 0 0 1-1.86-.51v.05a4.1 4.1 0 0 0 3.3 4 3.93 3.93 0 0 1-1.1.17 4.9 4.9 0 0 1-.77-.07 4.11 4.11 0 0 0 3.83 2.84A8.22 8.22 0 0 1 3 18.34a7.93 7.93 0 0 1-1-.06 11.57 11.57 0 0 0 6.29 1.85A11.59 11.59 0 0 0 20 8.45v-.53a8.43 8.43 0 0 0 2-2.12Z" />
                </svg>
                <span className="sr-only">Twitter</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-green-500 hover:bg-green-600 text-white"
                onClick={shareViaWhatsApp}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span className="sr-only">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-gray-500 hover:bg-gray-600 text-white"
                onClick={shareViaEmail}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span className="sr-only">Email</span>
              </Button>
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Add event listeners for location save/subscribe events and refresh locations
  useEffect(() => {
    const handleLocationSaved = () => {
      // Force refresh to update UI
      setRefreshKey(prev => prev + 1)
    }
    
    const handleLocationSubscribed = () => {
      // Force refresh to update UI
      setRefreshKey(prev => prev + 1)
    }
    
    // Listen for custom events
    document.addEventListener('locationSaved', handleLocationSaved)
    document.addEventListener('locationSubscribed', handleLocationSubscribed)
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('locationSaved', handleLocationSaved)
      document.removeEventListener('locationSubscribed', handleLocationSubscribed)
    }
  }, [])

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me')
        if (response.ok) {
          const userData = await response.json()
          setCurrentUser(userData.user)
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }

    loadCurrentUser()
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
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: getCategoryColor(category) }}
                              ></div>
                              <span>{category.name}</span>
                            </div>
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
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getCategoryColor(category) }}
                          ></div>
                          <span>{category.name}</span>
                        </div>
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
              const color = getCategoryColor(category)
              return (
                <Badge
                  key={categoryId}
                  variant="outline"
                  className="px-2 py-0.5 h-6 text-xs font-medium"
                  style={{
                    backgroundColor: `${color}10`,
                    color: color,
                    borderColor: `${color}30`,
                  }}
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
                isLoading={locationsLoading}
                currentUser={currentUser || undefined}
                onViewDetail={(location) => {
                  setSelectedLocation(location)
                  setIsDetailOpen(true) // Open the dialog
                }}
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
          <InteractiveMap
            locations={filteredLocations}
            userLocation={userLocation}
            center={mapCenter}
            zoom={mapZoom}
            mapStyle="streets-v12"
            onMarkerClick={handleLocationSelect}
            onMapClick={handleMapClick}
            onMapMove={handleMapMove}
            className="h-full w-full"
            selectedLocation={selectedLocation}
            onViewDetail={(location) => {
              setSelectedLocation(location)
              setIsDetailOpen(true) // Open the dialog
            }}
          />

          {/* Map controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            {/* Location controls */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {userLocation ? (
                    <Button
                      id="go-to-my-location-btn"
                      variant="default"
                      size="icon"
                      onClick={() => {
                        console.log("🎯 Centering map on user location:", userLocation)
                        setMapCenter(userLocation)
                        setMapZoom(15)
                        toast.success("Centered on your location")
                      }}
                      className="bg-white text-gray-800 shadow-md hover:bg-gray-100 border border-gray-200 rounded-full h-10 w-10"
                      aria-label="Go to my location"
                    >
                      <Navigation className="h-4 w-4 text-blue-600" />
                    </Button>
                  ) : (
                    <Button
                      id="find-my-location-btn"
                      variant="default"
                      size="icon"
                      onClick={() => {
                        console.log("🔄 Manual location request triggered")
                        requestUserLocation()
                      }}
                      disabled={locationRequestStatus === 'requesting'}
                      className="bg-white text-gray-800 shadow-md hover:bg-gray-100 border border-gray-200 rounded-full h-10 w-10"
                      aria-label="Find my location"
                    >
                      {locationRequestStatus === 'requesting' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <Navigation className="h-4 w-4 text-gray-600" />
                      )}
                    </Button>
                  )}
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>
                    {userLocation 
                      ? "Go to My Location" 
                      : locationRequestStatus === 'requesting' 
                        ? "Getting location..." 
                        : locationRequestStatus === 'denied' 
                          ? "Retry Location Access"
                          : "Find My Location"
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={toggleLegend}
                    className={cn(
                      "bg-white text-gray-800 shadow-md hover:bg-gray-100 border border-gray-200 rounded-full h-10 w-10",
                      showLegend && "bg-gray-100",
                    )}
                    aria-label="Show category legend"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Category Legend</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Category legend */}
          {showLegend && (
            <div className="absolute top-4 right-16 bg-white rounded-lg shadow-lg p-3 z-20 w-56">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-800 px-2">Categories</h4>
                {isMobile && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleLegend}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center px-2">
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: getCategoryColor(category) }}
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile list drawer with Safari-specific fixes */}
          {isMobile && showMobileList && (
            <div
              ref={mobileListRef}
              className={cn(
                "absolute left-0 right-0 bg-white z-20 rounded-t-xl shadow-lg transition-all duration-300 ease-in-out",
                listHeight === "partial" ? "h-[50%]" : "h-[80%]",
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
                  isLoading={locationsLoading}
                  currentUser={currentUser || undefined}
                  onViewDetail={(location) => {
                    setSelectedLocation(location)
                    setIsDetailOpen(true) // Open the dialog
                  }}
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
            <div ref={listScrollRef} className="h-full overflow-y-auto overscroll-contain">
              <LocationList
                locations={filteredLocations}
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                isLoading={locationsLoading}
                currentUser={currentUser || undefined}
                onViewDetail={(location) => {
                  setSelectedLocation(location)
                  setIsDetailOpen(true) // Open the dialog
                }}
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

        {/* Location Detail Dialog - Use the new dialog-based component instead of a side panel */}
        <LocationDetail location={selectedLocation} isOpen={isDetailOpen} onClose={closeDetail} isMobile={isMobile} />
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
      {locationsLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg">
            <Loader2 className="h-10 w-10 text-[#FF6B6B] animate-spin mb-4" />
            <p className="text-gray-700 font-medium">Loading locations...</p>
          </div>
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
      <ShareDialog />
    </div>
  )
}
