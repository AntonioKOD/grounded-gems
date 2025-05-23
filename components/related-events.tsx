"use client"

import { useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"

// Sample related events data
const RELATED_EVENTS = [
  {
    id: "2",
    title: "Jazz Night at Blue Note",
    date: "Aug 18, 2023",
    location: "Blue Note Jazz Club",
    image: "/smoky-jazz-club.png",
    price: "$35",
    category: "Music",
  },
  {
    id: "3",
    title: "Classical Orchestra Performance",
    date: "Sep 5, 2023",
    location: "Symphony Hall",
    image: "/grand-orchestra-hall.png",
    price: "$45",
    category: "Music",
  },
  {
    id: "4",
    title: "Rock Concert: The Amplifiers",
    date: "Aug 25, 2023",
    location: "Metro Arena",
    image: "/vibrant-rock-show.png",
    price: "$55",
    category: "Music",
  },
  {
    id: "5",
    title: "Electronic Music Festival",
    date: "Sep 15-16, 2023",
    location: "Riverside Park",
    image: "/placeholder.svg",
    price: "$75",
    category: "Music",
  },
]

export default function RelatedEvents({ category }: { category: string }) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleScroll = (direction: "left" | "right") => {
    const container = carouselRef.current
    if (!container) return

    const scrollAmount = 400
    const newPosition =
      direction === "left"
        ? Math.max(scrollPosition - scrollAmount, 0)
        : Math.min(scrollPosition + scrollAmount, container.scrollWidth - container.clientWidth)

    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    })

    setScrollPosition(newPosition)
  }

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Similar {category} Events</h2>
          <p className="text-gray-600">You might also be interested in these events</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-gray-300"
            onClick={() => handleScroll("left")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-gray-300"
            onClick={() => handleScroll("right")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {RELATED_EVENTS.map((event) => (
          <Card
            key={event.id}
            className="min-w-[300px] max-w-[300px] snap-start rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px]"
          >
            <div className="relative h-40 w-full overflow-hidden">
              <Image src={event.image || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
              <Badge className="absolute top-3 right-3 bg-[#FFE66D] text-gray-900 hover:bg-[#FFE66D]/90">
                {event.category}
              </Badge>
            </div>

            <CardContent className="p-4">
              <h3 className="text-lg font-bold mb-2 text-gray-900">{event.title}</h3>

              <div className="flex items-center text-gray-600 mb-1">
                <Calendar className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                <span className="text-sm">{event.date}</span>
              </div>

              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                <span className="text-sm">{event.location}</span>
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex items-center justify-between">
              <span className="font-bold text-gray-900">{event.price}</span>
              <Link href={`/events/${event.id}`}>
                <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">View Event</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}
