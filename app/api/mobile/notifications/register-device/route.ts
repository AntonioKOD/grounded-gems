import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getServerSideUser } from '@/lib/auth-server'

// POST /api/mobile/notifications/register-device - Register device for push notifications
export async function POST(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { deviceToken, platform, appVersion } = body

    if (!deviceToken) {
      return NextResponse.json({ success: false, error: 'Device token is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Check if device is already registered
    const existingDevice = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { deviceToken: { equals: deviceToken } },
          { user: { equals: user.id } }
        ]
      }
    })

    if (existingDevice.docs.length > 0) {
      // Update existing device
      const device = existingDevice.docs[0]
      await payload.update({
        collection: 'deviceTokens',
        id: device?.id || '',
        data: {
          platform: platform || 'ios',
          appVersion: appVersion || '1.0',
          lastSeen: new Date().toISOString(),
          isActive: true
        }
      })
    } else {
      // Register new device
      await payload.create({
        collection: 'deviceTokens',
        data: {
          deviceToken,
          user: user.id,
          platform: platform || 'ios',
          appVersion: appVersion || '1.0',
          isActive: true
        }
      })
    }

    return NextResponse.json({ success: true, message: 'Device registered successfully' })
  } catch (error) {
    console.error('Error registering device:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to register device',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/mobile/notifications/register-device - Unregister device
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const deviceToken = searchParams.get('deviceToken')

    if (!deviceToken) {
      return NextResponse.json({ success: false, error: 'Device token is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Find and deactivate device
    const existingDevice = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { deviceToken: { equals: deviceToken } },
          { user: { equals: user.id } }
        ]
      }
    })

    if (existingDevice.docs.length > 0) {
      await payload.update({
        collection: 'deviceTokens',
        id: existingDevice.docs[0]?.id || '',
        data: {
          isActive: false,
          unregisteredAt: new Date().toISOString()
        }
      })
    }

    return NextResponse.json({ success: true, message: 'Device unregistered successfully' })
  } catch (error) {
    console.error('Error unregistering device:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to unregister device',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 