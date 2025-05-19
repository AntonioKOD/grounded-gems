/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Calendar, Filter, Plus, Loader2, UserCircle } from "lucide-react"
import { EventCard } from "@/components/event/event-card"
import EventsFilter from "@/components/event/events-filter"
import { getNearbyEventsAction, getUserEventsByCategory } from "@/app/(frontend)/events/actions"
import type { Event } from "@/types/event"
import { toast } from "sonner"
import Link from "next/link"
import { updateUserLocation } from "@/app/actions"
import type { EventFilterOptions } from "@/types/event-filter"

export default function EventsContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [events, setEvents] = useState<Event[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all")
  const [showFilters, setShowFilters] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number | null
    longitude: number | null
  }>({
    latitude: null,
    longitude: null,
  })

  // My Events tab state
  const [createdEvents, setCreatedEvents] = useState<Event[]>([])
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([])
  const [isLoadingMyEvents, setIsLoadingMyEvents] = useState(false)

  // Filter state with default values from URL or set defaults
  const [eventOptions, setEventOptions] = useState<EventFilterOptions>({
    radiusKm: Number(searchParams.get("radius")) || 25,
    category: searchParams.get("category") || "",
    eventType: searchParams.get("eventType") || "",
    isMatchmaking: searchParams.get("matchmaking") === "true",
    limit: 12,
    offset: 0,
    status: "published",
  })

  // Get user's geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          setUserCoordinates({ latitude, longitude })

          // Update event options with coordinates
          setEventOptions((prev) => ({
            ...prev,
            coordinates: { latitude, longitude },
          }))
        },
        (err) => {
          console.warn("Geolocation unavailable or denied", err)
          toast.error("Location access denied. Some features may be limited.")
        },
      )
    }
  }, [])

  // Fetch current user and update their location
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          const user = data.user
          setCurrentUser(user)

          // Only update user location if we have valid coordinates
          if (userCoordinates.latitude && userCoordinates.longitude) {
            await updateUserLocation(user.id, {
              latitude: userCoordinates.latitude,
              longitude: userCoordinates.longitude,
            })
          }

          // Update event options with user ID
          setEventOptions((prev) => ({
            ...prev,
            userId: user.id,
          }))
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }

    fetchCurrentUser()
  }, [userCoordinates])

  // Load events based on current options
  const loadEvents = useCallback(async () => {
    setIsLoading(true)

    try {
      // Create a copy of the current options
      const options: EventFilterOptions = { ...eventOptions }

      // Apply tab-specific filters
      if (activeTab === "my-events") {
        // My Events tab is handled separately
        setIsLoading(false)
        return
      } else if (activeTab === "matchmaking") {
        // For matchmaking tab, ensure we're only showing matchmaking events
        options.isMatchmaking = true
      }

      // Ensure userId is provided before calling the action
      if (!options.userId) {
        setEvents([])
        setTotalEvents(0)
        return
      }
      // Call the action with properly structured options
      const response = await getNearbyEventsAction({
        userId: options.userId,
        radiusKm: options.radiusKm,
      })

      // Update state with the results
      setEvents(response.map((item) => item.event as Event))
      setTotalEvents(response.length)
    } catch (error) {
      console.error("Error loading events:", error)
      toast.error("Failed to load events")
      setEvents([])
      setTotalEvents(0)
    } finally {
      setIsLoading(false)
    }
  }, [eventOptions, activeTab, currentUser?.id])

  // Load My Events data
  const loadMyEvents = useCallback(async () => {
    if (!currentUser || activeTab !== "my-events") return

    setIsLoadingMyEvents(true)
    try {
      const eventsData = await getUserEventsByCategory(currentUser.id)

      if (eventsData.success) {
        setCreatedEvents((eventsData.createdEvents || []) as Event[])
        setJoinedEvents((eventsData.joinedEvents || []) as Event[])
      } else {
        toast.error("Failed to load your events")
      }
    } catch (error) {
      console.error("Error loading my events:", error)
      toast.error("Failed to load your events")
    } finally {
      setIsLoadingMyEvents(false)
    }
  }, [currentUser, activeTab])

  // Load events when options or tab changes
  useEffect(() => {
    if (activeTab === "my-events") {
      loadMyEvents()
    } else {
      loadEvents()
    }
  }, [loadEvents, loadMyEvents, activeTab])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`/events?${params.toString()}`)
  }

  // Handle filter change
  const handleFilterChange = (newFilters: any) => {
    // Update event options with new filters
    setEventOptions((prev) => ({
      ...prev,
      ...newFilters,
    }))

    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })
    router.push(`/events?${params.toString()}`)
  }

  // Handle radius change
  const handleRadiusChange = (radius: number) => {
    // Update event options with new radius
    setEventOptions((prev) => ({
      ...prev,
      radiusKm: radius,
    }))

    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    params.set("radius", String(radius))
    router.push(`/events?${params.toString()}`)
  }

  // Handle load more
  const handleLoadMore = () => {
    setEventOptions((prev) => ({
      ...prev,
      offset: prev.offset! + prev.limit!,
    }))
  }

  // Render My Events tab content
  const renderMyEventsContent = () => {
    // If user is not logged in
    if (!currentUser) {
      return (
        <div className="text-center py-12 px-4 border rounded-lg bg-gray-50">
          <UserCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Sign in to view your events</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You need to be signed in to view your events. Please sign in or create an account.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push("/login")}>Sign In</Button>
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
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} compact={true} userCoordinates={userCoordinates} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg bg-gray-50">
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="my-events">My Events</TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="my-events" className="mt-6">
            {renderMyEventsContent()}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {renderEventsGrid()}
          </TabsContent>

          <TabsContent value="matchmaking" className="mt-6">
            {renderEventsGrid()}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 flex-1 sm:flex-auto">
            <Link href="/events/create">
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
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
      )}
    </div>
  )

  // Helper function to render events grid
  function renderEventsGrid() {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
        </div>
      )
    }

    if (events.length > 0) {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} userCoordinates={userCoordinates} />
            ))}
          </div>

          {/* Pagination or load more */}
          {events.length < totalEvents && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
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

    return (
      <div className="text-center py-12 px-4 border rounded-lg bg-gray-50">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mb-4">
          <Calendar className="h-6 w-6 text-[#FF6B6B]" />
        </div>
        <h3 className="text-lg font-medium mb-2">No events found</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {activeTab === "matchmaking"
            ? "No matchmaking events found. Try adjusting your preferences or create your own matchmaking event!"
            : "No events match your current filters. Try adjusting your filters or create your own event!"}
        </p>
        <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          <Link href="/events/create">Create Event</Link>
        </Button>
      </div>
    )
  }
}
