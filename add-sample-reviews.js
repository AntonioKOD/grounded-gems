// Script to add sample reviews for testing
const baseURL = 'http://localhost:3000'

async function addSampleReviews() {
  try {
    console.log('Adding sample reviews...')
    
    // Get a location ID
    const locationsResponse = await fetch(`${baseURL}/api/mobile/locations?limit=1`)
    const locationsData = await locationsResponse.json()
    
    if (!locationsData.success || !locationsData.data.locations.length) {
      console.log('No locations found')
      return
    }
    
    const location = locationsData.data.locations[0]
    console.log(`Adding reviews to: ${location.name} (ID: ${location.id})`)
    
    // Sample reviews data
    const sampleReviews = [
      {
        title: 'Amazing Food!',
        content: 'The food here is absolutely delicious. Highly recommend the pasta dishes.',
        rating: 5.0,
        visitDate: new Date().toISOString(),
        pros: ['Great food', 'Excellent service', 'Nice atmosphere'],
        cons: [],
        tips: 'Make a reservation on weekends',
        reviewType: 'location'
      },
      {
        title: 'Good Experience',
        content: 'Had a nice dinner here. The service was good and the food was tasty.',
        rating: 4.0,
        visitDate: new Date().toISOString(),
        pros: ['Good food', 'Friendly staff'],
        cons: ['A bit pricey'],
        tips: 'Try the specials',
        reviewType: 'location'
      },
      {
        title: 'Decent Place',
        content: 'The food was okay, nothing special but not bad either.',
        rating: 3.5,
        visitDate: new Date().toISOString(),
        pros: ['Convenient location'],
        cons: ['Average food', 'Slow service'],
        tips: 'Go during off-peak hours',
        reviewType: 'location'
      }
    ]
    
    console.log(`\nNote: These reviews will fail due to authentication, but this shows the expected data structure.`)
    console.log(`To test with real reviews, you would need to be logged in.`)
    
    // Show what the reviews would look like
    sampleReviews.forEach((review, index) => {
      console.log(`\nSample Review ${index + 1}:`)
      console.log(JSON.stringify(review, null, 2))
    })
    
    // Calculate expected stats
    const ratings = sampleReviews.map(r => r.rating)
    const expectedAverageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
    const expectedReviewCount = ratings.length
    
    console.log(`\nExpected results after adding reviews:`)
    console.log(`- Average Rating: ${expectedAverageRating.toFixed(1)}`)
    console.log(`- Review Count: ${expectedReviewCount}`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

addSampleReviews() 