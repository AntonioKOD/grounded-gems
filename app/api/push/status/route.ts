import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseMessaging } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envStatus = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_SERVICE_ACCOUNT_JSON: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      NODE_ENV: process.env.NODE_ENV,
    }

    // Try to initialize Firebase
    let firebaseStatus = 'Not initialized'
    let messagingStatus = 'Not available'
    
    try {
      const messaging = getFirebaseMessaging()
      firebaseStatus = 'Initialized successfully'
      messagingStatus = 'Available'
    } catch (error) {
      firebaseStatus = `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      messagingStatus = 'Failed'
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envStatus,
      firebase: {
        status: firebaseStatus,
        messaging: messagingStatus
      },
      message: 'Firebase status check completed'
    })

  } catch (error) {
    console.error('Error checking Firebase status:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check Firebase status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
