#!/usr/bin/env node

/**
 * Simple Coordinates Fix Script
 * This script uses the API to fetch and fix coordinate data
 * Run with: node scripts/fix-coordinates-simple.mjs
 */

async function fixCoordinatesData() {
  console.log('🔧 Starting coordinates data fix via API...')
  
  try {
    // Fetch locations from the API
    const response = await fetch('http://localhost:3000/api/locations/all')
    const data = await response.json()
    
    if (!data.success) {
      console.error('❌ Failed to fetch locations:', data.error)
      return
    }
    
    console.log(`📊 Found ${data.locations.length} locations`)
    
    // Check the first few locations to see their coordinate format
    for (let i = 0; i < Math.min(3, data.locations.length); i++) {
      const location = data.locations[i]
      console.log(`📍 Location ${i + 1}: ${location.name}`)
      console.log(`   Coordinates:`, location.coordinates)
      console.log(`   Latitude type: ${typeof location.coordinates?.latitude}`)
      console.log(`   Longitude type: ${typeof location.coordinates?.longitude}`)
      console.log(`   Latitude value: ${location.coordinates?.latitude}`)
      console.log(`   Longitude value: ${location.coordinates?.longitude}`)
    }
    
    // Check if coordinates are strings
    const stringCoordinates = data.locations.filter(loc => 
      typeof loc.coordinates?.latitude === 'string' || 
      typeof loc.coordinates?.longitude === 'string'
    )
    
    console.log(`\n🔍 Found ${stringCoordinates.length} locations with string coordinates`)
    
    if (stringCoordinates.length > 0) {
      console.log('❌ String coordinates found! This is the issue.')
      console.log('Sample string coordinates:')
      stringCoordinates.slice(0, 3).forEach(loc => {
        console.log(`  ${loc.name}: lat="${loc.coordinates.latitude}" lng="${loc.coordinates.longitude}"`)
      })
    } else {
      console.log('✅ All coordinates are numbers - the issue might be elsewhere')
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

fixCoordinatesData()


