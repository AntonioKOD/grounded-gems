import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendPushNotification } from '@/lib/push-notifications'
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
      data = {}
    } = requestBody

    console.log(`🔔 [Test API] Test notification data:`, { title, body, userId: user.id })

    // Check APNs configuration status
    const apnsStatus = apnsSender.getStatus()
    
    if (!apnsStatus.configured) {
      console.log('🔔 [Test API] APNs not properly configured')
      return NextResponse.json({ 
        success: false, 
        error: 'APNs configuration incomplete',
        code: 'APNS_NOT_CONFIGURED',
        details: {
          configured: apnsStatus.configured,
          initialized: apnsStatus.initialized,
          keyExists: apnsStatus.keyExists,
          environment: apnsStatus.environment
        }
      }, { status: 500 })
    }

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
          deviceTokensCount: 0,
          apnsStatus
        }
      }, { status: 400 })
    }

    // Send test notification to the current user using APNs
    const result = await apnsSender.sendNotificationToUser(String(user.id), {
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
      console.log(`🔔 [Test API] Test notification sent successfully to user ${user.id}`)
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent successfully',
        data: {
          userId: user.id,
          title,
          body,
          sentCount: result.sentCount,
          totalCount: result.totalCount,
          deviceTokensCount: deviceTokens.docs.length,
          environment: process.env.NODE_ENV,
          apnsStatus,
          timestamp: new Date().toISOString()
        }
      })
    } else {
      console.log(`🔔 [Test API] Failed to send test notification to user ${user.id}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send test notification',
        code: 'NOTIFICATION_FAILED',
        details: {
          sentCount: result.sentCount,
          totalCount: result.totalCount,
          errors: result.errors
        },
        data: {
          userId: user.id,
          deviceTokensCount: deviceTokens.docs.length,
          environment: process.env.NODE_ENV,
          apnsStatus,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 })
    }
  } catch (error) {
    console.error('🔔 [Test API] Error sending test notification:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR'
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send test notification',
      code: errorCode,
      details: errorMessage,
      data: {
        timestamp: new Date().toISOString(),
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
        apnsStatus,
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
