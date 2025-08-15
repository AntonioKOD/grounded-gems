const { getPayload } = require('payload')
const path = require('path')

// Helper function to normalize IDs (handle both string IDs and object IDs)
const normalizeId = (val) => {
  if (typeof val === 'string') return val
  if (val?.id) return val.id
  if (val?._id) return val._id
  throw new Error(`Unable to normalize ID from value: ${JSON.stringify(val)}`)
}

// Helper function to clean and deduplicate an array of IDs
const cleanIdArray = (array) => {
  if (!Array.isArray(array)) return []
  
  try {
    // Normalize all IDs and remove duplicates
    const normalizedIds = array.map(normalizeId)
    const uniqueIds = [...new Set(normalizedIds)]
    
    // Remove any invalid IDs (empty strings, null, undefined)
    const validIds = uniqueIds.filter(id => id && typeof id === 'string' && id.trim() !== '')
    
    return validIds
  } catch (error) {
    console.error('Error cleaning ID array:', error)
    return []
  }
}

async function cleanAllUsersFollowingFollowers() {
  try {
    console.log('🧹 Starting cleanup of all users following/followers lists...')
    
    // Load the config dynamically
    const configPath = path.join(__dirname, 'payload.config.ts')
    const config = require(configPath)
    
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
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run the cleanup
cleanAllUsersFollowingFollowers()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
