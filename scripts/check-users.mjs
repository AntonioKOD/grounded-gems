import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function checkUsers() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 Checking users in database...')
    
    // Get all users
    const usersResult = await payload.find({
      collection: 'users',
      limit: 10,
      depth: 1,
    })
    
    console.log(`📊 Found ${usersResult.docs.length} users:`)
    
    for (const user of usersResult.docs) {
      console.log(`\n👤 User: ${user.name} (${user.id})`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Username: ${user.username}`)
      console.log(`   Interests: ${user.interests?.length || 0}`)
      console.log(`   Social Links: ${user.socialLinks?.length || 0}`)
      console.log(`   Following: ${user.following?.length || 0}`)
      console.log(`   Followers: ${user.followers?.length || 0}`)
      
      // Check posts for this user
      const postsResult = await payload.find({
        collection: 'posts',
        where: {
          author: { equals: user.id }
        },
        limit: 5,
        depth: 1
      })
      
      console.log(`   Posts: ${postsResult.totalDocs} total`)
      for (const post of postsResult.docs) {
        console.log(`     - ${post.title || 'No title'} (${post.status || 'no status'})`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkUsers() 