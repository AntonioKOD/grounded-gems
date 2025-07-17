// Simple script to fix location stats
const baseURL = 'http://localhost:3000'

async function fixLocationStats() {
  try {
    const locationId = '685564db6097032565797b8a'
    
    console.log('Fixing location stats...')
    
    // First, get the current reviews for this location
    const reviewsResponse = await fetch(`${baseURL}/api/mobile/locations/${locationId}/reviews`)
    const reviewsData = await reviewsResponse.json()
    
    if (reviewsData.success) {
      const { numReviews, averageRating } = reviewsData.data
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
      // but there are actually reviews with an average rating
      console.log('\nISSUE CONFIRMED:')
      console.log('- Reviews API shows:', numReviews, 'reviews, average:', averageRating)
      console.log('- Location API shows:', locationData.data.location.reviewCount, 'reviews, rating:', locationData.data.location.rating)
      
      // The hooks are not working, so we need to manually update the location
      console.log('\nThe hooks are not working. This means:')
      console.log('1. The Reviews collection hooks are not being triggered')
      console.log('2. Or there is an error in the hook execution')
      console.log('3. Or the import path in the hooks is incorrect')
      
      console.log('\nTo fix this, you need to:')
      console.log('1. Check the server logs for hook errors')
      console.log('2. Verify the import path in collections/Reviews.ts')
      console.log('3. Restart the development server')
      console.log('4. Or manually update the location stats via admin panel')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixLocationStats() 