"use client"

import { Calendar, MapPin, Users, Clock, Heart, Share2, ExternalLink } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useCallback } from "react"
import { toast } from "sonner"
import { format, isToday, isTomorrow, isThisWeek } from "date-fns"

interface MobileEventCardProps {
  event: {
    id: string
    title: string
    description?: string
    shortDescription?: string
    featuredImage?: string | { url: string }
    startDate: string | Date
    endDate?: string | Date
    location?: {
      name: string
      address?: string
    } | string
    category?: string
    eventType?: string
    capacity?: number
    attendeeCount?: number
    isOnline?: boolean
    price?: number
    isFree?: boolean
    organizer?: {
      name: string
      avatar?: string | { url: string }
    }
    status?: "upcoming" | "ongoing" | "completed" | "cancelled"
  }
  onEventClick?: (event: any) => void
  onLocationClick?: (event: any) => void
  onOrganizerClick?: (event: any) => void
  currentUserId?: string
  className?: string
  showInterested?: boolean
}

export default function MobileEventCard({
  event,
  onEventClick,
  onLocationClick,
  onOrganizerClick,
  currentUserId,
  className,
  showInterested = true,
}: MobileEventCardProps) {
  const [isInterested, setIsInterested] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleInterested = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!currentUserId) {
      toast.error("Please log in to show interest in events")
      return
    }

    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/events/${event.id}/participation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: isInterested ? "not_going" : "interested",
          userId: currentUserId,
        }),
      })

      if (response.ok) {
        setIsInterested(!isInterested)
        toast.success(isInterested ? "No longer interested" : "Marked as interested")
      } else {
        throw new Error("Failed to update interest status")
      }
    } catch (error) {
      console.error("Error handling interest:", error)
      toast.error("Failed to update interest status")
    } finally {
      setIsLoading(false)
    }
  }, [event.id, isInterested, currentUserId])

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    const shareUrl = `${window.location.origin}/events/${event.id}`
    
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.shortDescription || event.description || `Join me at ${event.title}!`,
        url: shareUrl,
      }).catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err)
        }
      })
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Event link copied to clipboard")
      }).catch(() => {
        toast.error("Could not copy link")
      })
    }
  }, [event])

  const handleCardClick = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
    
    if (onEventClick) {
      onEventClick(event)
    }
  }, [event, onEventClick])

  const handleLocationClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
    
    if (onLocationClick) {
      onLocationClick(event)
    }
  }, [event, onLocationClick])

  const getImageUrl = useCallback(() => {
    if (typeof event.featuredImage === "string") {
      return event.featuredImage
    } else if (event.featuredImage?.url) {
      return event.featuredImage.url
    }
    return "/placeholder.svg"
  }, [event.featuredImage])

  const getDateDisplay = useCallback(() => {
    const startDate = new Date(event.startDate)
    
    if (isToday(startDate)) {
      return { 
        primary: "Today", 
        secondary: format(startDate, "h:mm a"),
        badge: "today"
      }
    }
    
    if (isTomorrow(startDate)) {
      return { 
        primary: "Tomorrow", 
        secondary: format(startDate, "h:mm a"),
        badge: "tomorrow"
      }
    }
    
    if (isThisWeek(startDate)) {
      return { 
        primary: format(startDate, "EEEE"), 
        secondary: format(startDate, "h:mm a"),
        badge: "this-week"
      }
    }
    
    return { 
      primary: format(startDate, "MMM d"), 
      secondary: format(startDate, "h:mm a"),
      badge: "future"
    }
  }, [event.startDate])

  const getEventStatus = useCallback(() => {
    const now = new Date()
    const startDate = new Date(event.startDate)
    const endDate = event.endDate ? new Date(event.endDate) : null
    
    if (event.status === "cancelled") {
      return { status: "cancelled", text: "Cancelled", color: "bg-red-100 text-red-800" }
    }
    
    if (endDate && now > endDate) {
      return { status: "completed", text: "Completed", color: "bg-gray-100 text-gray-800" }
    }
    
    if (now >= startDate && (!endDate || now <= endDate)) {
      return { status: "ongoing", text: "Live Now", color: "bg-green-100 text-green-800" }
    }
    
    return { status: "upcoming", text: "Upcoming", color: "bg-blue-100 text-blue-800" }
  }, [event.startDate, event.endDate, event.status])

  const getPriceDisplay = useCallback(() => {
    if (event.isFree) return "Free"
    if (event.price && event.price > 0) return `$${event.price}`
    return null
  }, [event.isFree, event.price])

  const getAttendanceDisplay = useCallback(() => {
    if (event.attendeeCount && event.capacity) {
      const percentage = (event.attendeeCount / event.capacity) * 100
      return {
        text: `${event.attendeeCount}/${event.capacity}`,
        percentage,
        isFull: percentage >= 100,
        isAlmostFull: percentage >= 80
      }
    }
    
    if (event.attendeeCount) {
      return {
        text: `${event.attendeeCount} going`,
        percentage: 0,
        isFull: false,
        isAlmostFull: false
      }
    }
    
    return null
  }, [event.attendeeCount, event.capacity])

  const dateDisplay = getDateDisplay()
  const eventStatus = getEventStatus()
  const priceDisplay = getPriceDisplay()
  const attendanceDisplay = getAttendanceDisplay()

  return (
    <div 
      className={cn(
        "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden",
        "transition-all duration-200 ease-in-out",
        "active:scale-[0.98] active:shadow-md",
        "hover:shadow-md hover:border-gray-200",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div className="relative h-40 bg-gray-100">
        <Image
          src={getImageUrl()}
          alt={event.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
        
        {/* Overlay Actions */}
        <div className="absolute top-3 right-3 flex gap-2">
          {showInterested && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm border-white/50 hover:bg-white shadow-sm"
              onClick={handleInterested}
              disabled={isLoading}
              aria-label={isInterested ? "Remove from interested" : "Mark as interested"}
            >
              <Heart 
                className={cn(
                  "h-4 w-4 transition-colors",
                  isInterested ? "text-red-500 fill-red-500" : "text-gray-600"
                )} 
              />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm border-white/50 hover:bg-white shadow-sm"
            onClick={handleShare}
            aria-label="Share event"
          >
            <Share2 className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={cn("text-xs font-medium", eventStatus.color)}>
            {eventStatus.text}
          </Badge>
        </div>

        {/* Date Badge */}
        <div className="absolute bottom-3 left-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
            <div className="text-xs font-semibold text-gray-900">{dateDisplay.primary}</div>
            <div className="text-xs text-gray-600">{dateDisplay.secondary}</div>
          </div>
        </div>

        {/* Price Badge */}
        {priceDisplay && (
          <div className="absolute bottom-3 right-3">
            <Badge 
              variant="outline" 
              className={cn(
                "bg-white/95 backdrop-blur-sm border-white/50 text-xs font-semibold",
                event.isFree ? "text-green-700" : "text-gray-900"
              )}
            >
              {priceDisplay}
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-1">
          <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2">
            {event.title}
          </h3>

          {/* Event Type & Category */}
          <div className="flex items-center gap-2">
            {event.eventType && (
              <Badge variant="outline" className="text-xs">
                {event.eventType}
              </Badge>
            )}
            {event.category && (
              <Badge variant="secondary" className="text-xs">
                {event.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {(event.shortDescription || event.description) && (
          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {event.shortDescription || event.description}
          </p>
        )}

        {/* Event Details */}
        <div className="space-y-2 text-sm">
          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span 
                className="line-clamp-1 hover:text-[#FF6B6B] cursor-pointer transition-colors"
                onClick={handleLocationClick}
              >
                {typeof event.location === "string" 
                  ? event.location 
                  : event.location.name}
                {event.isOnline && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Online
                  </Badge>
                )}
              </span>
            </div>
          )}

          {/* Organizer */}
          {event.organizer && (
            <div className="flex items-center gap-2 text-gray-500">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span 
                className="text-sm hover:text-[#FF6B6B] cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onOrganizerClick) onOrganizerClick(event)
                }}
              >
                Hosted by {event.organizer.name}
              </span>
            </div>
          )}

          {/* Attendance */}
          {attendanceDisplay && (
            <div className="flex items-center gap-2 text-gray-500">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                {attendanceDisplay.text}
                {attendanceDisplay.isFull && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Full
                  </Badge>
                )}
                {attendanceDisplay.isAlmostFull && !attendanceDisplay.isFull && (
                  <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-200">
                    Almost Full
                  </Badge>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs font-medium border-gray-200 hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation()
              if (navigator.vibrate) navigator.vibrate(50)
              
              // Add to calendar functionality
              const startDate = new Date(event.startDate)
              const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours
              
              const calendarUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description || event.shortDescription || ''}
LOCATION:${typeof event.location === 'string' ? event.location : event.location?.name || ''}
END:VEVENT
END:VCALENDAR`
              
              const blob = new Blob([calendarUrl], { type: 'text/calendar' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `${event.title}.ics`
              link.click()
              URL.revokeObjectURL(url)
              
              toast.success("Event added to calendar")
            }}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Add to Calendar
          </Button>

          <Button
            className="flex-1 h-9 text-xs font-medium bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            onClick={handleCardClick}
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  )
} 