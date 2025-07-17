// Script to update all locations with their current review counts and average ratings
import payload from 'payload'
import config from '../payload.config.ts'

async function updateLocationRatings() {
  try {
    await payload.init({ config })
    
    console.log('Starting location ratings update...')
    
    // Get all locations
    const locations = await payload.find({
      collection: 'locations',
      limit: 1000,
      depth: 0
    })
    
    console.log(`Found ${locations.docs.length} locations to update`)
    
    let updatedCount = 0
    
    for (const location of locations.docs) {
      try {
        // Get all published reviews for this location
        const reviews = await payload.find({
          collection: 'reviews',
          where: {
            and: [
              { location: { equals: location.id } },
              { status: { equals: 'published' } }
            ]
          },
          limit: 1000
        })
        
        // Calculate average rating and count
        const publishedReviews = reviews.docs
        const reviewCount = publishedReviews.length
        const averageRating = reviewCount > 0 
          ? publishedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount 
          : 0
        
        // Update the location
        await payload.update({
          collection: 'locations',
          id: location.id,
          data: {
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
            reviewCount
          }
        })
        
        console.log(`Updated ${location.name}: rating=${averageRating}, count=${reviewCount}`)
        updatedCount++
        
      } catch (error) {
        console.error(`Error updating location ${location.name}:`, error)
      }
    }
    
    console.log(`\nCompleted! Updated ${updatedCount} locations`)
    
  } catch (error) {
    console.error('Error in updateLocationRatings:', error)
  } finally {
    process.exit(0)
  }
}

updateLocationRatings() 