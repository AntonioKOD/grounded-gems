#!/usr/bin/env node

/**
 * Test script specifically for comment notifications
 * This will help verify that comment notifications are now working properly
 */

import { getPayload } from 'payload'
import config from './payload.config.js'

async function testCommentNotifications() {
  console.log('🧪 [Comment Test] Starting comment notification test...')
  
  try {
    const payload = await getPayload({ config })
    
    // Get a test user
    const users = await payload.find({
      collection: 'users',
      limit: 1
    })
    
    if (users.docs.length === 0) {
      console.log('❌ [Comment Test] No users found')
      return
    }
    
    const testUser = users.docs[0]
    console.log(`🧪 [Comment Test] Using test user: ${testUser.name} (${testUser.id})`)
    
    // Check device tokens for the test user
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        user: { equals: testUser.id }
      }
    })
    
    console.log(`🧪 [Comment Test] Found ${deviceTokens.docs.length} device tokens for test user`)
    
    if (deviceTokens.docs.length === 0) {
      console.log('❌ [Comment Test] No device tokens found for test user')
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
    
    // Get a test post (or create one if none exists)
    const posts = await payload.find({
      collection: 'posts',
      where: {
        author: { equals: testUser.id }
      },
      limit: 1
    })
    
    let testPost
    if (posts.docs.length === 0) {
      console.log('🧪 [Comment Test] No posts found for test user, creating a test post...')
      
      testPost = await payload.create({
        collection: 'posts',
        data: {
          title: 'Test Post for Comment Notifications',
          content: 'This is a test post to verify comment notifications are working.',
          type: 'post',
          author: testUser.id,
          status: 'published',
          visibility: 'public'
        }
      })
      
      console.log(`✅ [Comment Test] Created test post: ${testPost.id}`)
    } else {
      testPost = posts.docs[0]
      console.log(`🧪 [Comment Test] Using existing post: ${testPost.id}`)
    }
    
    // Test 1: Direct notification service call
    console.log('\n🧪 [Comment Test] Test 1: Direct notification service call')
    try {
      const { NotificationService } = await import('./lib/notification-service.js')
      
      const result = await NotificationService.notifyNewComment(
        testUser.id,
        'test-commenter-id',
        'Test Commenter',
        testPost.id,
        'post',
        'This is a test comment to verify notifications are working!'
      )
      
      console.log('✅ [Comment Test] Direct notification service call successful')
      console.log('Result:', result)
    } catch (error) {
      console.log('❌ [Comment Test] Direct notification service call failed:', error.message)
    }
    
    // Test 2: Using notification hooks
    console.log('\n🧪 [Comment Test] Test 2: Using notification hooks')
    try {
      const { notificationHooks } = await import('./lib/notification-hooks.js')
      
      const result = await notificationHooks.onUserComment(
        testUser.id,
        'test-commenter-id',
        'Test Commenter',
        testPost.id,
        'post',
        'This is a test comment via notification hooks!'
      )
      
      console.log('✅ [Comment Test] Notification hooks call successful')
    } catch (error) {
      console.log('❌ [Comment Test] Notification hooks call failed:', error.message)
    }
    
    // Test 3: Simulate actual comment creation
    console.log('\n🧪 [Comment Test] Test 3: Simulate actual comment creation')
    try {
      const { addComment } = await import('./app/actions.js')
      
      // Create a comment as if it's from another user
      const commentResult = await addComment(
        testPost.id,
        'This is a test comment to verify the notification system!',
        'test-commenter-id' // Different user ID to trigger notification
      )
      
      console.log('✅ [Comment Test] Comment creation successful')
      console.log('Comment result:', commentResult)
    } catch (error) {
      console.log('❌ [Comment Test] Comment creation failed:', error.message)
    }
    
    // Check notifications collection
    console.log('\n🧪 [Comment Test] Checking notifications collection...')
    const notifications = await payload.find({
      collection: 'notifications',
      where: {
        and: [
          { recipient: { equals: testUser.id } },
          { type: { equals: 'comment' } }
        ]
      },
      sort: '-createdAt',
      limit: 10
    })
    
    console.log(`🧪 [Comment Test] Found ${notifications.docs.length} comment notifications for test user`)
    
    if (notifications.docs.length > 0) {
      notifications.docs.forEach((notification, index) => {
        console.log(`\nComment Notification ${index + 1}:`)
        console.log(`  ID: ${notification.id}`)
        console.log(`  Type: ${notification.type}`)
        console.log(`  Title: ${notification.title}`)
        console.log(`  Message: ${notification.message}`)
        console.log(`  Created: ${notification.createdAt}`)
        console.log(`  Action By: ${notification.actionBy}`)
        console.log(`  Related To: ${notification.relatedTo?.relationTo} - ${notification.relatedTo?.value}`)
        console.log(`  Metadata:`, notification.metadata)
      })
    } else {
      console.log('⚠️ [Comment Test] No comment notifications found in database')
    }
    
    // Check if notifications were actually sent (check logs)
    console.log('\n🧪 [Comment Test] Checking notification delivery...')
    console.log('Look for these log messages in your server logs:')
    console.log('  ✅ [NotificationService] FCM notification sent to iOS device')
    console.log('  📱 [NotificationService] Sending push notification to X devices for user')
    console.log('  ✅ [addComment] Comment notification sent to post owner')
    
    console.log('\n✅ [Comment Test] Comment notification test completed!')
    
    // Summary
    console.log('\n📊 [Comment Test] Test Summary:')
    console.log(`  - Test user: ${testUser.name} (${testUser.id})`)
    console.log(`  - Device tokens: ${deviceTokens.docs.length}`)
    console.log(`  - Test post: ${testPost.id}`)
    console.log(`  - Comment notifications created: ${notifications.docs.length}`)
    
    if (notifications.docs.length > 0) {
      console.log('  ✅ Comment notifications are being created in database')
      console.log('  🔍 Check server logs to verify push notification delivery')
    } else {
      console.log('  ❌ Comment notifications are NOT being created in database')
      console.log('  🔍 Check the notification service and hooks implementation')
    }
    
  } catch (error) {
    console.error('❌ [Comment Test] Test failed:', error)
  }
}

// Run the test
testCommentNotifications()
  .then(() => {
    console.log('🏁 [Comment Test] Test script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 [Comment Test] Test script crashed:', error)
    process.exit(1)
  })
