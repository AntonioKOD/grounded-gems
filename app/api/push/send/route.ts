import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendFCMMessage, sendFCMMessageToTopic } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware here
    // - Verify user has permission to send notifications
    // - Rate limiting for notification sending
    // - Admin role validation for broadcast notifications
    
    const { 
      type, // 'token', 'topic', or 'user'
      target, // token string, topic string, or userId
      notification,
      data,
      apns
    } = await request.json()

    // Validate required fields
    if (!type || !target || !notification) {
      return NextResponse.json(
        { error: 'type, target, and notification are required' },
        { status: 400 }
      )
    }

    if (!notification.title || !notification.body) {
      return NextResponse.json(
        { error: 'Notification title and body are required' },
        { status: 400 }
      )
    }

    // Validate notification type
    const validTypes = ['token', 'topic', 'user']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: token, topic, user' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })
    let result: any

    switch (type) {
      case 'token':
        // Send to a single device token
        try {
          const response = await sendFCMMessage(
            target,
            { title: notification.title, body: notification.body, imageUrl: notification.imageUrl },
            data,
            apns
          )
          
          result = {
            success: response.success,
            message: response.success ? 'Notification sent to device token successfully' : 'Failed to send notification',
            messageId: response.messageId,
            type: 'token',
            target,
            sentCount: response.success ? 1 : 0,
            failedCount: response.success ? 0 : 1,
            error: response.error
          }
        } catch (error) {
          console.error('Error sending to token:', error)
          result = {
            success: false,
            message: 'Failed to send notification to device token',
            error: error instanceof Error ? error.message : 'Unknown error',
            type: 'token',
            target,
            sentCount: 0,
            failedCount: 1
          }
        }
        break

      case 'topic':
        // Send to a topic
        try {
          const response = await sendFCMMessageToTopic(
            target,
            { title: notification.title, body: notification.body, imageUrl: notification.imageUrl },
            data,
            apns
          )
          
          result = {
            success: response.success,
            message: response.success ? 'Notification sent to topic successfully' : 'Failed to send notification',
            messageId: response.messageId,
            type: 'topic',
            target,
            sentCount: response.success ? 'unknown' : 0, // FCM doesn't provide exact count for topics
            failedCount: response.success ? 0 : 1,
            error: response.error
          }
        } catch (error) {
          console.error('Error sending to topic:', error)
          result = {
            success: false,
            message: 'Failed to send notification to topic',
            error: error instanceof Error ? error.message : 'Unknown error',
            type: 'topic',
            target,
            sentCount: 0,
            failedCount: 'unknown'
          }
        }
        break

      case 'user':
        // Send to all active tokens for a user
        try {
          // Get all active device tokens for the user
          const userTokens = await payload.find({
            collection: 'deviceTokens',
            where: {
              and: [
                { user: { equals: target } },
                { isActive: { equals: true } }
              ]
            }
          })

          if (userTokens.docs.length === 0) {
            return NextResponse.json({
              success: false,
              message: 'No active device tokens found for user',
              type: 'user',
              target,
              sentCount: 0,
              failedCount: 0
            })
          }

          let successCount = 0
          let failedCount = 0
          const results = []

          // Send to each device token
          for (const tokenDoc of userTokens.docs) {
            try {
              const response = await sendFCMMessage(
                tokenDoc.deviceToken,
                { title: notification.title, body: notification.body, imageUrl: notification.imageUrl },
                data,
                apns
              )
              
              if (response.success) {
                successCount++
                results.push({
                  tokenId: tokenDoc.id,
                  deviceToken: tokenDoc.deviceToken,
                  platform: tokenDoc.platform,
                  success: true,
                  messageId: response.messageId
                })
              } else {
                failedCount++
                results.push({
                  tokenId: tokenDoc.id,
                  deviceToken: tokenDoc.deviceToken,
                  platform: tokenDoc.platform,
                  success: false,
                  error: response.error
                })
              }
            } catch (error) {
              failedCount++
              results.push({
                tokenId: tokenDoc.id,
                deviceToken: tokenDoc.deviceToken,
                platform: tokenDoc.platform,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }

          result = {
            success: successCount > 0,
            message: `Notification sent to ${successCount} devices for user`,
            type: 'user',
            target,
            sentCount: successCount,
            failedCount,
            totalDevices: userTokens.docs.length,
            results
          }
        } catch (error) {
          console.error('Error sending to user:', error)
          result = {
            success: false,
            message: 'Failed to send notification to user',
            error: error instanceof Error ? error.message : 'Unknown error',
            type: 'user',
            target,
            sentCount: 0,
            failedCount: 'unknown'
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

    // Log the notification in the notifications collection
    try {
      // Only log notifications that have a valid recipient (user notifications)
      if (type === 'user' && target) {
        await payload.create({
          collection: 'notifications',
          data: {
            title: notification.title,
            message: notification.body, // Use 'message' instead of 'body'
            type: 'push', // Add 'push' as a valid type option
            recipient: target, // Only set recipient for user notifications
            read: false,
            metadata: {
              notificationType: type,
              target,
              result,
              sentCount: result.sentCount,
              failedCount: result.failedCount,
              status: result.success ? 'sent' : 'failed'
            }
          }
        })
        console.log('✅ [Push] Notification logged to database')
      } else {
        console.log('ℹ️ [Push] Skipping notification logging for non-user notification type:', type)
      }
    } catch (logError) {
      console.warn('❌ [Push] Failed to log notification:', logError)
    }

    // Return appropriate status code based on success
    const statusCode = result.success ? 200 : 500
    
    return NextResponse.json(result, { status: statusCode })

  } catch (error) {
    console.error('Error sending push notification:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send push notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper endpoint to get available topics
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication middleware here
    // - Verify user has permission to view topics
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'topics') {
      // Get all unique topics from device tokens
      const payload = await getPayload({ config })
      
      const allTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          isActive: { equals: true }
        },
        limit: 1000 // Adjust as needed
      })

      const topicSet = new Set<string>()
      allTokens.docs.forEach(token => {
        if (token.topics && Array.isArray(token.topics)) {
          token.topics.forEach((t: any) => {
            if (t.topic) topicSet.add(t.topic)
          })
        }
      })

      return NextResponse.json({
        success: true,
        topics: Array.from(topicSet),
        totalTopics: topicSet.size
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action. Use ?action=topics to get available topics'
    })

  } catch (error) {
    console.error('Error getting topics:', error)
    return NextResponse.json(
      { error: 'Failed to get topics' },
      { status: 500 }
    )
  }
}
