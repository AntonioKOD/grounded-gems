// Script to add new categories using API endpoint
const categories = [
  // 🍕 Food Niches & Local Flavors
  {
    name: 'New York-Style Pizza',
    slug: 'new-york-style-pizza',
    type: 'location',
    source: 'manual',
    description: 'Authentic New York-style pizza joints with thin crust and classic toppings',
    color: '#FF6B6B',
    order: 1,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Neapolitan Pizza',
    slug: 'neapolitan-pizza',
    type: 'location',
    source: 'manual',
    description: 'Traditional Neapolitan pizza with wood-fired ovens and authentic Italian ingredients',
    color: '#FF6B6B',
    order: 2,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Halal Carts & Street Eats',
    slug: 'halal-carts-street-eats',
    type: 'location',
    source: 'manual',
    description: 'Halal food carts and street vendors serving authentic Middle Eastern and South Asian cuisine',
    color: '#4ECDC4',
    order: 3,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Korean BBQ & Hot Pot',
    slug: 'korean-bbq-hot-pot',
    type: 'location',
    source: 'manual',
    description: 'Korean BBQ restaurants and hot pot establishments for interactive dining experiences',
    color: '#FFE66D',
    order: 4,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Latin Eateries',
    slug: 'latin-eateries',
    type: 'location',
    source: 'manual',
    description: 'Peruvian, Dominican, Cuban, and other Latin American restaurants and food spots',
    color: '#FF8E53',
    order: 5,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Ramen & Noodle Bars',
    slug: 'ramen-noodle-bars',
    type: 'location',
    source: 'manual',
    description: 'Authentic ramen shops and noodle bars serving various Asian noodle dishes',
    color: '#4ECDC4',
    order: 6,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Vegan Comfort Food',
    slug: 'vegan-comfort-food',
    type: 'location',
    source: 'manual',
    description: 'Plant-based restaurants specializing in vegan comfort food and creative alternatives',
    color: '#10B981',
    order: 7,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Gourmet Burgers',
    slug: 'gourmet-burgers',
    type: 'location',
    source: 'manual',
    description: 'Upscale burger joints with creative toppings and high-quality ingredients',
    color: '#FF6B6B',
    order: 8,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Dumpling Houses',
    slug: 'dumpling-houses',
    type: 'location',
    source: 'manual',
    description: 'Restaurants specializing in dumplings, dim sum, and steamed bun varieties',
    color: '#FFE66D',
    order: 9,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Dessert Bars & Ice Cream Labs',
    slug: 'dessert-bars-ice-cream-labs',
    type: 'location',
    source: 'manual',
    description: 'Innovative dessert bars, artisanal ice cream shops, and creative sweet spots',
    color: '#FF8E53',
    order: 10,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },

  // 🛍️ Specialty Shops & Curated Goods
  {
    name: 'Record Stores & Vinyl',
    slug: 'record-stores-vinyl',
    type: 'location',
    source: 'manual',
    description: 'Independent record stores selling vinyl records, CDs, and music memorabilia',
    color: '#8B5CF6',
    order: 11,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Comics & Collectibles',
    slug: 'comics-collectibles',
    type: 'location',
    source: 'manual',
    description: 'Comic book shops, collectible stores, and pop culture merchandise outlets',
    color: '#3B82F6',
    order: 12,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Zero-Waste & Eco Shops',
    slug: 'zero-waste-eco-shops',
    type: 'location',
    source: 'manual',
    description: 'Sustainable stores focusing on zero-waste products and eco-friendly alternatives',
    color: '#10B981',
    order: 13,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Craft Supply & Maker Shops',
    slug: 'craft-supply-maker-shops',
    type: 'location',
    source: 'manual',
    description: 'Art supply stores, craft shops, and maker spaces for creative projects',
    color: '#F59E0B',
    order: 14,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Plant & Succulent Boutiques',
    slug: 'plant-succulent-boutiques',
    type: 'location',
    source: 'manual',
    description: 'Plant shops specializing in houseplants, succulents, and gardening supplies',
    color: '#10B981',
    order: 15,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },

  // 🌙 After Dark Vibes
  {
    name: 'Late-Night Eats',
    slug: 'late-night-eats',
    type: 'location',
    source: 'manual',
    description: 'Restaurants and food spots open late for night owls and shift workers',
    color: '#6366F1',
    order: 16,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Rooftop Lounges',
    slug: 'rooftop-lounges',
    type: 'location',
    source: 'manual',
    description: 'Elevated bars and lounges with skyline views and outdoor seating',
    color: '#8B5CF6',
    order: 17,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Hookah & Shisha Bars',
    slug: 'hookah-shisha-bars',
    type: 'location',
    source: 'manual',
    description: 'Hookah lounges and shisha bars for social smoking experiences',
    color: '#EC4899',
    order: 18,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Karaoke Rooms',
    slug: 'karaoke-rooms',
    type: 'location',
    source: 'manual',
    description: 'Private karaoke rooms and karaoke bars for singing entertainment',
    color: '#F59E0B',
    order: 19,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Live DJ & Dance Venues',
    slug: 'live-dj-dance-venues',
    type: 'location',
    source: 'manual',
    description: 'Clubs and venues featuring live DJs and dancing with various music genres',
    color: '#8B5CF6',
    order: 20,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },

  // 📸 Instagrammable Spots
  {
    name: 'Colorful Alleys & Murals',
    slug: 'colorful-alleys-murals',
    type: 'location',
    source: 'manual',
    description: 'Vibrant street art, murals, and colorful alleyways perfect for photos',
    color: '#EC4899',
    order: 21,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Neon Signs & Retro Diners',
    slug: 'neon-signs-retro-diners',
    type: 'location',
    source: 'manual',
    description: 'Vintage neon signs, retro diners, and nostalgic spots with photogenic aesthetics',
    color: '#F59E0B',
    order: 22,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Sunset Rooftops',
    slug: 'sunset-rooftops',
    type: 'location',
    source: 'manual',
    description: 'Rooftop locations and elevated spots perfect for sunset photography',
    color: '#FF8E53',
    order: 23,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Hidden Courtyards',
    slug: 'hidden-courtyards',
    type: 'location',
    source: 'manual',
    description: 'Secluded courtyards, gardens, and intimate outdoor spaces',
    color: '#10B981',
    order: 24,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Aesthetic Bathrooms',
    slug: 'aesthetic-bathrooms',
    type: 'location',
    source: 'manual',
    description: 'Uniquely designed restrooms and bathrooms with Instagram-worthy interiors',
    color: '#EC4899',
    order: 25,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },

  // 🎒 Urban Adventures & Social Stuff
  {
    name: 'Trivia Nights & Pub Quizzes',
    slug: 'trivia-nights-pub-quizzes',
    type: 'event',
    source: 'manual',
    description: 'Bars and venues hosting regular trivia nights and quiz competitions',
    color: '#3B82F6',
    order: 26,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Themed Cafés',
    slug: 'themed-cafes',
    type: 'location',
    source: 'manual',
    description: 'Cat cafés, board game cafés, and other uniquely themed coffee shops',
    color: '#F59E0B',
    order: 27,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Street Fairs & Flea Markets',
    slug: 'street-fairs-flea-markets',
    type: 'event',
    source: 'manual',
    description: 'Outdoor markets, street fairs, and flea markets for unique finds',
    color: '#10B981',
    order: 28,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Picnic-Friendly Parks',
    slug: 'picnic-friendly-parks',
    type: 'location',
    source: 'manual',
    description: 'Parks and green spaces perfect for picnics and outdoor gatherings',
    color: '#10B981',
    order: 29,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Walking Tours & Story Hunts',
    slug: 'walking-tours-story-hunts',
    type: 'event',
    source: 'manual',
    description: 'Guided walking tours and interactive story hunts exploring local history',
    color: '#6366F1',
    order: 30,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },

  // Additional 20 categories continue here (truncated for brevity)...
  // Adding the remaining categories
  {
    name: 'Bookstores & Reading Spots',
    slug: 'bookstores-reading-spots',
    type: 'location',
    source: 'manual',
    description: 'Cozy reading nooks, independent bookstores, and community libraries',
    color: '#8B5CF6',
    order: 31,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Creative Studios',
    slug: 'creative-studios',
    type: 'location',
    source: 'manual',
    description: 'Pottery studios, art jam spots, music recording spaces, and creative workshops',
    color: '#EC4899',
    order: 32,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Language & Cultural Exchanges',
    slug: 'language-cultural-exchanges',
    type: 'event',
    source: 'manual',
    description: 'Language meetups, cultural exchange events, and community centers',
    color: '#4ECDC4',
    order: 33,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Neighborhood Gems',
    slug: 'neighborhood-gems',
    type: 'location',
    source: 'manual',
    description: 'Hyper-local standouts like the best stoop coffee spot in the neighborhood',
    color: '#F59E0B',
    order: 34,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Community Gardens',
    slug: 'community-gardens',
    type: 'location',
    source: 'manual',
    description: 'Volunteer-friendly or visitable community gardens and urban farms',
    color: '#10B981',
    order: 35,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Coworking & Study Spaces',
    slug: 'coworking-study-spaces',
    type: 'location',
    source: 'manual',
    description: 'Aesthetic, community-powered locations to work, study, or read',
    color: '#3B82F6',
    order: 36,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Speakeasies & Secret Spots',
    slug: 'speakeasies-secret-spots',
    type: 'location',
    source: 'manual',
    description: 'Hard-to-find bars, password-only venues, and hidden speakeasies',
    color: '#6366F1',
    order: 37,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Oddities & Curiosities',
    slug: 'oddities-curiosities',
    type: 'location',
    source: 'manual',
    description: 'Weird museums, magic shops, taxidermy stores, and unusual attractions',
    color: '#8B5CF6',
    order: 38,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Escape Rooms & Puzzle Spots',
    slug: 'escape-rooms-puzzle-spots',
    type: 'location',
    source: 'manual',
    description: 'Interactive escape rooms and puzzle experiences for group fun and dates',
    color: '#EC4899',
    order: 39,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Skateparks & Bike Trails',
    slug: 'skateparks-bike-trails',
    type: 'location',
    source: 'manual',
    description: 'Urban recreation infrastructure including skateparks and bike trails',
    color: '#10B981',
    order: 40,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Outdoor Fitness Zones',
    slug: 'outdoor-fitness-zones',
    type: 'location',
    source: 'manual',
    description: 'Calisthenics parks, open-air gyms, and outdoor workout equipment',
    color: '#F59E0B',
    order: 41,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Adventure Activities',
    slug: 'adventure-activities',
    type: 'location',
    source: 'manual',
    description: 'Kayaking, zip-lining, paragliding, and other adventure activity spots',
    color: '#FF6B6B',
    order: 42,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Open Mic & Poetry Nights',
    slug: 'open-mic-poetry-nights',
    type: 'event',
    source: 'manual',
    description: 'Rotating community events featuring open mic and poetry performances',
    color: '#8B5CF6',
    order: 43,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Board Game Cafés & Arcades',
    slug: 'board-game-cafes-arcades',
    type: 'location',
    source: 'manual',
    description: 'Analog and digital social gaming venues with board games and arcade machines',
    color: '#3B82F6',
    order: 44,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Drive-in & Rooftop Cinemas',
    slug: 'drive-in-rooftop-cinemas',
    type: 'location',
    source: 'manual',
    description: 'Vintage-style drive-in theaters and scenic rooftop movie viewing experiences',
    color: '#EC4899',
    order: 45,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Hostels & Artist Residencies',
    slug: 'hostels-artist-residencies',
    type: 'location',
    source: 'manual',
    description: 'Budget-friendly lodging and creative residencies for travelers and artists',
    color: '#4ECDC4',
    order: 46,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: "Traveler's Tips & Local Hacks",
    slug: 'travelers-tips-local-hacks',
    type: 'general',
    source: 'manual',
    description: 'Mini guides and user-submitted lifehacks for travelers and locals',
    color: '#6366F1',
    order: 47,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Digital Nomad Hotspots',
    slug: 'digital-nomad-hotspots',
    type: 'location',
    source: 'manual',
    description: 'Internet cafés, coworking lounges, and travel-friendly workspaces',
    color: '#3B82F6',
    order: 48,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Meetups & Networking Events',
    slug: 'meetups-networking-events',
    type: 'event',
    source: 'manual',
    description: 'Entrepreneurship mixers, local hackathons, and professional networking events',
    color: '#3B82F6',
    order: 49,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  },
  {
    name: 'Startup Hubs & Incubators',
    slug: 'startup-hubs-incubators',
    type: 'location',
    source: 'manual',
    description: 'Innovation spaces, startup incubators, and entrepreneurship hubs in the city',
    color: '#8B5CF6',
    order: 50,
    isActive: true,
    isFeatured: true,
    showInFilter: true
  }
]

console.log(`📋 Starting to add ${categories.length} new categories...`)

// Function to add each category by making a direct database insertion via Payload API
async function addCategoriesDirectly() {
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]
    
    try {
      console.log(`${i + 1}/${categories.length} Creating: ${category.name}`)
      
      // We'll output the curl commands to run manually
      const curlCommand = `curl -X POST http://localhost:3000/api/categories \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
    ...category,
    meta: {
      title: `${category.name} | Sacavia`,
      description: category.description,
      keywords: category.name.toLowerCase().replace(/\s+/g, ', ')
    }
  })}'`
      
      console.log(curlCommand)
      console.log('')
      
    } catch (error) {
      console.error(`❌ Error with ${category.name}:`, error.message)
    }
  }
  
  console.log('✅ All category commands generated!')
  console.log('\n📝 To add these categories, run the curl commands above against your running dev server.')
}

addCategoriesDirectly() 