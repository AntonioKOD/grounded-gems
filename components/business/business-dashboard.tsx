'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign,
  TrendingUp,
  Users,
  MapPin,
  Calendar,
  Star,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Settings,
  BarChart3,
  Crown,
  Zap,
  Bell,
  Plus,
  Edit,
  Photo,
  Clock,
  Phone,
  Mail,
  Globe,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

interface BusinessClaim {
  id: string
  businessName: string
  location: {
    id: string
    name: string
    averageRating?: number
    reviewCount?: number
    categories?: string[]
  }
  subscriptionTier: 'basic' | 'premium' | 'enterprise'
  analytics: {
    monthlyViews: number
    monthlyInteractions: number
    totalRevenue: number
    averageRating?: number
    totalReviews: number
  }
  revenueSharing: {
    monthlyPayout: number
    totalPaidOut: number
    creatorCommissionRate: number
  }
  enabledFeatures: Array<{
    feature: string
    enabledAt: string
  }>
}

interface BusinessDashboardProps {
  businessClaim: BusinessClaim
  currentUser?: any
}

export default function BusinessDashboard({ businessClaim, currentUser }: BusinessDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [analytics, setAnalytics] = useState(businessClaim.analytics)

  const getSubscriptionBadge = (tier: string) => {
    const config = {
      basic: { label: 'Basic', color: 'bg-blue-100 text-blue-800', icon: MapPin },
      premium: { label: 'Premium', color: 'bg-purple-100 text-purple-800', icon: Crown },
      enterprise: { label: 'Enterprise', color: 'bg-amber-100 text-amber-800', icon: Zap },
    }
    const { label, color, icon: Icon } = config[tier as keyof typeof config] || config.basic
    
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const getFeaturesList = (tier: string) => {
    const features = {
      basic: [
        'Business Hours Management',
        'Photo Management',
        'Contact Information',
        'Basic Analytics',
      ],
      premium: [
        'All Basic Features',
        'Review Response',
        'Special Offers',
        'Event Creation',
        'Advanced Analytics',
        'Priority Support',
      ],
      enterprise: [
        'All Premium Features',
        'API Access',
        'Custom Branding',
        'Multi-location Management',
        'Dedicated Account Manager',
        'White-label Solutions',
      ],
    }
    return features[tier as keyof typeof features] || []
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{businessClaim.businessName}</h1>
          <p className="text-gray-600 mt-1">{businessClaim.location.name}</p>
          <div className="flex items-center gap-3 mt-2">
            {getSubscriptionBadge(businessClaim.subscriptionTier)}
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-current text-yellow-500" />
              {analytics.averageRating?.toFixed(1) || 'N/A'}
            </Badge>
            <Badge variant="outline">
              {analytics.totalReviews} reviews
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Location
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Special
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12.5% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.monthlyViews)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +8.2% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interactions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.monthlyInteractions)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                -2.1% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Creator Payouts</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(businessClaim.revenueSharing.monthlyPayout)}</div>
            <p className="text-xs text-muted-foreground">
              {businessClaim.revenueSharing.creatorCommissionRate}% commission rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Star className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">New 5-star review</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Heart className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Location saved by user</p>
                        <p className="text-xs text-gray-500">4 hours ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Photo className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">New photos uploaded</p>
                        <p className="text-xs text-gray-500">6 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Subscription Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {businessClaim.subscriptionTier.charAt(0).toUpperCase() + businessClaim.subscriptionTier.slice(1)} Plan
                    </span>
                    {getSubscriptionBadge(businessClaim.subscriptionTier)}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Included Features:</h4>
                    <div className="space-y-1">
                      {getFeaturesList(businessClaim.subscriptionTier).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Track your location's performance and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatNumber(analytics.monthlyViews)}</div>
                  <div className="text-sm text-gray-600">Monthly Views</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatNumber(analytics.monthlyInteractions)}</div>
                  <div className="text-sm text-gray-600">Interactions</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{analytics.averageRating?.toFixed(1) || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
              </div>
              
              {/* Placeholder for charts */}
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Analytics charts will be displayed here</p>
                  <p className="text-sm">Integration with charting library required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Photo className="h-5 w-5" />
                  Photo Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload New Photos
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                        <Photo className="h-8 w-8 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Business Hours</span>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Edit
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Contact Info</span>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Edit
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Website & Social</span>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Creator Revenue Sharing
              </CardTitle>
              <CardDescription>
                Manage payments to creators who promote your location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatCurrency(businessClaim.revenueSharing.monthlyPayout)}</div>
                  <div className="text-sm text-gray-600">Monthly Payouts</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{formatCurrency(businessClaim.revenueSharing.totalPaidOut)}</div>
                  <div className="text-sm text-gray-600">Total Paid Out</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{businessClaim.revenueSharing.creatorCommissionRate}%</div>
                  <div className="text-sm text-gray-600">Commission Rate</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Top Performing Creators</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Chen', earnings: 245.50, posts: 12 },
                    { name: 'Mike Rodriguez', earnings: 189.25, posts: 8 },
                    { name: 'Emma Thompson', earnings: 156.75, posts: 6 },
                  ].map((creator, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{creator.name}</p>
                        <p className="text-sm text-gray-600">{creator.posts} posts this month</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(creator.earnings)}</p>
                        <p className="text-sm text-gray-600">earned</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Business Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Notification Preferences</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">New reviews</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Creator activity</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      <span className="text-sm">Monthly reports</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Revenue Sharing</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Creator commission rate</span>
                      <span className="text-sm font-medium">{businessClaim.revenueSharing.creatorCommissionRate}%</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Adjust Rate
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Account Management</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      Download Business Data
                    </Button>
                    <Button variant="outline" className="w-full">
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 