import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
}) : null

// POST /api/creators/[id]/stripe-connect - Create Stripe Connect account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const payload = await getPayload({ config })
    const { id: creatorId } = await params
    const { returnUrl } = await request.json()

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

    // Check if creator already has a Stripe account
    if (creator.creatorProfile?.stripeAccountId) {
      return NextResponse.json(
        { success: false, error: 'Stripe account already connected' },
        { status: 400 }
      )
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // Default to US, can be made configurable
      email: creator.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        url: `https://sacavia.com/creators/${creator.username}`,
        mcc: '5817', // Digital goods
      },
      individual: {
        email: creator.email,
        first_name: creator.name?.split(' ')[0] || '',
        last_name: creator.name?.split(' ').slice(1).join(' ') || '',
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual', // Manual payouts
          },
        },
      },
    })

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/earnings`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/earnings`,
      type: 'account_onboarding',
    })

    // Update creator with Stripe account ID
    await payload.update({
      collection: 'users',
      id: creatorId,
      data: {
        'creatorProfile.stripeAccountId': account.id,
        'creatorProfile.stripeAccountStatus': 'pending'
      }
    })

    return NextResponse.json({
      success: true,
      accountId: account.id,
      accountLink: accountLink.url,
      message: 'Stripe Connect account created successfully'
    })

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create Stripe Connect account' },
      { status: 500 }
    )
  }
}

// GET /api/creators/[id]/stripe-connect - Get Stripe Connect account status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const payload = await getPayload({ config })
    const { id: creatorId } = await params

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

    if (!creator.creatorProfile?.stripeAccountId) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'No Stripe account connected'
      })
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(creator.creatorProfile.stripeAccountId)

    // Check if account is ready for payouts
    const isReady = account.charges_enabled && account.payouts_enabled

    // Update creator's Stripe account status
    if (isReady && creator.creatorProfile.stripeAccountStatus !== 'active') {
      await payload.update({
        collection: 'users',
        id: creatorId,
        data: {
          'creatorProfile.stripeAccountStatus': 'active'
        }
      })
    }

    return NextResponse.json({
      success: true,
      connected: true,
      accountId: account.id,
      isReady,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
      accountStatus: isReady ? 'active' : 'pending'
    })

  } catch (error) {
    console.error('Error getting Stripe Connect account status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get Stripe Connect account status' },
      { status: 500 }
    )
  }
} 