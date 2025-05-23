"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarCheck, Clock, MapPin, Users, ArrowRight, Calendar } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow, format, isPast } from "date-fns"
import type { AppEvent } from "@/types/event"
import { getSuggestedOrPopularEvents } from "@/app/(frontend)/home-page-actions/actions"
import { useAuth } from "@/hooks/use-auth"

export default function SuggestedEvents() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<AppEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number | null
    longitude: number | null
  }>({ latitude: null, longitude: null })

  // Get user's location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setUserCoordinates({
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
        },
        (error) => {
          console.warn("Geolocation error:", error)
          // Load events without coordinates
          loadEvents(user?.id)
        },
      )
    } else {
      // Geolocation not supported, load without coordinates
      loadEvents(user?.id)
    }
  }, [user])

  // Load events when coordinates change
  useEffect(() => {
    if (userCoordinates.latitude && userCoordinates.longitude) {
      loadEvents(user?.id, {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude
      })
    }
  }, [userCoordinates, user])

  // Function to load events
  const loadEvents = async (userId?: string, coordinates?: { latitude: number; longitude: number }) => {
    setIsLoading(true)
    try {
      const suggestedEvents = await getSuggestedOrPopularEvents(
        userId,
        coordinates
          ? {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            }
          : undefined,
        6,
      )
      setEvents(suggestedEvents)
    } catch (error) {
      console.error("Error loading events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Format distance
  const formatDistance = (distance?: number) => {
    if (!distance) return ""
    return distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`
  }

  // Format date
  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const isToday = new Date().toDateString() === date.toDateString()

      if (isToday) {
        return `Today at ${format(date, "h:mm a")}`
      }

      return `${format(date, "MMM d")} at ${format(date, "h:mm a")}`
    } catch (error) {
        console.error("Error formatting date:", error)
      return dateString
      
    }
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString)

      if (isPast(date)) {
        return `Ended ${formatDistanceToNow(date, { addSuffix: true })}`
      }

      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
        console.error("Error formatting relative time:", error)
      return dateString
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Suggested Events</h2>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden shadow-sm">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  // No events
  if (events.length === 0) {
    return (
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Suggested Events</h2>
          <Button
            variant="outline"
            onClick={() => router.push("/events")}
            className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
          >
            View All Events
            <Calendar className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <Card className="border-dashed bg-gray-50">
          <CardContent className="py-16 text-center">
            <CalendarCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No upcoming events</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              We couldn&apos;t find any events for you. Create your own event or check back later.
            </p>
            <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
              <Link href="/events/create">Create an Event</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{user ? "Suggested Events" : "Upcoming Events"}</h2>
        <Button
          variant="outline"
          onClick={() => router.push("/events")}
          className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
        >
          View All Events
          <Calendar className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${event.image})` }}>
              {event.category && (
                <Badge className="m-3 bg-white/80 hover:bg-white/90 text-gray-800 backdrop-blur-sm">
                  {event.category}
                </Badge>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.name}</h3>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <Clock className="h-3.5 w-3.5 mr-1 text-[#FF6B6B]" />
                {formatEventDate(event.date)}
                <span className="text-xs ml-2 text-[#FF6B6B] font-medium">({formatRelativeTime(event.date)})</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <MapPin className="h-3.5 w-3.5 mr-1 text-[#FF6B6B]" />
                {event.location?.address || "No location"}
              </div>
              {event.distance !== undefined && (
                <div className="text-sm text-[#FF6B6B] font-medium mb-2">{formatDistance(event.distance)}</div>
              )}
              {event.attendeesCount !== undefined && event.attendeesCount > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {event.attendeesCount} {event.attendeesCount === 1 ? "person" : "people"} attending
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-end">
              <Button asChild variant="ghost" className="text-[#FF6B6B] hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10">
                <Link href={`/events/${event.id}`}>
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}
