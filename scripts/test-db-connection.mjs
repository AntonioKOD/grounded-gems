import mongoose from 'mongoose'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...')
  
  try {
    // Get current IP
    const response = await fetch('https://ipinfo.io/ip')
    const currentIP = await response.text()
    console.log('📍 Current IP:', currentIP.trim())
  } catch (error) {
    console.log('📍 Current IP: Unable to detect')
  }
  
  const dbUri = process.env.DATABASE_URI
  
  if (!dbUri) {
    console.error('❌ DATABASE_URI not found in environment variables')
    console.log('💡 Make sure you have a .env.local file with DATABASE_URI set')
    process.exit(1)
  }
  
  // Mask sensitive parts of the URI
  const maskedUri = dbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
  console.log('🔗 Connection string:', maskedUri)
  
  try {
    console.log('⏳ Connecting to MongoDB...')
    await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
    })
    
    console.log('✅ Successfully connected to MongoDB!')
    
    // Test a simple operation
    console.log('🔍 Testing database access...')
    const admin = mongoose.connection.db.admin()
    const result = await admin.ping()
    console.log('✅ Database ping successful:', result)
    
    // List collections
    console.log('📋 Available collections:')
    const collections = await mongoose.connection.db.listCollections().toArray()
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`)
    })
    
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:')
    console.error('Error:', error.message)
    
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log('\n💡 Troubleshooting steps:')
      console.log('1. Go to MongoDB Atlas → Network Access')
      console.log('2. Add your current IP to the whitelist')
      console.log('3. Or temporarily add 0.0.0.0/0 for development (less secure)')
      console.log('4. Wait 2-3 minutes for changes to propagate')
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n💡 Authentication issue:')
      console.log('1. Check your username and password in the connection string')
      console.log('2. Make sure the database user has proper permissions')
    }
    
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB')
  }
}

testConnection().catch(console.error) 