"use client"

import { useState, useMemo } from "react"
import { Search, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import SimpleMap from "@/components/simple-map"

// Static constants to prevent re-renders
const BOSTON_CENTER: [number, number] = [-71.0589, 42.3601]
const EMPTY_LOCATIONS: any[] = []
const MAP_ZOOM = 11

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <section className="relative bg-gradient-to-br from-gray-50 to-white pt-16">
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
                Discover
                <span className="block bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
                  Hidden Gems
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-lg">
                Explore authentic local experiences and connect with your community through curated locations and events.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <div className="relative flex h-14 overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all duration-200 border-gray-200 hover:border-[#4ECDC4] focus-within:border-[#4ECDC4] focus-within:shadow-md">
                <div className="absolute left-4 top-0 bottom-0 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="hero-search"
                  name="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for places, events, experiences..."
                  className="flex-1 pl-12 pr-4 h-full border-0 bg-transparent text-gray-900 placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="submit"
                  size="sm" 
                  className="m-2 px-6 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white rounded-lg"
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link href="/map">
                <Button variant="outline" className="flex items-center space-x-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white">
                  <MapPin className="h-4 w-4" />
                  <span>Explore Map</span>
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="outline" className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white">
                  View Events
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Map */}
          <div className="relative">
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-xl border border-gray-100">
              <SimpleMap
                height="100%"
                center={BOSTON_CENTER}
                zoom={MAP_ZOOM}
                locations={EMPTY_LOCATIONS}
                showControls={true}
                interactive={true}
                className="w-full h-full"
              />
              
              {/* Map Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              
              {/* Simple Call-to-Action */}
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Explore Boston's hidden gems
                      </p>
                      <p className="text-xs text-gray-600">
                        Discover amazing places around the city
                      </p>
                    </div>
                    <Link href="/map">
                      <Button size="sm" className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white shadow-md">
                        Full Map
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 