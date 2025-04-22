"use client"

import { useRef, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  {
    id: 1,
    name: "Music",
    count: "1,245 events",
    icon: "/music-icon.png",
    color: "#FF6B6B",
    pattern: "circle",
  },
  {
    id: 2,
    name: "Food & Drink",
    count: "867 events",
    icon: "/food-icon.png",
    color: "#4ECDC4",
    pattern: "dots",
  },
  {
    id: 3,
    name: "Arts & Culture",
    count: "523 events",
    icon: "/arts-icon.png",
    color: "#FFE66D",
    pattern: "zigzag",
  },
  {
    id: 4,
    name: "Sports",
    count: "429 events",
    icon: "/sports-icon.png",
    color: "#FF6B6B",
    pattern: "lines",
  },
  {
    id: 5,
    name: "Wellness",
    count: "312 events",
    icon: "/wellness-icon.png",
    color: "#4ECDC4",
    pattern: "waves",
  },
  {
    id: 6,
    name: "Technology",
    count: "198 events",
    icon: "/tech-icon.svg",
    color: "#FFE66D",
    pattern: "grid",
  },
]

export default function CategoryGrid() {
  const sectionRef = useRef(null)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [isInView, setIsInView] = useState(false)

  // Check if section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  // Pattern generator based on type
  const getPatternBackground = (pattern: string, color: string) => {
    switch (pattern) {
      case "dots":
        return {
          backgroundImage: `radial-gradient(circle, ${color}20 10%, transparent 10%)`,
          backgroundSize: "15px 15px",
        }
      case "lines":
        return {
          backgroundImage: `repeating-linear-gradient(45deg, ${color}10, ${color}10 2px, transparent 2px, transparent 10px)`,
        }
      case "zigzag":
        return {
          backgroundImage: `linear-gradient(135deg, ${color}20 25%, transparent 25%), linear-gradient(225deg, ${color}20 25%, transparent 25%), linear-gradient(45deg, ${color}20 25%, transparent 25%), linear-gradient(315deg, ${color}20 25%, transparent 25%)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 10px 0, 10px -10px, 0px 10px",
        }
      case "waves":
        return {
          backgroundImage: `radial-gradient(ellipse at 50% 50%, ${color}20 0%, transparent 70%)`,
          backgroundSize: "30px 30px",
        }
      case "grid":
        return {
          backgroundImage: `linear-gradient(${color}20 1px, transparent 1px), linear-gradient(to right, ${color}20 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }
      case "circle":
      default:
        return {
          backgroundImage: `radial-gradient(circle at center, ${color}30 0%, transparent 70%)`,
        }
    }
  }

  return (
    <section ref={sectionRef} className="relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="inline-block w-8 h-1 bg-[#4ECDC4] rounded-full mr-3"></span>
          Browse by Category
        </h2>
        <p className="text-gray-600 mt-1">Find events that match your interests</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {CATEGORIES.map((category, index) => (
          <Card
            key={category.id}
            className={cn(
              "category-card group cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-lg border-0",
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
              hoveredCard === category.id ? "transform scale-[1.03]" : "",
            )}
            style={{ transitionDelay: `${index * 100}ms` }}
            onMouseEnter={() => setHoveredCard(category.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <CardContent className="p-0 flex flex-col items-center text-center relative h-[200px]">
              {/* Background with pattern */}
              <div
                className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                style={{
                  backgroundColor: `${category.color}10`,
                  ...getPatternBackground(category.pattern, category.color),
                }}
              ></div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full w-full p-6">
                <div
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 shadow-md",
                    hoveredCard === category.id ? "scale-110" : "",
                  )}
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Image
                    src={category.icon || "/placeholder.svg"}
                    alt={category.name}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>

                <h3 className="font-bold text-xl mb-1">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.count}</p>

                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 transition-all duration-500",
                    hoveredCard === category.id ? "opacity-100" : "opacity-0",
                  )}
                  style={{ backgroundColor: category.color }}
                ></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
