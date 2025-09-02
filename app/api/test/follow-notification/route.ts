import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const { 
      followerId = 'test-follower-123',
      followerName = 'Test User',
      targetUserId = 'test-target-456'
    } = await request.json()

    console.log('🧪 [Test Follow] Starting follow notification test...')
    console.log(`🧪 [Test Follow] Follower: ${followerName} (${followerId})`)
    console.log(`🧪 [Test Follow] Target: ${targetUserId}`)

    const payload = await getPayload({ config })

    // First, check if we have any device tokens for the target user
    const userTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { equals: targetUserId } },
          { isActive: { equals: true } }
        ]
      }
    })

    if (userTokens.docs.length === 0) {
      console.log('🧪 [Test Follow] No device tokens found for target user, creating a test token...')
      
      // Create a test device token for the target user
      await payload.create({
        collection: 'deviceTokens',
        data: {
          deviceToken: 'test-device-token-' + Date.now(),
          user: targetUserId,
          platform: 'ios',
          isActive: true,
          deviceInfo: {
            model: 'iPhone Test',
            os: 'iOS Test',
            appVersion: '1.0.0',
            buildNumber: '1',
            deviceId: 'test-device-' + Date.now()
          }
        }
      })
      
      console.log('✅ [Test Follow] Created test device token')
    }

    // Now send the follow notification
    const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user',
        target: targetUserId,
        notification: {
          title: 'New Follower! 👥',
          body: `${followerName} started following you`
        },
        data: {
          type: 'new_follower',
          followerId,
          userId: targetUserId,
          action: 'view_profile'
        }
      })
    })

    const notificationResult = await notificationResponse.json()
    console.log('🧪 [Test Follow] Notification result:', notificationResult)

    // Check if the notification was logged to the database
    const notifications = await payload.find({
      collection: 'notifications',
      where: {
        and: [
          { recipient: { equals: targetUserId } },
          { type: { equals: 'push' } },
          { title: { equals: 'New Follower! 👥' } }
        ]
      },
      limit: 1
    })

    console.log('🧪 [Test Follow] Notifications found in database:', notifications.docs.length)

    return NextResponse.json({
      success: true,
      message: 'Follow notification test completed',
      notificationResult,
      databaseLogging: {
        success: notifications.docs.length > 0,
        notificationsFound: notifications.docs.length,
        notificationDetails: notifications.docs[0] || null
      }
    })

  } catch (error) {
    console.error('❌ [Test Follow] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test follow notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
