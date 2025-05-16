"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SlidersHorizontal, Search, MapPin, ChevronDown } from "lucide-react"
import { getFeedPosts } from "@/app/actions"
import ExploreFiltersComponent from "@/components/explore/explore-filters"
import type { ExploreFilters } from "@/components/explore/explore-filters"
import ExplorePostGrid from "./explore-post-grid"
import { toast } from "sonner"
import type { Post } from "@/types/feed"

export default function ExploreContainer() {
  const searchParams = useSearchParams()

  // State for search, filters, and posts
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "recent")
  const [activeSortLabel, setActiveSortLabel] = useState("Most Recent")
  const [filters, setFilters] = useState<ExploreFilters>({})
  const [posts, setPosts] = useState<Post[]>([])
  const [highlightedPosts, setHighlightedPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Load posts based on search, sort, and filters
  const loadPosts = useCallback(
    async (page = 1, append = false) => {
      setIsLoading(true)
      try {
        // Get posts from api/actions
        const newPosts = await getFeedPosts("all", sortBy, page)

        // Apply client-side filtering based on filters and search
        const filteredPosts = filterPosts(newPosts, filters, searchQuery)

        // Set highlighted posts (newest in your area)
        if (page === 1 && !append) {
          const nearbyPosts = newPosts
            .filter(
              (post) => post.createdAt && new Date(post.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            )
            .slice(0, 3)
          setHighlightedPosts(nearbyPosts)
        }

        // Update posts state
        if (append) {
          setPosts((prev) => [...prev, ...filteredPosts])
        } else {
          setPosts(filteredPosts)
        }

        // Update pagination state
        setCurrentPage(page)
        setHasMore(filteredPosts.length === 10) // Assuming 10 posts per page

        // Set total count for display
        // In a real app, you'd get this from an API that supports counting
        setTotalCount(page === 1 ? filteredPosts.length * 3 : posts.length + filteredPosts.length)
      } catch (error) {
        console.error("Error loading posts:", error)
        toast.error("Failed to load posts")
      } finally {
        setIsLoading(false)
      }
    },
    [sortBy, filters, searchQuery, posts.length],
  )

  // Filter posts client-side based on selected filters
  const filterPosts = (allPosts: Post[], filters: ExploreFilters, search: string) => {
    return allPosts.filter((post) => {
      // Filter by search query
      if (
        search &&
        !(
          post.content?.toLowerCase().includes(search.toLowerCase()) ||
          post.title?.toLowerCase().includes(search.toLowerCase()) ||
          post.location?.name.toLowerCase().includes(search.toLowerCase())
        )
      ) {
        return false
      }

      // Filter by category
      if (filters.category && post.location?.name) {
        // This is a simplification. In a real app, you'd have a proper category field
        const postCategory = post.location.name.toLowerCase()
        if (!postCategory.includes(filters.category.toLowerCase())) {
          return false
        }
      }

      // Filter by rating
      if (filters.rating && post.rating) {
        if (post.rating < Number.parseInt(filters.rating)) {
          return false
        }
      }

      // Add more filters as needed

      return true
    })
  }

  // Handle load more posts
  const handleLoadMore = () => {
    loadPosts(currentPage + 1, true)
  }

  // Handle filter changes
  const handleFilterChange = (newFilters: ExploreFilters) => {
    setFilters(newFilters)
  }

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPosts(1, false)
  }

  // Handle sort change
  const handleSortChange = (value: string, label: string) => {
    setSortBy(value)
    setActiveSortLabel(label)
  }

  // Update sort label on init
  useEffect(() => {
    if (sortBy === "popular") setActiveSortLabel("Most Popular")
    else if (sortBy === "trending") setActiveSortLabel("Trending")
    else if (sortBy === "nearest") setActiveSortLabel("Nearest to Me")
    else setActiveSortLabel("Most Recent")
  }, [sortBy])

  // Load posts initially or when dependencies change
  useEffect(() => {
    loadPosts(1, false)
  }, [loadPosts])

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar for filters - hidden on mobile */}
      <div className="hidden md:block md:col-span-3 lg:col-span-2">
        <ExploreFiltersComponent
          onFilterChange={handleFilterChange}
          totalResults={totalCount}
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
        />
      </div>

      {/* Main content area */}
      <div className="col-span-12 md:col-span-9 lg:col-span-10">
        {/* Search and sort controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search places, posts, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-10"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[160px] justify-between">
                  <span>{activeSortLabel}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onClick={() => handleSortChange("recent", "Most Recent")}>
                  Most Recent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("popular", "Most Popular")}>
                  Most Popular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("trending", "Trending")}>Trending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("nearest", "Nearest to Me")}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Nearest to Me
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile filter button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setShowMobileFilters(true)}
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile filters - shown as a button that opens a sheet */}
        <div className="md:hidden mb-4">
          <ExploreFiltersComponent
            onFilterChange={handleFilterChange}
            totalResults={totalCount}
            showMobileFilters={showMobileFilters}
            setShowMobileFilters={setShowMobileFilters}
          />
        </div>

        {/* Posts grid */}
        <ExplorePostGrid
          posts={posts}
          highlightedPosts={highlightedPosts}
          loading={isLoading}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          currentPage={currentPage}
          totalPosts={totalCount}
        />
      </div>
    </div>
  )
}
