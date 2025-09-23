#!/usr/bin/env node

/**
 * Fix Coordinates Data Script
 * This script converts string coordinates to numbers in the database
 * Run with: node scripts/fix-coordinates-data.mjs
 */

import { getPayload } from 'payload'

async function fixCoordinatesData() {
  console.log('🔧 Starting coordinates data fix...')
  
  try {
    const config = await import('../payload.config.ts')
    const payload = await getPayload({ config: config.default })
    
    // Get all locations
    const result = await payload.find({
      collection: 'locations',
      limit: 1000,
      depth: 0
    })
    
    console.log(`📊 Found ${result.docs.length} locations to check`)
    
    let fixedCount = 0
    let errorCount = 0
    
    for (const location of result.docs) {
      try {
        let needsUpdate = false
        const updateData = {}
        
        // Check coordinates
        if (location.coordinates) {
          if (typeof location.coordinates.latitude === 'string') {
            const lat = parseFloat(location.coordinates.latitude)
            if (!isNaN(lat)) {
              updateData['coordinates.latitude'] = lat
              needsUpdate = true
              console.log(`📍 ${location.name}: Converting latitude "${location.coordinates.latitude}" to ${lat}`)
            }
          }
          
          if (typeof location.coordinates.longitude === 'string') {
            const lng = parseFloat(location.coordinates.longitude)
            if (!isNaN(lng)) {
              updateData['coordinates.longitude'] = lng
              needsUpdate = true
              console.log(`📍 ${location.name}: Converting longitude "${location.coordinates.longitude}" to ${lng}`)
            }
          }
        }
        
        // Update if needed
        if (needsUpdate) {
          await payload.update({
            collection: 'locations',
            id: location.id,
            data: updateData
          })
          fixedCount++
          console.log(`✅ Fixed coordinates for: ${location.name}`)
        }
        
      } catch (error) {
        console.error(`❌ Error fixing location ${location.name}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n🎉 Coordinates fix completed!`)
    console.log(`✅ Fixed: ${fixedCount} locations`)
    console.log(`❌ Errors: ${errorCount} locations`)
    console.log(`📊 Total processed: ${result.docs.length} locations`)
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

fixCoordinatesData()
