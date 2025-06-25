import payload from 'payload'
import dotenv from 'dotenv'
import config from '../payload.config.js'
dotenv.config()

const createAdminUser = async () => {
  try {
    // Initialize Payload
    await payload.init({
      config,
      secret: process.env.PAYLOAD_SECRET,
      local: true,
    })

    console.log('Creating admin user...')

    // Create or update admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sacavia.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const adminName = process.env.ADMIN_NAME || 'Admin User'

    try {
      // Try to find existing user
      const existingUser = await payload.find({
        collection: 'users',
        where: {
          email: { equals: adminEmail }
        },
        limit: 1
      })

      if (existingUser.docs.length > 0) {
        // Update existing user to admin
        const user = await payload.update({
          collection: 'users',
          id: existingUser.docs[0].id,
          data: {
            role: 'admin',
            name: adminName,
            _verified: true
          }
        })
        console.log(`✅ Updated existing user to admin: ${user.email}`)
      } else {
        // Create new admin user
        const user = await payload.create({
          collection: 'users',
          data: {
            email: adminEmail,
            password: adminPassword,
            name: adminName,
            role: 'admin',
            _verified: true
          }
        })
        console.log(`✅ Created new admin user: ${user.email}`)
      }

      console.log('\n📝 Admin credentials:')
      console.log(`Email: ${adminEmail}`)
      console.log(`Password: ${adminPassword}`)
      console.log('\n🔗 Access PayloadCMS at: http://localhost:3000/admin')
      console.log('\n⚠️  Make sure to change the password after first login!')

    } catch (error) {
      console.error('❌ Error creating/updating admin user:', error.message)
    }

  } catch (error) {
    console.error('❌ Error initializing Payload:', error.message)
  }

  process.exit(0)
}

createAdminUser() 