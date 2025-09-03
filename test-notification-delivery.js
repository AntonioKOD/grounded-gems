#!/usr/bin/env node

/**
 * Test script to verify notification delivery for all notification types
 * This will help diagnose why some notifications aren't being received on iOS
 */

import { getPayload } from 'payload'
import config from './payload.config.js'

async function testNotificationDelivery() {
  console.log('🧪 [Test] Starting notification delivery test...')
  
  try {
    const payload = await getPayload({ config })
    
    // Get a test user and their device tokens
    const users = await payload.find({
      collection: 'users',
      limit: 1
    })
    
    if (users.docs.length === 0) {
      console.log('❌ [Test] No users found in database')
      return
    }
    
    const testUser = users.docs[0]
    console.log(`🧪 [Test] Using test user: ${testUser.name} (${testUser.id})`)
    
    // Check user's device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        user: { equals: testUser.id }
      }
    })
    
    console.log(`🧪 [Test] Found ${deviceTokens.docs.length} device tokens for user`)
    
    deviceTokens.docs.forEach((token, index) => {
      console.log(`  ${index + 1}. Platform: ${token.platform}`)
      console.log(`     Device Token: ${token.deviceToken ? token.deviceToken.substring(0, 20) + '...' : 'NOT_SET'}`)
      console.log(`     FCM Token: ${token.fcmToken ? token.fcmToken.substring(0, 20) + '...' : 'NOT_SET'}`)
      console.log(`     APNs Token: ${token.apnsToken ? token.apnsToken.substring(0, 20) + '...' : 'NOT_SET'}`)
      console.log(`     Active: ${token.isActive}`)
      console.log('')
    })
    
    if (deviceTokens.docs.length === 0) {
      console.log('❌ [Test] No device tokens found for user')
      return
    }
    
    // Test different notification types
    console.log('🧪 [Test] Testing notification types...')
    
    // Test 1: Comment notification
    console.log('\n🧪 [Test] Testing comment notification...')
    try {
      const { notificationHooks } = await import('./lib/notification-hooks.js')
      const result = await notificationHooks.onUserComment(
        testUser.id,
        'test-commenter-id',
        'Test Commenter',
        'test-post-id',
        'post',
        'This is a test comment to verify notifications are working!'
      )
      console.log('✅ [Test] Comment notification test completed')
    } catch (error) {
      console.log('❌ [Test] Comment notification test failed:', error.message)
    }
    
    // Test 2: Location interaction notification
    console.log('\n🧪 [Test] Testing location interaction notification...')
    try {
      const { notificationHooks } = await import('./lib/notification-hooks.js')
      const result = await notificationHooks.onLocationInteraction(
        testUser.id,
        'test-interactor-id',
        'Test Interactor',
        'test-location-id',
        'Test Location',
        'save'
      )
      console.log('✅ [Test] Location interaction notification test completed')
    } catch (error) {
      console.log('❌ [Test] Location interaction notification test failed:', error.message)
    }
    
    // Test 3: Mention notification
    console.log('\n🧪 [Test] Testing mention notification...')
    try {
      const { notificationHooks } = await import('./lib/notification-hooks.js')
      const result = await notificationHooks.onUserMention(
        testUser.id,
        'test-mentioner-id',
        'Test Mentioner',
        'test-post-id',
        'post'
      )
      console.log('✅ [Test] Mention notification test completed')
    } catch (error) {
      console.log('❌ [Test] Mention notification test failed:', error.message)
    }
    
    // Check notifications collection
    console.log('\n🧪 [Test] Checking notifications collection...')
    const notifications = await payload.find({
      collection: 'notifications',
      where: {
        recipient: { equals: testUser.id }
      },
      sort: '-createdAt',
      limit: 5
    })
    
    console.log(`🧪 [Test] Found ${notifications.docs.length} recent notifications for user`)
    notifications.docs.forEach((notification, index) => {
      console.log(`  ${index + 1}. Type: ${notification.type}`)
      console.log(`     Title: ${notification.title}`)
      console.log(`     Message: ${notification.message}`)
      console.log(`     Created: ${notification.createdAt}`)
      console.log('')
    })
    
    console.log('✅ [Test] Notification delivery test completed!')
    
  } catch (error) {
    console.error('❌ [Test] Test failed:', error)
  }
}

// Run the test
testNotificationDelivery()
  .then(() => {
    console.log('🏁 [Test] Test script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 [Test] Test script crashed:', error)
    process.exit(1)
  })
