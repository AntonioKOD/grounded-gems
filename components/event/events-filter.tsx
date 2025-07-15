
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"

interface EventsFilterProps {
  filters: {
    category: string
    eventType: string
    isMatchmaking: boolean
  }
  radius: number
  onRadiusChange: (radius: number) => void
  onFilterChange: (filters: any) => void
  onClose: () => void
}

export default function EventsFilter({ filters, radius, onRadiusChange, onFilterChange, onClose }: EventsFilterProps) {
  const [localFilters, setLocalFilters] = useState({ ...filters })
  const [localRadius, setLocalRadius] = useState(radius)

  // Category options
  const categoryOptions = [
    { label: "All Categories", value: "all" },
    { label: "Sports", value: "sports" },
    { label: "Education", value: "education" },
    { label: "Entertainment", value: "entertainment" },
    { label: "Social", value: "social" },
    { label: "Other", value: "other" },
  ]

  // Event type options
  const eventTypeOptions = [
    { label: "All Types", value: "all" },
    { label: "Workshop", value: "workshop" },
    { label: "Concert", value: "concert" },
    { label: "Meetup", value: "meetup" },
    { label: "Webinar", value: "webinar" },
    { label: "Social", value: "social" },
    { label: "Sports Matchmaking", value: "sports_matchmaking" },
    { label: "Sports Tournament", value: "sports_tournament" },
    { label: "Other", value: "other" },
  ]

  const handleCategoryChange = (value: string) => {
    setLocalFilters((prev) => ({ ...prev, category: value === "all" ? "" : value }))
  }

  const handleEventTypeChange = (value: string) => {
    setLocalFilters((prev) => ({ ...prev, eventType: value === "all" ? "" : value }))
  }

  const handleMatchmakingChange = (checked: boolean) => {
    setLocalFilters((prev) => ({ ...prev, isMatchmaking: checked }))
  }

  const handleRadiusChange = (value: number[]) => {
    setLocalRadius(value[0] ?? 25)
  }

  const handleApplyFilters = () => {
    onFilterChange(localFilters)
    onRadiusChange(localRadius)
    onClose()
  }

  const handleResetFilters = () => {
    const resetFilters = {
      category: "",
      eventType: "",
      isMatchmaking: false,
    }
    setLocalFilters(resetFilters)
    setLocalRadius(25)
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Filter Events</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={localFilters.category || "all"} onValueChange={handleCategoryChange}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select value={localFilters.eventType || "all"} onValueChange={handleEventTypeChange}>
              <SelectTrigger id="eventType">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Radius */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="radius">Search Radius</Label>
            <span className="text-sm font-medium">{localRadius} km</span>
          </div>
          <Slider
            id="radius"
            min={5}
            max={100}
            step={5}
            value={[localRadius]}
            onValueChange={handleRadiusChange}
            className="py-4"
          />
        </div>

        {/* Matchmaking */}
        <div className="flex items-center justify-between space-x-2 pt-2">
          <Label htmlFor="matchmaking" className="flex flex-col space-y-1">
            <span>Matchmaking Events</span>
            <span className="font-normal text-sm text-muted-foreground">Show only events with matchmaking enabled</span>
          </Label>
          <Switch id="matchmaking" checked={localFilters.isMatchmaking} onCheckedChange={handleMatchmakingChange} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleResetFilters}>
          Reset Filters
        </Button>
        <Button onClick={handleApplyFilters} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
          Apply Filters
        </Button>
      </CardFooter>
    </Card>
  )
}
