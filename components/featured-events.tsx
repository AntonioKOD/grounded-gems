"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { cn } from "@/lib/utils"

const FEATURED_EVENTS = [
  {
    id: 1,
    title: "Summer Music Festival",
    date: "Aug 15-17, 2023",
    location: "Central Park",
    image: "/vibrant-music-fest.png",
    category: "Music",
    rating: 4.8,
    featured: true,
  },
  {
    id: 2,
    title: "Food & Wine Expo",
    date: "Sep 5, 2023",
    location: "Convention Center",
    image: "/gourmet-wine-tasting.png",
    category: "Food",
    rating: 4.6,
  },
  {
    id: 3,
    title: "Tech Conference 2023",
    date: "Oct 12-14, 2023",
    location: "Innovation Hub",
    image: "/tech-conference-modern.png",
    category: "Tech",
    rating: 4.7,
    featured: true,
  },
  {
    id: 4,
    title: "Art Gallery Opening",
    date: "Aug 23, 2023",
    location: "Metropolitan Museum",
    image: "/gallery-evening.png",
    category: "Arts",
    rating: 4.9,
  },
  {
    id: 5,
    title: "Yoga in the Park",
    date: "Every Sunday",
    location: "Riverside Park",
    image: "/park-yoga-flow.png",
    category: "Wellness",
    rating: 4.5,
  },
  {
    id: 6,
    title: "Jazz Night at Blue Note",
    date: "Aug 18, 2023",
    location: "Blue Note Jazz Club",
    image: "/smoky-jazz-club.png",
    category: "Music",
    rating: 4.7,
  },
]

export default function FeaturedEvents() {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleScroll = (direction: "left" | "right") => {
    const container = carouselRef.current
    if (!container) return

    const cardElement = container.querySelector(".event-card");
    const cardWidth = cardElement ? (cardElement as HTMLElement).offsetWidth + 24 : 0; // card width + gap
    const scrollAmount = direction === "left" ? -cardWidth * 2 : cardWidth * 2
    const newPosition = scrollPosition + scrollAmount

    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    })

    setScrollPosition(newPosition)
  }

  // Update active index based on scroll position
  useEffect(() => {
    const container = carouselRef.current
    if (!container) return

    const handleScrollEvent = () => {
      const scrollLeft = container.scrollLeft
      const cardElement = container.querySelector(".event-card")
      const cardWidth = cardElement ? (cardElement as HTMLElement).offsetWidth + 24 : 0 // card width + gap
      const newIndex = Math.round(scrollLeft / cardWidth)
      setActiveIndex(newIndex)
      setScrollPosition(scrollLeft)
    }

    container.addEventListener("scroll", handleScrollEvent)
    return () => container.removeEventListener("scroll", handleScrollEvent)
  }, [])

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="inline-block w-8 h-1 bg-[#FF6B6B] rounded-full mr-3"></span>
            Featured Events
          </h2>
          <p className="text-gray-600 mt-1">Discover the most popular events this month</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-gray-300 hover:border-[#4ECDC4] hover:text-[#4ECDC4] transition-all duration-300"
            onClick={() => handleScroll("left")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-gray-300 hover:border-[#4ECDC4] hover:text-[#4ECDC4] transition-all duration-300"
            onClick={() => handleScroll("right")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {FEATURED_EVENTS.map((event) => (
          <Card
            key={event.id}
            className={cn(
              "event-card min-w-[350px] max-w-[350px] snap-start rounded-xl overflow-hidden transition-all duration-500 hover:shadow-xl",
              hoveredCard === event.id ? "transform scale-[1.02]" : "",
            )}
            onMouseEnter={() => setHoveredCard(event.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-56 w-full overflow-hidden">
              <Image
                src={event.image || "/placeholder.svg"}
                alt={event.title}
                fill
                className={cn(
                  "object-cover transition-transform duration-700",
                  hoveredCard === event.id ? "scale-110" : "",
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <Badge
                className="absolute top-3 right-3 bg-[#FFE66D] text-gray-900 hover:bg-[#FFE66D]/90 shadow-md"
                style={{ backdropFilter: "blur(4px)" }}
              >
                {event.category}
              </Badge>

              {event.featured && (
                <div className="absolute top-3 left-3 bg-[#FF6B6B] text-white px-2 py-1 text-xs font-bold rounded-md shadow-md flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" />
                  FEATURED
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-xl font-bold mb-1 drop-shadow-md">{event.title}</h3>
                <div className="flex items-center text-white/90 mb-1">
                  <Calendar className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                  <span className="text-sm drop-shadow-md">{event.date}</span>
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                <span className="text-sm">{event.location}</span>
              </div>

              <div className="flex items-center mt-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.floor(event.rating) ? "text-[#FFE66D] fill-[#FFE66D]" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">{event.rating}</span>
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex items-center justify-between">
              <span className="font-medium text-gray-600 text-sm">Join Event</span>
              <Button
                className={cn(
                  "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 transition-all duration-300 shadow-md",
                  hoveredCard === event.id ? "shadow-lg scale-105" : "",
                )}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Carousel Indicators */}
      <div className="flex justify-center gap-2 mt-2">
        {Array.from({ length: Math.ceil(FEATURED_EVENTS.length / 3) }).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              Math.floor(activeIndex / 3) === index ? "bg-[#FF6B6B] w-6" : "bg-gray-300"
            }`}
            onClick={() => {
              const container = carouselRef.current
              if (container) {
                const cardElement = container.querySelector(".event-card")
                const cardWidth = cardElement ? (cardElement as HTMLElement).offsetWidth + 24 : 0 // card width + gap
                container.scrollTo({
                  left: index * cardWidth * 3,
                  behavior: "smooth",
                })
              }
            }}
          />
        ))}
      </div>
    </section>
  )
}
