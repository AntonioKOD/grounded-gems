import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription, userAgent } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: 'Invalid subscription data' }, { status: 400 })
    }

    // Store the push subscription
    const subscriptionData = {
      user: user.id,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      createdAt: new Date(),
      isActive: true
    }

    // Check if subscription already exists
    const existingSubscription = await payload.find({
      collection: 'push-subscriptions',
      where: {
        endpoint: { equals: subscription.endpoint }
      }
    })

    if (existingSubscription.docs.length > 0 && existingSubscription.docs[0]?.id) {
      // Update existing subscription
      await payload.update({
        collection: 'push-subscriptions',
        id: existingSubscription.docs[0].id,
        data: {
          keys: subscription.keys,
          userAgent,
          lastSeen: new Date(),
          isActive: true
        }
      })
    } else {
      // Create new subscription
      await payload.create({
        collection: 'push-subscriptions',
        data: subscriptionData
      })
    }

    return NextResponse.json({ success: true, message: 'Push subscription registered' })
  } catch (error) {
    console.error('Error registering push subscription:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to register subscription' },
      { status: 500 }
    )
  }
}
