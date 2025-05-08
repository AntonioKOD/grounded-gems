/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef } from "react"
import { Search} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import dynamic from 'next/dynamic'


const SimpleMap = dynamic(() => import("@/components/simple-map"), { ssr: false });

export default function Hero() {
  const [searchFocused, setSearchFocused] = useState(false)

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
      <SimpleMap/>
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
