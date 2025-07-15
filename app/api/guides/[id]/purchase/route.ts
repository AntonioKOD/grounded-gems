import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
}) : null

// Platform commission rates
const PLATFORM_COMMISSION_RATE = 0.15 // 15% platform fee
const STRIPE_FEE_RATE = 0.029 // 2.9% + $0.30
const STRIPE_FIXED_FEE = 0.30

// POST /api/guides/[id]/purchase - Purchase a guide with Stripe payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if Stripe is available for paid guides
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is temporarily unavailable' },
        { status: 503 }
      )
    }

    const payload = await getPayload({ config })
    const { id: guideId } = await params
    const { 
      amount, 
      paymentMethodId, 
      userId,
      paymentType = 'stripe' // 'stripe', 'free', or 'pwyw'
    } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    // Get the guide and creator information
    const guide = await payload.findByID({
      collection: 'guides',
      id: guideId,
      depth: 2
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
    
    // Get the user information
    const user = await payload.findByID({
      collection: 'users',
      id: userId
    })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Handle free guides
    if (guide.pricing?.type === 'free') {
      const purchase = await payload.create({
        collection: 'guide-purchases',
        data: {
          user: userId,
          guide: guideId,
          amount: 0,
          currency: 'USD',
          paymentMethod: 'free',
          status: 'completed',
          platformFee: 0,
          creatorEarnings: 0,
          stripeFee: 0
        }
      })
      
      return NextResponse.json({
        success: true,
        purchase,
        message: 'Free guide added to your library!'
      })
    }
    
    // Validate payment amount for paid guides
    const expectedAmount = guide.pricing?.type === 'paid' ? guide.pricing.price : amount
    
    if (guide.pricing?.type === 'paid' && amount !== expectedAmount) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment amount' },
        { status: 400 }
      )
    }
    
    if (!expectedAmount || expectedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment amount' },
        { status: 400 }
      )
    }
    
    // Calculate fees and earnings
    const totalAmount = expectedAmount * 100 // Convert to cents
    const stripeFee = Math.round(totalAmount * STRIPE_FEE_RATE + STRIPE_FIXED_FEE * 100)
    const platformFee = Math.round(totalAmount * PLATFORM_COMMISSION_RATE)
    const creatorEarnings = totalAmount - stripeFee - platformFee
    
    let paymentIntent
    let transactionId
    
    // Process Stripe payment for paid guides
    if (paymentType === 'stripe' && paymentMethodId) {
      try {
        // Create payment intent with application fee for platform commission
        paymentIntent = await stripe.paymentIntents.create({
          amount: totalAmount,
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            guideId,
            userId,
            creatorId: typeof guide.author === 'object' ? guide.author.id : guide.author,
            platformFee: platformFee.toString(),
            creatorEarnings: creatorEarnings.toString()
          },
          description: `Purchase of guide: ${guide.title}`,
          receipt_email: user.email
        })
        
        transactionId = paymentIntent.id
        
        if (paymentIntent.status !== 'succeeded') {
          return NextResponse.json(
            { success: false, error: 'Payment failed' },
            { status: 400 }
          )
        }
      } catch (stripeError: any) {
        console.error('Stripe payment error:', stripeError)
        return NextResponse.json(
          { success: false, error: stripeError.message || 'Payment processing failed' },
          { status: 400 }
        )
      }
    }
    
    // Create the purchase record
    const purchase = await payload.create({
      collection: 'guide-purchases',
      data: {
        user: userId,
        guide: guideId,
        amount: expectedAmount,
        currency: 'USD',
        paymentMethod: paymentType,
        transactionId,
        status: 'completed',
        platformFee: platformFee / 100, // Convert back to dollars
        creatorEarnings: creatorEarnings / 100,
        stripeFee: stripeFee / 100,
        paymentIntentId: paymentIntent?.id
      }
    })
    
    // Update creator earnings
    const creatorId = typeof guide.author === 'object' ? guide.author.id : guide.author
    if (creatorId && creatorEarnings > 0) {
      try {
        const creator = await payload.findByID({
          collection: 'users',
          id: creatorId
        })
        
        if (creator?.creatorProfile) {
          const currentEarnings = creator.creatorProfile.earnings || {}
          const currentStats = creator.creatorProfile.stats || {}
          const newTotalEarnings = (currentEarnings.totalEarnings || 0) + (creatorEarnings / 100)
          const newAvailableBalance = (currentEarnings.availableBalance || 0) + (creatorEarnings / 100)
          const newTotalSales = (currentStats.totalSales || 0) + 1
          
          await payload.update({
            collection: 'users',
            id: creatorId,
            data: {
              creatorProfile: {
                ...creator.creatorProfile,
                earnings: {
                  ...currentEarnings,
                  totalEarnings: newTotalEarnings,
                  availableBalance: newAvailableBalance
                },
                stats: {
                  ...currentStats,
                  totalSales: newTotalSales,
                  totalEarnings: newTotalEarnings
                }
              }
            }
          })
        }
      } catch (error) {
        console.error('Error updating creator earnings:', error)
        // Don't fail the purchase if this update fails
      }
    }
    
    // Update guide stats
    try {
      const currentGuide = await payload.findByID({
        collection: 'guides',
        id: guideId
      })
      
      if (currentGuide) {
        const currentStats = currentGuide.stats || {}
        await payload.update({
          collection: 'guides',
          id: guideId,
          data: {
            stats: {
              ...currentStats,
              purchases: (currentStats.purchases || 0) + 1,
              revenue: (currentStats.revenue || 0) + expectedAmount
            }
          }
        })
      }
    } catch (error) {
      console.error('Error updating guide stats:', error)
    }
    
    // Create notification for creator
    if (creatorId && creatorId !== userId) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: creatorId,
            type: 'guide_purchased',
            title: 'Guide Purchased! 🎉',
            message: `Someone just purchased your guide "${guide.title}" for $${expectedAmount}. You earned $${(creatorEarnings / 100).toFixed(2)}!`,
            priority: 'high',
            relatedTo: {
              relationTo: 'guides',
              value: guideId
            }
          }
        })
      } catch (error) {
        console.error('Error creating notification:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      purchase,
      paymentIntent: paymentIntent ? {
        id: paymentIntent.id,
        status: paymentIntent.status
      } : null,
      breakdown: {
        totalAmount: expectedAmount,
        platformFee: platformFee / 100,
        stripeFee: stripeFee / 100,
        creatorEarnings: creatorEarnings / 100
      },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id: guideId } = await params
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