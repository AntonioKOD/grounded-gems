import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Test Push Notification] Starting push notification test...')
    
    const payload = await getPayload({ config })
    const body = await request.json()
    const { userId, title, body: message } = body
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }
    
    console.log(`🧪 [Test Push Notification] Sending test notification to user: ${userId}`)
    
    // Create a test notification
    const result = await notificationService.createNotification({
      recipient: userId,
      type: 'test_notification',
      title: title || 'Test Notification! 🧪',
      message: message || 'This is a test push notification to verify the system is working.',
      metadata: {
        test: 'true',
        timestamp: new Date().toISOString(),
        action: 'test'
      },
      priority: 'high'
    })
    
    console.log(`🧪 [Test Push Notification] Result:`, result)
    
    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
      result
    })
    
  } catch (error) {
    console.error('❌ [Test Push Notification] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [Test Push Notification] Getting push notification status...')
    
    // Check Firebase configuration
    const firebaseStatus = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'NOT_SET',
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      apnKeyId: process.env.APN_KEY_ID || 'NOT_SET',
      apnTeamId: process.env.APN_TEAM_ID || 'NOT_SET',
      apnKeyPath: process.env.APN_KEY_PATH || 'NOT_SET',
      apnBundleId: process.env.APN_BUNDLE_ID || 'NOT_SET'
    }
    
    console.log('🧪 [Test Push Notification] Firebase status:', firebaseStatus)
    
    // Check device tokens
    const payload = await getPayload({ config })
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        isActive: { equals: true }
      },
      limit: 10
    })
    
    console.log(`🧪 [Test Push Notification] Found ${deviceTokens.docs.length} active device tokens`)
    
    return NextResponse.json({
      success: true,
      firebase: firebaseStatus,
      deviceTokens: {
        count: deviceTokens.docs.length,
        tokens: deviceTokens.docs.map(token => ({
          id: token.id,
          platform: token.platform,
          user: token.user,
          isActive: token.isActive,
          hasFcmToken: !!token.fcmToken,
          hasApnsToken: !!token.apnsToken,
          hasDeviceToken: !!token.deviceToken
        }))
      }
    })
    
  } catch (error) {
    console.error('❌ [Test Push Notification] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

