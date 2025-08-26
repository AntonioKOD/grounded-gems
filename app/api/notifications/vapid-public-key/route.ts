import { NextResponse } from 'next/server'

// VAPID keys for web push notifications
// In production, these should be stored in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLJSx5x2nt-UvZwuThlCklpYc7jJYuNo6HV3-1YzJXhq4k0v_Qykhtc2WwrU4YNYBF_9GaJKFGFREfwew6Mr3Zk'

export async function GET() {
  try {
    return NextResponse.json({
      publicKey: VAPID_PUBLIC_KEY
    })
  } catch (error) {
    console.error('Error providing VAPID public key:', error)
    return NextResponse.json(
      { error: 'Failed to provide VAPID key' },
      { status: 500 }
    )
  }
}
