import { getPayload } from 'payload'
import config from '../payload.config.ts'

const AUTHORIZED_ADMIN_EMAILS = [
  'antonio_kodheli@icloud.com',
  'ermir1mata@yahoo.com'
]

async function grantAdminAccess() {
  try {
    const payload = await getPayload({ 
      config
    })
    
    console.log('🔧 Granting admin access to authorized emails...')
    
    for (const email of AUTHORIZED_ADMIN_EMAILS) {
      console.log(`\n📧 Processing: ${email}`)
      
      // Find the user by email
      const users = await payload.find({
        collection: 'users',
        where: {
          email: { equals: email }
        }
      })
      
      if (users.docs.length === 0) {
        console.log(`❌ User with email ${email} not found. They need to sign up first.`)
        continue
      }
      
      const user = users.docs[0]
      if (user) {
        console.log(`👤 Found user: ${user.email} (Current role: ${user.role})`)
        if (user.role !== 'admin') {
          console.log('🔧 Updating user role to admin...')
          const updatedUser = await payload.update({
            collection: 'users',
            id: user.id,
            data: {
              role: 'admin'
            }
          })
          console.log(`✅ User ${updatedUser.email} role updated to: ${updatedUser.role}`)
        } else {
          console.log(`✅ User ${user.email} already has admin role`)
        }
      }
    }
    
    console.log('\n🎉 Admin access grant process completed!')
    
  } catch (error) {
    console.error('❌ Error granting admin access:', error)
  }
  
  process.exit(0)
}

grantAdminAccess() 