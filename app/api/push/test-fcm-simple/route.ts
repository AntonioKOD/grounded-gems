import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseMessaging } from '@/lib/firebase-admin'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Test FCM Simple] Starting simple FCM test...')
    
    // Get Firebase Messaging instance
    const messaging = getFirebaseMessaging()
    console.log('✅ [Test FCM Simple] Firebase Messaging instance obtained')
    
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
        console.log('🧪 [Test FCM Simple] Using real device token:', testToken.substring(0, 20) + '...')
      } else {
        console.log('🧪 [Test FCM Simple] Device token is undefined, using dummy token')
      }
    } else {
      console.log('🧪 [Test FCM Simple] No device tokens found, using dummy token')
    }
    
    // Create a very simple message without APNs-specific headers
    const message = {
      token: testToken,
      notification: {
        title: 'Simple Test',
        body: 'This is a simple FCM test without APNs headers'
      },
      data: {
        test: 'simple',
        timestamp: Date.now().toString()
      }
      // No apns field - let Firebase handle it automatically
    }
    
    console.log('🧪 [Test FCM Simple] Attempting to send simple message...')
    console.log('🧪 [Test FCM Simple] Message object:', JSON.stringify(message, null, 2))
    
    try {
      const response = await messaging.send(message)
      console.log('✅ [Test FCM Simple] Message sent successfully:', response)
      return NextResponse.json({
        success: true,
        message: 'Simple FCM test successful',
        response,
        tokenUsed: testToken === 'dummy_token_for_testing' ? 'dummy' : 'real'
      })
    } catch (fcmError) {
      console.error('❌ [Test FCM Simple] FCM error details:', {
        error: fcmError,
        errorMessage: fcmError instanceof Error ? fcmError.message : 'Unknown error',
        errorStack: fcmError instanceof Error ? fcmError.stack : 'No stack trace',
        errorInfo: (fcmError as any).errorInfo,
        codePrefix: (fcmError as any).codePrefix
      })
      
      return NextResponse.json({
        success: false,
        error: 'Simple FCM test failed',
        details: fcmError instanceof Error ? fcmError.message : 'Unknown error',
        errorInfo: (fcmError as any).errorInfo,
        codePrefix: (fcmError as any).codePrefix,
        tokenUsed: testToken === 'dummy_token_for_testing' ? 'dummy' : 'real'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ [Test FCM Simple] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Unexpected error during simple FCM test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
