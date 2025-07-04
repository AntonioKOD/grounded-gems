import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
}) : null

// POST /api/creators/[id]/payout - Request a payout
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id: creatorId } = await params
    const { amount, payoutMethod = 'stripe' } = await request.json()

    // Get the creator
    const creator = await payload.findByID({
      collection: 'users',
      id: creatorId
    })

    if (!creator) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Check if creator has enough available balance
    const availableBalance = creator.creatorProfile?.earnings?.availableBalance || 0
    const minimumPayout = 25 // $25 minimum payout

    if (amount < minimumPayout) {
      return NextResponse.json(
        { success: false, error: `Minimum payout amount is $${minimumPayout}` },
        { status: 400 }
      )
    }

    if (amount > availableBalance) {
      return NextResponse.json(
        { success: false, error: 'Insufficient available balance' },
        { status: 400 }
      )
    }

    // Check if creator has Stripe Connect account set up
    if (payoutMethod === 'stripe' && !creator.creatorProfile?.stripeAccountId) {
      return NextResponse.json(
        { success: false, error: 'Stripe account not connected. Please set up your payout method first.' },
        { status: 400 }
      )
    }

    let payoutTransaction

    if (payoutMethod === 'stripe' && stripe) {
      try {
        // Create transfer to creator's Stripe Connect account
        const transfer = await stripe.transfers.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          destination: creator.creatorProfile.stripeAccountId,
          description: `Payout for ${creator.name || creator.username}`,
          metadata: {
            creatorId,
            payoutType: 'creator_earnings'
          }
        })

        payoutTransaction = {
          id: transfer.id,
          amount: amount,
          currency: 'usd',
          status: transfer.status,
          method: 'stripe',
          transferId: transfer.id
        }

      } catch (stripeError: any) {
        console.error('Stripe payout error:', stripeError)
        return NextResponse.json(
          { success: false, error: stripeError.message || 'Payout processing failed' },
          { status: 400 }
        )
      }
    } else {
      // For other payout methods (PayPal, bank transfer, etc.)
      payoutTransaction = {
        id: `manual_${Date.now()}`,
        amount: amount,
        currency: 'usd',
        status: 'pending',
        method: payoutMethod,
        notes: 'Manual payout - will be processed within 3-5 business days'
      }
    }

    // Create payout record
    const payout = await payload.create({
      collection: 'payouts',
      data: {
        creator: creatorId,
        amount: amount,
        currency: 'usd',
        method: payoutMethod,
        status: payoutTransaction.status,
        transactionId: payoutTransaction.id,
        stripeTransferId: payoutTransaction.transferId,
        notes: payoutTransaction.notes,
        processedAt: payoutTransaction.status === 'paid' ? new Date().toISOString() : null
      }
    })

    // Update creator's balance in their profile
    const currentEarnings = creator.creatorProfile?.earnings || {}
    const newAvailableBalance = Math.max(0, availableBalance - amount)
    const newPendingBalance = (currentEarnings.pendingBalance || 0) + amount
    const newTotalPayouts = (currentEarnings.totalPayouts || 0) + amount

    await payload.update({
      collection: 'users',
      id: creatorId,
      data: {
        creatorProfile: {
          ...creator.creatorProfile,
          earnings: {
            ...currentEarnings,
            availableBalance: newAvailableBalance,
            pendingBalance: newPendingBalance,
            lastPayoutDate: new Date().toISOString(),
            totalPayouts: newTotalPayouts
          }
        }
      }
    })

    // Create notification for creator
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: creatorId,
        type: 'payout_requested',
        title: 'Payout Requested! 💰',
        message: `Your payout request for $${amount} has been submitted. You'll receive it within 3-5 business days.`,
        priority: 'high',
        relatedTo: {
          relationTo: 'payouts',
          value: payout.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      payout,
      transaction: payoutTransaction,
      newBalance: {
        available: newAvailableBalance,
        pending: newPendingBalance
      },
      message: 'Payout requested successfully!'
    })

  } catch (error) {
    console.error('Error processing payout:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process payout' },
      { status: 500 }
    )
  }
}

// GET /api/creators/[id]/payout - Get payout history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id: creatorId } = await params
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get payout history
    const result = await payload.find({
      collection: 'payouts',
      where: {
        creator: { equals: creatorId }
      },
      page,
      limit,
      sort: '-createdAt'
    })

    return NextResponse.json({
      success: true,
      payouts: result.docs,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalDocs: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      }
    })

  } catch (error) {
    console.error('Error fetching payout history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payout history' },
      { status: 500 }
    )
  }
} 