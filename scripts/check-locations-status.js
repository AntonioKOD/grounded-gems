import { getPayload } from 'payload'
import config from '../payload.config.js'

async function checkLocationsStatus() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 Checking locations status...')
    
    // Get all locations
    const locations = await payload.find({
      collection: 'locations',
      limit: 1000,
      depth: 1
    })
    
    console.log(`📊 Total locations: ${locations.docs.length}`)
    
    // Group by status
    const statusCounts = {}
    const locationsByStatus = {}
    
    locations.docs.forEach(location => {
      const status = location.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
      
      if (!locationsByStatus[status]) {
        locationsByStatus[status] = []
      }
      locationsByStatus[status].push({
        id: location.id,
        name: location.name,
        createdBy: location.createdBy,
        privacy: location.privacy,
        createdAt: location.createdAt
      })
    })
    
    console.log('\n📈 Status breakdown:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })
    
    // Show locations that need review
    if (locationsByStatus['review']) {
      console.log('\n🔍 Locations under review:')
      locationsByStatus['review'].forEach(location => {
        console.log(`  - ${location.name} (ID: ${location.id})`)
        console.log(`    Created: ${location.createdAt}`)
        console.log(`    Privacy: ${location.privacy}`)
        console.log(`    Created by: ${location.createdBy}`)
        console.log('')
      })
    }
    
    // Show draft locations
    if (locationsByStatus['draft']) {
      console.log('\n📝 Draft locations:')
      locationsByStatus['draft'].forEach(location => {
        console.log(`  - ${location.name} (ID: ${location.id})`)
      })
    }
    
    // Show published locations
    if (locationsByStatus['published']) {
      console.log('\n✅ Published locations:')
      locationsByStatus['published'].forEach(location => {
        console.log(`  - ${location.name} (ID: ${location.id})`)
      })
    }
    
    console.log('\n🎯 Admin actions needed:')
    if (locationsByStatus['review']) {
      console.log(`  - Review ${locationsByStatus['review'].length} locations in Payload admin`)
      console.log(`  - Access: http://localhost:3000/admin/collections/locations`)
    }
    
    if (locationsByStatus['draft']) {
      console.log(`  - Consider publishing ${locationsByStatus['draft'].length} draft locations`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
  
  process.exit(0)
}

checkLocationsStatus() 