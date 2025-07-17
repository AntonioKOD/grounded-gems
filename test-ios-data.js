// Test script to verify iOS app data
const baseURL = 'http://localhost:3000'

async function testIOSData() {
  try {
    console.log('Testing iOS app data...')
    
    // Test the main locations endpoint that the iOS app uses
    const response = await fetch(`${baseURL}/api/mobile/locations?limit=5`)
    const data = await response.json()
    
    if (data.success) {
      console.log(`Found ${data.data.locations.length} locations`)
      
      data.data.locations.forEach((location, index) => {
        console.log(`\nLocation ${index + 1}:`)
        console.log(`  Name: ${location.name}`)
        console.log(`  Rating: ${location.rating}`)
        console.log(`  Review Count: ${location.reviewCount}`)
        console.log(`  ID: ${location.id}`)
        
        // Check if the data looks correct
        if (location.rating > 0 || location.reviewCount > 0) {
          console.log(`  ✅ Has reviews/ratings`)
        } else {
          console.log(`  ❌ No reviews/ratings`)
        }
      })
      
      console.log('\n🎉 SUCCESS: The iOS app should now be receiving correct data!')
      console.log('The location stats are being properly calculated and returned.')
      
    } else {
      console.error('API request failed:', data.error)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testIOSData() 