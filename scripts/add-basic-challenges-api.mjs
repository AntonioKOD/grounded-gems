// Simple script to add basic challenges using API calls
async function addBasicChallenges() {
  try {
    console.log('🚀 Adding basic challenges via API...')
    
    // Get current week number
    const now = new Date()
    const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
    
    // Basic weekly challenges
    const weeklyChallenges = [
      {
        title: "Local Explorer",
        description: "Visit 3 different neighborhoods in your city this week. Take a photo at each location and share what makes each area unique.",
        difficulty: "Easy",
        category: "Exploration",
        tags: ["local", "neighborhoods", "photography"],
        reward: "50 points",
        participants: 127,
        isWeekly: true,
        weekNumber: weekNumber,
        year: now.getFullYear(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active"
      },
      {
        title: "Food Adventure",
        description: "Try 5 different types of cuisine this week. Document each meal with a photo and share your experience.",
        difficulty: "Medium",
        category: "Food",
        tags: ["food", "cuisine", "adventure"],
        reward: "75 points",
        participants: 89,
        isWeekly: true,
        weekNumber: weekNumber,
        year: now.getFullYear(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active"
      }
    ]
    
    // Basic challenge suggestions for voting
    const challengeSuggestions = [
      {
        title: "Street Art Hunter",
        description: "Find and photograph 10 different street art pieces in your city. Share the locations and artists if known.",
        difficulty: "Easy",
        category: "Art",
        tags: ["street-art", "photography", "urban"],
        reward: "60 points",
        votes: 45,
        status: "active"
      },
      {
        title: "Coffee Shop Tour",
        description: "Visit 7 different local coffee shops this week. Rate each one and share your favorite discoveries.",
        difficulty: "Medium",
        category: "Food",
        tags: ["coffee", "local-business", "reviews"],
        reward: "80 points",
        votes: 32,
        status: "active"
      },
      {
        title: "Historical Sites Explorer",
        description: "Visit 5 historical sites or landmarks in your area. Learn about their history and share interesting facts.",
        difficulty: "Medium",
        category: "Education",
        tags: ["history", "landmarks", "learning"],
        reward: "70 points",
        votes: 28,
        status: "active"
      },
      {
        title: "Nature Trail Challenge",
        description: "Complete 3 different hiking trails or nature walks. Document the wildlife and scenery you encounter.",
        difficulty: "Hard",
        category: "Outdoors",
        tags: ["hiking", "nature", "wildlife"],
        reward: "100 points",
        votes: 19,
        status: "active"
      }
    ]
    
    console.log('📝 Creating weekly challenges...')
    
    // Create weekly challenges using API
    for (const challengeData of weeklyChallenges) {
      try {
        const response = await fetch('http://localhost:3000/api/challenges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(challengeData)
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log(`✅ Created challenge: ${challengeData.title}`)
        } else {
          console.error(`❌ Error creating challenge ${challengeData.title}: ${response.status}`)
        }
      } catch (error) {
        console.error(`❌ Error creating challenge ${challengeData.title}:`, error.message)
      }
    }
    
    console.log('🗳️ Creating challenge suggestions...')
    
    // Create challenge suggestions using API
    for (const suggestionData of challengeSuggestions) {
      try {
        const response = await fetch('http://localhost:3000/api/challenge-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(suggestionData)
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log(`✅ Created suggestion: ${suggestionData.title}`)
        } else {
          console.error(`❌ Error creating suggestion ${suggestionData.title}: ${response.status}`)
        }
      } catch (error) {
        console.error(`❌ Error creating suggestion ${suggestionData.title}:`, error.message)
      }
    }
    
    console.log('🎉 Basic challenges setup complete!')
    
  } catch (error) {
    console.error('❌ Error in addBasicChallenges:', error)
  }
}

// Run the script
addBasicChallenges() 