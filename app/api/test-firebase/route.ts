import { NextResponse } from 'next/server'
import { firebaseSender } from '@/lib/firebase-admin'

// GET /api/test-firebase - Test Firebase configuration
export async function GET() {
  try {
    const firebaseStatus = firebaseSender.getStatus()
    
    return NextResponse.json({
      success: true,
      message: 'Firebase configuration test',
      data: {
        firebaseStatus,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Firebase test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Firebase test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
