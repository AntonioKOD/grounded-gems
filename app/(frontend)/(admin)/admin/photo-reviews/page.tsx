'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Image as ImageIcon,
  Star,
  Calendar,
  User,
  Search,
  RefreshCw
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface PhotoSubmission {
  id: string
  location: {
    id: string
    name: string
  }
  submittedBy: {
    id: string
    name: string
    email: string
  }
  photo: {
    id: string
    url: string
    alt?: string
    filename: string
  }
  caption?: string
  category: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'needs_improvement'
  qualityScore?: number
  submittedAt: string
  reviewedBy?: {
    id: string
    name: string
  }
  reviewedAt?: string
  reviewNotes?: string
  rejectionReason?: string
  rejectionFeedback?: string
  featured?: boolean
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  reviewing: { label: 'Reviewing', color: 'bg-blue-100 text-blue-800', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  needs_improvement: { label: 'Needs Improvement', color: 'bg-orange-100 text-orange-800', icon: RefreshCw }
}

const categoryLabels = {
  exterior: 'Exterior',
  interior: 'Interior', 
  food_drinks: 'Food & Drinks',
  atmosphere: 'Atmosphere',
  menu: 'Menu',
  staff: 'Staff',
  events: 'Events',
  other: 'Other'
}

export default function PhotoReviewsPage() {
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<PhotoSubmission | null>(null)
  const [reviewAction, setReviewAction] = useState<string>('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionFeedback, setRejectionFeedback] = useState('')
  const [featured, setFeatured] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/photo-reviews')
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      } else {
        toast.error('Failed to fetch photo submissions')
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast.error('Failed to fetch photo submissions')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async () => {
    if (!selectedSubmission || !reviewAction) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/locations/${selectedSubmission.location.id}/photo-submissions/${selectedSubmission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: reviewAction,
          reviewNotes: reviewNotes.trim() || undefined,
          rejectionReason: rejectionReason || undefined,
          rejectionFeedback: rejectionFeedback.trim() || undefined,
          featured: reviewAction === 'approved' ? featured : undefined,
        }),
      })

      if (response.ok) {
        toast.success(`Photo submission ${reviewAction} successfully`)
        await fetchSubmissions() // Refresh the list
        setSelectedSubmission(null)
        resetReviewForm()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update submission')
      }
    } catch (error) {
      console.error('Error reviewing submission:', error)
      toast.error('Failed to update submission')
    } finally {
      setProcessing(false)
    }
  }

  const resetReviewForm = () => {
    setReviewAction('')
    setReviewNotes('')
    setRejectionReason('')
    setRejectionFeedback('')
    setFeatured(false)
  }

  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus
    const matchesSearch = !searchQuery || 
      submission.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.submittedBy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryLabels[submission.category as keyof typeof categoryLabels]?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  const getQualityColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading photo submissions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photo Review Center</h1>
          <p className="text-gray-600">Review and manage location photo submissions</p>
        </div>
        <Button onClick={fetchSubmissions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by location, user, caption, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-status">Status Filter</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Photo Submissions ({filteredSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[700px] overflow-y-auto">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No photo submissions found</p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => {
                const StatusIcon = statusConfig[submission.status].icon
                return (
                  <div
                    key={submission.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSubmission?.id === submission.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex gap-4">
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={submission.photo.url}
                          alt={submission.photo.alt || submission.caption || 'Submitted photo'}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium truncate">{submission.location.name}</h3>
                          <Badge className={statusConfig[submission.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[submission.status].label}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>{submission.submittedBy.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{categoryLabels[submission.category as keyof typeof categoryLabels]}</span>
                            {submission.qualityScore && (
                              <>
                                <span>•</span>
                                <Star className={`h-3 w-3 ${getQualityColor(submission.qualityScore)}`} />
                                <span className={getQualityColor(submission.qualityScore)}>
                                  {submission.qualityScore}/100
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {submission.caption && (
                          <p className="text-sm text-gray-700 mt-2 truncate">{submission.caption}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Review Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Review Panel</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSubmission ? (
              <div className="space-y-6">
                {/* Photo Preview */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={selectedSubmission.photo.url}
                    alt={selectedSubmission.photo.alt || selectedSubmission.caption || 'Submitted photo'}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Submission Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedSubmission.location.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>Category: {categoryLabels[selectedSubmission.category as keyof typeof categoryLabels]}</span>
                      {selectedSubmission.qualityScore && (
                        <span className={getQualityColor(selectedSubmission.qualityScore)}>
                          Quality: {selectedSubmission.qualityScore}/100
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedSubmission.caption && (
                    <div>
                      <Label>Caption</Label>
                      <p className="text-sm bg-gray-50 p-3 rounded">{selectedSubmission.caption}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Submitted By</Label>
                      <p>{selectedSubmission.submittedBy.name}</p>
                    </div>
                    <div>
                      <Label>Submitted Date</Label>
                      <p>{new Date(selectedSubmission.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Current Status */}
                  <div>
                    <Label>Current Status</Label>
                    <div className="mt-1">
                      <Badge className={statusConfig[selectedSubmission.status].color}>
                        {statusConfig[selectedSubmission.status].label}
                      </Badge>
                    </div>
                  </div>

                  {/* Review Form */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Review Action</h4>
                    
                    <div>
                      <Label>New Status</Label>
                      <Select value={reviewAction} onValueChange={setReviewAction}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reviewing">Under Review</SelectItem>
                          <SelectItem value="approved">Approve</SelectItem>
                          <SelectItem value="rejected">Reject</SelectItem>
                          <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {reviewAction === 'approved' && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="featured"
                          checked={featured}
                          onChange={(e) => setFeatured(e.target.checked)}
                        />
                        <Label htmlFor="featured">Mark as featured photo</Label>
                      </div>
                    )}

                    {(reviewAction === 'rejected' || reviewAction === 'needs_improvement') && (
                      <div>
                        <Label>Rejection Reason</Label>
                        <Select value={rejectionReason} onValueChange={setRejectionReason}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="poor_quality">Poor Quality</SelectItem>
                            <SelectItem value="blurry">Blurry/Out of Focus</SelectItem>
                            <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                            <SelectItem value="not_relevant">Not Relevant to Location</SelectItem>
                            <SelectItem value="duplicate">Duplicate Photo</SelectItem>
                            <SelectItem value="copyright">Copyright Issue</SelectItem>
                            <SelectItem value="low_resolution">Low Resolution</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(reviewAction === 'rejected' || reviewAction === 'needs_improvement') && (
                      <div>
                        <Label>Feedback for User</Label>
                        <Textarea
                          value={rejectionFeedback}
                          onChange={(e) => setRejectionFeedback(e.target.value)}
                          placeholder="Explain what needs to be improved or why the photo was rejected..."
                          rows={3}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Internal Review Notes</Label>
                      <Textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Internal notes about this review (not shown to user)..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleReview}
                        disabled={!reviewAction || processing}
                        className="flex-1"
                      >
                        {processing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Submit Review`
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSubmission(null)
                          resetReviewForm()
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a photo submission to review</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 