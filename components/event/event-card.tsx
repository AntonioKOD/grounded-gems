/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow, format } from "date-fns"
import { Calendar, MapPin, Users, Clock, ChevronRight, Lock, Mail } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Event } from "@/types/event"

interface EventCardProps {
  event: Event
  className?: string
  compact?: boolean
  userCoordinates?: {
    latitude: number | null
    longitude: number | null
  }
}

export function EventCard({ event, className, compact = false, userCoordinates }: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Format dates
  const startDate = new Date(event.startDate)
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
  const isToday = new Date().toDateString() === startDate.toDateString()

  // Calculate if event is happening soon (within 24 hours)
  const isHappeningSoon = startDate.getTime() - Date.now() < 24 * 60 * 60 * 1000 && startDate.getTime() > Date.now()

  // Get image URL
  const getImageUrl = () => {
    if (event.featuredImage) {
      return typeof event.featuredImage === "string" ? event.featuredImage : event.featuredImage.url
    } else if (event.image) {
      return typeof event.image === "string" ? event.image : event.image.url
    }
    return `/placeholder.svg?height=400&width=600&query=event+${event.category || ""}`
  }

  // Get location name
  const getLocationName = () => {
    if (typeof event.location === "string") {
      return "Event Location"
    } else {
      return event.location?.name || "Event Location"
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "postponed":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "sports":
        return "bg-green-100 text-green-800 border-green-200"
      case "social":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "education":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "entertainment":
        return "bg-pink-100 text-pink-800 border-pink-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Render compact card for My Events tab
  if (compact) {
    return (
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300",
          isHovered && "shadow-md transform translate-y-[-2px]",
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link href={`/events/${event.id}`} className="block">
          <div className="flex h-full">
            <div className="w-1/3 relative">
              <Image unoptimized src={getImageUrl() || "/placeholder.svg"} alt={event.name} fill className="object-cover" />

              {/* Status badge for compact view */}
              {event.status !== "published" && (
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className={cn("text-xs font-medium", getStatusColor(event.status))}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>
              )}
            </div>

            <div className="w-2/3 p-3 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-base line-clamp-1">{event.name}</h3>

                <div className="flex flex-wrap gap-1 mt-1">
                  {event.category && (
                    <Badge variant="outline" className={cn("text-xs", getCategoryColor(event.category))}>
                      {event.category}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                  {isToday ? "Today" : format(startDate, "EEE, MMM d")}
                  <span className="mx-1">•</span>
                  {format(startDate, "h:mm a")}
                </div>

                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="line-clamp-1">{getLocationName()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center text-xs text-gray-500">
                  <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                  {event.goingCount || 0} going
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </Link>
      </Card>
    )
  }

  // Original card implementation for standard view
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300",
        isHovered && "shadow-md transform translate-y-[-2px]",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0">
        {/* Event Image */}
        <div className="relative h-40 w-full">
          <Image unoptimized src={getImageUrl() || "/placeholder.svg"} alt={event.name} fill className="object-cover" />

          {/* Date overlay */}
          <div className="absolute top-3 left-3 bg-white rounded-md overflow-hidden shadow-md">
            <div className="bg-[#FF6B6B] text-white text-center py-1 px-3 text-xs font-bold">
              {format(startDate, "MMM").toUpperCase()}
            </div>
            <div className="py-1 px-3 text-center">
              <span className="text-lg font-bold">{format(startDate, "d")}</span>
            </div>
          </div>

          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className={cn("font-medium", getStatusColor(event.status))}>
              {event.status === "published" ? "Upcoming" : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Badge>
          </div>

          {/* Visibility badge */}
          {event.visibility && event.visibility !== "public" && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 font-medium">
                {event.visibility === "private" ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" /> Private
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3 mr-1" /> RSVP Only
                  </>
                )}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Title */}
          <div className="mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">{event.name}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {event.category && (
                <Badge variant="outline" className={cn("text-xs", getCategoryColor(event.category))}>
                  {event.category}
                </Badge>
              )}
            </div>
          </div>

          {/* Event details */}
          {!compact && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{event.shortDescription || event.description}</p>
          )}

          <div className="space-y-2 text-sm">
            {/* Date and time */}
            <div className="flex items-start">
              <Calendar className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <div>{isToday ? "Today" : format(startDate, "EEEE, MMMM d, yyyy")}</div>
                <div className="text-gray-500">
                  {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="line-clamp-1">{getLocationName()}</span>
            </div>

            {/* Participants */}
            <div className="flex items-center">
              <Users className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
              <span>
                {event.goingCount || 0} going
                {event.capacity && ` (${event.capacity} max)`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {isHappeningSoon ? (
            <span className="text-[#FF6B6B] font-medium">Starting soon!</span>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 inline-block mr-1" />
              {formatDistanceToNow(startDate, { addSuffix: true })}
            </>
          )}
        </div>

        <Button asChild variant="ghost" size="sm" className="text-[#FF6B6B] hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10">
          <Link href={`/events/${event.id}`}>
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
