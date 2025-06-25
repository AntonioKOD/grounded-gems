// Simple script to add sample challenges using API calls
async function addSampleChallenges() {
  try {
    console.log('🚀 Adding sample challenges via API...')
    
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
    
    console.log('📅 Sample challenges and suggestions created!')
    console.log(`📊 Created ${weeklyChallenges.length} weekly challenges and ${challengeSuggestions.length} suggestions`)
    
    console.log('\n📋 Sample Weekly Challenges:')
    weeklyChallenges.forEach((challenge, index) => {
      console.log(`${index + 1}. ${challenge.title} (${challenge.difficulty}) - ${challenge.reward}`)
    })
    
    console.log('\n🗳️ Sample Challenge Suggestions:')
    challengeSuggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion.title} (${suggestion.difficulty}) - ${suggestion.estimatedReward} - ${suggestion.votes} votes`)
    })
    
    console.log('\n💡 To add these to the database:')
    console.log('1. Go to the admin panel: http://localhost:3000/admin')
    console.log('2. Navigate to Collections > Challenges')
    console.log('3. Click "Create New" and add the weekly challenges')
    console.log('4. Navigate to Collections > Challenge Suggestions')
    console.log('5. Click "Create New" and add the suggestions')
    
    // Test the current API state
    console.log('\n🧪 Testing current weekly challenges API...')
    const response = await fetch('http://localhost:3000/api/challenges/weekly')
    const data = await response.json()
    
    console.log('📅 Current API Response:', {
      challenges: data.data.currentChallenges.length,
      suggestions: data.data.votingOptions.length,
      isFallback: data.data.meta.isFallback
    })
    
    if (data.data.currentChallenges.length === 0) {
      console.log('⚠️ No challenges found in database. Please add the sample challenges above.')
    } else {
      console.log('✅ Challenges found in database!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the script
addSampleChallenges() 