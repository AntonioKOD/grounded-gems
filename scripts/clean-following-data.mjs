import { getPayload } from 'payload'
import config from '../payload.config.js'

// Helper function to normalize IDs (handle both string IDs and object IDs)
const normalizeId = (val) => {
  if (typeof val === 'string') return val
  if (val?.id) return val.id
  if (val?._id) return val._id
  return null
}

// Helper function to clean and deduplicate an array of IDs
const cleanIdArray = (array) => {
  if (!Array.isArray(array)) return []
  
  try {
    // Normalize all IDs and remove duplicates
    const normalizedIds = array.map(normalizeId).filter(id => id)
    const uniqueIds = [...new Set(normalizedIds)]
    
    // Remove any invalid IDs (empty strings, null, undefined)
    const validIds = uniqueIds.filter(id => id && typeof id === 'string' && id.trim() !== '')
    
    return validIds
  } catch (error) {
    console.error('Error cleaning ID array:', error)
    return []
  }
}

export async function cleanAllUsersFollowingFollowers() {
  try {
    console.log('🧹 Starting cleanup of all users following/followers lists...')
    
    const payload = await getPayload({ config })
    
    // Get all users
    const allUsers = await payload.find({
      collection: 'users',
      limit: 1000, // Adjust if you have more users
      depth: 0
    })
    
    console.log(`📊 Found ${allUsers.totalDocs} users to process`)
    
    let processedCount = 0
    let cleanedCount = 0
    
    for (const user of allUsers.docs) {
      try {
        console.log(`\n👤 Processing user: ${user.name} (${user.id})`)
        
        const originalFollowing = Array.isArray(user.following) ? user.following : []
        const originalFollowers = Array.isArray(user.followers) ? user.followers : []
        
        console.log(`   Following before: ${originalFollowing.length} entries`)
        console.log(`   Followers before: ${originalFollowers.length} entries`)
        
        // Clean the arrays
        const cleanedFollowing = cleanIdArray(originalFollowing)
        const cleanedFollowers = cleanIdArray(originalFollowers)
        
        console.log(`   Following after: ${cleanedFollowing.length} entries`)
        console.log(`   Followers after: ${cleanedFollowers.length} entries`)
        
        // Check if cleanup is needed
        const followingChanged = originalFollowing.length !== cleanedFollowing.length
        const followersChanged = originalFollowers.length !== cleanedFollowers.length
        
        if (followingChanged || followersChanged) {
          console.log(`   🧹 Cleaning needed!`)
          
          // Update the user
          await payload.update({
            collection: 'users',
            id: user.id,
            data: {
              following: cleanedFollowing,
              followers: cleanedFollowers
            },
            overrideAccess: true
          })
          
          cleanedCount++
          console.log(`   ✅ User cleaned successfully`)
        } else {
          console.log(`   ✅ User already clean`)
        }
        
        processedCount++
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.id}:`, error.message)
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`)
    console.log(`📊 Processed: ${processedCount} users`)
    console.log(`🧹 Cleaned: ${cleanedCount} users`)
    
    return {
      success: true,
      processed: processedCount,
      cleaned: cleanedCount
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanAllUsersFollowingFollowers()
    .then((result) => {
      if (result.success) {
        console.log('✅ Script completed successfully')
        process.exit(0)
      } else {
        console.error('❌ Script failed:', result.error)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}
