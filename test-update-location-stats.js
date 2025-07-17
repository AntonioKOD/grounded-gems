// Test script to manually update location stats
const baseURL = 'http://localhost:3000'

async function testUpdateLocationStats() {
  try {
    const locationId = '685564db6097032565797b8a'
    
    console.log('Testing location stats update...')
    
    // First, get the current reviews for this location
    const reviewsResponse = await fetch(`${baseURL}/api/mobile/locations/${locationId}/reviews`)
    const reviewsData = await reviewsResponse.json()
    
    console.log('Reviews data:', reviewsData)
    
    if (reviewsData.success) {
      const { reviews, numReviews, averageRating } = reviewsData.data
      console.log(`Found ${numReviews} reviews with average rating ${averageRating}`)
      
      // Now check the location's current stats
      const locationResponse = await fetch(`${baseURL}/api/mobile/locations/${locationId}`)
      const locationData = await locationResponse.json()
      
      console.log('Location current stats:', {
        name: locationData.data.location.name,
        rating: locationData.data.location.rating,
        reviewCount: locationData.data.location.reviewCount
      })
      
      // The issue is that the location document shows 0 for both fields
      // but there are actually 4 reviews with average rating 4
      console.log('\nISSUE IDENTIFIED:')
      console.log('- Reviews API shows:', numReviews, 'reviews, average:', averageRating)
      console.log('- Location API shows:', locationData.data.location.reviewCount, 'reviews, rating:', locationData.data.location.rating)
      console.log('\nThis means the hooks are not working properly.')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testUpdateLocationStats() 