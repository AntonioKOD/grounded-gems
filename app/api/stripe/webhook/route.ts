import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'
import Stripe from 'stripe'

// Disable body parsing for Stripe webhook signature verification
export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
}) : null

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  // Check if Stripe is available
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    )
  }

  const payload = await getPayload({ config: payloadConfig })
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()

  let event: Stripe.Event

  try {
    if (endpointSecret) {
      // Production: verify webhook signature
      if (!sig) {
        throw new Error('Missing stripe-signature header')
      }
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } else {
      // Development: skip signature verification
      console.log('⚠️  Development mode: Skipping webhook signature verification')
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, payload)
        break
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, payload)
        break
        
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute, payload)
        break
        
      case 'checkout.session.completed':
        await handleContestCheckoutCompleted(event.data.object as Stripe.Checkout.Session, payload)
        break
        
      case 'invoice.payment_succeeded':
        // Handle subscription payments if needed
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, payload: any) {
  try {
    // Find the purchase record by payment intent ID
    const purchases = await payload.find({
      collection: 'guide-purchases',
      where: {
        paymentIntentId: { equals: paymentIntent.id }
      },
      limit: 1
    })

    if (purchases.docs.length === 0) {
      console.error('Purchase not found for payment intent:', paymentIntent.id)
      return
    }

    const purchase = purchases.docs[0]

    // Update purchase status to completed
    await payload.update({
      collection: 'guide-purchases',
      id: purchase.id,
      data: {
        status: 'completed',
        transactionId: paymentIntent.id,
      }
    })

    // Get guide and creator information
    const guide = await payload.findByID({
      collection: 'guides',
      id: purchase.guide,
      depth: 1
    })

    if (guide && guide.author) {
      const creatorId = typeof guide.author === 'object' ? guide.author.id : guide.author
      
      // Update creator earnings
      const creator = await payload.findByID({
        collection: 'users',
        id: creatorId
      })

              if (creator?.creatorProfile) {
          const currentEarnings = creator.creatorProfile.earnings || {}
          const currentStats = creator.creatorProfile.stats || {}
          const newTotalEarnings = (currentEarnings.totalEarnings || 0) + purchase.creatorEarnings
          const newAvailableBalance = (currentEarnings.availableBalance || 0) + purchase.creatorEarnings
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

      // Send notification to creator
      await payload.create({
        collection: 'notifications',
        data: {
          recipient: creatorId,
          type: 'guide_purchased',
          title: 'Guide Purchased! 🎉',
          message: `Your guide "${guide.title}" was purchased for $${purchase.amount}. You earned $${purchase.creatorEarnings}!`,
          priority: 'high',
          relatedTo: {
            relationTo: 'guides',
            value: guide.id
          }
        }
      })
    }

    // Update guide stats
    await payload.update({
      collection: 'guides',
      id: purchase.guide,
      data: {
        'stats.purchases': (guide.stats?.purchases || 0) + 1,
        'stats.revenue': (guide.stats?.revenue || 0) + purchase.amount
      }
    })

    console.log('Payment succeeded for purchase:', purchase.id)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, payload: any) {
  try {
    // Find the purchase record by payment intent ID
    const purchases = await payload.find({
      collection: 'guide-purchases',
      where: {
        paymentIntentId: { equals: paymentIntent.id }
      },
      limit: 1
    })

    if (purchases.docs.length === 0) {
      console.error('Purchase not found for failed payment intent:', paymentIntent.id)
      return
    }

    const purchase = purchases.docs[0]

    // Update purchase status to failed
    await payload.update({
      collection: 'guide-purchases',
      id: purchase.id,
      data: {
        status: 'failed',
        transactionId: paymentIntent.id,
      }
    })

    // Send notification to user about failed payment
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: purchase.user,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment for the guide purchase failed. Please try again or contact support.`,
        priority: 'high',
        relatedTo: {
          relationTo: 'guide-purchases',
          value: purchase.id
        }
      }
    })

    console.log('Payment failed for purchase:', purchase.id)
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute, payload: any) {
  try {
    const chargeId = dispute.charge as string
    
    // Find the purchase record by transaction ID (charge ID)
    const purchases = await payload.find({
      collection: 'guide-purchases',
      where: {
        transactionId: { equals: chargeId }
      },
      limit: 1
    })

    if (purchases.docs.length === 0) {
      console.error('Purchase not found for disputed charge:', chargeId)
      return
    }

    const purchase = purchases.docs[0]

    // Update purchase with dispute information
    await payload.update({
      collection: 'guide-purchases',
      id: purchase.id,
      data: {
        status: 'disputed',
        // Add dispute fields if needed
      }
    })

    // Get guide information
    const guide = await payload.findByID({
      collection: 'guides',
      id: purchase.guide,
      depth: 1
    })

    if (guide && guide.author) {
      const creatorId = typeof guide.author === 'object' ? guide.author.id : guide.author
      
      // Notify creator about dispute
      await payload.create({
        collection: 'notifications',
        data: {
          recipient: creatorId,
          type: 'payment_disputed',
          title: 'Payment Disputed',
          message: `A payment for your guide "${guide.title}" has been disputed. Reason: ${dispute.reason}`,
          priority: 'high',
          relatedTo: {
            relationTo: 'guides',
            value: guide.id
          }
        }
      })
    }

    // Notify admin about dispute
    const admins = await payload.find({
      collection: 'users',
      where: {
        role: { equals: 'admin' }
      }
    })

    for (const admin of admins.docs) {
      await payload.create({
        collection: 'notifications',
        data: {
          recipient: admin.id,
          type: 'payment_disputed',
          title: 'Payment Dispute Created',
          message: `A payment dispute was created for guide purchase ${purchase.id}. Amount: $${dispute.amount / 100}`,
          priority: 'high',
          relatedTo: {
            relationTo: 'guide-purchases',
            value: purchase.id
          }
        }
      })
    }

    console.log('Dispute created for purchase:', purchase.id)
  } catch (error) {
    console.error('Error handling dispute:', error)
  }
}

async function handleContestCheckoutCompleted(session: Stripe.Checkout.Session, payload: any) {
  try {
    // Only process paid sessions
    if (session.payment_status !== 'paid') {
      console.log('Contest checkout session not paid:', session.id, 'Status:', session.payment_status)
      return
    }

    // Extract metadata
    const { experienceId, userId, type } = session.metadata || {}
    
    if (!experienceId || !userId || type !== 'contest_entry') {
      console.log('Contest checkout session missing required metadata:', session.id, session.metadata)
      return
    }

    console.log('🎯 Processing contest checkout completion:', {
      sessionId: session.id,
      experienceId,
      userId,
      amount: session.amount_total,
      currency: session.currency
    })

    // Check if experience is already contest eligible (idempotency)
    const experience = await payload.findByID({
      collection: 'experiences',
      id: experienceId
    })

    if (!experience) {
      console.error('❌ Experience not found for contest checkout:', experienceId)
      return
    }

    if (experience.contestEligible) {
      console.log('✅ Experience already contest eligible, skipping update:', experienceId)
      return
    }

    // Update experience to contest eligible
    await payload.update({
      collection: 'experiences',
      id: experienceId,
      data: {
        contestEligible: true,
        status: 'PUBLISHED'
      }
    })

    console.log('✅ Experience updated to contest eligible:', experienceId)

    // Log payment record (minimal since no payments collection exists)
    const paymentRecord = {
      userId,
      experienceId,
      provider: 'stripe',
      providerRef: session.id,
      amount: session.amount_total,
      currency: session.currency,
      status: 'succeeded',
      type: 'contest_entry',
      createdAt: new Date().toISOString()
    }

    console.log('💰 Payment record logged:', paymentRecord)

    // Send notification to user about successful contest entry
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: userId,
        type: 'contest_entry_success',
        title: 'Contest Entry Successful! 🏆',
        message: `Your experience "${experience.title}" has been successfully entered into contests!`,
        priority: 'high',
        relatedTo: {
          relationTo: 'experiences',
          value: experienceId
        }
      }
    })

    console.log('✅ Contest checkout completed successfully for experience:', experienceId)

  } catch (error) {
    console.error('❌ Error handling contest checkout completion:', error)
    throw error // Re-throw to trigger webhook failure response
  }
} 