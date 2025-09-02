import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import * as apn from 'apn'

export async function POST(request: NextRequest) {
  try {
    const { 
      deviceToken,
      title,
      body,
      data = {},
      badge = 1,
      sound = 'default'
    } = await request.json()

    if (!deviceToken || !title || !body) {
      return NextResponse.json(
        { error: 'deviceToken, title, and body are required' },
        { status: 400 }
      )
    }

    // Configure APNs
    const apnProvider = new apn.Provider({
      token: {
        key: process.env.APN_KEY_PATH || '/Users/antoniokodheli/sacavia/AuthKey_VYNFGZAT99.p8',
        keyId: process.env.APN_KEY_ID || 'VYNFGZAT99',
        teamId: process.env.APN_TEAM_ID || 'WAWJ7L538T'
      },
      production: true // Force production mode since APNs key is for production
    })

    // Create notification
    const notification = new apn.Notification()
    notification.alert = {
      title: title,
      body: body
    }
    notification.badge = badge
    notification.sound = sound
    notification.topic = process.env.APN_BUNDLE_ID || 'com.sacavia.app'
    notification.payload = data

    console.log('📱 [APNs] Sending notification:', {
      deviceToken: deviceToken.substring(0, 20) + '...',
      title,
      body,
      bundleId: process.env.APN_BUNDLE_ID
    })

    try {
      const result = await apnProvider.send(notification, deviceToken)
      
      if (result.failed.length > 0) {
        console.error('❌ [APNs] Failed to send:', result.failed)
        return NextResponse.json({
          success: false,
          error: 'APNs delivery failed',
          details: result.failed
        }, { status: 500 })
      }

      console.log('✅ [APNs] Notification sent successfully')
      return NextResponse.json({
        success: true,
        message: 'APNs notification sent successfully',
        result: result.sent
      })

    } catch (apnsError) {
      console.error('❌ [APNs] Error sending notification:', apnsError)
      return NextResponse.json({
        success: false,
        error: 'APNs error',
        details: apnsError instanceof Error ? apnsError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ [APNs] Unexpected error:', error)
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
