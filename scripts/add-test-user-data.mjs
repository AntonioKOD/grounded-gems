import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function addTestUserData() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔧 Adding test user data...')
    
    // Get the first user
    const usersResult = await payload.find({
      collection: 'users',
      limit: 1,
      depth: 1,
    })
    
    if (usersResult.docs.length === 0) {
      console.log('❌ No users found in database')
      return
    }
    
    const user = usersResult.docs[0]
    console.log(`🔧 Found user: ${user.name} (${user.id})`)
    
    // Update user with interests and social links
    const updatedUser = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        interests: ['Travel', 'Food', 'Adventure', 'Photography', 'Coffee', 'Art'],
        socialLinks: [
          { platform: 'instagram', url: 'https://instagram.com/testuser' },
          { platform: 'twitter', url: 'https://twitter.com/testuser' },
          { platform: 'youtube', url: 'https://youtube.com/@testuser' }
        ]
      }
    })
    
    console.log('✅ Updated user with test data:')
    console.log(`   Interests: ${updatedUser.interests?.length || 0}`)
    console.log(`   Social Links: ${updatedUser.socialLinks?.length || 0}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addTestUserData() 