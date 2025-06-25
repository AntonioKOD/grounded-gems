// Simple script to create challenges via API
const BASE_URL = 'http://localhost:3000'

const sampleChallenges = [
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
    weekNumber: 26,
    year: 2025,
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
    weekNumber: 26,
    year: 2025,
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
    weekNumber: 26,
    year: 2025,
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    locationBased: true,
    maxDistance: 20,
    estimatedDuration: "medium",
    cost: "free",
    featured: true,
    tags: ["street art", "culture", "photography", "urban"]
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

async function createChallenges() {
  console.log('🚀 Starting to create challenges via API...')
  
  // Create challenges
  for (const challengeData of sampleChallenges) {
    try {
      const response = await fetch(`${BASE_URL}/api/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(challengeData)
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Created challenge: ${challengeData.title}`)
      } else {
        const errorData = await response.json()
        console.error(`❌ Error creating challenge ${challengeData.title}:`, errorData)
      }
    } catch (error) {
      console.error(`❌ Error creating challenge ${challengeData.title}:`, error.message)
    }
  }
  
  console.log('🎯 Starting to create suggestions via API...')
  
  // Create suggestions
  for (const suggestionData of sampleSuggestions) {
    try {
      const response = await fetch(`${BASE_URL}/api/challenges/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...suggestionData,
          status: 'pending',
          featured: true
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Created suggestion: ${suggestionData.title}`)
      } else {
        const errorData = await response.json()
        console.error(`❌ Error creating suggestion ${suggestionData.title}:`, errorData)
      }
    } catch (error) {
      console.error(`❌ Error creating suggestion ${suggestionData.title}:`, error.message)
    }
  }
  
  console.log('🎉 Sample challenges and suggestions created successfully!')
  
  // Get summary
  try {
    const [challengesResponse, suggestionsResponse] = await Promise.all([
      fetch(`${BASE_URL}/api/challenges`),
      fetch(`${BASE_URL}/api/challenges/suggestions`)
    ])
    
    if (challengesResponse.ok && suggestionsResponse.ok) {
      const [challengesData, suggestionsData] = await Promise.all([
        challengesResponse.json(),
        suggestionsResponse.json()
      ])
      
      console.log(`📊 Summary:`)
      console.log(`   - Challenges created: ${challengesData.data.challenges.length}`)
      console.log(`   - Suggestions created: ${suggestionsData.data.suggestions.length}`)
    }
  } catch (error) {
    console.error('Error getting summary:', error)
  }
}

// Run the script
createChallenges().catch(console.error) 