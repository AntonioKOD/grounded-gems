import { getPayload } from 'payload'
import config from '../payload.config.ts'

const sampleChallenges = [
  // Weekly Challenges
  {
    title: "🌅 Sunrise Explorer",
    description: "Start your day by visiting 3 different sunrise spots in your city. Capture the beauty of dawn and share your morning adventures with the community.",
    shortDescription: "Visit 3 sunrise spots and capture the beauty of dawn",
    category: "exploration",
    difficulty: "easy",
    reward: "Sunrise Badge + 150 Points",
    rewardPoints: 150,
    requirements: [
      { requirement: "Visit 3 different sunrise viewing locations", count: 3 },
      { requirement: "Take photos at each location", count: 3 },
      { requirement: "Share your experience with a post", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 1,
    year: 2024,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-01-07'),
    locationBased: true,
    maxDistance: 25,
    estimatedDuration: "short",
    cost: "free",
    featured: true,
    tags: ["sunrise", "morning", "photography", "nature"]
  },
  {
    title: "🍕 Pizza Quest",
    description: "Embark on a delicious journey to find the best pizza in your area. Visit 5 different pizza places and rate them based on taste, atmosphere, and value.",
    shortDescription: "Find and rate the best pizza places in your area",
    category: "food",
    difficulty: "medium",
    reward: "Pizza Connoisseur Badge + 200 Points",
    rewardPoints: 200,
    requirements: [
      { requirement: "Visit 5 different pizza restaurants", count: 5 },
      { requirement: "Rate each place (taste, atmosphere, value)", count: 5 },
      { requirement: "Share your top pick with reasons", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 1,
    year: 2024,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-01-07'),
    locationBased: true,
    maxDistance: 30,
    estimatedDuration: "medium",
    cost: "medium",
    featured: true,
    tags: ["pizza", "food", "restaurants", "rating"]
  },
  {
    title: "🎨 Street Art Safari",
    description: "Discover the vibrant street art scene in your city. Find and photograph 10 different murals, graffiti pieces, or public art installations.",
    shortDescription: "Find and photograph 10 street art pieces",
    category: "culture",
    difficulty: "medium",
    reward: "Art Explorer Badge + 175 Points",
    rewardPoints: 175,
    requirements: [
      { requirement: "Find 10 different street art pieces", count: 10 },
      { requirement: "Take photos of each piece", count: 10 },
      { requirement: "Learn about one artist and share their story", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 1,
    year: 2024,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-01-07'),
    locationBased: true,
    maxDistance: 20,
    estimatedDuration: "medium",
    cost: "free",
    featured: true,
    tags: ["street art", "culture", "photography", "urban"]
  },
  {
    title: "🏃‍♀️ Park Runner",
    description: "Get active and explore your local parks! Visit 5 different parks and complete a 10-minute activity at each one (walking, jogging, yoga, etc.).",
    shortDescription: "Visit 5 parks and do 10-minute activities at each",
    category: "fitness",
    difficulty: "easy",
    reward: "Park Explorer Badge + 125 Points",
    rewardPoints: 125,
    requirements: [
      { requirement: "Visit 5 different parks", count: 5 },
      { requirement: "Complete 10-minute activity at each park", count: 5 },
      { requirement: "Share your favorite park and why", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 2,
    year: 2024,
    startsAt: new Date('2024-01-08'),
    expiresAt: new Date('2024-01-14'),
    locationBased: true,
    maxDistance: 15,
    estimatedDuration: "medium",
    cost: "free",
    featured: true,
    tags: ["parks", "fitness", "outdoors", "exercise"]
  },
  {
    title: "📚 Bookstore Crawl",
    description: "Support local bookstores by visiting 3 different independent bookshops. Browse their collections, chat with staff, and discover new reads.",
    shortDescription: "Visit 3 independent bookstores and discover new reads",
    category: "culture",
    difficulty: "easy",
    reward: "Bookworm Badge + 150 Points",
    rewardPoints: 150,
    requirements: [
      { requirement: "Visit 3 independent bookstores", count: 3 },
      { requirement: "Take photos of each store", count: 3 },
      { requirement: "Share a book recommendation from each store", count: 3 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 2,
    year: 2024,
    startsAt: new Date('2024-01-08'),
    expiresAt: new Date('2024-01-14'),
    locationBased: true,
    maxDistance: 25,
    estimatedDuration: "short",
    cost: "low",
    featured: true,
    tags: ["books", "bookstores", "culture", "reading"]
  },
  {
    title: "🌙 Night Photography",
    description: "Capture the magic of your city at night. Take photos of 5 different nighttime scenes - city lights, moonlit landmarks, or starry skies.",
    shortDescription: "Take 5 nighttime photos of your city",
    category: "photography",
    difficulty: "medium",
    reward: "Night Photographer Badge + 200 Points",
    rewardPoints: 200,
    requirements: [
      { requirement: "Take 5 nighttime photos", count: 5 },
      { requirement: "Visit different locations for each photo", count: 5 },
      { requirement: "Share your best shot with camera settings", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 2,
    year: 2024,
    startsAt: new Date('2024-01-08'),
    expiresAt: new Date('2024-01-14'),
    locationBased: true,
    maxDistance: 20,
    estimatedDuration: "medium",
    cost: "free",
    featured: true,
    tags: ["night", "photography", "city", "lights"]
  },
  {
    title: "☕ Coffee Connoisseur",
    description: "Explore the local coffee scene! Visit 4 different coffee shops and try their signature drinks. Rate each experience and find your new favorite spot.",
    shortDescription: "Visit 4 coffee shops and try their signature drinks",
    category: "food",
    difficulty: "easy",
    reward: "Coffee Expert Badge + 175 Points",
    rewardPoints: 175,
    requirements: [
      { requirement: "Visit 4 different coffee shops", count: 4 },
      { requirement: "Try signature drink at each shop", count: 4 },
      { requirement: "Rate each experience and share your favorite", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 3,
    year: 2024,
    startsAt: new Date('2024-01-15'),
    expiresAt: new Date('2024-01-21'),
    locationBased: true,
    maxDistance: 20,
    estimatedDuration: "short",
    cost: "low",
    featured: true,
    tags: ["coffee", "cafes", "drinks", "local"]
  },
  {
    title: "🎭 Cultural Explorer",
    description: "Immerse yourself in different cultures by visiting 3 cultural venues (museums, galleries, theaters, or cultural centers) and learning something new.",
    shortDescription: "Visit 3 cultural venues and learn something new",
    category: "culture",
    difficulty: "medium",
    reward: "Cultural Ambassador Badge + 225 Points",
    rewardPoints: 225,
    requirements: [
      { requirement: "Visit 3 cultural venues", count: 3 },
      { requirement: "Take photos at each venue", count: 3 },
      { requirement: "Share one interesting fact learned at each venue", count: 3 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 3,
    year: 2024,
    startsAt: new Date('2024-01-15'),
    expiresAt: new Date('2024-01-21'),
    locationBased: true,
    maxDistance: 30,
    estimatedDuration: "medium",
    cost: "medium",
    featured: true,
    tags: ["culture", "museums", "learning", "arts"]
  },
  {
    title: "🌿 Green Thumb",
    description: "Connect with nature by visiting 3 different gardens, parks, or nature reserves. Learn about local plants and wildlife, and share your discoveries.",
    shortDescription: "Visit 3 gardens/parks and learn about local nature",
    category: "environmental",
    difficulty: "easy",
    reward: "Nature Lover Badge + 150 Points",
    rewardPoints: 150,
    requirements: [
      { requirement: "Visit 3 gardens, parks, or nature reserves", count: 3 },
      { requirement: "Take photos of interesting plants/wildlife", count: 3 },
      { requirement: "Share one new thing you learned about local nature", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 3,
    year: 2024,
    startsAt: new Date('2024-01-15'),
    expiresAt: new Date('2024-01-21'),
    locationBased: true,
    maxDistance: 25,
    estimatedDuration: "short",
    cost: "free",
    featured: true,
    tags: ["nature", "gardens", "wildlife", "outdoors"]
  },
  {
    title: "🎵 Music Venue Crawl",
    description: "Discover the local music scene! Visit 3 different music venues (bars, clubs, theaters) and experience live music or open mic nights.",
    shortDescription: "Visit 3 music venues and experience live music",
    category: "culture",
    difficulty: "medium",
    reward: "Music Explorer Badge + 200 Points",
    rewardPoints: 200,
    requirements: [
      { requirement: "Visit 3 different music venues", count: 3 },
      { requirement: "Experience live music at each venue", count: 3 },
      { requirement: "Share your favorite performance and why", count: 1 }
    ],
    status: "active",
    isWeekly: true,
    weekNumber: 4,
    year: 2024,
    startsAt: new Date('2024-01-22'),
    expiresAt: new Date('2024-01-28'),
    locationBased: true,
    maxDistance: 25,
    estimatedDuration: "medium",
    cost: "medium",
    featured: true,
    tags: ["music", "live music", "venues", "entertainment"]
  }
]

const sampleSuggestions = [
  {
    title: "Historical Building Tour",
    description: "Visit 5 historical buildings in your city and learn about their architectural significance and historical importance. Take photos and share the stories behind each building.",
    category: "culture",
    difficulty: "medium",
    estimatedDuration: "medium",
    cost: "free",
    locationBased: true,
    weatherDependent: false,
    seasonal: false,
    tags: ["history", "architecture", "buildings", "education"]
  },
  {
    title: "Food Truck Festival",
    description: "Create a food truck crawl by visiting 4 different food trucks in your area. Try their signature dishes and rate the overall experience including taste, service, and value.",
    category: "food",
    difficulty: "easy",
    estimatedDuration: "short",
    cost: "low",
    locationBased: true,
    weatherDependent: true,
    seasonal: false,
    tags: ["food trucks", "street food", "local", "festival"]
  },
  {
    title: "Sunset Photography Challenge",
    description: "Capture stunning sunset photos from 3 different vantage points in your city. Experiment with different angles, compositions, and camera settings to create unique shots.",
    category: "photography",
    difficulty: "medium",
    estimatedDuration: "short",
    cost: "free",
    locationBased: true,
    weatherDependent: true,
    seasonal: false,
    tags: ["sunset", "photography", "nature", "landscape"]
  },
  {
    title: "Local Market Explorer",
    description: "Visit 3 different local markets (farmers markets, flea markets, craft markets) and discover unique products, meet local vendors, and support small businesses.",
    category: "social",
    difficulty: "easy",
    estimatedDuration: "medium",
    cost: "low",
    locationBased: true,
    weatherDependent: true,
    seasonal: true,
    targetSeason: "summer",
    tags: ["markets", "local", "shopping", "community"]
  }
]

async function createSampleChallenges() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🚀 Starting to create sample challenges...')
    
    // Create challenges
    for (const challengeData of sampleChallenges) {
      try {
        const challenge = await payload.create({
          collection: 'challenges',
          data: challengeData
        })
        console.log(`✅ Created challenge: ${challenge.title}`)
      } catch (error) {
        console.error(`❌ Error creating challenge ${challengeData.title}:`, error.message)
      }
    }
    
    console.log('🎯 Starting to create sample suggestions...')
    
    // Create suggestions
    for (const suggestionData of sampleSuggestions) {
      try {
        const suggestion = await payload.create({
          collection: 'challenge-suggestions',
          data: {
            ...suggestionData,
            status: 'pending',
            featured: true
          }
        })
        console.log(`✅ Created suggestion: ${suggestion.title}`)
      } catch (error) {
        console.error(`❌ Error creating suggestion ${suggestionData.title}:`, error.message)
      }
    }
    
    console.log('🎉 Sample challenges and suggestions created successfully!')
    
    // Get summary
    const [challenges, suggestions] = await Promise.all([
      payload.find({
        collection: 'challenges',
        limit: 1000
      }),
      payload.find({
        collection: 'challenge-suggestions',
        limit: 1000
      })
    ])
    
    console.log(`📊 Summary:`)
    console.log(`   - Challenges created: ${challenges.docs.length}`)
    console.log(`   - Suggestions created: ${suggestions.docs.length}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating sample data:', error)
    process.exit(1)
  }
}

createSampleChallenges() 