import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import * as apn from 'apn'

export async function POST(request: NextRequest) {
  try {
    const { 
      title = 'Test Notification',
      body = 'This is a test notification sent to all APNs tokens',
      data = {},
      badge = 1,
      sound = 'default'
    } = await request.json()

    const payload = await getPayload({ config })

    // Get all active APNs tokens
    const tokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { isActive: { equals: true } },
          { apnsToken: { exists: true } }
        ]
      },
      limit: 100
    })

    if (tokens.docs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No APNs tokens found',
        message: 'Register some APNs tokens first'
      }, { status: 404 })
    }

    console.log(`📱 [APNs] Sending to ${tokens.docs.length} APNs tokens`)

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

    // Send to all tokens
    const apnsTokens = tokens.docs.map(token => token.apnsToken).filter(Boolean)
    const result = await apnProvider.send(notification, apnsTokens)

    const successCount = result.sent.length
    const failedCount = result.failed.length

    console.log(`📱 [APNs] Result: ${successCount} sent, ${failedCount} failed`)

    if (failedCount > 0) {
      console.error('❌ [APNs] Failed deliveries:', result.failed)
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successCount} devices`,
      sent: successCount,
      failed: failedCount,
      total: apnsTokens.length,
      failedDetails: result.failed
    })

  } catch (error) {
    console.error('❌ [APNs] Error sending to all tokens:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
