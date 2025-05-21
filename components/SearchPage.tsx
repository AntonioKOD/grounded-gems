"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    // Here you would implement the actual search functionality
    // For now, we'll just simulate a search with a timeout
    setTimeout(() => {
      setIsSearching(false)
    }, 1000)
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search for events, locations, people..."
            className="pl-10 py-6 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Popular Searches</h2>
        <div className="flex flex-wrap gap-2">
          {["Hiking", "Coffee shops", "Weekend events", "Photography", "Local food"].map((term) => (
            <Button key={term} variant="outline" className="rounded-full" onClick={() => setSearchQuery(term)}>
              {term}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
