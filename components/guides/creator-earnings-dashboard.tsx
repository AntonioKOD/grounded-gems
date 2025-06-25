'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Star,
  Calendar,
  Download,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface CreatorStats {
  totalEarnings: number
  monthlyEarnings: number
  totalSales: number
  monthlySales: number
  totalGuides: number
  publishedGuides: number
  totalViews: number
  monthlyViews: number
  averageRating: number
  conversionRate: number
  availableBalance: number
  pendingBalance: number
  topSellingGuide?: {
    id: string
    title: string
    sales: number
    revenue: number
  }
}

interface StripeConnectStatus {
  connected: boolean
  isReady: boolean
  accountId?: string
  accountLink?: string
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  requirements?: any
}

interface EarningsData {
  stats: CreatorStats
  recentSales: Array<{
    id: string
    guide: {
      title: string
      pricing: { price: number }
    }
    amount: number
    creatorEarnings: number
    purchaseDate: string
    user: {
      username: string
    }
  }>
  monthlyData: Array<{
    month: string
    earnings: number
    sales: number
  }>
  payoutInfo: {
    availableBalance: number
    pendingBalance: number
    nextPayoutDate: string
    payoutMethod: string
    minimumPayout: number
  }
  stripeConnect: StripeConnectStatus
}

interface CreatorEarningsDashboardProps {
  userId: string
}

export default function CreatorEarningsDashboard({ userId }: CreatorEarningsDashboardProps) {
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [settingUpStripe, setSettingUpStripe] = useState(false)

  useEffect(() => {
    fetchEarningsData()
  }, [userId, selectedPeriod])

  const fetchEarningsData = async () => {
    try {
      const response = await fetch(`/api/creators/${userId}/earnings?period=${selectedPeriod}`)
      const data = await response.json()

      if (data.success) {
        setEarningsData(data.data)
      } else {
        toast.error('Failed to load earnings data')
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
      toast.error('Failed to load earnings data')
    } finally {
      setLoading(false)
    }
  }

  const setupStripeConnect = async () => {
    setSettingUpStripe(true)
    try {
      const response = await fetch(`/api/creators/${userId}/stripe-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href
        })
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.accountLink
      } else {
        toast.error(data.error || 'Failed to set up Stripe Connect')
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error)
      toast.error('Failed to set up Stripe Connect')
    } finally {
      setSettingUpStripe(false)
    }
  }

  const checkStripeStatus = async () => {
    try {
      const response = await fetch(`/api/creators/${userId}/stripe-connect`)
      const data = await response.json()

      if (data.success && data.connected) {
        // Update the earnings data with new Stripe status
        setEarningsData(prev => prev ? {
          ...prev,
          stripeConnect: data
        } : null)
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error)
    }
  }

  const requestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid payout amount')
      return
    }

    const amount = parseFloat(payoutAmount)
    const minimumPayout = earningsData?.payoutInfo.minimumPayout || 25

    if (amount < minimumPayout) {
      toast.error(`Minimum payout amount is $${minimumPayout}`)
      return
    }

    if (amount > (earningsData?.stats.availableBalance || 0)) {
      toast.error('Insufficient available balance')
      return
    }

    setRequestingPayout(true)
    try {
      const response = await fetch(`/api/creators/${userId}/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          payoutMethod: 'stripe'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Payout requested successfully!')
        setPayoutAmount('')
        fetchEarningsData() // Refresh data
      } else {
        toast.error(data.error || 'Failed to request payout')
      }
    } catch (error) {
      console.error('Error requesting payout:', error)
      toast.error('Failed to request payout')
    } finally {
      setRequestingPayout(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return null
    const change = ((current - previous) / previous) * 100
    const isPositive = change > 0
    
    return (
      <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!earningsData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No earnings data available</h3>
        <p className="text-gray-600">Start creating and selling guides to see your earnings here.</p>
      </div>
    )
  }

  const { stats, recentSales, monthlyData, payoutInfo, stripeConnect } = earningsData

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Creator Earnings</h2>
        <div className="flex space-x-2">
          {['7d', '30d', '90d', '1y'].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period === '7d' ? '7 days' : 
               period === '30d' ? '30 days' :
               period === '90d' ? '90 days' : '1 year'}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              {getChangeIndicator(stats.monthlyEarnings, stats.totalEarnings - stats.monthlyEarnings)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.availableBalance)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600">{formatCurrency(stats.pendingBalance)} pending</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published Guides</p>
                <p className="text-2xl font-bold">{stats.publishedGuides}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600">{stats.totalGuides} total guides</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600">{stats.conversionRate.toFixed(1)}% conversion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payout Information */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Payout Information</CardTitle>
            <CardDescription>Manage your earnings and payouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stripe Connect Status */}
            {!stripeConnect.connected ? (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Set up payouts</span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  Connect your Stripe account to receive payouts directly to your bank account.
                </p>
                <Button
                  onClick={setupStripeConnect}
                  disabled={settingUpStripe}
                  className="w-full"
                >
                  {settingUpStripe ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Stripe Account
                    </>
                  )}
                </Button>
              </div>
            ) : !stripeConnect.isReady ? (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-orange-800">Complete setup</span>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  Your Stripe account needs additional verification to receive payouts.
                </p>
                <Button
                  onClick={setupStripeConnect}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Complete Verification
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Ready for payouts</span>
                </div>
                <p className="text-sm text-green-700">
                  Your Stripe account is connected and ready to receive payouts.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Available Balance</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(stats.availableBalance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending Balance</span>
                <span className="font-semibold text-yellow-600">
                  {formatCurrency(stats.pendingBalance)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Next Payout</span>
                <span className="text-sm font-medium">
                  {formatDate(payoutInfo.nextPayoutDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Payout Method</span>
                <Badge variant="outline">{payoutInfo.payoutMethod}</Badge>
              </div>
            </div>

            {/* Payout Request Form */}
            {stripeConnect.isReady && stats.availableBalance >= payoutInfo.minimumPayout && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payout Amount</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder={`Min $${payoutInfo.minimumPayout}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={payoutInfo.minimumPayout}
                      max={stats.availableBalance}
                      step="0.01"
                    />
                    <Button
                      onClick={requestPayout}
                      disabled={requestingPayout || !payoutAmount || parseFloat(payoutAmount) < payoutInfo.minimumPayout}
                      className="px-4"
                    >
                      {requestingPayout ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Request
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Minimum payout: {formatCurrency(payoutInfo.minimumPayout)}
                  </p>
                </div>
              </div>
            )}

            {stats.availableBalance < payoutInfo.minimumPayout && (
              <p className="text-xs text-gray-500 text-center">
                Minimum payout: {formatCurrency(payoutInfo.minimumPayout)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Your latest guide purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent sales</p>
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{sale.guide.title}</h4>
                      <p className="text-sm text-gray-600">
                        Purchased by @{sale.user.username} • {formatDate(sale.purchaseDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(sale.amount)}</p>
                      <p className="text-sm text-green-600">
                        +{formatCurrency(sale.creatorEarnings)} earned
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Guide */}
      {stats.topSellingGuide && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Guide</CardTitle>
            <CardDescription>Your best performing guide</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{stats.topSellingGuide.title}</h3>
                <p className="text-gray-600">
                  {stats.topSellingGuide.sales} sales • {formatCurrency(stats.topSellingGuide.revenue)} revenue
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Best Seller
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Earnings Trend</CardTitle>
          <CardDescription>Your earnings over the past months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <span className="text-sm font-medium w-16">{month.month}</span>
                  <div className="flex-1">
                    <Progress 
                      value={(month.earnings / Math.max(...monthlyData.map(m => m.earnings))) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold">{formatCurrency(month.earnings)}</p>
                  <p className="text-sm text-gray-600">{month.sales} sales</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 