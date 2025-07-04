import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// POST /api/test/creator-earnings - Generate test earnings data for testing
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { userId, testGuideTitle = 'Test Guide', testAmount = 29.99 } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get the user
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

    if (!user.isCreator && user.role !== 'creator') {
      return NextResponse.json(
        { success: false, error: 'User is not a creator' },
        { status: 400 }
      )
    }

    // Calculate earnings breakdown (similar to real purchase)
    const totalAmount = testAmount * 100 // Convert to cents
    const stripeFee = Math.round(totalAmount * 0.029 + 30) // 2.9% + $0.30
    const platformFee = Math.round(totalAmount * 0.15) // 15% platform fee
    const creatorEarnings = totalAmount - stripeFee - platformFee

    // Create a test guide purchase
    const testPurchase = await payload.create({
      collection: 'guide-purchases',
      data: {
        user: userId, // Self-purchase for testing
        guide: null, // Will create a dummy guide reference
        amount: testAmount,
        currency: 'USD',
        paymentMethod: 'stripe',
        transactionId: `test_${Date.now()}`,
        status: 'completed',
        platformFee: platformFee / 100,
        creatorEarnings: creatorEarnings / 100,
        stripeFee: stripeFee / 100,
        purchaseDate: new Date().toISOString()
      }
    })

    // Update creator's earnings
    const currentEarnings = user.creatorProfile?.earnings || {}
    const currentStats = user.creatorProfile?.stats || {}
    const newTotalEarnings = (currentEarnings.totalEarnings || 0) + (creatorEarnings / 100)
    const newAvailableBalance = (currentEarnings.availableBalance || 0) + (creatorEarnings / 100)
    const newTotalSales = (currentStats.totalSales || 0) + 1

    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        creatorProfile: {
          ...user.creatorProfile,
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

    // Create notification for the creator
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: userId,
        type: 'guide_purchased',
        title: '🧪 Test Purchase Created!',
        message: `Test purchase for "${testGuideTitle}" created successfully. You earned $${(creatorEarnings / 100).toFixed(2)}! This is test data for development.`,
        priority: 'normal',
        read: false,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Test earnings data created successfully!',
      testPurchase: {
        id: testPurchase.id,
        amount: testAmount,
        creatorEarnings: creatorEarnings / 100,
        platformFee: platformFee / 100,
        stripeFee: stripeFee / 100
      },
      newBalances: {
        totalEarnings: newTotalEarnings,
        availableBalance: newAvailableBalance,
        totalSales: newTotalSales
      }
    })

  } catch (error) {
    console.error('Error creating test earnings data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create test data' },
      { status: 500 }
    )
  }
} 