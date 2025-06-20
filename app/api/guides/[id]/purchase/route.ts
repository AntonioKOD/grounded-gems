import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// POST /api/guides/[id]/purchase - Purchase a guide
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id: guideId } = params
    const { amount, paymentMethod = 'free', transactionId } = await request.json()
    
    // TODO: Add authentication to get current user
    // For now, we'll assume user ID is passed in the request
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    // Get the guide to check pricing
    const guide = await payload.findByID({
      collection: 'guides',
      id: guideId
    })
    
    if (!guide || guide.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Guide not found or not available' },
        { status: 404 }
      )
    }
    
    // Check if user already purchased this guide
    const existingPurchase = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { user: { equals: userId } },
          { guide: { equals: guideId } },
          { status: { equals: 'completed' } }
        ]
      },
      limit: 1
    })
    
    if (existingPurchase.docs.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You have already purchased this guide' },
        { status: 400 }
      )
    }
    
    // Validate payment amount
    const expectedAmount = guide.pricing?.type === 'free' ? 0 : 
                          guide.pricing?.type === 'paid' ? guide.pricing.price : 
                          amount // For pay-what-you-want
    
    if (guide.pricing?.type === 'paid' && amount !== expectedAmount) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment amount' },
        { status: 400 }
      )
    }
    
    // Create the purchase record
    const purchase = await payload.create({
      collection: 'guide-purchases',
      data: {
        user: userId,
        guide: guideId,
        amount: amount || 0,
        currency: 'USD',
        paymentMethod,
        transactionId,
        status: 'completed' // For free guides or after payment verification
      }
    })
    
    return NextResponse.json({
      success: true,
      purchase,
      message: 'Guide purchased successfully!'
    })
    
  } catch (error) {
    console.error('Error purchasing guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to purchase guide' },
      { status: 500 }
    )
  }
}

// GET /api/guides/[id]/purchase - Check if user has purchased this guide
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id: guideId } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }
    
    // Check if user has purchased this guide
    const purchase = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { user: { equals: userId } },
          { guide: { equals: guideId } },
          { status: { equals: 'completed' } }
        ]
      },
      limit: 1
    })
    
    const hasPurchased = purchase.docs.length > 0
    
    return NextResponse.json({
      success: true,
      hasPurchased,
      purchase: hasPurchased ? purchase.docs[0] : null
    })
    
  } catch (error) {
    console.error('Error checking purchase status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check purchase status' },
      { status: 500 }
    )
  }
} 