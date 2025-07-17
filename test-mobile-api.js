// Test script to check mobile API response
const baseURL = 'http://localhost:3000'

async function testMobileAPI() {
  try {
    console.log('Testing mobile locations API...')
    
    const response = await fetch(`${baseURL}/api/mobile/locations?limit=5`)
    const data = await response.json()
    
    console.log('Full response:', JSON.stringify(data, null, 2))
    
    if (data.success && data.data && data.data.locations) {
      console.log(`\nFound ${data.data.locations.length} locations`)
      
      data.data.locations.forEach((location, index) => {
        console.log(`\nLocation ${index + 1}:`)
        console.log(`  Name: ${location.name}`)
        console.log(`  Rating: ${location.rating}`)
        console.log(`  Review Count: ${location.reviewCount}`)
        console.log(`  ID: ${location.id}`)
      })
    } else {
      console.log('No locations found or invalid response structure')
    }
  } catch (error) {
    console.error('Error testing API:', error)
  }
}

testMobileAPI() 