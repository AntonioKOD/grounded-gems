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
  title: "Grounded Gems | Discover Hidden Treasures",
  description: "Explore and share hidden gems, local experiences, and amazing places with like-minded explorers.",
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
          {/* Categories Section */}
          <section className="pt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Explore by Category
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Discover hidden gems based on your interests
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Link key={category.name} href={category.href}>
                  <div className="group p-6 rounded-xl border border-gray-100 hover:border-[#4ECDC4]/30 hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div 
                      className="flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto"
                      style={{ backgroundColor: category.backgroundColor }}
                    >
                      <div style={{ color: category.iconColor }}>
                        {category.icon}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.count} place{category.count === 1 ? '' : 's'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          
          {/* Nearby Locations Section */}
          <section className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Nearby Hidden Gems
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Discover amazing places close to you
              </p>
            </div>
{locationSamples.length > 0 ? (
              <GeolocationLocations initialLocations={locationSamples} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No locations available at the moment.</p>
                <Link href="/add-location">
                  <button className="px-6 py-3 bg-[#FF6B6B] text-white rounded-lg hover:bg-[#FF6B6B]/90 transition-colors">
                    Add the First Location
                  </button>
                </Link>
              </div>
            )}
            
            {locationSamples.length > 0 && (
              <div className="mt-8 text-center">
                <Link
                  href="/map"
                  className="inline-flex items-center text-[#4ECDC4] hover:text-[#3DBDB5] font-medium transition-colors"
                >
                  Discover more nearby
                  <svg
                    className="ml-1 h-4 w-4"
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
          
          {/* Stats Section */}
          <AnimatedStats 
            title="Join Our Growing Community"
            subtitle="Discover and share authentic local experiences with explorers like you"
            items={statsItems}
            className="mt-20 bg-gray-50/50 rounded-2xl"
          />
          
          {/* Upcoming Events Section */}
          <section className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Upcoming Events
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Join exciting events happening near you
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.slice(0, 6).map((event) => (
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
            
            <div className="mt-8 text-center">
              <Link
                href="/events"
                className="inline-flex items-center text-[#4ECDC4] hover:text-[#3DBDB5] font-medium transition-colors"
              >
                View all events
                <svg
                  className="ml-1 h-4 w-4"
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
          </section>
          
          {/* Call to Action Section */}
          <section className="mt-20 py-16 bg-gradient-to-br from-[#FF6B6B]/5 via-transparent to-[#4ECDC4]/5 rounded-2xl">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Ready to Explore?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Join our community of explorers and start discovering amazing places around you
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/map">
                  <button className="px-8 py-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white rounded-lg font-medium transition-colors">
                    Explore Map
                  </button>
                </Link>
                <Link href="/add-location">
                  <button className="px-8 py-3 border-2 border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white rounded-lg font-medium transition-colors">
                    Add a Place
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
