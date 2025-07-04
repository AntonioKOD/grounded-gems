import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/creators/[id]/earnings - Get creator earnings and analytics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id: creatorId } = params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Calculate date range based on period
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get creator information
    const creator = await payload.findByID({
      collection: 'users',
      id: creatorId,
      depth: 1
    })

    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { success: false, error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Get all purchases for this creator's guides
    const creatorGuides = await payload.find({
      collection: 'guides',
      where: {
        author: { equals: creatorId },
        status: { equals: 'published' }
      },
      limit: 1000
    })

    const guideIds = creatorGuides.docs.map(guide => guide.id)

    if (guideIds.length === 0) {
      // Get Stripe Connect status for creators with no guides
      let stripeConnect = {
        connected: false,
        isReady: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false
      }

      if (creator.creatorProfile?.stripeAccountId) {
        stripeConnect = {
          connected: true,
          isReady: creator.creatorProfile?.stripeAccountStatus === 'active',
          accountId: creator.creatorProfile?.stripeAccountId,
          chargesEnabled: creator.creatorProfile?.stripeAccountStatus === 'active',
          payoutsEnabled: creator.creatorProfile?.stripeAccountStatus === 'active'
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalEarnings: 0,
            monthlyEarnings: 0,
            totalSales: 0,
            monthlySales: 0,
            totalGuides: 0,
            publishedGuides: 0,
            totalViews: 0,
            monthlyViews: 0,
            averageRating: 0,
            conversionRate: 0,
            availableBalance: 0,
            pendingBalance: 0
          },
          recentSales: [],
          monthlyData: [],
          payoutInfo: {
            availableBalance: 0,
            pendingBalance: 0,
            nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            payoutMethod: creator.creatorProfile?.stripeAccountId ? 'stripe' : 'Not set',
            minimumPayout: 25
          },
          stripeConnect
        }
      })
    }

    // Get all purchases for creator's guides
    const allPurchases = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { guide: { in: guideIds } },
          { status: { equals: 'completed' } }
        ]
      },
      depth: 2,
      limit: 1000,
      sort: '-purchaseDate'
    })

    // Get purchases within the selected period
    const periodPurchases = allPurchases.docs.filter(purchase => 
      new Date(purchase.purchaseDate) >= startDate
    )

    // Calculate stats
    const totalEarnings = creator.creatorProfile.earnings?.totalEarnings || 0
    const totalSales = creator.creatorProfile.stats?.totalSales || 0
    
    const monthlyEarnings = periodPurchases.reduce((sum, purchase) => sum + purchase.creatorEarnings, 0)
    const monthlySales = periodPurchases.length

    // Calculate total views (sum from all guides)
    const totalViews = creatorGuides.docs.reduce((sum, guide) => sum + (guide.stats?.views || 0), 0)
    const monthlyViews = creatorGuides.docs.reduce((sum, guide) => sum + (guide.stats?.monthlyViews || 0), 0)

    // Calculate average rating
    const guidesWithRatings = creatorGuides.docs.filter(guide => guide.stats?.averageRating)
    const averageRating = guidesWithRatings.length > 0 
      ? guidesWithRatings.reduce((sum, guide) => sum + guide.stats.averageRating, 0) / guidesWithRatings.length
      : 0

    // Calculate conversion rate (purchases / views)
    const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0

    // Find top selling guide
    const guideEarnings = new Map()
    const guideSales = new Map()
    
    allPurchases.docs.forEach(purchase => {
      const guideId = typeof purchase.guide === 'object' ? purchase.guide.id : purchase.guide
      const guide = typeof purchase.guide === 'object' ? purchase.guide : null
      
      if (guide) {
        guideEarnings.set(guideId, (guideEarnings.get(guideId) || 0) + purchase.creatorEarnings)
        guideSales.set(guideId, (guideSales.get(guideId) || 0) + 1)
      }
    })

    let topSellingGuide = null
    let maxSales = 0
    
    for (const [guideId, sales] of guideSales.entries()) {
      if (sales > maxSales) {
        maxSales = sales
        const guide = creatorGuides.docs.find(g => g.id === guideId)
        if (guide) {
          topSellingGuide = {
            id: guideId,
            title: guide.title,
            sales: sales,
            revenue: guideEarnings.get(guideId) || 0
          }
        }
      }
    }

    // Get recent sales (last 10)
    const recentSales = allPurchases.docs.slice(0, 10).map(purchase => ({
      id: purchase.id,
      guide: {
        title: typeof purchase.guide === 'object' ? purchase.guide.title : 'Unknown Guide',
        pricing: typeof purchase.guide === 'object' ? purchase.guide.pricing : { price: purchase.amount }
      },
      amount: purchase.amount,
      creatorEarnings: purchase.creatorEarnings,
      purchaseDate: purchase.purchaseDate,
      user: {
        username: typeof purchase.user === 'object' ? purchase.user.username : 'Unknown User'
      }
    }))

    // Generate monthly data for the past 12 months
    const monthlyData = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthPurchases = allPurchases.docs.filter(purchase => {
        const purchaseDate = new Date(purchase.purchaseDate)
        return purchaseDate >= monthStart && purchaseDate <= monthEnd
      })
      
      const monthEarnings = monthPurchases.reduce((sum, purchase) => sum + purchase.creatorEarnings, 0)
      
      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        earnings: monthEarnings,
        sales: monthPurchases.length
      })
    }

    // Get creator's payout history to calculate correct balances
    const payouts = await payload.find({
      collection: 'payouts',
      where: {
        creator: { equals: creatorId }
      },
      limit: 1000
    })

    const totalPayouts = payouts.docs.reduce((sum, payout) => {
      return payout.status === 'completed' ? sum + payout.amount : sum
    }, 0)

    const pendingPayouts = payouts.docs.reduce((sum, payout) => {
      return payout.status === 'pending' || payout.status === 'processing' ? sum + payout.amount : sum
    }, 0)

    // Calculate correct available balance
    const availableBalance = Math.max(0, totalEarnings - totalPayouts - pendingPayouts)
    const pendingBalance = pendingPayouts
    const nextPayoutDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week

    // Get Stripe Connect status
    let stripeConnect = {
      connected: false,
      isReady: false,
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false
    }

    if (creator.creatorProfile?.stripeAccountId) {
      stripeConnect = {
        connected: true,
        isReady: creator.creatorProfile?.stripeAccountStatus === 'active',
        accountId: creator.creatorProfile?.stripeAccountId,
        chargesEnabled: creator.creatorProfile?.stripeAccountStatus === 'active',
        payoutsEnabled: creator.creatorProfile?.stripeAccountStatus === 'active'
      }
    }

    const response = {
      success: true,
      data: {
        stats: {
          totalEarnings,
          monthlyEarnings,
          totalSales,
          monthlySales,
          totalGuides: creatorGuides.totalDocs,
          publishedGuides: creatorGuides.docs.length,
          totalViews,
          monthlyViews: Math.round(totalViews * 0.3), // Estimate 30% of total views are monthly
          averageRating,
          conversionRate,
          availableBalance,
          pendingBalance,
          topSellingGuide
        },
        recentSales,
        monthlyData,
        payoutInfo: {
          availableBalance,
          pendingBalance,
          nextPayoutDate: nextPayoutDate.toISOString(),
          payoutMethod: creator.creatorProfile?.stripeAccountId ? 'stripe' : 'Not set',
          minimumPayout: 25
        },
        stripeConnect
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching creator earnings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch earnings data' },
      { status: 500 }
    )
  }
} 