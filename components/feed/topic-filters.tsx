"use client"

import { useState, useEffect } from "react"
import { Tag, TrendingUp, Heart, Map, Star, Utensils, Music, Camera } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TopicFiltersProps {
  onFilterChange: (filter: string) => void
  selectedFilter?: string
  className?: string
  variant?: "pill" | "tag" | "minimal"
}

export default function TopicFilters({
  onFilterChange,
  selectedFilter = "all",
  className = "",
  variant = "pill",
}: TopicFiltersProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return null // Prevent SSR issues with animations
  }
  
  const topics = [
    { id: "all", name: "All", icon: Tag },
    { id: "trending", name: "Trending", icon: TrendingUp },
    { id: "food", name: "Food", icon: Utensils },
    { id: "events", name: "Events", icon: Music },
    { id: "reviews", name: "Reviews", icon: Star },
    { id: "locations", name: "Places", icon: Map },
    { id: "favorites", name: "Favorites", icon: Heart },
    { id: "photos", name: "Photos", icon: Camera },
  ]
  
  // Different UI variants
  if (variant === "tag") {
    return (
      <div className={cn("mb-4", className)}>
        <ScrollArea className="w-full">
          <div className="flex space-x-2 py-2">
            {topics.map((topic) => {
              const Icon = topic.icon
              const isActive = selectedFilter === topic.id
              
              return (
                <Badge
                  key={topic.id}
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer py-1.5 px-3 flex items-center gap-1.5",
                    isActive ? "bg-gray-800 hover:bg-gray-700" : "hover:bg-gray-100"
                  )}
                  onClick={() => onFilterChange(topic.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{topic.name}</span>
                </Badge>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>
    )
  }
  
  if (variant === "minimal") {
    return (
      <div className={cn("mb-4", className)}>
        <ScrollArea className="w-full">
          <div className="flex space-x-3 py-2">
            {topics.map((topic) => {
              const isActive = selectedFilter === topic.id
              
              return (
                <span
                  key={topic.id}
                  className={cn(
                    "cursor-pointer text-sm transition-colors",
                    isActive ? "text-[#FF6B6B] font-medium" : "text-gray-500 hover:text-gray-800"
                  )}
                  onClick={() => onFilterChange(topic.id)}
                >
                  {topic.name}
                </span>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>
    )
  }
  
  // Default "pill" variant
  return (
    <div className={cn("mb-4", className)}>
      <ScrollArea className="w-full">
        <div className="flex space-x-2 py-2">
          {topics.map((topic) => {
            const Icon = topic.icon
            const isActive = selectedFilter === topic.id
            
            return (
              <Button
                key={topic.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex items-center gap-1.5 px-3 rounded-full flex-shrink-0",
                  isActive ? 
                    "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white" : 
                    "hover:bg-gray-100 text-gray-700"
                )}
                onClick={() => onFilterChange(topic.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{topic.name}</span>
              </Button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  )
} 