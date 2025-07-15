"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Calendar, MapPin, Users, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAnime } from "@/components/anime-loader"

interface Event {
  id: string
  name: string
  slug: string
  description: string
  startDate: string
  endDate?: string
  category: string
  eventType: string
  capacity?: number
  attendeeCount?: number
  status: string
  image?: {
    url: string
    alt?: string
  }
  location: {
    id: string
    name: string
    coordinates?: [number, number]
  }
  organizer: {
    id: string
    firstName: string
    lastName: string
  }
  pricing?: {
    isFree: boolean
    price?: number
    currency?: string
  }
}

interface AnimatedEventsProps {
  events: Event[]
  title?: string
  subtitle?: string
  className?: string
}

export default function AnimatedEvents({
  events,
  title = "Upcoming Events",
  subtitle = "Join exciting events happening near you",
  className
}: AnimatedEventsProps) {
  const { anime, loading } = useAnime()
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const eventsGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loading || !anime || typeof anime !== 'function') return
    
    // Title animation
    if (titleRef.current) {
      anime({
        targets: titleRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        easing: 'easeOutExpo',
      })
    }

    // Subtitle animation
    if (subtitleRef.current) {
      anime({
        targets: subtitleRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        delay: 100,
        easing: 'easeOutExpo',
      })
    }

    // Events grid animation
    if (eventsGridRef.current) {
      anime({
        targets: eventsGridRef.current.children,
        opacity: [0, 1],
        translateY: [30, 0],
        scale: [0.95, 1],
        delay: 200,
        duration: 800,
        easing: 'easeOutExpo',
      })
    }
  }, [events, anime, loading])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      entertainment: 'bg-purple-100 text-purple-800',
      education: 'bg-blue-100 text-blue-800',
      social: 'bg-green-100 text-green-800',
      business: 'bg-gray-100 text-gray-800',
      sports: 'bg-orange-100 text-orange-800',
      other: 'bg-slate-100 text-slate-800',
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  const handleCardHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!anime || typeof anime !== 'function') return
    const card = e.currentTarget
    anime({
      targets: card,
      translateY: -8,
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      duration: 300,
      easing: 'easeOutQuad',
    })
  }

  const handleCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!anime || typeof anime !== 'function') return
    const card = e.currentTarget
    anime({
      targets: card,
      translateY: 0,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      duration: 300,
      easing: 'easeOutQuad',
    })
  }

  if (events.length === 0) {
    return (
      <div className={cn("py-16", className)}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 ref={titleRef} className="text-3xl md:text-4xl font-bold mb-4 opacity-0">
            {title}
          </h2>
          <p ref={subtitleRef} className="text-lg text-gray-600 mb-8 opacity-0">
            No upcoming events found. Check back soon!
          </p>
          <Link href="/events/create">
            <Button className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] hover:from-[#FF5A5A] hover:to-[#FF7A7A] text-white">
              Create Event
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn("py-16", className)}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 ref={titleRef} className="text-3xl md:text-4xl font-bold mb-4 opacity-0">
            {title}
          </h2>
          <p ref={subtitleRef} className="text-lg text-gray-600 opacity-0">
            {subtitle}
          </p>
        </div>

        {/* Events Grid */}
        <div 
          ref={eventsGridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {events.map((event, index) => (
            <Link key={event.id} href={`/events/${event.slug}`}>
              <Card
                className="overflow-hidden cursor-pointer transition-all duration-300 h-full opacity-0"
                onMouseEnter={handleCardHover}
                onMouseLeave={handleCardLeave}
              >
                {/* Event Image */}
                <div 
                  className="h-48 bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 bg-cover bg-center relative"
                  style={event.image ? { backgroundImage: `url(${event.image.url})` } : {}}
                >
                  <div className="absolute top-3 left-3">
                    <Badge className={getCategoryColor(event.category)}>
                      {event.category}
                    </Badge>
                  </div>
                  
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
                    <div className="text-center">
                      <div className="text-sm font-bold text-gray-900">
                        {formatDate(event.startDate).split(' ')[1]}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDate(event.startDate).split(' ')[0]}
                      </div>
                    </div>
                  </div>

                  {event.pricing?.isFree && (
                    <div className="absolute bottom-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                      FREE
                    </div>
                  )}
                </div>

                {/* Event Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-2">
                      {event.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {event.description}
                    </p>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{formatTime(event.startDate)}</span>
                    </div>

                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{event.location.name}</span>
                    </div>

                    {event.capacity && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {event.attendeeCount || 0} / {event.capacity} attending
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Organizer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      by {event.organizer.firstName} {event.organizer.lastName}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.eventType}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center mt-12">
          <Link href="/events">
            <Button 
              variant="outline"
              className="border-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white transition-all duration-300"
            >
              View All Events
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 