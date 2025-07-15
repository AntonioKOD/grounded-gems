import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/admin/platform-revenue - Get platform revenue statistics
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y, all
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    let dateFilter = {}
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          greater_than: startDate,
          less_than: endDate
        }
      }
    } else if (period !== 'all') {
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
      }
      
      dateFilter = {
        createdAt: {
          greater_than: startDate.toISOString()
        }
      }
    }

    // Get all completed purchases
    const purchases = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { status: { equals: 'completed' } },
          dateFilter
        ]
      },
      limit: 1000, // Get all purchases for the period
      populate: { guide: {}, 'guide.creator': {} }
    })

    // Calculate revenue statistics
    let totalRevenue = 0
    let totalPlatformFees = 0
    let totalStripeFees = 0
    let totalCreatorEarnings = 0
    let totalPurchases = purchases.docs.length
    let uniqueCreators = new Set()
    let uniqueBuyers = new Set()
    let revenueByMonth: { [key: string]: number } = {}
    let topSellingGuides: { [key: string]: any } = {}
    let topEarningCreators: { [key: string]: any } = {}

    purchases.docs.forEach(purchase => {
      const amount = purchase.amount || 0
      const platformFee = purchase.platformFee || 0
      const stripeFee = purchase.stripeFee || 0
      const creatorEarnings = purchase.creatorEarnings || 0

      totalRevenue += amount
      totalPlatformFees += platformFee
      totalStripeFees += stripeFee
      totalCreatorEarnings += creatorEarnings

      // Track unique creators and buyers
      if (purchase.guide?.creator) {
        uniqueCreators.add(purchase.guide.creator.id)
      }
      uniqueBuyers.add(purchase.user)

      // Track revenue by month
      const purchaseDate = new Date(purchase.createdAt)
      const monthKey = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}`
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + amount

      // Track top selling guides
      if (purchase.guide?.id) {
        if (!topSellingGuides[purchase.guide.id]) {
          topSellingGuides[purchase.guide.id] = {
            id: purchase.guide.id,
            title: purchase.guide.title,
            creator: purchase.guide.creator?.name || 'Unknown',
            sales: 0,
            revenue: 0
          }
        }
        topSellingGuides[purchase.guide.id].sales += 1
        topSellingGuides[purchase.guide.id].revenue += amount
      }

      // Track top earning creators
      if (purchase.guide?.creator?.id) {
        if (!topEarningCreators[purchase.guide.creator.id]) {
          topEarningCreators[purchase.guide.creator.id] = {
            id: purchase.guide.creator.id,
            name: purchase.guide.creator.name || 'Unknown',
            earnings: 0,
            sales: 0
          }
        }
        topEarningCreators[purchase.guide.creator.id].earnings += creatorEarnings
        topEarningCreators[purchase.guide.creator.id].sales += 1
      }
    })

    // Convert to arrays and sort
    const topSellingGuidesArray = Object.values(topSellingGuides)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)

    const topEarningCreatorsArray = Object.values(topEarningCreators)
      .sort((a: any, b: any) => b.earnings - a.earnings)
      .slice(0, 10)

    // Get monthly revenue data for chart
    const monthlyRevenueArray = Object.entries(revenueByMonth)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate conversion rates and averages
    const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0
    const platformMargin = totalRevenue > 0 ? (totalPlatformFees / totalRevenue) * 100 : 0
    const netRevenue = totalPlatformFees - totalStripeFees

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalPlatformFees,
          totalStripeFees,
          totalCreatorEarnings,
          netRevenue,
          totalPurchases,
          uniqueCreators: uniqueCreators.size,
          uniqueBuyers: uniqueBuyers.size,
          averageOrderValue,
          platformMargin: platformMargin.toFixed(2)
        },
        topSellingGuides: topSellingGuidesArray,
        topEarningCreators: topEarningCreatorsArray,
        monthlyRevenue: monthlyRevenueArray,
        period,
        startDate: startDate || null,
        endDate: endDate || null
      }
    })

  } catch (error) {
    console.error('Error fetching platform revenue:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch platform revenue' },
      { status: 500 }
    )
  }
} 