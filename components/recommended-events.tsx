"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"

const RECOMMENDED_EVENTS = [
  {
    id: 1,
    title: "Jazz Night at Blue Note",
    date: "Aug 18, 2023",
    time: "8:00 PM",
    location: "Blue Note Jazz Club",
    image: "/smoky-jazz-club.png",
    rating: 4.8,
    category: "Music",
    description:
      "Experience an unforgettable evening of smooth jazz with renowned musicians in an intimate setting. Perfect for jazz enthusiasts and casual listeners alike.",
  },
  {
    id: 2,
    title: "Craft Beer Festival",
    date: "Sep 9, 2023",
    time: "2:00 PM",
    location: "Waterfront Park",
    image: "/craft-beer-festival.png",
    rating: 4.6,
    category: "Food",
    description:
      "Sample over 100 craft beers from local and international breweries. Includes food pairings, live music, and brewing demonstrations throughout the day.",
  },
  {
    id: 3,
    title: "Modern Art Exhibition",
    date: "Aug 25-30, 2023",
    time: "10:00 AM",
    location: "Contemporary Art Museum",
    image: "/modern-art-exhibition.png",
    rating: 4.7,
    category: "Arts",
    description:
      "Explore cutting-edge works from emerging and established artists. This exhibition challenges conventional perspectives with innovative multimedia installations.",
  },
  {
    id: 4,
    title: "Startup Networking Mixer",
    date: "Sep 14, 2023",
    time: "6:30 PM",
    location: "Innovation Hub",
    image: "/startup-networking.png",
    rating: 4.5,
    category: "Business",
    description:
      "Connect with entrepreneurs, investors, and industry experts in a relaxed atmosphere. Perfect for expanding your professional network and discovering new opportunities.",
  },
  {
    id: 5,
    title: "Outdoor Yoga Retreat",
    date: "Aug 26, 2023",
    time: "9:00 AM",
    location: "Botanical Gardens",
    image: "/outdoor-yoga-retreat.png",
    rating: 4.9,
    category: "Wellness",
    description:
      "Rejuvenate your mind and body with a day of yoga and meditation in the beautiful botanical gardens. All experience levels welcome. Mats and refreshments provided.",
  },
]

export default function RecommendedEvents() {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({})
  const [isInView, setIsInView] = useState(false)

  // Check if section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry?.isIntersecting ?? false)
      },
      { threshold: 0.1 },
    )

    const currentRef = carouselRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    }
  }, [])

  const handleScroll = (direction: string) => {
    const container = carouselRef.current
    if (!container) return

    const cardElement = container.querySelector(".flip-card-container")
    const cardWidth = cardElement ? (cardElement as HTMLElement).offsetWidth + 24 : 0 // card width + gap
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
      const cardElement = container.querySelector(".flip-card-container")
        const cardWidth = cardElement ? (cardElement as HTMLElement).offsetWidth + 24 : 0 // card width + gap
      const newIndex = Math.round(scrollLeft / cardWidth)
      setActiveIndex(newIndex)
      setScrollPosition(scrollLeft)
    }

    container.addEventListener("scroll", handleScrollEvent)
    return () => container.removeEventListener("scroll", handleScrollEvent)
  }, [])

  const toggleFlip = (id: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="inline-block w-8 h-1 bg-[#FFE66D] rounded-full mr-3"></span>
            Recommended for You
          </h2>
          <p className="text-gray-600 mt-1">Based on your interests and past activities</p>
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
        {RECOMMENDED_EVENTS.map((event, index) => (
          <div
            key={event.id}
            className={cn(
              "flip-card-container min-w-[320px] max-w-[320px] h-[380px] snap-start perspective-1000",
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
            )}
            style={{ transitionDelay: `${index * 100}ms`, transition: "all 0.5s ease-out" }}
            onClick={() => toggleFlip(event.id)}
          >
            <div
              className={cn(
                "relative w-full h-full transition-transform duration-700 transform-style-3d cursor-pointer",
                flippedCards[event.id] ? "rotate-y-180" : "",
              )}
            >
              {/* Front of card */}
              <div className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden shadow-lg border border-gray-100">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image src={event.image || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute top-3 right-3 bg-[#FFE66D] text-gray-900 px-2 py-1 text-xs font-bold rounded-md shadow-md">
                    {event.category}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{event.title}</h3>

                  <div className="flex items-center text-gray-600 mb-1">
                    <Calendar className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                    <span className="text-sm">{event.date}</span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                    <span className="text-sm">{event.location}</span>
                  </div>

                  <div className="flex items-center mt-3">
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
                    <span className="ml-2 text-sm font-medium">{event.rating}</span>
                  </div>

                  <div className="absolute bottom-3 right-3 text-sm text-[#4ECDC4]">Tap to see details</div>
                </div>
              </div>

              {/* Back of card */}
              <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-xl overflow-hidden shadow-lg border border-gray-100 bg-white">
                <div className="p-6 flex flex-col h-full">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">{event.title}</h3>

                  <p className="text-gray-600 mb-4 flex-grow">{event.description}</p>

                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                      <span className="text-sm">
                        {event.date} • {event.time}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-[#4ECDC4]" />
                      <span className="text-sm">{event.location}</span>
                    </div>

                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-[#FFE66D] fill-current mr-2" />
                      <span className="text-sm font-medium">{event.rating} rating</span>
                    </div>
                  </div>

                  <Button className="w-full mt-4 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">View Details</Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Indicators */}
      <div className="flex justify-center gap-2 mt-2">
        {Array.from({ length: Math.ceil(RECOMMENDED_EVENTS.length / 3) }).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              Math.floor(activeIndex / 3) === index ? "bg-[#FFE66D] w-6" : "bg-gray-300"
            }`}
            onClick={() => {
              const container = carouselRef.current
              if (container) {
                const cardElement = container.querySelector(".flip-card-container")
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
