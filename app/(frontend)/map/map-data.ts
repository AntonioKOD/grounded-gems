export interface Location {
    id: string
    name: string
    latitude: number
    longitude: number
    category: string
    address: string
    description?: string
    imageUrl?: string
    rating?: number
    reviewCount?: number
    eventDate?: string
    hours?: string
    phone?: string
    website?: string
    amenities?: string[]
  }
  
  // Mock locations data
  export const mockLocations: Location[] = [
    {
      id: "1",
      name: "Central Park Music Festival",
      latitude: 40.7812,
      longitude: -73.9665,
      category: "Music",
      address: "Central Park, New York, NY",
      description:
        "Annual music festival featuring top artists from around the world. Enjoy food vendors, art installations, and unforgettable performances across multiple stages.",
      imageUrl: "/vibrant-music-fest.png",
      rating: 4.8,
      reviewCount: 387,
      eventDate: "August 15-17, 2023",
      hours: "11:00 AM - 11:00 PM",
      website: "https://example.com/music-festival",
      amenities: ["Food Vendors", "Restrooms", "Seating Areas", "Water Stations"],
    },
    {
      id: "2",
      name: "Metropolitan Art Gallery",
      latitude: 40.7794,
      longitude: -73.9632,
      category: "Art",
      address: "1000 5th Ave, New York, NY 10028",
      description:
        "One of the world's largest and finest art museums with a collection that spans 5,000 years of world culture.",
      imageUrl: "/gallery-evening.png",
      rating: 4.9,
      reviewCount: 512,
      hours: "10:00 AM - 5:30 PM, Closed Mondays",
      phone: "(212) 535-7710",
      website: "https://example.com/art-gallery",
      amenities: ["Guided Tours", "Gift Shop", "Café", "Wheelchair Accessible"],
    },
    {
      id: "3",
      name: "Gourmet Food Market",
      latitude: 40.7425,
      longitude: -73.9878,
      category: "Food",
      address: "75 9th Ave, New York, NY 10011",
      description:
        "Indoor food hall featuring dozens of vendors selling gourmet foods, artisanal products, and international cuisine.",
      imageUrl: "/gourmet-wine-tasting.png",
      rating: 4.6,
      reviewCount: 298,
      hours: "7:00 AM - 9:00 PM Daily",
      phone: "(212) 652-2110",
      website: "https://example.com/food-market",
      amenities: ["Indoor Seating", "Outdoor Seating", "Public Restrooms"],
    },
    {
      id: "4",
      name: "Tech Innovation Hub",
      latitude: 40.7128,
      longitude: -74.006,
      category: "Tech",
      address: "350 5th Ave, New York, NY 10118",
      description: "A collaborative workspace and event venue for tech startups, entrepreneurs, and innovators.",
      imageUrl: "/tech-conference-modern.png",
      rating: 4.7,
      reviewCount: 156,
      hours: "9:00 AM - 6:00 PM, Mon-Fri",
      phone: "(212) 736-3100",
      website: "https://example.com/tech-hub",
      amenities: ["Free WiFi", "Meeting Rooms", "Coffee Bar", "Printing Services"],
    },
    {
      id: "5",
      name: "Riverside Yoga Studio",
      latitude: 40.7903,
      longitude: -73.9597,
      category: "Wellness",
      address: "500 W 72nd St, New York, NY 10023",
      description:
        "Tranquil yoga studio offering a variety of classes for all skill levels with views of the Hudson River.",
      imageUrl: "/park-yoga-flow.png",
      rating: 4.5,
      reviewCount: 203,
      hours: "6:00 AM - 9:00 PM Daily",
      phone: "(212) 362-5000",
      website: "https://example.com/yoga-studio",
      amenities: ["Changing Rooms", "Showers", "Mat Rentals", "Water Station"],
    },
    {
      id: "6",
      name: "Comedy Club Downtown",
      latitude: 40.7308,
      longitude: -73.9973,
      category: "Entertainment",
      address: "117 MacDougal St, New York, NY 10012",
      description:
        "Intimate comedy club featuring both established comedians and rising stars in the heart of Greenwich Village.",
      rating: 4.4,
      reviewCount: 178,
      hours: "7:00 PM - 2:00 AM, Thu-Sun",
      phone: "(212) 254-3480",
      website: "https://example.com/comedy-club",
      amenities: ["Full Bar", "Food Menu", "VIP Seating"],
    },
    {
      id: "7",
      name: "Waterfront Park",
      latitude: 40.7023,
      longitude: -74.016,
      category: "Wellness",
      address: "Battery Park, New York, NY 10004",
      description:
        "Scenic park along the Hudson River with walking paths, green spaces, and stunning views of the Statue of Liberty.",
      rating: 4.7,
      reviewCount: 342,
      hours: "6:00 AM - 1:00 AM Daily",
      amenities: ["Playgrounds", "Bike Paths", "Public Restrooms", "Dog-Friendly"],
    },
    {
      id: "8",
      name: "Historic Theater",
      latitude: 40.759,
      longitude: -73.9845,
      category: "Entertainment",
      address: "1564 Broadway, New York, NY 10036",
      description: "Landmark theater showcasing Broadway productions in an elegant, historic setting.",
      rating: 4.8,
      reviewCount: 276,
      hours: "Box Office: 10:00 AM - 8:00 PM",
      phone: "(212) 302-4100",
      website: "https://example.com/historic-theater",
      amenities: ["Coat Check", "Bar Service", "Accessible Seating"],
    },
    {
      id: "9",
      name: "Craft Brewery",
      latitude: 40.7075,
      longitude: -73.9626,
      category: "Food",
      address: "79 N 11th St, Brooklyn, NY 11249",
      description:
        "Local brewery offering tours, tastings, and a rotating selection of craft beers in a converted warehouse space.",
      rating: 4.5,
      reviewCount: 189,
      hours: "12:00 PM - 10:00 PM, Wed-Sun",
      phone: "(718) 486-7422",
      website: "https://example.com/craft-brewery",
      amenities: ["Outdoor Seating", "Food Trucks", "Live Music (Weekends)"],
    },
    {
      id: "10",
      name: "Science Museum",
      latitude: 40.7813,
      longitude: -73.9739,
      category: "Tech",
      address: "Central Park West & 79th St, New York, NY 10024",
      description:
        "Interactive science museum with exhibits on natural history, space exploration, and technological innovation.",
      rating: 4.9,
      reviewCount: 423,
      hours: "10:00 AM - 5:45 PM, Closed Mondays",
      phone: "(212) 769-5100",
      website: "https://example.com/science-museum",
      amenities: ["IMAX Theater", "Planetarium", "Café", "Gift Shop"],
    },
  ]
  
  // Function to search locations by query
  export function searchLocations(locations: Location[], query: string): Location[] {
    const lowerCaseQuery = query.toLowerCase()
  
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(lowerCaseQuery) ||
        location.address.toLowerCase().includes(lowerCaseQuery) ||
        location.category.toLowerCase().includes(lowerCaseQuery) ||
        (location.description && location.description.toLowerCase().includes(lowerCaseQuery)),
    )
  }
  