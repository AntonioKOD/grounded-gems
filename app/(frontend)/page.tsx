import Hero from "@/components/hero"
import FilterBar from "@/components/filter-bar"
import FeaturedEvents from "@/components/featured-events"
import CategoryGrid from "@/components/category-grid"
import RecommendedEvents from "@/components/recommended-events"


import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarPlus, MapPin } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <main className="relative pb-16 md:pb-0">
        <FilterBar />
        <div className="container mx-auto px-4 py-8 space-y-16">
          <FeaturedEvents />
          <CategoryGrid />

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
                <Link href="/add-event">
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

          <RecommendedEvents />
        </div>
      </main>
    </div>
  )
}
