import { getPayload } from 'payload'
import config from '../payload.config'

async function makeAdmin() {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 Checking user roles...')
    
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
    console.log('👤 Found user:', user?.email)
    console.log('🔐 Current role:', user?.role)
    
    if (user?.role !== 'admin') {
      console.log('🔧 Updating user role to admin...')
      
      const updatedUser = await payload.update({
        collection: 'users',
        id: user?.id || '',
        data: {
          role: 'admin'
        }
      })
      
      console.log('✅ User role updated to:', updatedUser.role)
    } else {
      console.log('✅ User already has admin role')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

makeAdmin() 