"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { 
  Check, 
  X, 
  Eye, 
  Clock, 
  Star, 
  MapPin, 
  User, 
  Calendar,
  Filter,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Tag,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

interface PhotoSubmission {
  id: string
  photo: {
    id: string
    url: string
    alt?: string
    filename?: string
  }
  location: {
    id: string
    name: string
  }
  submittedBy: {
    id: string
    name?: string
    email?: string
    avatar?: { url: string }
  }
  caption?: string
  category?: string
  tags?: string[]
  status: 'pending' | 'approved' | 'rejected'
  qualityScore?: number
  reviewNotes?: string
  createdAt: string
  reviewedAt?: string
}

interface PhotoReviewPanelProps {
  className?: string
}

export default function PhotoReviewPanel({ className }: PhotoReviewPanelProps) {
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<PhotoSubmission | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [qualityScore, setQualityScore] = useState<number | null>(null)
  const [processingReview, setProcessingReview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchSubmissions()
  }, [statusFilter, currentPage])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/photo-reviews?status=${statusFilter}&page=${currentPage}&limit=12`)
      const data = await response.json()

      if (data.success) {
        setSubmissions(data.submissions)
        setTotalPages(data.pagination.totalPages)
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

  const openReviewDialog = (submission: PhotoSubmission) => {
    setSelectedSubmission(submission)
    setReviewNotes(submission.reviewNotes || '')
    setQualityScore(submission.qualityScore || null)
    setReviewDialogOpen(true)
  }

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedSubmission) return

    setProcessingReview(true)
    try {
      const response = await fetch('/api/admin/photo-reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          status,
          reviewNotes: reviewNotes.trim(),
          qualityScore: status === 'approved' ? qualityScore : undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setReviewDialogOpen(false)
        fetchSubmissions() // Refresh the list
      } else {
        toast.error(data.error || 'Failed to review photo')
      }
    } catch (error) {
      console.error('Error reviewing photo:', error)
      toast.error('Failed to review photo')
    } finally {
      setProcessingReview(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      exterior: 'bg-green-100 text-green-800',
      interior: 'bg-blue-100 text-blue-800',
      food_drinks: 'bg-orange-100 text-orange-800',
      atmosphere: 'bg-purple-100 text-purple-800',
      menu: 'bg-yellow-100 text-yellow-800',
      staff: 'bg-pink-100 text-pink-800',
      events: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors.other
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

  const filteredSubmissions = submissions.filter(submission =>
    submission.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    submission.submittedBy.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    submission.caption?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Photo Review Panel</h1>
          <p className="text-gray-600 mt-1">Review and moderate user-submitted photos</p>
        </div>
        <Button onClick={fetchSubmissions} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by location, user, or caption..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter(s => s.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-t-lg" />
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos to review</h3>
            <p className="text-gray-600">
              {statusFilter === 'pending' 
                ? "All photos have been reviewed!" 
                : `No ${statusFilter} photos found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSubmissions.map((submission) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <Image
                      src={submission.photo.url}
                      alt={submission.photo.alt || 'User photo'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openReviewDialog(submission)}
                        className="bg-white/90 hover:bg-white text-gray-900"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 truncate">
                          {submission.location.name}
                        </h4>
                        {submission.caption && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {submission.caption}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={submission.submittedBy.avatar?.url} />
                          <AvatarFallback className="text-xs">
                            {submission.submittedBy.name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{submission.submittedBy.name || 'Anonymous'}</span>
                      </div>

                      {submission.category && (
                        <Badge className={getCategoryColor(submission.category)} variant="outline">
                          {submission.category.replace('_', ' ')}
                        </Badge>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(submission.createdAt)}</span>
                        {submission.qualityScore && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{submission.qualityScore}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Review Photo Submission
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Photo */}
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={selectedSubmission.photo.url}
                      alt={selectedSubmission.photo.alt || 'User photo'}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Photo Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(selectedSubmission.status)}>
                        {selectedSubmission.status}
                      </Badge>
                      {selectedSubmission.category && (
                        <Badge className={getCategoryColor(selectedSubmission.category)} variant="outline">
                          {selectedSubmission.category.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedSubmission.location.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{selectedSubmission.submittedBy.name || 'Anonymous'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(selectedSubmission.createdAt)}</span>
                      </div>
                    </div>

                    {selectedSubmission.caption && (
                      <div>
                        <Label className="text-sm font-medium">Caption</Label>
                        <p className="text-sm text-gray-700 mt-1">{selectedSubmission.caption}</p>
                      </div>
                    )}

                    {selectedSubmission.tags && selectedSubmission.tags.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedSubmission.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Form */}
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="quality-score">Quality Score (1-10)</Label>
                    <Select 
                      value={qualityScore?.toString() || ''} 
                      onValueChange={(value) => setQualityScore(parseInt(value))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Rate the photo quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                          <SelectItem key={score} value={score.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {Array.from({ length: score }, (_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                              <span>{score}/10</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="review-notes">Review Notes</Label>
                    <Textarea
                      id="review-notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about this photo..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  {selectedSubmission.reviewNotes && (
                    <div>
                      <Label>Previous Review Notes</Label>
                      <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                        {selectedSubmission.reviewNotes}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleReview('approved')}
                      disabled={processingReview}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview('rejected')}
                      disabled={processingReview}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 