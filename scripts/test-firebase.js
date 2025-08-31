#!/usr/bin/env node

/**
 * Firebase Configuration Test Script
 * 
 * This script tests if Firebase Admin SDK is properly configured
 * and can send test notifications.
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(path.dirname(__dirname), '.env.local') })

async function testFirebaseConfig() {
  console.log('🔥 Testing Firebase Configuration')
  console.log('================================\n')

  // Check environment variables
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ]

  console.log('📋 Checking environment variables...')
  const missingVars = []
  
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (!value) {
      missingVars.push(varName)
      console.log(`❌ ${varName}: missing`)
    } else {
      console.log(`✅ ${varName}: ${varName.includes('KEY') ? '[HIDDEN]' : value}`)
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`)
    console.log('💡 Run: npm run setup-firebase')
    process.exit(1)
  }

  console.log('\n✅ All environment variables present')

  // Test Firebase initialization
  try {
    console.log('\n📱 Testing Firebase Admin SDK initialization...')
    
    // Import the Firebase config directly
    const { firebaseSender } = await import('../lib/firebase-admin.ts')
    
    const status = firebaseSender.getStatus()
    console.log('📊 Firebase Status:', status)
    
    if (status.configured) {
      console.log('✅ Firebase Admin SDK initialized successfully')
      
      // Test sending a notification (if FCM token provided)
      const testToken = process.argv[2]
      if (testToken) {
        console.log('\n📤 Testing notification sending...')
        const result = await firebaseSender.sendNotification(testToken, {
          title: '🧪 Firebase Test',
          body: 'This is a test notification from Firebase Admin SDK',
          data: {
            type: 'test',
            timestamp: Date.now()
          }
        })
        
        if (result) {
          console.log('✅ Test notification sent successfully')
        } else {
          console.log('❌ Test notification failed')
        }
      } else {
        console.log('\n💡 To test notification sending, provide an FCM token:')
        console.log('   node scripts/test-firebase.js YOUR_FCM_TOKEN')
      }
    } else {
      console.log('❌ Firebase Admin SDK not properly configured')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error.message)
    process.exit(1)
  }

  console.log('\n🎉 Firebase configuration test completed successfully!')
}

testFirebaseConfig().catch(console.error)
