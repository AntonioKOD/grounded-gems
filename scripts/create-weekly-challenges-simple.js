const currentWeek = Math.ceil(((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
const currentYear = new Date().getFullYear()
const nextWeek = currentWeek + 1

const sampleWeeklyChallenges = [
  {
    title: "🌅 Sunrise Explorer",
    description: "Start your day by visiting 3 different sunrise spots in your city. Capture the beauty of dawn and share your morning adventures with the community.",
    shortDescription: "Visit 3 sunrise spots and capture the beauty of dawn",
    category: "exploration",
    difficulty: "easy",
    reward: "Sunrise Badge + 150 Points",
    rewardPoints: 150,
    requirements: [
      { requirement: "Visit 3 different sunrise spots", completed: false },
      { requirement: "Take photos at each location", completed: false },
      { requirement: "Share your experience", completed: false }
    ],
    weekNumber: currentWeek,
    year: currentYear,
    status: "active",
    participants: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "🍽️ Local Food Adventure",
    description: "Try 5 different local restaurants or food trucks you've never visited before. Rate each experience and share your culinary discoveries.",
    shortDescription: "Try 5 new local restaurants or food trucks",
    category: "food",
    difficulty: "medium",
    reward: "Foodie Badge + 200 Points",
    rewardPoints: 200,
    requirements: [
      { requirement: "Visit 5 new local restaurants/food trucks", completed: false },
      { requirement: "Rate each experience", completed: false },
      { requirement: "Share photos and reviews", completed: false }
    ],
    weekNumber: currentWeek,
    year: currentYear,
    status: "active",
    participants: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const sampleVotingOptions = [
  {
    title: "🎨 Street Art Hunt",
    description: "Discover and photograph 10 different street art pieces or murals in your city. Create a map of your findings.",
    category: "culture",
    difficulty: "easy",
    reward: "Art Explorer Badge + 180 Points",
    weekNumber: nextWeek,
    year: currentYear,
    status: "voting",
    upvotes: 0,
    downvotes: 0,
    netVotes: 0,
    totalVotes: 0,
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "🏃‍♀️ Fitness Challenge",
    description: "Complete 7 different outdoor workouts in 7 different parks or outdoor spaces. Document your fitness journey.",
    category: "fitness",
    difficulty: "medium",
    reward: "Fitness Warrior Badge + 250 Points",
    weekNumber: nextWeek,
    year: currentYear,
    status: "voting",
    upvotes: 0,
    downvotes: 0,
    netVotes: 0,
    totalVotes: 0,
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "📚 Bookstore Tour",
    description: "Visit 5 independent bookstores in your area. Find a hidden gem book at each location and share your discoveries.",
    category: "culture",
    difficulty: "easy",
    reward: "Bookworm Badge + 160 Points",
    weekNumber: nextWeek,
    year: currentYear,
    status: "voting",
    upvotes: 0,
    downvotes: 0,
    netVotes: 0,
    totalVotes: 0,
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "🌿 Nature Photography",
    description: "Capture 15 different types of plants, flowers, or trees in your local area. Create a nature guide with your photos.",
    category: "nature",
    difficulty: "medium",
    reward: "Nature Photographer Badge + 220 Points",
    weekNumber: nextWeek,
    year: currentYear,
    status: "voting",
    upvotes: 0,
    downvotes: 0,
    netVotes: 0,
    totalVotes: 0,
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

async function createWeeklyChallengesSystem() {
  try {
    console.log('🚀 Starting weekly challenges system setup...')
    console.log('📅 Current week:', currentWeek, 'Year:', currentYear)
    console.log('📅 Next week:', nextWeek, 'Year:', currentYear)
    
    // Create current weekly challenges
    console.log('🏆 Creating current weekly challenges...')
    const createdChallenges = []
    
    for (const challengeData of sampleWeeklyChallenges) {
      try {
        const response = await fetch('http://localhost:3000/api/challenges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(challengeData)
        })
        
        if (response.ok) {
          const challenge = await response.json()
          createdChallenges.push(challenge)
          console.log(`✅ Created challenge: ${challengeData.title}`)
        } else {
          console.error(`❌ Failed to create challenge ${challengeData.title}:`, response.statusText)
        }
      } catch (error) {
        console.error(`❌ Error creating challenge ${challengeData.title}:`, error.message)
      }
    }
    
    // Create voting options for next week
    console.log('🗳️ Creating voting options for next week...')
    const createdVotingOptions = []
    
    for (const votingData of sampleVotingOptions) {
      try {
        const response = await fetch('http://localhost:3000/api/challenge-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(votingData)
        })
        
        if (response.ok) {
          const votingOption = await response.json()
          createdVotingOptions.push(votingOption)
          console.log(`✅ Created voting option: ${votingData.title}`)
        } else {
          console.error(`❌ Failed to create voting option ${votingData.title}:`, response.statusText)
        }
      } catch (error) {
        console.error(`❌ Error creating voting option ${votingData.title}:`, error.message)
      }
    }
    
    console.log('\n🎉 Weekly challenges system setup completed!')
    console.log(`📊 Summary:`)
    console.log(`   - Created ${createdChallenges.length} current weekly challenges`)
    console.log(`   - Created ${createdVotingOptions.length} voting options for next week`)
    console.log(`   - Current week: ${currentWeek}, ${currentYear}`)
    console.log(`   - Next week: ${nextWeek}, ${currentYear}`)
    
    if (createdChallenges.length > 0) {
      console.log('\n🏆 Current Weekly Challenges:')
      createdChallenges.forEach(challenge => {
        console.log(`   - ${challenge.title} (${challenge.difficulty})`)
      })
    }
    
    if (createdVotingOptions.length > 0) {
      console.log('\n🗳️ Voting Options for Next Week:')
      createdVotingOptions.forEach(option => {
        console.log(`   - ${option.title} (${option.difficulty})`)
      })
    }
    
    console.log('\n✨ You can now test the weekly challenges in your app!')
    console.log('🌐 Visit http://localhost:3000/feed and click the "Weekly" tab to see the challenges.')
    
  } catch (error) {
    console.error('❌ Error setting up weekly challenges system:', error)
    process.exit(1)
  }
}

// Run the setup
createWeeklyChallengesSystem() 