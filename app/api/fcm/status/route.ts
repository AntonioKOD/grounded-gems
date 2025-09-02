import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getFirebaseMessaging } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Check Firebase configuration
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Configured' : 'Not configured',
    }

    // Check if Firebase is properly configured
    const isFirebaseConfigured = !!(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    )

    // Get device token statistics
    let deviceTokenStats = {
      total: 0,
      active: 0,
      ios: 0,
      android: 0,
      web: 0
    }

    try {
      const totalTokens = await payload.find({
        collection: 'deviceTokens',
        limit: 0
      })
      
      const activeTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          isActive: { equals: true }
        },
        limit: 0
      })

      const iosTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { platform: { equals: 'ios' } },
            { isActive: { equals: true } }
          ]
        },
        limit: 0
      })

      const androidTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { platform: { equals: 'android' } },
            { isActive: { equals: true } }
          ]
        },
        limit: 0
      })

      const webTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { platform: { equals: 'web' } },
            { isActive: { equals: true } }
          ]
        },
        limit: 0
      })

      deviceTokenStats = {
        total: totalTokens.totalDocs,
        active: activeTokens.totalDocs,
        ios: iosTokens.totalDocs,
        android: androidTokens.totalDocs,
        web: webTokens.totalDocs
      }
    } catch (statsError) {
      console.warn('Failed to get device token statistics:', statsError)
    }

    // Test Firebase connection
    let firebaseStatus = 'Not configured'
    let firebaseError = null
    
    if (isFirebaseConfigured) {
      try {
        const messaging = getFirebaseMessaging()
        firebaseStatus = 'Connected'
      } catch (error) {
        firebaseStatus = 'Connection failed'
        firebaseError = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Get recent notification statistics
    let notificationStats = {
      total: 0,
      sent: 0,
      failed: 0,
      last24h: 0
    }

    try {
      const totalNotifications = await payload.find({
        collection: 'notifications',
        where: {
          type: { equals: 'push' }
        },
        limit: 0
      })

      const sentNotifications = await payload.find({
        collection: 'notifications',
        where: {
          and: [
            { type: { equals: 'push' } },
            { status: { equals: 'sent' } }
          ]
        },
        limit: 0
      })

      const failedNotifications = await payload.find({
        collection: 'notifications',
        where: {
          and: [
            { type: { equals: 'push' } },
            { status: { equals: 'failed' } }
          ]
        },
        limit: 0
      })

      const last24h = new Date()
      last24h.setHours(last24h.getHours() - 24)

      const recentNotifications = await payload.find({
        collection: 'notifications',
        where: {
          and: [
            { type: { equals: 'push' } },
            { createdAt: { greater_than: last24h.toISOString() } }
          ]
        },
        limit: 0
      })

      notificationStats = {
        total: totalNotifications.totalDocs,
        sent: sentNotifications.totalDocs,
        failed: failedNotifications.totalDocs,
        last24h: recentNotifications.totalDocs
      }
    } catch (notifError) {
      console.warn('Failed to get notification statistics:', notifError)
    }

    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      firebase: {
        configured: isFirebaseConfigured,
        status: firebaseStatus,
        config: firebaseConfig,
        error: firebaseError
      },
      deviceTokens: deviceTokenStats,
      notifications: notificationStats,
      services: {
        fcm: firebaseStatus === 'Connected',
        payload: true,
        database: true
      }
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting FCM status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get status',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      { status: 500 }
    )
  }
}
