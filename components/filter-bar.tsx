"use client"

import { useState, useEffect } from "react"
import { Calendar, MapPin, DollarSign, Tag, Filter, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export default function FilterBar() {
  const [isSticky, setIsSticky] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return
      const offset = window.scrollY
      setIsSticky(offset > 500)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener("scroll", handleScroll)
      return () => window.removeEventListener("scroll", handleScroll)
    }
    return undefined
  }, [])

  const toggleFilter = (filter: string | null) => {
    setActiveFilter(activeFilter === filter ? null : filter)
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-30 w-full bg-white border-b border-gray-200 transition-all duration-300",
        isSticky ? "py-2 shadow-md" : "py-4 shadow-sm bg-gradient-to-r from-white via-[#f8fcfc] to-white",
      )}
    >
      <div className="container mx-auto px-4">
        {/* Mobile Filter Toggle */}
        <div className="md:hidden">
          <Button
            variant="outline"
            className="w-full flex items-center justify-between"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2 text-[#4ECDC4]" />
              <span>Filters</span>
            </div>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", mobileFiltersOpen ? "transform rotate-180" : "")}
            />
          </Button>

          {/* Mobile Filters Dropdown */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              mobileFiltersOpen ? "max-h-96 mt-2" : "max-h-0",
            )}
          >
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#4ECDC4]" />
                  <span className="font-medium">Date</span>
                </div>
                <Select>
                  <SelectTrigger className="w-full h-10 border-gray-300">
                    <SelectValue placeholder="Any date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                    <SelectItem value="weekend">This weekend</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#4ECDC4]" />
                  <span className="font-medium">Distance</span>
                </div>
                <Select>
                  <SelectTrigger className="w-full h-10 border-gray-300">
                    <SelectValue placeholder="5 miles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mile</SelectItem>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50+ miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#4ECDC4]" />
                  <span className="font-medium">Price</span>
                </div>
                <Select>
                  <SelectTrigger className="w-full h-10 border-gray-300">
                    <SelectValue placeholder="Any price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="low">Under $25</SelectItem>
                    <SelectItem value="medium">$25 - $50</SelectItem>
                    <SelectItem value="high">$50 - $100</SelectItem>
                    <SelectItem value="premium">$100+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#4ECDC4]" />
                  <span className="font-medium">Category</span>
                </div>
                <Select>
                  <SelectTrigger className="w-full h-10 border-gray-300">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="food">Food & Drink</SelectItem>
                    <SelectItem value="arts">Arts & Culture</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                    <SelectItem value="tech">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full mt-2 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Apply Filters</Button>
            </div>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex flex-wrap items-center gap-3 md:gap-6">
          <div className="relative">
            <Button
              variant={activeFilter === "date" ? "default" : "outline"}
              className={cn(
                "h-10 gap-2 transition-all duration-300",
                activeFilter === "date"
                  ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white"
                  : "border-gray-300 hover:border-[#4ECDC4] hover:text-[#4ECDC4]",
              )}
              onClick={() => toggleFilter("date")}
            >
              <Calendar className="h-4 w-4" />
              <span>Date</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", activeFilter === "date" ? "transform rotate-180" : "")}
              />
            </Button>

            {activeFilter === "date" && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 p-3 z-40">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="date" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>Today</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="date" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>Tomorrow</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="date" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>This weekend</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="date" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>This week</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="date" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>This month</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="date" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>Custom date range</span>
                  </label>
                </div>
                <Button className="w-full mt-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">Apply</Button>
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant={activeFilter === "distance" ? "default" : "outline"}
              className={cn(
                "h-10 gap-2 transition-all duration-300",
                activeFilter === "distance"
                  ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white"
                  : "border-gray-300 hover:border-[#4ECDC4] hover:text-[#4ECDC4]",
              )}
              onClick={() => toggleFilter("distance")}
            >
              <MapPin className="h-4 w-4" />
              <span>Distance</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  activeFilter === "distance" ? "transform rotate-180" : "",
                )}
              />
            </Button>

            {activeFilter === "distance" && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 p-3 z-40">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="distance" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>1 mile</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="distance" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>5 miles</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="distance" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>10 miles</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="distance" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>25 miles</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="distance" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>50+ miles</span>
                  </label>
                </div>
                <div className="mt-3">
                  <label className="text-sm font-medium mb-1 block">Custom distance</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      defaultValue="25"
                      className="flex-1 h-2 rounded-lg appearance-none bg-gray-200 accent-[#4ECDC4]"
                    />
                    <span className="text-sm font-medium">25 mi</span>
                  </div>
                </div>
                <Button className="w-full mt-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">Apply</Button>
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant={activeFilter === "price" ? "default" : "outline"}
              className={cn(
                "h-10 gap-2 transition-all duration-300",
                activeFilter === "price"
                  ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white"
                  : "border-gray-300 hover:border-[#4ECDC4] hover:text-[#4ECDC4]",
              )}
              onClick={() => toggleFilter("price")}
            >
              <DollarSign className="h-4 w-4" />
              <span>Price</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", activeFilter === "price" ? "transform rotate-180" : "")}
              />
            </Button>

            {activeFilter === "price" && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 p-3 z-40">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="price" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>Free</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="price" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>Under $25</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="price" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>$25 - $50</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="price" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>$50 - $100</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="price" className="text-[#4ECDC4] focus:ring-[#4ECDC4]" />
                    <span>$100+</span>
                  </label>
                </div>
                <Button className="w-full mt-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">Apply</Button>
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant={activeFilter === "category" ? "default" : "outline"}
              className={cn(
                "h-10 gap-2 transition-all duration-300",
                activeFilter === "category"
                  ? "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white"
                  : "border-gray-300 hover:border-[#4ECDC4] hover:text-[#4ECDC4]",
              )}
              onClick={() => toggleFilter("category")}
            >
              <Tag className="h-4 w-4" />
              <span>Category</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  activeFilter === "category" ? "transform rotate-180" : "",
                )}
              />
            </Button>

            {activeFilter === "category" && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 p-3 z-40">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Music</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Food & Drink</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Arts & Culture</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Sports</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Wellness</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Technology</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Business</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="text-[#4ECDC4] focus:ring-[#4ECDC4] rounded" />
                    <span>Family</span>
                  </label>
                </div>
                <Button className="w-full mt-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">Apply</Button>
              </div>
            )}
          </div>

          <Button className="ml-auto h-10 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] hover:from-[#FF5A5A] hover:to-[#FF7A7A] shadow-md transition-all duration-300">
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
