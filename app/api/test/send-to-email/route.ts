import { NextRequest, NextResponse } from 'next/server'
import { notificationHooks } from '@/lib/notification-hooks'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const { 
      email = 'antonio_kodheli@icloud.com',
      notificationType = 'follow',
      testData = {}
    } = await request.json()

    console.log(`🧪 [Send To Email Test] Sending ${notificationType} notification to ${email}`)

    const payload = await getPayload({ config })

    // Find user by email
    const { docs: users } = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email }
      },
      limit: 1
    })

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: `User not found with email: ${email}` },
        { status: 404 }
      )
    }

    const targetUser = users[0]
    
    if (!targetUser || !targetUser.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 500 }
      )
    }
    
    const testUserId = '68ac67b87879e7096031cace' // Test user ID
    const testUserName = 'Test User'

    console.log(`🧪 [Send To Email Test] Target user: ${targetUser.name} (${targetUser.id})`)

    let result: any = null

    // Send different types of notifications based on notificationType
    switch (notificationType) {
      case 'follow':
        result = await notificationHooks.onUserFollow(
          String(targetUser.id),
          testUserId,
          testUserName
        )
        break

      case 'like':
        result = await notificationHooks.onUserLike(
          String(targetUser.id),
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Test post ID
          'post'
        )
        break

      case 'comment':
        result = await notificationHooks.onUserComment(
          String(targetUser.id),
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Test post ID
          'post',
          'This is a test comment to verify notifications are working! 🎉'
        )
        break

      case 'mention':
        result = await notificationHooks.onUserMention(
          String(targetUser.id),
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Test post ID
          'post'
        )
        break

      case 'location_interaction':
        result = await notificationHooks.onLocationInteraction(
          String(targetUser.id),
          testUserId,
          testUserName,
          '507f1f77bcf86cd799439011', // Test location ID
          'Test Location',
          'like'
        )
        break

      case 'all':
        // Send multiple notification types
        const results = []
        
        results.push(await notificationHooks.onUserFollow(String(targetUser.id), testUserId, testUserName))
        results.push(await notificationHooks.onUserLike(String(targetUser.id), testUserId, testUserName, '507f1f77bcf86cd799439011', 'post'))
        results.push(await notificationHooks.onUserComment(String(targetUser.id), testUserId, testUserName, '507f1f77bcf86cd799439011', 'post', 'Test comment!'))
        results.push(await notificationHooks.onLocationInteraction(String(targetUser.id), testUserId, testUserName, '507f1f77bcf86cd799439011', 'Test Location', 'like'))
        
        result = { type: 'multiple', results }
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown notification type: ${notificationType}` },
          { status: 400 }
        )
    }

    console.log(`✅ [Send To Email Test] ${notificationType} notification sent successfully to ${email}`)

    return NextResponse.json({
      success: true,
      message: `${notificationType} notification sent to ${email}`,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email
      },
      notificationType,
      result
    })

  } catch (error) {
    console.error('❌ [Send To Email Test] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send notification to email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
