// Manual script to update location stats
import payload from 'payload'
import config from '../payload.config.ts'

async function manualUpdateLocationStats() {
  try {
    await payload.init({ config })
    
    const locationId = '685564db6097032565797b8a'
    
    console.log('Manually updating location stats...')
    
    // Get all published reviews for this location
    const reviews = await payload.find({
      collection: 'reviews',
      where: {
        and: [
          { location: { equals: locationId } },
          { status: { equals: 'published' } }
        ]
      },
      limit: 1000
    })
    
    console.log(`Found ${reviews.docs.length} published reviews`)
    
    // Calculate stats
    const publishedReviews = reviews.docs
    const reviewCount = publishedReviews.length
    const averageRating = reviewCount > 0 
      ? publishedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount 
      : 0
    
    console.log(`Calculated: ${reviewCount} reviews, average rating: ${averageRating}`)
    
    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount
      }
    })
    
    console.log('Location updated successfully!')
    console.log('New stats:', {
      name: updatedLocation.name,
      averageRating: updatedLocation.averageRating,
      reviewCount: updatedLocation.reviewCount
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

manualUpdateLocationStats() 