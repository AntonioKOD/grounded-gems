// Script to sync Foursquare categories with your local database
// Run this script to populate your categories collection with Foursquare data

// Instructions:
// 1. Start your development server: `npm run dev`
// 2. Run this script: `node scripts/sync-foursquare-categories.js`
// 3. Or make a POST request to: http://localhost:3000/api/categories/sync-foursquare

const syncCategories = async () => {
  try {
    console.log('🔄 Starting Foursquare categories sync...')
    
    const response = await fetch('http://localhost:3000/api/categories/sync-foursquare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    
    console.log('✅ Sync completed successfully!')
    console.log(`📊 Results: ${result.results.created} created, ${result.results.updated} updated`)
    
    if (result.results.errors.length > 0) {
      console.log('⚠️  Errors occurred:')
      result.results.errors.forEach(error => console.log(`  - ${error}`))
    }
    
    console.log('\n🎉 Categories are now available in your add-location form!')
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    console.log('\n📝 Make sure:')
    console.log('  1. Your development server is running (npm run dev)')
    console.log('  2. Your FOURSQUARE_API_KEY is configured in .env')
    console.log('  3. Your database connection is working')
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  syncCategories()
}

module.exports = { syncCategories } 