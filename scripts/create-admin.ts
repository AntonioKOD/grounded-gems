import { getPayload } from 'payload'
import config from '../payload.config'

const createAdminUser = async () => {
  try {
    const payload = await getPayload({ 
      config,
      secret: 'your-super-secret-key-here-make-it-long-and-random-123456789'
    })

    console.log('Creating admin user...')

    const adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'admin@sacavia.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('Email:', adminUser.email)
    console.log('Password: admin123')
    console.log('\nYou can now log into PayloadCMS at: http://localhost:3000/admin')
    
  } catch (error) {
    if (error.message.includes('already registered')) {
      console.log('⚠️ Admin user already exists')
      console.log('Email: admin@sacavia.com')
      console.log('Password: admin123')
      console.log('\nYou can log into PayloadCMS at: http://localhost:3000/admin')
    } else {
      console.error('❌ Error creating admin user:', error.message)
    }
  }

  process.exit(0)
}

createAdminUser() 