const { MongoClient } = require('mongodb')

// MongoDB connection string - replace with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sacavia'

// Weekly challenges data
const weeklyChallenges = [
  {
    title: "Urban Explorer",
    description: "Visit 5 different neighborhoods in your city this week. Document each with a photo and share what makes each area unique.",
    difficulty: "Easy",
    reward: "50 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 1,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    category: "Exploration",
    tags: ["urban", "neighborhoods", "photography"],
    requirements: {
      minLocations: 5,
      requirePhotos: true,
      requireDescriptions: true
    },
    status: "active"
  },
  {
    title: "Hidden Gems Hunter",
    description: "Find and visit 3 local businesses or spots that have less than 100 reviews. Share your discoveries with the community.",
    difficulty: "Medium",
    reward: "75 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 1,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    category: "Discovery",
    tags: ["hidden-gems", "local-business", "reviews"],
    requirements: {
      minLocations: 3,
      maxReviews: 100,
      requireReviews: true
    },
    status: "active"
  },
  {
    title: "Foodie Adventure",
    description: "Try 4 different cuisines this week. Visit restaurants serving food from different countries or regions.",
    difficulty: "Medium",
    reward: "60 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 2,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    category: "Food",
    tags: ["food", "cuisine", "restaurants"],
    requirements: {
      minLocations: 4,
      requirePhotos: true,
      requireRatings: true
    },
    status: "active"
  },
  {
    title: "Nature Explorer",
    description: "Visit 3 different parks, trails, or natural areas. Share the beauty of nature in your area.",
    difficulty: "Easy",
    reward: "40 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 2,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    category: "Nature",
    tags: ["nature", "parks", "outdoors"],
    requirements: {
      minLocations: 3,
      requirePhotos: true,
      requireDescriptions: true
    },
    status: "active"
  },
  {
    title: "Cultural Immersion",
    description: "Visit 2 museums, galleries, or cultural centers. Learn something new and share your experience.",
    difficulty: "Medium",
    reward: "65 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 3,
    expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
    category: "Culture",
    tags: ["culture", "museums", "learning"],
    requirements: {
      minLocations: 2,
      requirePhotos: true,
      requireReviews: true
    },
    status: "active"
  },
  {
    title: "Fitness Challenge",
    description: "Visit 3 different fitness-related locations (gyms, parks, sports facilities) and try different activities.",
    difficulty: "Hard",
    reward: "80 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 3,
    expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    category: "Fitness",
    tags: ["fitness", "sports", "health"],
    requirements: {
      minLocations: 3,
      requirePhotos: true,
      requireActivityLog: true
    },
    status: "active"
  },
  {
    title: "Local History Buff",
    description: "Visit 2 historical sites or landmarks in your area. Learn about the history and share interesting facts.",
    difficulty: "Easy",
    reward: "45 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 4,
    expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
    category: "History",
    tags: ["history", "landmarks", "education"],
    requirements: {
      minLocations: 2,
      requirePhotos: true,
      requireHistoricalInfo: true
    },
    status: "active"
  },
  {
    title: "Art & Creativity",
    description: "Visit 3 art galleries, street art locations, or creative spaces. Share the most inspiring pieces you find.",
    difficulty: "Medium",
    reward: "70 points",
    participants: 0,
    isWeekly: true,
    weekNumber: 4,
    expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    category: "Art",
    tags: ["art", "creativity", "inspiration"],
    requirements: {
      minLocations: 3,
      requirePhotos: true,
      requireArtisticReviews: true
    },
    status: "active"
  }
]

// Challenge suggestions for voting
const challengeSuggestions = [
  {
    title: "Coffee Shop Crawl",
    description: "Visit 5 different coffee shops in your city. Rate their coffee, atmosphere, and find your new favorite spot.",
    difficulty: "Easy",
    category: "Food & Drink",
    tags: ["coffee", "cafes", "rating"],
    estimatedReward: "50 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  },
  {
    title: "Sunrise Photography",
    description: "Wake up early and capture 3 beautiful sunrise photos from different locations in your city.",
    difficulty: "Medium",
    category: "Photography",
    tags: ["photography", "sunrise", "early-bird"],
    estimatedReward: "60 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  },
  {
    title: "Local Market Explorer",
    description: "Visit 2 farmers markets or local markets. Buy something from at least 3 different vendors and share your finds.",
    difficulty: "Easy",
    category: "Shopping",
    tags: ["markets", "local", "shopping"],
    estimatedReward: "40 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  },
  {
    title: "Bookstore Adventure",
    description: "Visit 3 different bookstores or libraries. Find a book from a genre you've never read before.",
    difficulty: "Easy",
    category: "Education",
    tags: ["books", "libraries", "reading"],
    estimatedReward: "45 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  },
  {
    title: "Music Venue Tour",
    description: "Visit 2 live music venues or performance spaces. Attend a show or just explore the venues.",
    difficulty: "Medium",
    category: "Entertainment",
    tags: ["music", "live-shows", "venues"],
    estimatedReward: "70 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  },
  {
    title: "Street Food Safari",
    description: "Try 4 different street food vendors or food trucks. Rate each one and share your favorites.",
    difficulty: "Medium",
    category: "Food",
    tags: ["street-food", "food-trucks", "tasting"],
    estimatedReward: "65 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  },
  {
    title: "Architecture Walk",
    description: "Take a walking tour of your city's architecture. Visit 5 buildings with interesting designs or history.",
    difficulty: "Medium",
    category: "Architecture",
    tags: ["architecture", "walking", "design"],
    estimatedReward: "55 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  },
  {
    title: "Local Brewery Tour",
    description: "Visit 3 local breweries or craft beer spots. Try different styles and learn about the brewing process.",
    difficulty: "Medium",
    category: "Food & Drink",
    tags: ["beer", "breweries", "craft"],
    estimatedReward: "75 points",
    votes: 0,
    status: "active",
    suggestedBy: "community"
  }
]

async function createWeeklyChallengesSystem() {
  let client

  try {
    console.log('🚀 Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Connected to MongoDB')

    const db = client.db()
    
    // Create collections if they don't exist
    console.log('📝 Creating collections...')
    
    // Create challenges collection
    await db.createCollection('challenges')
    console.log('✅ Created challenges collection')
    
    // Create challenge-suggestions collection
    await db.createCollection('challenge-suggestions')
    console.log('✅ Created challenge-suggestions collection')
    
    // Create challenge-votes collection
    await db.createCollection('challenge-votes')
    console.log('✅ Created challenge-votes collection')

    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await db.collection('challenges').deleteMany({})
    await db.collection('challenge-suggestions').deleteMany({})
    await db.collection('challenge-votes').deleteMany({})
    console.log('✅ Cleared existing data')

    // Insert weekly challenges
    console.log('📅 Inserting weekly challenges...')
    const challengesResult = await db.collection('challenges').insertMany(
      weeklyChallenges.map(challenge => ({
        ...challenge,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: generateId()
      }))
    )
    console.log(`✅ Inserted ${challengesResult.insertedCount} weekly challenges`)

    // Insert challenge suggestions
    console.log('🗳️ Inserting challenge suggestions...')
    const suggestionsResult = await db.collection('challenge-suggestions').insertMany(
      challengeSuggestions.map(suggestion => ({
        ...suggestion,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: generateId()
      }))
    )
    console.log(`✅ Inserted ${suggestionsResult.insertedCount} challenge suggestions`)

    // Create indexes for better performance
    console.log('🔍 Creating indexes...')
    await db.collection('challenges').createIndex({ isWeekly: 1, status: 1 })
    await db.collection('challenges').createIndex({ weekNumber: 1 })
    await db.collection('challenge-suggestions').createIndex({ status: 1 })
    await db.collection('challenge-votes').createIndex({ user: 1, suggestion: 1 })
    console.log('✅ Created indexes')

    // Verify the data
    console.log('🔍 Verifying data...')
    const challengeCount = await db.collection('challenges').countDocuments()
    const suggestionCount = await db.collection('challenge-suggestions').countDocuments()
    
    console.log(`📊 Database summary:`)
    console.log(`   - Weekly challenges: ${challengeCount}`)
    console.log(`   - Challenge suggestions: ${suggestionCount}`)
    console.log(`   - Collections created: 3`)

    console.log('🎉 Weekly challenges system created successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Restart your application')
    console.log('   2. Visit /feed and select the Weekly tab')
    console.log('   3. Test the challenges and voting system')

  } catch (error) {
    console.error('❌ Error creating weekly challenges system:', error)
    throw error
  } finally {
    if (client) {
      await client.close()
      console.log('🔌 Disconnected from MongoDB')
    }
  }
}

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// Run the script
if (require.main === module) {
  createWeeklyChallengesSystem()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { createWeeklyChallengesSystem } 