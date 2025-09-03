#!/usr/bin/env node

/**
 * Simple test script to test notification service directly
 */

import { getPayload } from 'payload'
import config from './payload.config.js'

async function testSimpleNotification() {
  console.log('🧪 [Simple Test] Starting simple notification test...')
  
  try {
    const payload = await getPayload({ config })
    
    // Get a test user
    const users = await payload.find({
      collection: 'users',
      limit: 1
    })
    
    if (users.docs.length === 0) {
      console.log('❌ [Simple Test] No users found')
      return
    }
    
    const testUser = users.docs[0]
    console.log(`🧪 [Simple Test] Using test user: ${testUser.name} (${testUser.id})`)
    
    // Check device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        user: { equals: testUser.id }
      }
    })
    
    console.log(`🧪 [Simple Test] Found ${deviceTokens.docs.length} device tokens`)
    
    if (deviceTokens.docs.length === 0) {
      console.log('❌ [Simple Test] No device tokens found')
      return
    }
    
    // Show token details
    deviceTokens.docs.forEach((token, index) => {
      console.log(`\nToken ${index + 1}:`)
      console.log(`  Platform: ${token.platform}`)
      console.log(`  Device Token: ${token.deviceToken ? token.deviceToken.substring(0, 20) + '...' : 'NOT_SET'}`)
      console.log(`  FCM Token: ${token.fcmToken ? token.fcmToken.substring(0, 20) + '...' : 'NOT_SET'}`)
      console.log(`  APNs Token: ${token.apnsToken ? token.apnsToken.substring(0, 20) + '...' : 'NOT_SET'}`)
      console.log(`  Active: ${token.isActive}`)
    })
    
    // Test notification service directly
    console.log('\n🧪 [Simple Test] Testing notification service directly...')
    
    const { NotificationService } = await import('./lib/notification-service.js')
    
    // Test 1: Simple notification
    console.log('\n🧪 [Simple Test] Test 1: Simple notification')
    const result1 = await NotificationService.createNotification({
      recipient: testUser.id,
      type: 'test',
      title: '🧪 Test Notification',
      message: 'This is a test notification to verify the system is working',
      metadata: {
        testType: 'simple',
        timestamp: Date.now().toString()
      },
      priority: 'normal'
    })
    
    console.log('Result 1:', result1)
    
    // Test 2: Comment notification
    console.log('\n🧪 [Simple Test] Test 2: Comment notification')
    const result2 = await NotificationService.notifyNewComment(
      testUser.id,
      'test-commenter-id',
      'Test Commenter',
      'test-post-id',
      'post',
      'This is a test comment notification!'
    )
    
    console.log('Result 2:', result2)
    
    // Test 3: Location interaction notification
    console.log('\n🧪 [Simple Test] Test 3: Location interaction notification')
    const result3 = await NotificationService.notifyLocationInteraction(
      testUser.id,
      'test-interactor-id',
      'Test Interactor',
      'test-location-id',
      'Test Location',
      'save'
    )
    
    console.log('Result 3:', result3)
    
    // Check if notifications were created
    console.log('\n🧪 [Simple Test] Checking notifications collection...')
    const notifications = await payload.find({
      collection: 'notifications',
      where: {
        recipient: { equals: testUser.id }
      },
      sort: '-createdAt',
      limit: 10
    })
    
    console.log(`🧪 [Simple Test] Found ${notifications.docs.length} notifications`)
    notifications.docs.forEach((notification, index) => {
      console.log(`  ${index + 1}. Type: ${notification.type}`)
      console.log(`     Title: ${notification.title}`)
      console.log(`     Message: ${notification.message}`)
      console.log(`     Created: ${notification.createdAt}`)
    })
    
    console.log('\n✅ [Simple Test] Simple notification test completed!')
    
  } catch (error) {
    console.error('❌ [Simple Test] Test failed:', error)
  }
}

// Run the test
testSimpleNotification()
  .then(() => {
    console.log('🏁 [Simple Test] Test script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 [Simple Test] Test script crashed:', error)
    process.exit(1)
  })
