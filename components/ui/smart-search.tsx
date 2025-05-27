"use client"

import { useState } from "react"
import { Search, MapPin, Coffee, Camera, Utensils } from "lucide-react"
import Link from "next/link"

interface SmartSearchProps {
  className?: string
}

export default function SmartSearch({ className = "" }: SmartSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Following Zipf's Law: Most searched categories get top billing
  const popularSearches = [
    { term: "coffee", icon: Coffee, count: "120+ places" },
    { term: "restaurants", icon: Utensils, count: "85+ places" },
    { term: "scenic views", icon: Camera, count: "45+ places" },
    { term: "parks", icon: MapPin, count: "30+ places" }
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchTerm.trim())}`
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search places..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent outline-none"
        />
      </form>

      {/* Popular Searches */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Popular searches</p>
        <div className="space-y-2">
          {popularSearches.map((search) => {
            const Icon = search.icon
            return (
              <Link
                key={search.term}
                href={`/search?q=${encodeURIComponent(search.term)}`}
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4 text-gray-400 group-hover:text-[#4ECDC4]" />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 capitalize">
                    {search.term}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{search.count}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
} 