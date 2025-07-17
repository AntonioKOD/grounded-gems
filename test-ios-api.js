// Test script to simulate iOS app API call
const baseURL = 'http://localhost:3000'

async function testIOSAPI() {
  try {
    console.log('Testing iOS app API call...')
    
    // Simulate the exact API call the iOS app makes
    const response = await fetch(`${baseURL}/api/mobile/locations?limit=5`)
    const data = await response.json()
    
    console.log('API Response Structure:')
    console.log('- success:', data.success)
    console.log('- has data:', !!data.data)
    console.log('- has locations:', !!data.data?.locations)
    console.log('- locations count:', data.data?.locations?.length || 0)
    
    if (data.success && data.data && data.data.locations) {
      console.log('\nFirst location data structure:')
      const location = data.data.locations[0]
      console.log(JSON.stringify(location, null, 2))
      
      console.log('\nChecking specific fields:')
      console.log('- rating field exists:', 'rating' in location)
      console.log('- rating value:', location.rating)
      console.log('- rating type:', typeof location.rating)
      console.log('- reviewCount field exists:', 'reviewCount' in location)
      console.log('- reviewCount value:', location.reviewCount)
      console.log('- reviewCount type:', typeof location.reviewCount)
      
      // Check if these match what the iOS Location struct expects
      console.log('\niOS Location struct compatibility:')
      console.log('- rating is Double?:', typeof location.rating === 'number' || location.rating === null || location.rating === undefined)
      console.log('- reviewCount is Int?:', typeof location.reviewCount === 'number' || location.reviewCount === null || location.reviewCount === undefined)
    }
    
  } catch (error) {
    console.error('Error testing iOS API:', error)
  }
}

testIOSAPI() 