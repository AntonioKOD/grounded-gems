import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, Users, DollarSign, Share2, Heart, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EventGallery from "@/components/event-gallery"
import EventMap from "@/components/event-map"
import RelatedEvents from "@/components/related-events"
import EventReviews from "@/components/event-reviews"

// This would typically come from a database
const getEventData = (id: string) => {
  return {
    id,
    title: "Summer Music Festival",
    description:
      "Join us for three days of amazing live music featuring top artists from around the world. Enjoy food vendors, art installations, and unforgettable performances across multiple stages.",
    longDescription:
      "The Summer Music Festival is the highlight of the season, bringing together music lovers from all over the country. This year's lineup features an incredible mix of established stars and emerging talent across multiple genres.\n\nWith three main stages, food from award-winning local restaurants, art installations from renowned artists, and plenty of activities, this is more than just a concert—it's an experience you won't want to miss.\n\nThe festival grounds open at 11:00 AM each day, with performances scheduled until 11:00 PM. Camping options are available for those who want the full festival experience.",
    date: "August 15-17, 2023",
    time: "11:00 AM - 11:00 PM",
    location: "Central Park, New York",
    address: "5th Ave, New York, NY 10022",
    organizer: "NYC Events Co.",
    category: "Music",
    price: "$59",
    priceRange: "$59 - $299",
    attendees: 1245,
    maxAttendees: 5000,
    rating: 4.8,
    reviewCount: 387,
    featured: true,
    image: "/vibrant-music-fest.png",
    gallery: [
      "/vibrant-music-fest.png",
      "/gallery-evening.png",
      "/tech-conference-modern.png",
      "/gourmet-wine-tasting.png",
    ],
    tags: ["Music", "Festival", "Outdoor", "Live Performance", "Food & Drinks"],
    amenities: ["Food Vendors", "Restrooms", "Seating Areas", "Water Stations", "First Aid", "ATM"],
    coordinates: {
      lat: 40.7812,
      lng: -73.9665,
    },
  }
}



export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id
  const event = await getEventData(id)

  return (
    <div className="min-h-screen bg-white">
      {/* Back button */}
      <div className="container mx-auto px-4 py-4">
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span>Back to events</span>
        </Link>
      </div>

      {/* Event Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#FFE66D] hover:bg-[#FFE66D]/90 text-gray-900">{event.category}</Badge>
                <span className="text-sm text-gray-500">
                  {event.attendees} attending · {event.reviewCount} reviews
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{event.title}</h1>
              <p className="text-gray-600 max-w-3xl">{event.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-300">
                <Share2 className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-gray-300">
                <Heart className="h-5 w-5 text-gray-600" />
              </Button>
              <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Get Tickets</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2/3 width on desktop */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Gallery */}
            <EventGallery images={event.gallery} />

            {/* Event Details Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="about"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-600 py-3"
                >
                  About
                </TabsTrigger>
                <TabsTrigger
                  value="schedule"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-600 py-3"
                >
                  Schedule
                </TabsTrigger>
                <TabsTrigger
                  value="location"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-600 py-3"
                >
                  Location
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-600 py-3"
                >
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-3">About This Event</h2>
                    <div className="prose max-w-none text-gray-700">
                      <p>{event.longDescription}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="bg-gray-100 hover:bg-gray-200 text-gray-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-2">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {event.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#4ECDC4]"></div>
                          <span className="text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-2">Organizer</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="font-bold text-gray-600">
                          {event.organizer
                            .split(" ")
                            .map((word) => word[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{event.organizer}</p>
                        <p className="text-sm text-gray-500">Event Organizer</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="pt-6">
                <div className="space-y-6">
                  <h2 className="text-xl font-bold mb-3">Event Schedule</h2>

                  <div className="space-y-4">
                    <div className="border-l-4 border-[#4ECDC4] pl-4 py-2">
                      <h3 className="font-bold">Day 1 - August 15</h3>
                      <div className="mt-3 space-y-3">
                        <div className="flex">
                          <div className="w-24 text-gray-500">11:00 AM</div>
                          <div>
                            <p className="font-medium">Gates Open</p>
                            <p className="text-sm text-gray-600">Welcome activities and vendor setup</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">12:30 PM</div>
                          <div>
                            <p className="font-medium">Opening Act - The Soundwaves</p>
                            <p className="text-sm text-gray-600">Main Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">3:00 PM</div>
                          <div>
                            <p className="font-medium">Rhythm Collective</p>
                            <p className="text-sm text-gray-600">Second Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">6:00 PM</div>
                          <div>
                            <p className="font-medium">Sunset Jam Session</p>
                            <p className="text-sm text-gray-600">Acoustic Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">8:30 PM</div>
                          <div>
                            <p className="font-medium">Headliner - Electric Dreams</p>
                            <p className="text-sm text-gray-600">Main Stage</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-4 border-[#FFE66D] pl-4 py-2">
                      <h3 className="font-bold">Day 2 - August 16</h3>
                      <div className="mt-3 space-y-3">
                        <div className="flex">
                          <div className="w-24 text-gray-500">11:00 AM</div>
                          <div>
                            <p className="font-medium">Gates Open</p>
                            <p className="text-sm text-gray-600">Morning yoga and wellness activities</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">1:00 PM</div>
                          <div>
                            <p className="font-medium">Indie Showcase</p>
                            <p className="text-sm text-gray-600">Second Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">4:00 PM</div>
                          <div>
                            <p className="font-medium">Global Beats Collective</p>
                            <p className="text-sm text-gray-600">Main Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">7:00 PM</div>
                          <div>
                            <p className="font-medium">Acoustic Sessions</p>
                            <p className="text-sm text-gray-600">Acoustic Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">9:00 PM</div>
                          <div>
                            <p className="font-medium">Headliner - Neon Pulse</p>
                            <p className="text-sm text-gray-600">Main Stage</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-4 border-[#FF6B6B] pl-4 py-2">
                      <h3 className="font-bold">Day 3 - August 17</h3>
                      <div className="mt-3 space-y-3">
                        <div className="flex">
                          <div className="w-24 text-gray-500">11:00 AM</div>
                          <div>
                            <p className="font-medium">Gates Open</p>
                            <p className="text-sm text-gray-600">Community art project</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">12:00 PM</div>
                          <div>
                            <p className="font-medium">Local Talent Showcase</p>
                            <p className="text-sm text-gray-600">Second Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">3:30 PM</div>
                          <div>
                            <p className="font-medium">DJ Battle</p>
                            <p className="text-sm text-gray-600">Electronic Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">6:00 PM</div>
                          <div>
                            <p className="font-medium">Sunset Concert</p>
                            <p className="text-sm text-gray-600">Main Stage</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-24 text-gray-500">9:00 PM</div>
                          <div>
                            <p className="font-medium">Closing Headliner - Harmony Heights</p>
                            <p className="text-sm text-gray-600">Main Stage</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="location" className="pt-6">
                <div className="space-y-6">
                  <h2 className="text-xl font-bold mb-3">Event Location</h2>

                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/2">
                      <p className="font-medium text-lg">{event.location}</p>
                      <p className="text-gray-600 mb-4">{event.address}</p>

                      <div className="space-y-3">
                        <h3 className="font-medium">Getting There</h3>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#4ECDC4] text-white flex items-center justify-center mt-0.5">
                              <span className="text-xs font-bold">S</span>
                            </div>
                            <div>
                              <p className="font-medium">Subway</p>
                              <p className="text-sm text-gray-600">Take the A, B, or C line to 86th Street Station</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#FF6B6B] text-white flex items-center justify-center mt-0.5">
                              <span className="text-xs font-bold">B</span>
                            </div>
                            <div>
                              <p className="font-medium">Bus</p>
                              <p className="text-sm text-gray-600">M1, M2, M3, or M4 to 5th Avenue/82nd Street</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#FFE66D] text-gray-900 flex items-center justify-center mt-0.5">
                              <span className="text-xs font-bold">P</span>
                            </div>
                            <div>
                              <p className="font-medium">Parking</p>
                              <p className="text-sm text-gray-600">
                                Limited parking available at 5th Ave Garage ($25/day)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:w-1/2 h-[300px]">
                      <EventMap coordinates={event.coordinates} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="pt-6">
                <EventReviews eventId={event.id} rating={event.rating} reviewCount={event.reviewCount} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 1/3 width on desktop */}
          <div className="space-y-6">
            {/* Event Info Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div className="font-bold text-2xl text-gray-900">{event.priceRange}</div>
                  <Badge className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">
                    {event.attendees}/{event.maxAttendees} attending
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-gray-600">{event.date}</p>
                      <p className="text-gray-600">{event.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-gray-600">{event.location}</p>
                      <p className="text-gray-600">{event.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                    <div>
                      <p className="font-medium">Organizer</p>
                      <p className="text-gray-600">{event.organizer}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-[#4ECDC4] mt-0.5" />
                    <div>
                      <p className="font-medium">Price</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">General Admission</span>
                          <span className="text-gray-900">$59</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">VIP Package</span>
                          <span className="text-gray-900">$149</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">3-Day Pass + Camping</span>
                          <span className="text-gray-900">$299</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 h-12 text-lg">Get Tickets</Button>

                <p className="text-xs text-center text-gray-500">
                  Tickets are selling fast! 78% sold in the last 24 hours.
                </p>
              </div>
            </div>

            {/* Weather Widget */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4">
                <h3 className="font-medium mb-3">Weather Forecast</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#FFE66D]/20 flex items-center justify-center">
                        <Image src="/bright-sun-icon.png" alt="Sunny" width={24} height={24} />
                      </div>
                      <span>Aug 15</span>
                    </div>
                    <span className="font-medium">82°F / 28°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#4ECDC4]/20 flex items-center justify-center">
                        <Image src="/partly-cloudy-day.png" alt="Partly Cloudy" width={24} height={24} />
                      </div>
                      <span>Aug 16</span>
                    </div>
                    <span className="font-medium">79°F / 26°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#FFE66D]/20 flex items-center justify-center">
                        <Image src="/bright-sun-icon.png" alt="Sunny" width={24} height={24} />
                      </div>
                      <span>Aug 17</span>
                    </div>
                    <span className="font-medium">84°F / 29°C</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Widget */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4">
                <h3 className="font-medium mb-3">Share This Event</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Facebook
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Twitter
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Events Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <RelatedEvents category={event.category} />
        </div>
      </main>
    </div>
  )
}
