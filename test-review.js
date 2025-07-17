// Test script to add a review and check if it updates location stats
const baseURL = 'http://localhost:3000'

async function testReviewSystem() {
  try {
    console.log('Testing review system...')
    
    // First, get a location ID
    const locationsResponse = await fetch(`${baseURL}/api/mobile/locations?limit=1`)
    const locationsData = await locationsResponse.json()
    
    if (!locationsData.success || !locationsData.data.locations.length) {
      console.log('No locations found')
      return
    }
    
    const location = locationsData.data.locations[0]
    console.log(`Using location: ${location.name} (ID: ${location.id})`)
    console.log(`Current rating: ${location.rating}, review count: ${location.reviewCount}`)
    
    // Add a test review
    const reviewData = {
      title: 'Test Review',
      content: 'This is a test review to check if the rating system works.',
      rating: 4.5,
      visitDate: new Date().toISOString(),
      pros: ['Great food', 'Good service'],
      cons: ['A bit expensive'],
      tips: 'Try the pasta!',
      reviewType: 'location'
    }
    
    console.log('\nAdding test review...')
    const reviewResponse = await fetch(`${baseURL}/api/mobile/locations/${location.id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without authentication, but let's see what happens
      },
      body: JSON.stringify(reviewData)
    })
    
    const reviewResult = await reviewResponse.json()
    console.log('Review response:', reviewResult)
    
    // Check if the location stats were updated
    console.log('\nChecking updated location stats...')
    const updatedLocationResponse = await fetch(`${baseURL}/api/mobile/locations/${location.id}`)
    const updatedLocationData = await updatedLocationResponse.json()
    
    if (updatedLocationData.success) {
      const updatedLocation = updatedLocationData.data.location
      console.log(`Updated rating: ${updatedLocation.rating}, review count: ${updatedLocation.reviewCount}`)
    }
    
  } catch (error) {
    console.error('Error testing review system:', error)
  }
}

testReviewSystem() 