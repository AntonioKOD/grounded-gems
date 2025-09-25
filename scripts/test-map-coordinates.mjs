#!/usr/bin/env node

/**
 * Test Map Coordinates Script
 * This script tests the map data processing to see what's happening with coordinates
 * Run with: node scripts/test-map-coordinates.mjs
 */

async function testMapCoordinates() {
  console.log('🔧 Testing map coordinates processing...')
  
  try {
    // Test the map data processing function
    const { addedLocations } = await import('../app/(frontend)/map/map-data.ts')
    
    console.log('📊 Fetching locations for map...')
    const locations = await addedLocations()
    
    console.log(`📊 Found ${locations.length} locations`)
    
    // Check the first few locations
    for (let i = 0; i < Math.min(3, locations.length); i++) {
      const location = locations[i]
      console.log(`\n📍 Location ${i + 1}: ${location.name}`)
      console.log(`   Latitude: ${location.latitude} (type: ${typeof location.latitude})`)
      console.log(`   Longitude: ${location.longitude} (type: ${typeof location.longitude})`)
      console.log(`   Coordinates:`, location.coordinates)
      
      // Check if coordinates are valid numbers
      if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        console.log(`   ✅ Valid numeric coordinates`)
      } else {
        console.log(`   ❌ Invalid coordinate types!`)
      }
    }
    
    // Check for any locations with invalid coordinates
    const invalidCoords = locations.filter(loc => 
      typeof loc.latitude !== 'number' || 
      typeof loc.longitude !== 'number' ||
      isNaN(loc.latitude) || 
      isNaN(loc.longitude)
    )
    
    if (invalidCoords.length > 0) {
      console.log(`\n❌ Found ${invalidCoords.length} locations with invalid coordinates:`)
      invalidCoords.forEach(loc => {
        console.log(`   ${loc.name}: lat=${loc.latitude} (${typeof loc.latitude}), lng=${loc.longitude} (${typeof loc.longitude})`)
      })
    } else {
      console.log(`\n✅ All ${locations.length} locations have valid numeric coordinates`)
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

testMapCoordinates()





