import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseMessaging } from '@/lib/firebase-admin'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Test FCM] Starting FCM test...')
    
    // Get Firebase Messaging instance
    const messaging = getFirebaseMessaging()
    console.log('✅ [Test FCM] Firebase Messaging instance obtained')
    
    // Try to get a real device token from the database
    const payload = await getPayload({ config })
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        isActive: { equals: true }
      },
      limit: 1
    })
    
    let testToken = 'dummy_token_for_testing'
    if (deviceTokens.docs.length > 0) {
      const firstToken = deviceTokens.docs[0]
      if (firstToken && firstToken.deviceToken) {
        testToken = firstToken.deviceToken
        console.log('🧪 [Test FCM] Using real device token:', testToken.substring(0, 20) + '...')
      } else {
        console.log('🧪 [Test FCM] Device token is undefined, using dummy token')
      }
    } else {
      console.log('🧪 [Test FCM] No device tokens found, using dummy token')
    }
    
    const message = {
      token: testToken,
      notification: {
        title: 'Test Notification',
        body: 'This is a test notification from the server'
      },
      data: {
        test: 'true',
        timestamp: Date.now().toString()
      }
    }
    
    console.log('🧪 [Test FCM] Attempting to send test message...')
    
    try {
      const response = await messaging.send(message)
      console.log('✅ [Test FCM] Message sent successfully:', response)
      return NextResponse.json({
        success: true,
        message: 'FCM test successful',
        response,
        tokenUsed: testToken === 'dummy_token_for_testing' ? 'dummy' : 'real'
      })
    } catch (fcmError) {
      console.error('❌ [Test FCM] FCM error details:', {
        error: fcmError,
        errorMessage: fcmError instanceof Error ? fcmError.message : 'Unknown error',
        errorStack: fcmError instanceof Error ? fcmError.stack : 'No stack trace',
        errorInfo: (fcmError as any).errorInfo,
        codePrefix: (fcmError as any).codePrefix
      })
      
      return NextResponse.json({
        success: false,
        error: 'FCM test failed',
        details: fcmError instanceof Error ? fcmError.message : 'Unknown error',
        errorInfo: (fcmError as any).errorInfo,
        codePrefix: (fcmError as any).codePrefix,
        tokenUsed: testToken === 'dummy_token_for_testing' ? 'dummy' : 'real'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ [Test FCM] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Unexpected error during FCM test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
