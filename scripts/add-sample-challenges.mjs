import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function addSampleChallenges() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🚀 Adding sample challenges to database...')
    
    // Get current week number
    const now = new Date()
    const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
    
    // Sample weekly challenges
    const weeklyChallenges = [
      {
        title: "Urban Explorer",
        description: "Visit 5 different neighborhoods in your city this week. Document each with a photo and share what makes each area unique.",
        difficulty: "Easy",
        category: "Exploration",
        tags: ["urban", "neighborhoods", "photography"],
        reward: "50 points",
        participants: 127,
        isWeekly: true,
        weekNumber: weekNumber,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        requirements: {
          minLocations: 5,
          minPhotos: 5
        }
      },
      {
        title: "Hidden Gems Hunter",
        description: "Find and visit 3 local businesses or spots that have less than 100 reviews. Share your discoveries with the community.",
        difficulty: "Medium",
        category: "Discovery",
        tags: ["hidden-gems", "local-business", "reviews"],
        reward: "75 points",
        participants: 89,
        isWeekly: true,
        weekNumber: weekNumber,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        requirements: {
          minLocations: 3,
          minReviews: 3
        }
      }
    ]
    
    // Sample challenge suggestions
    const challengeSuggestions = [
      {
        title: "Coffee Shop Crawl",
        description: "Visit 5 different coffee shops in your city. Rate their coffee, atmosphere, and find your new favorite spot.",
        difficulty: "Easy",
        category: "Food & Drink",
        tags: ["coffee", "cafes", "rating"],
        estimatedReward: "50 points",
        votes: 156,
        status: "active",
        suggestedBy: "community",
        requirements: {
          minLocations: 5,
          minReviews: 5
        }
      },
      {
        title: "Sunrise Photography",
        description: "Wake up early and capture 3 beautiful sunrise photos from different locations in your city.",
        difficulty: "Medium",
        category: "Photography",
        tags: ["photography", "sunrise", "early-bird"],
        estimatedReward: "60 points",
        votes: 98,
        status: "active",
        suggestedBy: "community",
        requirements: {
          minPhotos: 3
        }
      },
      {
        title: "Local Market Explorer",
        description: "Visit 2 farmers markets or local markets. Buy something from at least 3 different vendors and share your finds.",
        difficulty: "Easy",
        category: "Shopping",
        tags: ["markets", "local", "shopping"],
        estimatedReward: "40 points",
        votes: 73,
        status: "active",
        suggestedBy: "community",
        requirements: {
          minLocations: 2,
          minReviews: 3
        }
      },
      {
        title: "Bookstore Adventure",
        description: "Visit 3 different bookstores or libraries. Find a book from a genre you've never read before.",
        difficulty: "Easy",
        category: "Education",
        tags: ["books", "libraries", "reading"],
        estimatedReward: "45 points",
        votes: 64,
        status: "active",
        suggestedBy: "community",
        requirements: {
          minLocations: 3,
          minReviews: 1
        }
      }
    ]
    
    // Add weekly challenges
    console.log('📅 Adding weekly challenges...')
    for (const challenge of weeklyChallenges) {
      try {
        const result = await payload.create({
          collection: 'challenges',
          data: challenge
        })
        console.log(`✅ Added challenge: ${result.title}`)
      } catch (error) {
        console.error(`❌ Error adding challenge ${challenge.title}:`, error.message)
      }
    }
    
    // Add challenge suggestions
    console.log('🗳️ Adding challenge suggestions...')
    for (const suggestion of challengeSuggestions) {
      try {
        const result = await payload.create({
          collection: 'challenge-suggestions',
          data: suggestion
        })
        console.log(`✅ Added suggestion: ${result.title}`)
      } catch (error) {
        console.error(`❌ Error adding suggestion ${suggestion.title}:`, error.message)
      }
    }
    
    console.log('🎉 Sample challenges added successfully!')
    console.log(`📊 Added ${weeklyChallenges.length} weekly challenges and ${challengeSuggestions.length} suggestions`)
    
    // Test the API
    console.log('\n🧪 Testing weekly challenges API...')
    const response = await fetch('http://localhost:3000/api/challenges/weekly')
    const data = await response.json()
    
    console.log('📅 API Response:', {
      challenges: data.data.currentChallenges.length,
      suggestions: data.data.votingOptions.length,
      isFallback: data.data.meta.isFallback
    })
    
  } catch (error) {
    console.error('❌ Error adding sample challenges:', error)
  }
}

// Run the script
addSampleChallenges() 