/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Calendar, Filter, Plus, Loader2, UserCircle, MapPin, Clock, ChevronDown, Search, SlidersHorizontal, X, Bookmark, Sparkles } from 'lucide-react'
import { EventCard } from "@/components/event/event-card"
import EventsFilter from "@/components/event/events-filter"
import { getNearbyEventsAction, getUserEventsByCategory, getNotifications, getSavedGemJourneys, unsaveGemJourney } from "@/app/(frontend)/events/actions"
import type { Event } from "@/types/event"
import { toast } from "sonner"
import Link from "next/link"
import { updateUserLocation } from "@/app/actions"
import type { EventFilterOptions } from "@/types/event-filter"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import SavedGemJourneysClient from './SavedGemJourneysClient'

export default function EventsContainer({
  initialUserId,
  savedJourneys,
  initialSearchParams
}: {
  initialUserId?: string,
  savedJourneys: any[],
  initialSearchParams: any
}) {
  const router = useRouter()
  // Convert initialSearchParams to URLSearchParams
  const searchParams = new URLSearchParams(
    typeof initialSearchParams === "string"
      ? initialSearchParams
      : Object.entries(initialSearchParams)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&")
  )
  const [isPending, startTransition] = useTransition()
  const isMounted = useRef(true)

  // Get user data from auth context
  const { user, isLoading: isUserLoading, isAuthenticated } = useAuth()

  // State
  const [events, setEvents] = useState<Event[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [isLoading, setIsLoading] = useState(true) // Start with loading state
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all")
  const [showFilters, setShowFilters] = useState(false)
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number | null
    longitude: number | null
  }>({
    latitude: null,
    longitude: null,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("distance")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [viewMode, setViewMode] = useState("grid") // grid or list
  const [isFilterApplied, setIsFilterApplied] = useState(false)

  // My Events tab state
  const [createdEvents, setCreatedEvents] = useState<Event[]>([])
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([])
  const [isLoadingMyEvents, setIsLoadingMyEvents] = useState(false)
  const [attendingJourneys, setAttendingJourneys] = useState<any[]>([])

  // Filter state with default values from URL or set defaults
  const [eventOptions, setEventOptions] = useState<EventFilterOptions>({
    radiusKm: Number(searchParams.get("radius")) || 25,
    category: searchParams.get("category") || "",
    eventType: searchParams.get("eventType") || "",
    isMatchmaking: searchParams.get("matchmaking") === "true",
    limit: 12,
    offset: 0,
    status: "published",
    userId: user?.id || initialUserId || "",
  })
  useEffect(() => {
    // Only fetch when on "My Events" tab and user is ready
    if (!isAuthenticated) return

    setIsLoadingMyEvents(true)
    if (!user?.id) return
    getUserEventsByCategory(user.id)
      .then(({ success, createdEvents, joinedEvents, error }) => {
        if (success) {
          setCreatedEvents((createdEvents || []) as Event[])
          setJoinedEvents((joinedEvents || []) as Event[])
        } else {
          toast.error(error || 'Could not load your events')
        }
      })
      .catch((err) => {
        console.error('Error in getUserEventsByCategory:', err)
        toast.error('Failed to load your events')
      })
      .finally(() => {
        setIsLoadingMyEvents(false)
      })
  }, [isAuthenticated, user?.id])

  // Update userId in eventOptions when user data changes
  useEffect(() => {
    if (user?.id && user.id !== eventOptions.userId) {
      setEventOptions((prev) => ({
        ...prev,
        userId: user.id,
      }))
    }
  }, [user, eventOptions.userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Check if any filters are applied
  useEffect(() => {
    const hasFilters =
      !!eventOptions.category || !!eventOptions.eventType || eventOptions.isMatchmaking || eventOptions.radiusKm !== 25

    setIsFilterApplied(hasFilters)
  }, [eventOptions])

  // Get user's geolocation
  useEffect(() => {
    if (!isMounted.current) return

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          if (!isMounted.current) return

          console.log("Geolocation obtained:", { latitude, longitude })
          setUserCoordinates({ latitude, longitude })

          // Update event options with coordinates
          setEventOptions((prev) => ({
            ...prev,
            coordinates: { latitude, longitude },
          }))

          // Update user location if we have a user
          if (user?.id && latitude && longitude) {
            updateUserLocation(user.id, { latitude, longitude }).catch(console.error)
          }
        },
        (err) => {
          console.warn("Geolocation unavailable or denied:", err)
          if (isMounted.current) {
            toast.error("Location access denied. Some features may be limited.")
          }
        },
        { timeout: 10000, enableHighAccuracy: true },
      )
    }
  }, [user])

  // Load events with specific options
  const loadEventsWithOptions = useCallback(
    async (options: EventFilterOptions) => {
      setIsLoading(true)
      try {
        // Map EventFilterOptions to GetNearbyEventsParams
        const nearbyParams = {
          userId: options.userId,
          radiusKm: options.radiusKm,
          category: options.category,
          eventType: options.eventType,
          isMatchmaking: options.isMatchmaking,
          limit: options.limit,
          offset: options.offset,
        }
        
        // Invoke the server action (cookies auto-read server-side)
        const nearby = await getNearbyEventsAction(nearbyParams)
  
        if (Array.isArray(nearby)) {
          // Map to Event[] and update state
          setEvents(nearby.map(item => item.event as Event))
          setTotalEvents(nearby.length)
        } else {
          console.error('Unexpected response from getNearbyEventsAction:', nearby)
          setEvents([])
          setTotalEvents(0)
        }
      } catch (error) {
        console.error('Error loading events:', error)
        toast.error('Failed to load events')
        setEvents([])
        setTotalEvents(0)
      } finally {
        setIsLoading(false)
      }
    },
    []  // dependencies only if constants or stable callbacks are used
  )

  // Load events based on current options
  const loadEvents = useCallback(() => {
    loadEventsWithOptions(eventOptions)
  }, [eventOptions, loadEventsWithOptions])

  // Load My Events data
  const loadMyEvents = useCallback(async () => {
    if (!user?.id || activeTab !== "my-events" || !isMounted.current) return

    setIsLoadingMyEvents(true)
    try {
      const eventsData = await getUserEventsByCategory(user.id)
      // Fetch journeys where user is an accepted invitee
      const journeysRes = await fetch(`/api/journeys?attendingFor=${user.id}`)
      const journeysData = await journeysRes.json()
      const attending = Array.isArray(journeysData.journeys)
        ? journeysData.journeys.filter((j: any) => (j.invitees || []).some((inv: any) => String(inv.user) === String(user.id) && inv.status === 'accepted'))
        : []
      // Fetch saved journeys using server action
      const saved = await getSavedGemJourneys()
      if (!isMounted.current) return
      if (eventsData.success) {
        setCreatedEvents((eventsData.createdEvents || []) as Event[])
        setJoinedEvents((eventsData.joinedEvents || []) as Event[])
        setAttendingJourneys(attending)
      } else {
        toast.error("Failed to load your events")
      }
    } catch (error) {
      console.error("Error loading my events:", error)
      if (isMounted.current) {
        toast.error("Failed to load your events")
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingMyEvents(false)
      }
    }
  }, [user, activeTab])

  // Initial data loading
  useEffect(() => {
    // Skip if component is not mounted
    if (!isMounted.current) return

    // If we're on the my-events tab, load my events
    if (activeTab === "my-events") {
      loadMyEvents()
      return
    }

    // If we're still loading user data, wait
    if (isUserLoading) return

    // Load events with current options
    console.log("Initial data loading with options:", eventOptions)
    loadEvents()
  }, [activeTab, isUserLoading, loadEvents, loadMyEvents])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Update URL
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", value)
      router.push(`/events?${params.toString()}`)
    })
  }

  // Handle filter change
  const handleFilterChange = (newFilters: any) => {
    // Update event options with new filters
    setEventOptions((prev) => ({
      ...prev,
      ...newFilters,
    }))

    // Update URL
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, String(value))
        } else {
          params.delete(key)
        }
      })
      router.push(`/events?${params.toString()}`)
    })
  }

  // Handle radius change
  const handleRadiusChange = (radius: number) => {
    // Update event options with new radius
    setEventOptions((prev) => ({
      ...prev,
      radiusKm: radius,
    }))

    // Update URL
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("radius", String(radius))
      router.push(`/events?${params.toString()}`)
    })
  }

  useEffect(() => {
    // Skip loading if on "My Events" tab or user not ready
    if (activeTab !== 'all') return
    loadEventsWithOptions(eventOptions)
  }, [activeTab, eventOptions, loadEventsWithOptions])
  
  // Optionally, handle "Load More" by updating offset
  const handleLoadMore = () => {
    setEventOptions(prev => ({ ...prev, offset: (prev.offset || 0) + (prev.limit || 0) }))
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality here
    toast.info(`Searching for "${searchQuery}"`)
  }

  // Handle sort change
  const handleSortChange = (option: string) => {
    setSortOption(option)
    // Implement sorting logic here
  }

  // Handle clear filters
  const handleClearFilters = () => {
    setEventOptions({
      radiusKm: 25,
      limit: 12,
      offset: 0,
      status: "published",
      userId: user?.id || initialUserId || "",
      coordinates:
        userCoordinates.latitude && userCoordinates.longitude
          ? { latitude: userCoordinates.latitude, longitude: userCoordinates.longitude }
          : undefined,
    })

    // Update URL
    startTransition(() => {
      const params = new URLSearchParams()
      params.set("tab", activeTab)
      router.push(`/events?${params.toString()}`)
    })
  }

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events

    return events.filter(
      (event) =>
        (event.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (event.description || "").toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [events, searchQuery])

  // Add handleUnsave function
  const handleUnsave = async (journeyId: string) => {
    try {
      const result = await unsaveGemJourney(journeyId)
      if (result.success) {
        // Remove the journey from attendingJourneys state
        setAttendingJourneys(prev => prev.filter(journey => journey.id !== journeyId))
        toast.success('Journey removed successfully')
      } else {
        toast.error(result.error || 'Failed to remove journey')
      }
    } catch (error) {
      console.error('Error removing journey:', error)
      toast.error('Failed to remove journey')
    }
  }

  // Render My Events tab content
  const renderMyEventsContent = () => {
    // If user is not logged in
    if (!isAuthenticated) {
      return (
        <div className="text-center py-12 px-4 border rounded-lg bg-gray-50 shadow-sm">
          <UserCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Sign in to view your events</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You need to be signed in to view your events. Please sign in or create an account.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push("/login")} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
              Sign In
            </Button>
            <Button variant="outline" onClick={() => router.push("/signup")}>
              Create Account
            </Button>
          </div>
        </div>
      )
    }

    // If loading
    if (isLoadingMyEvents) {
      return (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Skeleton className="h-px w-full" />

          <div className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Render events section
    const renderEventsSection = (title: string, events: Event[], emptyMessage: string) => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{title}</h3>
          {title === "Events You've Created" && (
            <Button asChild size="sm" className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
              <Link href="/events/create">
                <Plus className="h-4 w-4 mr-1" />
                Create Event
              </Link>
            </Button>
          )}
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-100">
            {events.map((event) => (
              <div key={event.id}>
                <EventCard event={event} compact={true} userCoordinates={userCoordinates} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg bg-gray-50 shadow-sm">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    )

    return (
      <div className="space-y-8">
        {renderEventsSection(
          "Events You've Created",
          createdEvents,
          "You haven't created any events yet. Create your first event to get started!",
        )}

        <Separator className="my-6" />

        {renderEventsSection(
          "Events You're Attending",
          joinedEvents,
          "You're not attending any events yet. Browse events and join ones that interest you!",
        )}

        {/* Journeys You're Attending */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#4ECDC4] flex items-center gap-2">
            <span>Journeys You're Attending</span>
            <span className="inline-block bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-full px-2 py-0.5 text-xs font-semibold">{attendingJourneys.length}</span>
          </h3>
          {attendingJourneys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-100">
              {attendingJourneys.map((journey: any) => (
                <div key={journey.id} className="border rounded-lg p-4 bg-white shadow flex flex-col gap-1">
                  <span className="inline-block bg-[#FFD93D] text-gray-900 px-2 py-0.5 rounded-full text-xs font-bold">Journey</span>
                  {journey.title}
                  <div className="text-gray-700 text-sm mb-1 line-clamp-2">{journey.summary}</div>
                  {journey.context && <div className="text-xs text-gray-400 mb-1">{journey.context}</div>}
                  <Link href={`/events/journey/${journey.id}`} className="text-xs text-[#4ECDC4] underline mt-2">View Journey</Link>
                  <button
                    onClick={() => handleUnsave(journey.id)}
                    className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition self-start"
                  >
                    Unsave
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg bg-gray-50 shadow-sm">
              <span className="text-gray-500">You're not attending any journeys yet.</span>
            </div>
          )}
        </div>

        {/* Saved Hangout Plans */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#FFD93D] flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-[#FFD93D]" />
            <span>Saved Hangout Plans</span>
          </h3>
          <SavedGemJourneysClient plans={savedJourneys} />
        </div>
      </div>
    )
  }

  // Helper function to render events grid
  function renderEventsGrid() {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-40 w-full rounded-md" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    const displayEvents = searchQuery ? filteredEvents : events

    if (displayEvents.length > 0) {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayEvents.map((event) => (
              <div key={event.id}>
                <EventCard event={event} userCoordinates={userCoordinates} />
              </div>
            ))}
          </div>

          {/* Pagination or load more */}
          {events.length < totalEvents && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5"
                onClick={handleLoadMore}
                disabled={isLoading || isPending}
              >
                {isLoading || isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )
    }

    // No events found
    return (
      <div className="text-center py-12 px-4 border rounded-lg bg-gray-50">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-[#FF6B6B]" />
        </div>
        <h3 className="text-xl font-medium mb-2">No events found</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {searchQuery
            ? `No events match your search for "${searchQuery}". Try different keywords.`
            : "No events match your current filters. Try adjusting your filters or create your own event!"}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isFilterApplied && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="border-[#FF6B6B] text-[#FF6B6B]"
              disabled={isPending}
            >
              Clear Filters
            </Button>
          )}
          <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
            <Link href="/events/create">Create Event</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with search, filters and actions */}
      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
        <div className="flex flex-col gap-5">
          {/* Top row with search and action buttons */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="events-search"
                name="search"
                type="search"
                placeholder="Search events..."
                className="pl-10 pr-4 py-2 h-11 bg-gray-50 border-gray-200 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            <div className="flex gap-3">
              <Button
                variant={isFilterApplied ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className={cn("flex items-center gap-2 h-11", isFilterApplied && "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90")}
                disabled={isPending}
              >
                {isFilterApplied ? <SlidersHorizontal className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                {isFilterApplied
                  ? `Filters (${Object.values(eventOptions).filter((v) => v && typeof v !== "object" && v !== "published" && v !== 25).length})`
                  : "Filters"}
              </Button>

              <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 h-11">
                <Link href="/events/create" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Link>
              </Button>
            </div>
          </div>

          {/* Second row with tabs and sort */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white"
                    disabled={isPending}
                  >
                    All Events
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-events"
                    className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white"
                    disabled={isPending}
                  >
                    My Events
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {isFilterApplied && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="text-gray-500 hover:text-gray-700"
                      disabled={isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 ml-auto"
                        disabled={isPending}
                      >
                        Sort: {sortOption === "distance" ? "Nearest" : sortOption === "date" ? "Upcoming" : "Popular"}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSortChange("distance")}>
                        <MapPin className="h-4 w-4 mr-2" />
                        Nearest
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("date")}>
                        <Clock className="h-4 w-4 mr-2" />
                        Upcoming
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("popular")}>
                        <UserCircle className="h-4 w-4 mr-2" />
                        Popular
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Applied filters display */}
              {isFilterApplied && (
                <div className="flex flex-wrap gap-2 items-center mt-4">
                  <span className="text-sm text-gray-500">Active filters:</span>
                  {eventOptions.category && (
                    <Badge variant="outline" className="bg-gray-100">
                      Category: {eventOptions.category}
                      <button
                        className="ml-1 hover:text-red-500"
                        onClick={() => handleFilterChange({ category: "" })}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {eventOptions.eventType && (
                    <Badge variant="outline" className="bg-gray-100">
                      Type: {eventOptions.eventType}
                      <button
                        className="ml-1 hover:text-red-500"
                        onClick={() => handleFilterChange({ eventType: "" })}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {eventOptions.isMatchmaking && (
                    <Badge variant="outline" className="bg-gray-100">
                      Matchmaking
                      <button
                        className="ml-1 hover:text-red-500"
                        onClick={() => handleFilterChange({ isMatchmaking: false })}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {eventOptions.radiusKm !== 25 && (
                    <Badge variant="outline" className="bg-gray-100">
                      Within {eventOptions.radiusKm}km
                      <button
                        className="ml-1 hover:text-red-500"
                        onClick={() => handleRadiusChange(25)}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}

              {/* Tab Content */}
              <TabsContent value="my-events" className="mt-6">
                {renderMyEventsContent()}
              </TabsContent>

              <TabsContent value="all" className="mt-6">
                {renderEventsGrid()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
          <EventsFilter
            filters={{
              category: eventOptions.category || "",
              eventType: eventOptions.eventType || "",
              isMatchmaking: eventOptions.isMatchmaking || false,
            }}
            radius={eventOptions.radiusKm || 25}
            onRadiusChange={handleRadiusChange}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}
    </div>
  )
}
