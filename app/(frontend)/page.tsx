import { Metadata } from "next"
import Link from "next/link"
import { Users, MapPin, Calendar, Star } from "lucide-react"
// Import components
import Hero from "@/components/hero"
import AnimatedStats from "@/components/animated-stats"
import GeolocationLocations from "@/components/geolocation-locations"


// Import server actions and types
import { getUpcomingEvents, getPublicLocations, getFeaturedCategories, getPlatformStats } from "@/app/(frontend)/home-page-actions/actions"
import { getCategoryIcon } from "@/components/ui/category-icons"
import Image from "next/image"


// Prevent static generation
export const dynamic = "force-dynamic"
export const revalidate = 60 // Revalidate at most once per minute

export const metadata: Metadata = {
  title: "Sacavia | Guided Discovery & Authentic Journeys",
  description: "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories. Your journey begins here.",
  openGraph: {
    title: "Sacavia | Guided Discovery & Authentic Journeys",
    description: "Discover authentic experiences and meaningful places with your community. Guided by wisdom, connected by stories.",
    images: ['/og-image.png'],
  },
}





export default async function HomePage() {
  // Fetch data - get more locations initially
  const [upcomingEvents, publicLocations, featuredCategories, platformStats] = await Promise.all([
    getUpcomingEvents(6),
    getPublicLocations(6), // Increased to show more locations
    getFeaturedCategories(8), // Get 8 featured categories
    getPlatformStats() // Get real platform statistics
  ])

  // Use real location data from database
  const locationSamples = publicLocations

  // Transform fetched categories into display format
  const categories = featuredCategories.map((category) => {
    const icon = getCategoryIcon(category.name, category.slug)
    const iconColor = category.color || "#4ECDC4"
    
    // Generate a light background color based on the main color
    const backgroundColor = `${iconColor}15` // Add 15% opacity
    
    return {
      name: category.name,
      icon,
      iconColor,
      backgroundColor,
      count: category.count,
      href: `/search?category=${category.slug}`,
      slug: category.slug,
      description: category.description
    }
  })

  // Stats data using real platform statistics
  const statsItems = [
    { 
      value: platformStats.locationCount, 
      label: "Hidden Gems", 
      icon: <MapPin className="h-6 w-6" />, 
      suffix: platformStats.locationCount > 20 ? "+" : "" 
    },
    { 
      value: platformStats.userCount, 
      label: "Community Members", 
      icon: <Users className="h-6 w-6" />, 
      suffix: platformStats.userCount > 50 ? "+" : "" 
    },
    { 
      value: platformStats.eventCount, 
      label: "Local Events", 
      icon: <Calendar className="h-6 w-6" />, 
      suffix: platformStats.eventCount > 10 ? "+" : "" 
    },
    { 
      value: platformStats.averageRating, 
      label: "Average Rating", 
      icon: <Star className="h-6 w-6" />, 
      prefix: "" 
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero />
      
      <main className="relative pb-16 md:pb-0">
        
        <div className="container mx-auto px-4 py-8">
          {/* Primary Action: Nearby Locations Section - Most Used Feature */}
          <section className="pt-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Discover Nearby
              </h2>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                Amazing places close to you
              </p>
            </div>
{locationSamples.length > 0 ? (
              <GeolocationLocations initialLocations={locationSamples} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No locations available at the moment.</p>
                <Link href="/add-location">
                  <button className="px-6 py-3 bg-[#FF6B6B] text-white rounded-lg hover:bg-[#FF6B6B]/90 transition-colors">
                    Add the First Location
                  </button>
                </Link>
              </div>
            )}
            
            {locationSamples.length > 0 && (
              <div className="mt-6 text-center">
                <Link
                  href="/map"
                  className="inline-flex items-center px-6 py-3 bg-[#4ECDC4] text-white rounded-lg hover:bg-[#3DBDB5] font-medium transition-colors"
                >
                  Explore All Places
                  <svg
                    className="ml-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Link>
              </div>
            )}
          </section>

          {/* Quick Categories - Simplified to Top 4 Most Popular */}
          <section className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                Popular Categories
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.slice(0, 4).map((category) => (
                <Link key={category.name} href={category.href}>
                  <div className="group p-4 rounded-lg border border-gray-100 hover:border-[#4ECDC4]/30 hover:shadow-md transition-all duration-200 cursor-pointer text-center">
                    <div 
                      className="flex items-center justify-center w-10 h-10 rounded-full mb-3 mx-auto"
                      style={{ backgroundColor: category.backgroundColor }}
                    >
                      <div style={{ color: category.iconColor }}>
                        {category.icon}
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{category.count} places</p>
                  </div>
                </Link>
              ))}
            </div>
            {categories.length > 4 && (
              <div className="mt-4 text-center">
                <Link
                  href="/search"
                  className="text-[#4ECDC4] hover:text-[#3DBDB5] font-medium text-sm transition-colors"
                >
                  View all categories →
                </Link>
              </div>
            )}
          </section>
          
          {/* Secondary Content: Upcoming Events - Simplified */}
          {upcomingEvents.length > 0 && (
            <section className="mt-16">
              <div className="text-center mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                  Happening Soon
                </h2>
                <p className="text-base text-gray-600">
                  Events near you
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.slice(0, 4).map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                    {event.image?.url && (
                      <div className="relative h-40 overflow-hidden">
                        <Image
                          src={event.image.url}
                          alt={event.image.alt || event.name}
                          width={400}
                          height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-2">{event.name}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>
                      <div className="flex items-center text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-sm">
                          {new Date(event.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {upcomingEvents.length > 2 && (
              <div className="mt-6 text-center">
                <Link
                  href="/events"
                  className="text-[#4ECDC4] hover:text-[#3DBDB5] font-medium text-sm transition-colors"
                >
                  View all events →
                </Link>
              </div>
            )}
          </section>
          )}
          
          {/* Simple CTA - Following Zipf's Law: One Primary Action */}
          <section className="mt-16 py-12 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Start Exploring
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Discover amazing places and connect with your community
            </p>
            <Link href="/map">
              <button className="px-8 py-3 bg-[#4ECDC4] hover:bg-[#3DBDB5] text-white rounded-lg font-medium transition-colors shadow-lg">
                Explore Now
              </button>
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}
