import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendFCMMessage } from '@/lib/firebase-admin'
import * as apn from 'apn'

export async function POST(request: NextRequest) {
  try {
    const { 
      deviceToken,
      title,
      body,
      data = {},
      badge = 1,
      sound = 'default',
      platform = 'ios'
    } = await request.json()

    if (!deviceToken || !title || !body) {
      return NextResponse.json(
        { error: 'deviceToken, title, and body are required' },
        { status: 400 }
      )
    }

    console.log('🚀 [Hybrid] Attempting to send notification:', {
      deviceToken: deviceToken.substring(0, 20) + '...',
      title,
      body,
      platform
    })

    // Try Firebase FCM first
    if (platform === 'ios' || platform === 'android') {
      try {
        console.log('🔥 [Hybrid] Trying Firebase FCM...')
        const fcmResult = await sendFCMMessage(
          deviceToken,
          { title, body },
          data,
          {
            payload: {
              aps: {
                badge,
                sound,
                'content-available': 1
              }
            }
          }
        )

        if (fcmResult.success) {
          console.log('✅ [Hybrid] Firebase FCM successful')
          return NextResponse.json({
            success: true,
            method: 'firebase_fcm',
            message: 'Notification sent via Firebase FCM',
            result: fcmResult
          })
        } else {
          console.log('⚠️ [Hybrid] Firebase FCM failed, trying APNs...')
        }
      } catch (fcmError) {
        console.log('⚠️ [Hybrid] Firebase FCM error, trying APNs:', fcmError instanceof Error ? fcmError.message : 'Unknown error')
      }
    }

    // Fallback to APNs for iOS
    if (platform === 'ios') {
      try {
        console.log('📱 [Hybrid] Trying APNs...')
        
        // Configure APNs
        const apnProvider = new apn.Provider({
          token: {
            key: process.env.APN_KEY_PATH || '/Users/antoniokodheli/sacavia/AuthKey_VYNFGZAT99.p8',
            keyId: process.env.APN_KEY_ID || 'VYNFGZAT99',
            teamId: process.env.APN_TEAM_ID || 'WAWJ7L538T'
          },
          production: true
        })

        // Create notification
        const notification = new apn.Notification()
        notification.alert = { title, body }
        notification.badge = badge
        notification.sound = sound
        notification.topic = process.env.APN_BUNDLE_ID || 'com.sacavia.app'
        notification.payload = data

        const result = await apnProvider.send(notification, deviceToken)
        
        if (result.failed.length > 0) {
          console.error('❌ [Hybrid] APNs failed:', result.failed)
          return NextResponse.json({
            success: false,
            method: 'apns',
            error: 'APNs delivery failed',
            details: result.failed
          }, { status: 500 })
        }

        console.log('✅ [Hybrid] APNs successful')
        return NextResponse.json({
          success: true,
          method: 'apns',
          message: 'Notification sent via APNs',
          result: result.sent
        })

      } catch (apnsError) {
        console.error('❌ [Hybrid] APNs error:', apnsError)
        return NextResponse.json({
          success: false,
          method: 'apns',
          error: 'APNs error',
          details: apnsError instanceof Error ? apnsError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'No suitable delivery method available',
      details: 'Both Firebase FCM and APNs failed'
    }, { status: 500 })

  } catch (error) {
    console.error('❌ [Hybrid] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
