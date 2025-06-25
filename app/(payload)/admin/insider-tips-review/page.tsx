'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MapPin, 
  Calendar,
  AlertTriangle,
  Star,
  MessageSquare,
  Filter,
  Search,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Award,
  TrendingUp,
  Building2,
  Sparkles
} from 'lucide-react'

interface InsiderTip {
  id: string
  category: string
  tip: string
  priority: 'high' | 'medium' | 'low'
  source: string
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: {
    id: string
    name: string
    email: string
  }
  submittedAt: string
  location: {
    id: string
    name: string
    address?: any
  }
  reviewedBy?: {
    id: string
    name: string
  }
  reviewedAt?: string
  rejectionReason?: string
}

interface LocationWithTips {
  id: string
  name: string
  address?: any
  pendingTips: InsiderTip[]
  approvedTips: InsiderTip[]
  rejectedTips: InsiderTip[]
}

export default function InsiderTipsReviewPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<LocationWithTips[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTip, setSelectedTip] = useState<InsiderTip | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  // Load data on component mount
  useEffect(() => {
    loadInsiderTips()
  }, [])

  // Update stats when locations change
  useEffect(() => {
    const newStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }

    locations.forEach(location => {
      newStats.pending += location.pendingTips.length
      newStats.approved += location.approvedTips.length
      newStats.rejected += location.rejectedTips.length
      newStats.total += location.pendingTips.length + location.approvedTips.length + location.rejectedTips.length
    })

    setStats(newStats)
  }, [locations])

  const loadInsiderTips = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/insider-tips/pending', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to load insider tips')
      }
      
      const data = await response.json()
      setLocations(data.locations || [])
    } catch (err) {
      console.error('Error loading insider tips:', err)
      setError(err instanceof Error ? err.message : 'Failed to load insider tips')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (tipId: string) => {
    if (!selectedTip) return
    
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/insider-tips/${tipId}/approve`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        toast.success('Tip approved successfully!')
        setSelectedTip(null)
        loadInsiderTips() // Refresh data
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve tip')
      }
    } catch (err) {
      console.error('Error approving tip:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to approve tip')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (tipId: string) => {
    if (!selectedTip || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/insider-tips/${tipId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason.trim() })
      })

      if (response.ok) {
        toast.success('Tip rejected successfully!')
        setSelectedTip(null)
        setRejectionReason('')
        loadInsiderTips() // Refresh data
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject tip')
      }
    } catch (err) {
      console.error('Error rejecting tip:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to reject tip')
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter tips based on selected filters
  const getFilteredTips = () => {
    let allTips: InsiderTip[] = []
    
    locations.forEach(location => {
      if (selectedLocation === 'all' || location.id === selectedLocation) {
        if (selectedStatus === 'all' || selectedStatus === 'pending') {
          allTips.push(...location.pendingTips.map(tip => ({ ...tip, status: 'pending' as const })))
        }
        if (selectedStatus === 'all' || selectedStatus === 'approved') {
          allTips.push(...location.approvedTips.map(tip => ({ ...tip, status: 'approved' as const })))
        }
        if (selectedStatus === 'all' || selectedStatus === 'rejected') {
          allTips.push(...location.rejectedTips.map(tip => ({ ...tip, status: 'rejected' as const })))
        }
      }
    })

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      allTips = allTips.filter(tip => 
        tip.tip.toLowerCase().includes(query) ||
        tip.location.name.toLowerCase().includes(query) ||
        tip.submittedBy.name.toLowerCase().includes(query) ||
        tip.category.toLowerCase().includes(query)
      )
    }

    return allTips
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'timing': return <Clock className="h-4 w-4" />
      case 'food': return <Star className="h-4 w-4" />
      case 'secrets': return <Sparkles className="h-4 w-4" />
      case 'protips': return <TrendingUp className="h-4 w-4" />
      case 'access': return <MapPin className="h-4 w-4" />
      case 'savings': return <Award className="h-4 w-4" />
      case 'recommendations': return <ThumbsUp className="h-4 w-4" />
      case 'hidden': return <Eye className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Insider Tips</h2>
            <p className="text-gray-600">Please wait while we fetch the latest submissions...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadInsiderTips} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const filteredTips = getFilteredTips()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-600" />
                Insider Tips Review
              </h1>
              <p className="text-gray-600 mt-2">Review and moderate user-submitted insider tips</p>
            </div>
            <Button onClick={loadInsiderTips} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Tips</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pending Review</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Approved</p>
                  <p className="text-3xl font-bold">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Rejected</p>
                  <p className="text-3xl font-bold">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Location Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tips, locations, users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips List */}
        <div className="space-y-6">
          {filteredTips.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tips found</h3>
                <p className="text-gray-500">Try adjusting your filters or search terms</p>
              </CardContent>
            </Card>
          ) : (
            filteredTips.map((tip) => (
              <Card key={tip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Tip Content */}
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 text-gray-600">
                            {getCategoryIcon(tip.category)}
                            <span className="text-sm font-medium capitalize">{tip.category}</span>
                          </div>
                          <Badge className={`text-xs ${getPriorityColor(tip.priority)}`}>
                            {tip.priority} priority
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(tip.status)}`}>
                            {tip.status}
                          </Badge>
                        </div>
                        <p className="text-gray-900 text-lg leading-relaxed">{tip.tip}</p>
                      </div>

                      {/* Location Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{tip.location.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{tip.submittedBy.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(tip.submittedAt)}</span>
                        </div>
                      </div>

                      {/* Review Info (if reviewed) */}
                      {tip.reviewedBy && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">Reviewed by:</span>
                            <span>{tip.reviewedBy.name}</span>
                            <span>•</span>
                            <span>{formatDate(tip.reviewedAt!)}</span>
                          </div>
                          {tip.rejectionReason && (
                            <div className="mt-2 text-sm text-red-600">
                              <span className="font-medium">Reason:</span> {tip.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-6">
                      {tip.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => setSelectedTip(tip)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Button>
                        </>
                      )}
                      {tip.status !== 'pending' && (
                        <div className="text-center">
                          <Badge className={`text-xs ${getStatusColor(tip.status)}`}>
                            {tip.status === 'approved' ? 'Approved' : 'Rejected'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedTip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Review Insider Tip</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTip(null)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              {/* Tip Details */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {getCategoryIcon(selectedTip.category)}
                    <span className="font-medium capitalize">{selectedTip.category}</span>
                    <Badge className={getPriorityColor(selectedTip.priority)}>
                      {selectedTip.priority} priority
                    </Badge>
                  </div>
                  <p className="text-gray-900 text-lg leading-relaxed">{selectedTip.tip}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <p className="text-gray-900">{selectedTip.location.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Submitted by:</span>
                    <p className="text-gray-900">{selectedTip.submittedBy.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Submitted:</span>
                    <p className="text-gray-900">{formatDate(selectedTip.submittedAt)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{selectedTip.submittedBy.email}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleApprove(selectedTip.id)}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                
                <Button
                  onClick={() => setSelectedTip(null)}
                  variant="outline"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>

              {/* Rejection Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reject Tip</h3>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Provide a reason for rejection (required)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={() => handleReject(selectedTip.id)}
                    disabled={isProcessing || !rejectionReason.trim()}
                    variant="destructive"
                    className="w-full gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Tip
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 