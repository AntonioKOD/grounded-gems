import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendFCMMessage, sendFCMMessageToMultipleTokens } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { 
      userIds, 
      notification, 
      data, 
      apns,
      sendToAll = false 
    } = await request.json()

    if (!notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: 'Notification title and body are required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })
    let deviceTokens: string[] = []

    if (sendToAll) {
      // Get all active device tokens
      const allTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { isActive: { equals: true } },
            { platform: { equals: 'ios' } }
          ]
        }
      })
      deviceTokens = allTokens.docs.map(doc => doc.fcmToken || doc.deviceToken)
    } else if (userIds && userIds.length > 0) {
      // Get device tokens for specific users
      const userTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { user: { in: userIds } },
            { isActive: { equals: true } },
            { platform: { equals: 'ios' } }
          ]
        }
      })
      deviceTokens = userTokens.docs.map(doc => doc.fcmToken || doc.deviceToken)
    } else {
      return NextResponse.json(
        { error: 'Either userIds or sendToAll must be specified' },
        { status: 400 }
      )
    }

    if (deviceTokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active device tokens found',
        sentCount: 0
      })
    }

    // Send notification to all device tokens
    const result = await sendFCMMessageToMultipleTokens(
      deviceTokens,
      notification,
      data,
      apns
    )

    if (result.success) {
      // Log the notification in the notifications collection
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            title: notification.title,
            body: notification.body,
            type: 'push',
            platform: 'ios',
            recipients: userIds || [],
            sentCount: result.successCount,
            failedCount: result.failureCount,
            data: data || {},
            status: 'sent'
          }
        })
      } catch (logError) {
        console.warn('Failed to log notification:', logError)
      }

      return NextResponse.json({
        success: true,
        message: 'Notifications sent successfully',
        sentCount: result.successCount,
        failedCount: result.failureCount,
        totalTokens: deviceTokens.length
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          sentCount: 0,
          failedCount: deviceTokens.length
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending FCM notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}

// Send notification to a single user
export async function PUT(request: NextRequest) {
  try {
    const { userId, notification, data, apns } = await request.json()

    if (!userId || !notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: 'User ID, notification title and body are required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Get user's device tokens
    const userTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { equals: userId } },
          { isActive: { equals: true } },
          { platform: { equals: 'ios' } }
        ]
      }
    })

    if (userTokens.docs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active device tokens found for user',
        sentCount: 0
      })
    }

    let successCount = 0
    let failedCount = 0
    const results = []

    // Send to each device token
    for (const tokenDoc of userTokens.docs) {
      const token = tokenDoc.fcmToken || tokenDoc.deviceToken
      const result = await sendFCMMessage(token, notification, data, apns)
      
      if (result.success) {
        successCount++
      } else {
        failedCount++
      }
      
      results.push({
        tokenId: tokenDoc.id,
        success: result.success,
        error: result.error
      })
    }

    // Log the notification
    try {
      await payload.create({
        collection: 'notifications',
        data: {
          title: notification.title,
          body: notification.body,
          type: 'push',
          platform: 'ios',
          recipients: [userId],
          sentCount: successCount,
          failedCount: failedCount,
          data: data || {},
          status: 'sent'
        }
      })
    } catch (logError) {
      console.warn('Failed to log notification:', logError)
    }

    return NextResponse.json({
      success: successCount > 0,
      message: `Notifications sent to ${successCount} devices`,
      sentCount: successCount,
      failedCount: failedCount,
      totalDevices: userTokens.docs.length,
      results
    })
  } catch (error) {
    console.error('Error sending FCM notification to user:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
