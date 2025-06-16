import { getPayload } from 'payload'
import config from '../payload.config.ts'

// New categories organized by sections
const newCategories = [
  // 🍕 Food Niches & Local Flavors
  {
    name: 'New York-Style Pizza',
    slug: 'new-york-style-pizza',
    type: 'location',
    source: 'manual',
    description: 'Authentic New York-style pizza joints with thin crust and classic toppings',
    color: '#FF6B6B',
    order: 1,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Neapolitan Pizza',
    slug: 'neapolitan-pizza',
    type: 'location',
    source: 'manual',
    description: 'Traditional Neapolitan pizza with wood-fired ovens and authentic Italian ingredients',
    color: '#FF6B6B',
    order: 2,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Halal Carts & Street Eats',
    slug: 'halal-carts-street-eats',
    type: 'location',
    source: 'manual',
    description: 'Halal food carts and street vendors serving authentic Middle Eastern and South Asian cuisine',
    color: '#4ECDC4',
    order: 3,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Korean BBQ & Hot Pot',
    slug: 'korean-bbq-hot-pot',
    type: 'location',
    source: 'manual',
    description: 'Korean BBQ restaurants and hot pot establishments for interactive dining experiences',
    color: '#FFE66D',
    order: 4,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Latin Eateries',
    slug: 'latin-eateries',
    type: 'location',
    source: 'manual',
    description: 'Peruvian, Dominican, Cuban, and other Latin American restaurants and food spots',
    color: '#FF8E53',
    order: 5,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Ramen & Noodle Bars',
    slug: 'ramen-noodle-bars',
    type: 'location',
    source: 'manual',
    description: 'Authentic ramen shops and noodle bars serving various Asian noodle dishes',
    color: '#4ECDC4',
    order: 6,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Vegan Comfort Food',
    slug: 'vegan-comfort-food',
    type: 'location',
    source: 'manual',
    description: 'Plant-based restaurants specializing in vegan comfort food and creative alternatives',
    color: '#10B981',
    order: 7,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Gourmet Burgers',
    slug: 'gourmet-burgers',
    type: 'location',
    source: 'manual',
    description: 'Upscale burger joints with creative toppings and high-quality ingredients',
    color: '#FF6B6B',
    order: 8,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Dumpling Houses',
    slug: 'dumpling-houses',
    type: 'location',
    source: 'manual',
    description: 'Restaurants specializing in dumplings, dim sum, and steamed bun varieties',
    color: '#FFE66D',
    order: 9,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
  },
  {
    name: 'Dessert Bars & Ice Cream Labs',
    slug: 'dessert-bars-ice-cream-labs',
    type: 'location',
    source: 'manual',
    description: 'Innovative dessert bars, artisanal ice cream shops, and creative sweet spots',
    color: '#FF8E53',
    order: 10,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Food Niches & Local Flavors'
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
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Specialty Shops & Curated Goods'
  },
  {
    name: 'Comics & Collectibles',
    slug: 'comics-collectibles',
    type: 'location',
    source: 'manual',
    description: 'Comic book shops, collectible stores, and pop culture merchandise outlets',
    color: '#3B82F6',
    order: 12,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Specialty Shops & Curated Goods'
  },
  {
    name: 'Zero-Waste & Eco Shops',
    slug: 'zero-waste-eco-shops',
    type: 'location',
    source: 'manual',
    description: 'Sustainable stores focusing on zero-waste products and eco-friendly alternatives',
    color: '#10B981',
    order: 13,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Specialty Shops & Curated Goods'
  },
  {
    name: 'Craft Supply & Maker Shops',
    slug: 'craft-supply-maker-shops',
    type: 'location',
    source: 'manual',
    description: 'Art supply stores, craft shops, and maker spaces for creative projects',
    color: '#F59E0B',
    order: 14,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Specialty Shops & Curated Goods'
  },
  {
    name: 'Plant & Succulent Boutiques',
    slug: 'plant-succulent-boutiques',
    type: 'location',
    source: 'manual',
    description: 'Plant shops specializing in houseplants, succulents, and gardening supplies',
    color: '#10B981',
    order: 15,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Specialty Shops & Curated Goods'
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
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'After Dark Vibes'
  },
  {
    name: 'Rooftop Lounges',
    slug: 'rooftop-lounges',
    type: 'location',
    source: 'manual',
    description: 'Elevated bars and lounges with skyline views and outdoor seating',
    color: '#8B5CF6',
    order: 17,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'After Dark Vibes'
  },
  {
    name: 'Hookah & Shisha Bars',
    slug: 'hookah-shisha-bars',
    type: 'location',
    source: 'manual',
    description: 'Hookah lounges and shisha bars for social smoking experiences',
    color: '#EC4899',
    order: 18,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'After Dark Vibes'
  },
  {
    name: 'Karaoke Rooms',
    slug: 'karaoke-rooms',
    type: 'location',
    source: 'manual',
    description: 'Private karaoke rooms and karaoke bars for singing entertainment',
    color: '#F59E0B',
    order: 19,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'After Dark Vibes'
  },
  {
    name: 'Live DJ & Dance Venues',
    slug: 'live-dj-dance-venues',
    type: 'location',
    source: 'manual',
    description: 'Clubs and venues featuring live DJs and dancing with various music genres',
    color: '#8B5CF6',
    order: 20,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'After Dark Vibes'
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
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Instagrammable Spots'
  },
  {
    name: 'Neon Signs & Retro Diners',
    slug: 'neon-signs-retro-diners',
    type: 'location',
    source: 'manual',
    description: 'Vintage neon signs, retro diners, and nostalgic spots with photogenic aesthetics',
    color: '#F59E0B',
    order: 22,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Instagrammable Spots'
  },
  {
    name: 'Sunset Rooftops',
    slug: 'sunset-rooftops',
    type: 'location',
    source: 'manual',
    description: 'Rooftop locations and elevated spots perfect for sunset photography',
    color: '#FF8E53',
    order: 23,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Instagrammable Spots'
  },
  {
    name: 'Hidden Courtyards',
    slug: 'hidden-courtyards',
    type: 'location',
    source: 'manual',
    description: 'Secluded courtyards, gardens, and intimate outdoor spaces',
    color: '#10B981',
    order: 24,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Instagrammable Spots'
  },
  {
    name: 'Aesthetic Bathrooms',
    slug: 'aesthetic-bathrooms',
    type: 'location',
    source: 'manual',
    description: 'Uniquely designed restrooms and bathrooms with Instagram-worthy interiors',
    color: '#EC4899',
    order: 25,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Instagrammable Spots'
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
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Urban Adventures & Social Stuff'
  },
  {
    name: 'Themed Cafés',
    slug: 'themed-cafes',
    type: 'location',
    source: 'manual',
    description: 'Cat cafés, board game cafés, and other uniquely themed coffee shops',
    color: '#F59E0B',
    order: 27,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Urban Adventures & Social Stuff'
  },
  {
    name: 'Street Fairs & Flea Markets',
    slug: 'street-fairs-flea-markets',
    type: 'event',
    source: 'manual',
    description: 'Outdoor markets, street fairs, and flea markets for unique finds',
    color: '#10B981',
    order: 28,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Urban Adventures & Social Stuff'
  },
  {
    name: 'Picnic-Friendly Parks',
    slug: 'picnic-friendly-parks',
    type: 'location',
    source: 'manual',
    description: 'Parks and green spaces perfect for picnics and outdoor gatherings',
    color: '#10B981',
    order: 29,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Urban Adventures & Social Stuff'
  },
  {
    name: 'Walking Tours & Story Hunts',
    slug: 'walking-tours-story-hunts',
    type: 'event',
    source: 'manual',
    description: 'Guided walking tours and interactive story hunts exploring local history',
    color: '#6366F1',
    order: 30,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Urban Adventures & Social Stuff'
  },

  // 🧠 Enrichment & Personal Growth
  {
    name: 'Bookstores & Reading Spots',
    slug: 'bookstores-reading-spots',
    type: 'location',
    source: 'manual',
    description: 'Cozy reading nooks, independent bookstores, and community libraries',
    color: '#8B5CF6',
    order: 31,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Enrichment & Personal Growth'
  },
  {
    name: 'Creative Studios',
    slug: 'creative-studios',
    type: 'location',
    source: 'manual',
    description: 'Pottery studios, art jam spots, music recording spaces, and creative workshops',
    color: '#EC4899',
    order: 32,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Enrichment & Personal Growth'
  },
  {
    name: 'Language & Cultural Exchanges',
    slug: 'language-cultural-exchanges',
    type: 'event',
    source: 'manual',
    description: 'Language meetups, cultural exchange events, and community centers',
    color: '#4ECDC4',
    order: 33,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Enrichment & Personal Growth'
  },

  // 🏡 Community & Local Living
  {
    name: 'Neighborhood Gems',
    slug: 'neighborhood-gems',
    type: 'location',
    source: 'manual',
    description: 'Hyper-local standouts like the best stoop coffee spot in the neighborhood',
    color: '#F59E0B',
    order: 34,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Community & Local Living'
  },
  {
    name: 'Community Gardens',
    slug: 'community-gardens',
    type: 'location',
    source: 'manual',
    description: 'Volunteer-friendly or visitable community gardens and urban farms',
    color: '#10B981',
    order: 35,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Community & Local Living'
  },
  {
    name: 'Coworking & Study Spaces',
    slug: 'coworking-study-spaces',
    type: 'location',
    source: 'manual',
    description: 'Aesthetic, community-powered locations to work, study, or read',
    color: '#3B82F6',
    order: 36,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Community & Local Living'
  },

  // 🎲 Hidden Fun & Quirky
  {
    name: 'Speakeasies & Secret Spots',
    slug: 'speakeasies-secret-spots',
    type: 'location',
    source: 'manual',
    description: 'Hard-to-find bars, password-only venues, and hidden speakeasies',
    color: '#6366F1',
    order: 37,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Hidden Fun & Quirky'
  },
  {
    name: 'Oddities & Curiosities',
    slug: 'oddities-curiosities',
    type: 'location',
    source: 'manual',
    description: 'Weird museums, magic shops, taxidermy stores, and unusual attractions',
    color: '#8B5CF6',
    order: 38,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Hidden Fun & Quirky'
  },
  {
    name: 'Escape Rooms & Puzzle Spots',
    slug: 'escape-rooms-puzzle-spots',
    type: 'location',
    source: 'manual',
    description: 'Interactive escape rooms and puzzle experiences for group fun and dates',
    color: '#EC4899',
    order: 39,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Hidden Fun & Quirky'
  },

  // 👟 Active Exploration
  {
    name: 'Skateparks & Bike Trails',
    slug: 'skateparks-bike-trails',
    type: 'location',
    source: 'manual',
    description: 'Urban recreation infrastructure including skateparks and bike trails',
    color: '#10B981',
    order: 40,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Active Exploration'
  },
  {
    name: 'Outdoor Fitness Zones',
    slug: 'outdoor-fitness-zones',
    type: 'location',
    source: 'manual',
    description: 'Calisthenics parks, open-air gyms, and outdoor workout equipment',
    color: '#F59E0B',
    order: 41,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Active Exploration'
  },
  {
    name: 'Adventure Activities',
    slug: 'adventure-activities',
    type: 'location',
    source: 'manual',
    description: 'Kayaking, zip-lining, paragliding, and other adventure activity spots',
    color: '#FF6B6B',
    order: 42,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Active Exploration'
  },

  // 🎭 Niche Entertainment
  {
    name: 'Open Mic & Poetry Nights',
    slug: 'open-mic-poetry-nights',
    type: 'event',
    source: 'manual',
    description: 'Rotating community events featuring open mic and poetry performances',
    color: '#8B5CF6',
    order: 43,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Niche Entertainment'
  },
  {
    name: 'Board Game Cafés & Arcades',
    slug: 'board-game-cafes-arcades',
    type: 'location',
    source: 'manual',
    description: 'Analog and digital social gaming venues with board games and arcade machines',
    color: '#3B82F6',
    order: 44,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Niche Entertainment'
  },
  {
    name: 'Drive-in & Rooftop Cinemas',
    slug: 'drive-in-rooftop-cinemas',
    type: 'location',
    source: 'manual',
    description: 'Vintage-style drive-in theaters and scenic rooftop movie viewing experiences',
    color: '#EC4899',
    order: 45,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Niche Entertainment'
  },

  // 🧳 Traveler & Nomad Life
  {
    name: 'Hostels & Artist Residencies',
    slug: 'hostels-artist-residencies',
    type: 'location',
    source: 'manual',
    description: 'Budget-friendly lodging and creative residencies for travelers and artists',
    color: '#4ECDC4',
    order: 46,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Traveler & Nomad Life'
  },
  {
    name: "Traveler's Tips & Local Hacks",
    slug: 'travelers-tips-local-hacks',
    type: 'general',
    source: 'manual',
    description: 'Mini guides and user-submitted lifehacks for travelers and locals',
    color: '#6366F1',
    order: 47,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Traveler & Nomad Life'
  },
  {
    name: 'Digital Nomad Hotspots',
    slug: 'digital-nomad-hotspots',
    type: 'location',
    source: 'manual',
    description: 'Internet cafés, coworking lounges, and travel-friendly workspaces',
    color: '#3B82F6',
    order: 48,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Traveler & Nomad Life'
  },

  // 💼 Business & Networking
  {
    name: 'Meetups & Networking Events',
    slug: 'meetups-networking-events',
    type: 'event',
    source: 'manual',
    description: 'Entrepreneurship mixers, local hackathons, and professional networking events',
    color: '#3B82F6',
    order: 49,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Business & Networking'
  },
  {
    name: 'Startup Hubs & Incubators',
    slug: 'startup-hubs-incubators',
    type: 'location',
    source: 'manual',
    description: 'Innovation spaces, startup incubators, and entrepreneurship hubs in the city',
    color: '#8B5CF6',
    order: 50,
    parent: null,
    isActive: true,
    isFeatured: true,
    showInFilter: true,
    section: 'Business & Networking'
  }
]

async function addNewCategories() {
  try {
    console.log('🚀 Starting to add new categories...')
    
    const payload = await getPayload({ config })
    const results = {
      created: 0,
      errors: []
    }

    for (const categoryData of newCategories) {
      try {
        // Check if category already exists
        const existingCategory = await payload.find({
          collection: 'categories',
          where: {
            slug: {
              equals: categoryData.slug
            }
          }
        })

        if (existingCategory.docs.length > 0) {
          console.log(`⚠️  Category "${categoryData.name}" already exists, skipping...`)
          continue
        }

        // Create new category
        const newCategory = await payload.create({
          collection: 'categories',
          data: {
            ...categoryData,
            meta: {
              title: `${categoryData.name} | Sacavia`,
              description: categoryData.description,
              keywords: categoryData.name.toLowerCase().replace(/\s+/g, ', ')
            }
          }
        })

        console.log(`✅ Created category: ${categoryData.name} (${categoryData.section})`)
        results.created++

      } catch (error) {
        console.error(`❌ Error creating category "${categoryData.name}":`, error)
        results.errors.push(`${categoryData.name}: ${error.message}`)
      }
    }

    console.log('\n🎉 Category creation completed!')
    console.log(`📊 Results: ${results.created} created`)
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.length}`)
      results.errors.forEach(error => console.log(`   - ${error}`))
    }

    // Display categories by section
    console.log('\n📋 Categories added by section:')
    const sections = [...new Set(newCategories.map(cat => cat.section))]
    for (const section of sections) {
      const sectionCategories = newCategories.filter(cat => cat.section === section)
      console.log(`\n${section}:`)
      sectionCategories.forEach(cat => {
        console.log(`   • ${cat.name}`)
      })
    }

    return results

  } catch (error) {
    console.error('💥 Fatal error:', error)
    throw error
  }
}

// Run the script
addNewCategories()
  .then((results) => {
    console.log('\n🏁 Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  }) 