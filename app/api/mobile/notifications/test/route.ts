import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendPushNotification } from '@/lib/push-notifications'
import { firebaseSender } from '@/lib/firebase-admin'
import { apnsSender } from '@/lib/apns-config'

// POST /api/mobile/notifications/test - Send a test push notification
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 [Test API] Test notification request received')
    
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.log('🔔 [Test API] Authentication required')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      console.log('🔔 [Test API] User not found')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required',
        code: 'USER_NOT_FOUND'
      }, { status: 401 })
    }

    console.log(`🔔 [Test API] User authenticated: ${user.id}`)

    const requestBody = await request.json()
    const { 
      title = '🧪 Server Test Notification', 
      body = 'This is a test push notification sent from the server!',
      data = {},
      useFirebase = true // Default to Firebase, can be overridden
    } = requestBody

    console.log(`🔔 [Test API] Test notification data:`, { title, body, userId: user.id, useFirebase })

    // Check if user has device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { equals: String(user.id) } },
          { isActive: { equals: true } }
        ]
      }
    })

    console.log(`🔔 [Test API] Found ${deviceTokens.docs.length} device tokens for user ${user.id}`)

    if (deviceTokens.docs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No device tokens found',
        code: 'NO_DEVICE_TOKENS',
        details: 'User has no registered device tokens. Make sure the device is properly registered.',
        data: {
          userId: user.id,
          deviceTokensCount: 0
        }
      }, { status: 400 })
    }

    let result: any

    // Try Firebase first (preferred method)
    if (useFirebase) {
      const firebaseStatus = firebaseSender.getStatus()
      console.log('🔔 [Test API] Firebase status:', firebaseStatus)
      
      if (firebaseStatus.configured) {
        console.log('🔔 [Test API] Using Firebase to send notification')
        result = await firebaseSender.sendNotificationToUser(String(user.id), {
          title,
          body,
          badge: 1,
          sound: 'default',
          data: {
            type: 'test_notification',
            timestamp: Date.now(),
            ...data
          }
        })
        
        if (result.success) {
          return NextResponse.json({ 
            success: true, 
            message: 'Test notification sent successfully via Firebase',
            data: {
              userId: user.id,
              sentCount: result.sentCount,
              method: 'firebase',
              deviceTokensCount: deviceTokens.docs.length,
              environment: process.env.NODE_ENV
            }
          })
        } else {
          console.log('🔔 [Test API] Firebase failed, trying APNs fallback')
        }
      } else {
        console.log('🔔 [Test API] Firebase not configured, using APNs fallback')
      }
    }

    // Fallback to APNs if Firebase fails or is not configured
    const apnsStatus = apnsSender.getStatus()
    console.log('🔔 [Test API] APNs status:', apnsStatus)
    
    if (!apnsStatus.configured) {
      return NextResponse.json({ 
        success: false, 
        error: 'No notification system configured',
        code: 'NO_NOTIFICATION_SYSTEM',
        details: {
          firebaseConfigured: firebaseSender.getStatus().configured,
          apnsConfigured: apnsStatus.configured,
          environment: process.env.NODE_ENV
        }
      }, { status: 500 })
    }

    console.log('🔔 [Test API] Using APNs to send notification')
    result = await apnsSender.sendNotificationToUser(String(user.id), {
      title,
      body,
      badge: 1,
      sound: 'default',
      data: {
        type: 'test_notification',
        timestamp: Date.now(),
        ...data
      }
    })

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent successfully via APNs',
        data: {
          userId: user.id,
          sentCount: result.sentCount,
          method: 'apns',
          deviceTokensCount: deviceTokens.docs.length,
          environment: process.env.NODE_ENV
        }
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send test notification',
        code: 'NOTIFICATION_FAILED',
        details: result.error || 'Unknown error',
        data: {
          userId: user.id,
          method: 'apns',
          deviceTokensCount: deviceTokens.docs.length,
          environment: process.env.NODE_ENV
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('🔔 [Test API] Error sending test notification:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
      data: {
        environment: process.env.NODE_ENV
      }
    }, { status: 500 })
  }
}

// GET /api/mobile/notifications/test - Get notification system status
export async function GET(request: NextRequest) {
  try {
    console.log('🔔 [Test API] Status check request received')
    
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required',
        code: 'USER_NOT_FOUND'
      }, { status: 401 })
    }

    // Get Firebase status
    const firebaseStatus = firebaseSender.getStatus()
    
    // Get APNs status
    const apnsStatus = apnsSender.getStatus()
    
    // Get user's device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { equals: String(user.id) } },
          { isActive: { equals: true } }
        ]
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Notification system status',
      data: {
        userId: user.id,
        deviceTokensCount: deviceTokens.docs.length,
        environment: process.env.NODE_ENV,
        firebaseStatus,
        apnsStatus,
        preferredMethod: firebaseStatus.configured ? 'firebase' : 'apns',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('🔔 [Test API] Error getting status:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get notification system status',
      code: 'STATUS_CHECK_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
