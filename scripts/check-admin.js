import { getPayload } from 'payload'
import config from '../payload.config.ts'

async function checkAndSetAdmin() {
  try {
    const payload = await getPayload({ config })
    
    console.log('Checking user roles...')
    
    // Find the user by email
    const users = await payload.find({
      collection: 'users',
      where: {
        email: { equals: 'antonio_kodheli@icloud.com' }
      }
    })
    
    if (users.docs.length === 0) {
      console.log('❌ User not found')
      return
    }
    
    const user = users.docs[0]
    console.log('👤 Found user:', user.email)
    console.log('🔐 Current role:', user.role)
    
    if (user.role !== 'admin') {
      console.log('🔧 Updating user role to admin...')
      
      const updatedUser = await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          role: 'admin'
        }
      })
      
      console.log('✅ User role updated to:', updatedUser.role)
    } else {
      console.log('✅ User already has admin role')
    }
    
    // Also check for any guides that need to be published
    const guides = await payload.find({
      collection: 'guides',
      where: {
        status: { equals: 'review' }
      }
    })
    
    console.log(`📋 Found ${guides.docs.length} guides under review`)
    
    if (guides.docs.length > 0) {
      console.log('Guides under review:')
      guides.docs.forEach(guide => {
        console.log(`- ${guide.title} (ID: ${guide.id})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkAndSetAdmin()
  .then(() => {
    console.log('✅ Admin check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 