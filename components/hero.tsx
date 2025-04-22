"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import SimpleMap from "@/components/simple-map"
import Link from "next/link"

export default function Hero() {
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close search suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: { target: EventTarget | null }) => {
      if (searchRef.current && event.target instanceof Node && !searchRef.current.contains(event.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <section className="relative h-[75vh] w-full overflow-hidden">
      {/* Textured Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f8fcfc] to-[#f0f8f8] z-0">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('/texture-pattern.png')" }}></div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 z-10">
        <SimpleMap height="100%" />
      </div>

      {/* Mobile Menu Button */}
      <div className="absolute top-4 right-4 z-30 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-white shadow-md border-gray-200"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 bg-white shadow-lg transition-transform duration-300 transform md:hidden",
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="p-4 space-y-4">
          <nav className="flex flex-col space-y-2">
            <Link href="/" className="px-4 py-2 hover:bg-gray-100 rounded-md font-medium">
              Home
            </Link>
            <Link href="/explore" className="px-4 py-2 hover:bg-gray-100 rounded-md font-medium">
              Explore
            </Link>
            <Link href="/locations" className="px-4 py-2 hover:bg-gray-100 rounded-md font-medium">
              Locations
            </Link>
            <Link href="/add-event" className="px-4 py-2 hover:bg-gray-100 rounded-md font-medium">
              Add Event
            </Link>
            <Link href="/add-location" className="px-4 py-2 hover:bg-gray-100 rounded-md font-medium">
              Add Location
            </Link>
          </nav>
          <div className="pt-2 border-t border-gray-200">
            <Button className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Sign In</Button>
          </div>
        </div>
      </div>

  
       

      {/* Search Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 z-20">
        <div className="w-full max-w-3xl space-y-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 drop-shadow-sm">
            Discover Amazing Events Near You
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find the best local experiences, concerts, workshops and more
          </p>

          <div className="relative w-full" ref={searchRef}>
            <div
              className={cn(
                "flex h-14 overflow-hidden rounded-full border-2 bg-white shadow-lg transition-all duration-300",
                searchFocused ? "border-[#4ECDC4] shadow-[0_0_0_4px_rgba(78,205,196,0.1)]" : "border-transparent",
              )}
            >
              <Input
                type="text"
                placeholder="Search for events, venues or categories..."
                className="flex-1 h-full border-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0 pl-6"
                onFocus={() => setSearchFocused(true)}
              />
              <Button
                className={cn(
                  "h-full px-6 rounded-r-full transition-all duration-300",
                  searchFocused
                    ? "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                    : "bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] hover:from-[#FF5A5A] hover:to-[#FF7A7A]",
                )}
              >
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </div>

            {/* Search suggestions - only show when focused */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50 transform transition-all duration-200 origin-top">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-1">Popular Searches</div>
                  <div className="space-y-1">
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center">
                      <Search className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      Music festivals
                    </button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center">
                      <Search className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      Food events near me
                    </button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md text-sm flex items-center">
                      <Search className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      Weekend activities
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-full border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all duration-300 hover:scale-105"
            >
              Concerts
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all duration-300 hover:scale-105"
            >
              Food & Drink
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all duration-300 hover:scale-105"
            >
              Workshops
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all duration-300 hover:scale-105"
            >
              Outdoor
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent z-20"></div>
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/80 to-transparent z-10"></div>
    </section>
  )
}
