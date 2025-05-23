import { Suspense } from "react"
import Hero from "@/components/hero"
import FilterBar from "@/components/filter-bar"
import CategoryGrid from "@/components/category-grid"
import SuggestedEvents from "@/components/suggested-events"
import NearbyLocations from "@/components/nearby-locations"
import { Skeleton } from "@/components/ui/skeleton"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarPlus, MapPin } from "lucide-react"

// Prevent static generation
export const dynamic = "force-dynamic"
export const revalidate = 60 // Revalidate at most once per minute

function SuggestedEventsSkeleton() {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-gray-200">
            <Skeleton className="h-40 w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function NearbyLocationsSkeleton() {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-gray-200">
            <Skeleton className="h-40 w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CategoryGridSkeleton() {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <main className="relative pb-16 md:pb-0">
        <FilterBar />
        <div className="container mx-auto px-4 py-8 space-y-16">
          {/* Suggested Events with Suspense boundary */}
          <Suspense fallback={<SuggestedEventsSkeleton />}>
            <SuggestedEvents />
          </Suspense>

          {/* Nearby Locations with Suspense boundary */}
          <Suspense fallback={<NearbyLocationsSkeleton />}>
            <NearbyLocations />
          </Suspense>

          {/* Categories with Suspense boundary */}
          <Suspense fallback={<CategoryGridSkeleton />}>
            <CategoryGrid />
          </Suspense>

          {/* Add Event/Location CTA Section */}
          <section className="bg-gradient-to-r from-[#f8fcfc] to-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Events & Locations</h2>
                <p className="text-gray-600 max-w-lg">
                  Know a great spot or planning an event? Share it with the Local Explorer community and help others
                  discover amazing experiences.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/events/create">
                  <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 min-w-[180px]">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Add Event
                  </Button>
                </Link>
                <Link href="/add-location">
                  <Button className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 min-w-[180px]">
                    <MapPin className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
