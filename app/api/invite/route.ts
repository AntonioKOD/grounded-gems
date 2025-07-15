import { NextRequest, NextResponse } from 'next/server'

// In-memory notifications for demo
let notifications: any[] = []

export async function POST(req: NextRequest) {
  try {
    const { planId, to } = await req.json()
    // Mock: Add a notification for the user
    notifications.push({
      to,
      planId,
      type: 'invite',
      message: `You have been invited to join a Gem Journey (plan ${planId})`,
      date: new Date().toISOString()
    })
    console.log(`Notification sent to ${to} for plan ${planId}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
} 