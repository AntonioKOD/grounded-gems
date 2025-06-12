/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  X,
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Navigation,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CalendarDays,
  Ticket,
  Users,
  Bookmark,
  Share2,
  Plus,
  Loader2,
  Crown,
  Target,
  Calendar,
  AlertTriangle,
  Check,
  ExternalLink,
  Edit3,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { Location } from "./map-data"
import { getCategoryColor, getCategoryName } from "./category-utils"
import { createLocationShareUrl } from "@/lib/location-sharing"
import { EnhancedShareButton } from "@/components/ui/enhanced-share-button"
import { PhotoSubmissionModal } from "@/components/location/photo-submission-modal"
import LocationDetailMobile from "./location-detail-mobile"
import StructuredInsiderTips from "@/components/location/structured-insider-tips"
import type { 
  User, 
  ReviewItem as Review, 
  BucketList, 
  LocationDetailProps,
  WriteReviewModalProps,
  AddToBucketListModalProps
} from "./location-detail-types"
import {
  formatAddress,
  formatPriceRange,
  formatDate,
  getBusinessStatus,
  getLocationImageUrl,
  getAuthorName,
  getAuthorImage,
  handleDirections,
  handleLikeLocation,
  handleSaveLocation,
  handleReviewHelpful,
  fetchCurrentUser,
  fetchUserBucketLists,
  fetchLocationReviews,
  processGalleryImages
} from "./location-detail-utils"

// Simple responsive hook
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const isMobileDevice = width < 768
      console.log('🔴 RESPONSIVE: Window width:', width, 'isMobile:', isMobileDevice)
      setIsMobile(isMobileDevice)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { isMobile }
}

function AddToBucketListModal({
  isOpen,
  onClose,
  location,
  userBucketLists,
  onSuccess,
}: AddToBucketListModalProps) {
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [goal, setGoal] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isAdding, setIsAdding] = useState(false)

  console.log('🔴 MODAL: AddToBucketListModal rendered with props:', {
    isOpen,
    location: location?.name,
    userBucketListsCount: userBucketLists.length,
    userBucketLists
  })

  // Reset form when modal opens
  useEffect(() => {
    console.log('🔴 MODAL: useEffect triggered, isOpen:', isOpen)
    if (isOpen) {
      setSelectedListId('')
      setGoal('')
      setPriority('medium')
      setIsAdding(false)
    }
  }, [isOpen])

  console.log('🔴 MODAL: About to render portal, isOpen:', isOpen)

  if (!isOpen) {
    console.log('🔴 MODAL: Not rendering because isOpen is false')
    return null
  }

  console.log('🔴 MODAL: Rendering portal with document.body')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Bucket list form submission started')
    console.log('Selected list ID:', selectedListId)
    console.log('Location:', location)
    console.log('Goal:', goal)
    console.log('Priority:', priority)
    console.log('Available bucket lists:', userBucketLists)
    
    if (!selectedListId || !location) {
      toast.error('Please select a bucket list')
      return
    }

    setIsAdding(true)
    try {
      const requestBody = {
        location: location.id,
        goal: goal.trim() || `Visit ${location.name}`,
        priority,
        status: 'not_started'
      }
      
      console.log('Sending request to:', `/api/bucket-lists/${selectedListId}/items`)
      console.log('Request body:', requestBody)
      
      const response = await fetch(`/api/bucket-lists/${selectedListId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add to bucket list')
      }

      toast.success(`Added "${location.name}" to your bucket list!`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding to bucket list:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add to bucket list')
    } finally {
      setIsAdding(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Responsive Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4"
            onClick={onClose}
            style={{ zIndex: 100000 }}
          >
            {/* Responsive Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-[#4ecdc4]/20 bucket-list-modal"
              style={{ zIndex: 100001 }}
              onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking inside modal
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[#ff6b6b]">
                    <Crown className="h-5 w-5 text-[#ffe66d]" />
                    <h2 className="text-lg font-semibold">Add to Bucket List</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 text-gray-600 rounded-full h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {location && (
                  <p className="text-sm text-gray-600 mb-6">
                    Adding "{location.name}" to your bucket list
                  </p>
                )}

                {userBucketLists.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="h-16 w-16 mx-auto text-[#ff6b6b]/50 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bucket Lists Yet</h3>
                    <p className="text-gray-600 mb-6">Create your first bucket list to start collecting amazing places!</p>
                    <Button
                      onClick={() => {
                        onClose()
                        window.open('/bucket-list', '_blank')
                      }}
                      className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Bucket List
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Bucket List Selection */}
                    <div>
                      <Label htmlFor="bucket-list" className="text-gray-700 font-medium mb-2 block">
                        Choose Bucket List ({userBucketLists.length} available)
                      </Label>
                      <Select value={selectedListId} onValueChange={setSelectedListId}>
                        <SelectTrigger className="w-full border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20 h-12 rounded-xl">
                          <SelectValue placeholder="Select a bucket list..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 z-[100002]" style={{ zIndex: 100002 }}>
                          {userBucketLists.map((list) => (
                            <SelectItem key={list.id} value={list.id} className="py-3">
                              <div className="flex items-center gap-3 w-full">
                                <Target className="h-4 w-4 text-[#4ecdc4] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{list.name}</div>
                                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                    <span>{list.stats.completedItems}/{list.stats.totalItems} completed</span>
                                    {list.type && (
                                      <>
                                        <span>•</span>
                                        <span className="capitalize">{list.type}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-[#4ecdc4] font-medium">
                                  {Math.round((list.stats.completedItems / list.stats.totalItems) * 100) || 0}%
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Goal Input */}
                    <div>
                      <Label htmlFor="goal" className="text-gray-700 font-medium mb-2 block">
                        Personal Goal (Optional)
                      </Label>
                      <Textarea
                        id="goal"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder={`e.g., Try their famous burger, Visit during sunset, Take photos with friends`}
                        rows={3}
                        className="w-full border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20 rounded-xl resize-none"
                      />
                    </div>

                    {/* Priority Selection */}
                    <div>
                      <Label htmlFor="priority" className="text-gray-700 font-medium mb-2 block">
                        Priority Level
                      </Label>
                      <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                        <SelectTrigger className="w-full border-[#4ecdc4]/30 focus:border-[#4ecdc4] focus:ring-[#4ecdc4]/20 h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[100002]" style={{ zIndex: 100002 }}>
                          <SelectItem value="low" className="py-3">
                            <span className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-green-400"></div>
                              <div>
                                <div className="font-medium">Low Priority</div>
                                <div className="text-xs text-gray-500">Visit when convenient</div>
                              </div>
                            </span>
                          </SelectItem>
                          <SelectItem value="medium" className="py-3">
                            <span className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-[#ffe66d]"></div>
                              <div>
                                <div className="font-medium">Medium Priority</div>
                                <div className="text-xs text-gray-500">Plan to visit soon</div>
                              </div>
                            </span>
                          </SelectItem>
                          <SelectItem value="high" className="py-3">
                            <span className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div>
                              <div>
                                <div className="font-medium">High Priority</div>
                                <div className="text-xs text-gray-500">Must visit ASAP!</div>
                              </div>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose} 
                        disabled={isAdding}
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 h-12 rounded-xl font-medium"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isAdding || !selectedListId}
                        className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-12 rounded-xl font-medium"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add to List
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Write Review Modal Component for Desktop
function WriteReviewModal({
  isOpen,
  onClose,
  location,
  currentUser,
  onSuccess,
}: WriteReviewModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 5,
    visitDate: new Date().toISOString().split('T')[0],
    pros: [''],
    cons: [''],
    tips: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        content: '',
        rating: 5,
        visitDate: new Date().toISOString().split('T')[0],
        pros: [''],
        cons: [''],
        tips: ''
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser || !location) {
      toast.error('You must be logged in to write a review')
      return
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in the title and review content')
      return
    }

    setIsSubmitting(true)
    try {
      const reviewData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        rating: formData.rating,
        locationId: location.id,
        authorId: currentUser.id,
        visitDate: formData.visitDate,
        pros: formData.pros.filter(p => p.trim()).map(p => p.trim()),
        cons: formData.cons.filter(c => c.trim()).map(c => c.trim()),
        tips: formData.tips.trim()
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reviewData)
      })

      if (response.ok) {
        toast.success('Review submitted successfully!')
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit review')
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateProsOrCons = (type: 'pros' | 'cons', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => i === index ? value : item)
    }))
  }

  const addProsOrCons = (type: 'pros' | 'cons') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }))
  }

  const removeProsOrCons = (type: 'pros' | 'cons', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }))
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 write-review-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[#ff6b6b]" />
                    <h2 className="text-xl font-semibold text-gray-900">Write a Review</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 text-gray-600 rounded-full h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {location && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-6">
                    <p className="text-sm text-gray-600">
                      Writing review for <span className="font-medium text-gray-900">{location.name}</span>
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Rating */}
                      <div>
                        <Label className="text-gray-700 font-medium mb-3 block">
                          Overall Rating
                        </Label>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, rating: i + 1 }))}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-8 w-8 transition-colors ${
                                  i < formData.rating
                                    ? "text-[#ffe66d] fill-current"
                                    : "text-gray-300 hover:text-[#ffe66d]"
                                }`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-sm text-gray-600">
                            ({formData.rating} star{formData.rating !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </div>

                      {/* Visit Date */}
                      <div>
                        <Label htmlFor="visitDate" className="text-gray-700 font-medium mb-2 block">
                          Visit Date
                        </Label>
                        <Input
                          type="date"
                          id="visitDate"
                          value={formData.visitDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
                          className="w-full"
                        />
                      </div>

                      {/* Title */}
                      <div>
                        <Label htmlFor="title" className="text-gray-700 font-medium mb-2 block">
                          Review Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Summarize your experience..."
                          className="w-full"
                          required
                        />
                      </div>

                      {/* Content */}
                      <div>
                        <Label htmlFor="content" className="text-gray-700 font-medium mb-2 block">
                          Your Review <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Share your detailed experience..."
                          rows={6}
                          className="w-full resize-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Pros */}
                      <div>
                        <Label className="text-gray-700 font-medium mb-2 block">
                          What did you like? (Optional)
                        </Label>
                        {formData.pros.map((pro, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <Input
                              type="text"
                              value={pro}
                              onChange={(e) => updateProsOrCons('pros', index, e.target.value)}
                              placeholder="Something you enjoyed..."
                              className="flex-1"
                            />
                            {formData.pros.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProsOrCons('pros', index)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addProsOrCons('pros')}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Pro
                        </Button>
                      </div>

                      {/* Cons */}
                      <div>
                        <Label className="text-gray-700 font-medium mb-2 block">
                          What could be improved? (Optional)
                        </Label>
                        {formData.cons.map((con, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <Input
                              type="text"
                              value={con}
                              onChange={(e) => updateProsOrCons('cons', index, e.target.value)}
                              placeholder="Something that could be better..."
                              className="flex-1"
                            />
                            {formData.cons.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProsOrCons('cons', index)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addProsOrCons('cons')}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Con
                        </Button>
                      </div>

                      {/* Tips */}
                      <div>
                        <Label htmlFor="tips" className="text-gray-700 font-medium mb-2 block">
                          Insider Tips (Optional)
                        </Label>
                        <Textarea
                          id="tips"
                          value={formData.tips}
                          onChange={(e) => setFormData(prev => ({ ...prev, tips: e.target.value }))}
                          placeholder="Any tips for future visitors..."
                          rows={3}
                          className="w-full resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Desktop version of the location detail component
function LocationDetailDesktop({ location, isOpen, onClose }: LocationDetailProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [savesCount, setSavesCount] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [isWriteReviewModalOpen, setIsWriteReviewModalOpen] = useState(false)
  const [helpfulStates, setHelpfulStates] = useState<Record<string, { isHelpful: boolean | null, helpfulCount: number, unhelpfulCount: number }>>({})
  const [activeTab, setActiveTab] = useState("about")
  const [specials, setSpecials] = useState<any[]>([])
  const [specialsLoading, setSpecialsLoading] = useState(false)
  const [interactionCounts, setInteractionCounts] = useState({
    likes: 0,
    saves: 0
  })
  const [userBucketLists, setUserBucketLists] = useState<BucketList[]>([])
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false)
  const [isLoadingBucketLists, setIsLoadingBucketLists] = useState(false)
  const [isPhotoSubmissionModalOpen, setIsPhotoSubmissionModalOpen] = useState(false)

  console.log('🔴 DESKTOP: LocationDetailDesktop rendered:', {
    locationName: location?.name,
    isOpen,
    currentUser: currentUser?.id,
    userBucketListsCount: userBucketLists.length,
    isBucketModalOpen,
    isLoadingBucketLists
  })

  // Add this to the window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugModal = {
        isBucketModalOpen,
        setIsBucketModalOpen,
        userBucketLists,
        currentUser,
        location: location?.name
      }
    }
  }, [isBucketModalOpen, userBucketLists, currentUser, location])

  useEffect(() => {
    if (isOpen && location) {
      loadCurrentUser()
      loadReviews()
      fetchSpecials()
      loadInteractionCounts()
    }
  }, [isOpen, location])

  // Fetch bucket lists when user is available
  useEffect(() => {
    if (currentUser) {
      loadUserBucketLists()
    }
  }, [currentUser])

  // Initialize helpful states when reviews change
  useEffect(() => {
    const states: Record<string, { isHelpful: boolean | null, helpfulCount: number, unhelpfulCount: number }> = {}
    reviews.forEach(review => {
      const userMarkedHelpful = currentUser && review.usersWhoMarkedHelpful?.includes(currentUser.id)
      const userMarkedUnhelpful = currentUser && review.usersWhoMarkedUnhelpful?.includes(currentUser.id)
      
      states[review.id] = {
        isHelpful: userMarkedHelpful ? true : userMarkedUnhelpful ? false : null,
        helpfulCount: review.helpfulCount || 0,
        unhelpfulCount: review.unhelpfulCount || 0
      }
    })
    setHelpfulStates(states)
  }, [reviews, currentUser])

  const loadCurrentUser = async () => {
    const user = await fetchCurrentUser()
    if (user) {
      console.log('Current user fetched:', user)
      setCurrentUser(user)
    } else {
      console.log('No authenticated user found')
    }
  }

  const loadUserBucketLists = async () => {
    if (!currentUser) {
      console.log('No current user for fetching bucket lists')
      return
    }
    
    setIsLoadingBucketLists(true)
    console.log('Fetching bucket lists for user:', currentUser.id)
    const bucketLists = await fetchUserBucketLists(currentUser.id)
    console.log('Fetched bucket lists:', bucketLists?.length || 0, 'lists')
    console.log('Bucket lists data:', bucketLists)
    setUserBucketLists(bucketLists)
    setIsLoadingBucketLists(false)
  }

  const loadInteractionCounts = async () => {
    if (!location) return
    
    try {
      // Mock data for now - replace with actual API call
      setInteractionCounts({
        likes: Math.floor(Math.random() * 100) + 10,
        saves: Math.floor(Math.random() * 50) + 5
      })
    } catch (error) {
      console.error('Error loading interaction counts:', error)
    }
  }

  const loadReviews = async () => {
    if (!location) return
    
    setReviewsLoading(true)
    const reviews = await fetchLocationReviews(location.id, 10, 1)
    setReviews(reviews)
    setReviewsLoading(false)
  }

  const fetchSpecials = async () => {
    if (!location) return
    
    setSpecialsLoading(true)
    try {
      // Mock data for now - replace with actual API call
      setSpecials([])
    } catch (error) {
      console.error('Error fetching specials:', error)
    } finally {
      setSpecialsLoading(false)
    }
  }

  const handleHelpfulClick = async (reviewId: string, helpful: boolean) => {
    if (!currentUser) {
      toast.error('Please log in to rate reviews')
      return
    }

    const result = await handleReviewHelpful(reviewId, helpful, currentUser.id)
    if (result.success && result.data) {
      setHelpfulStates(prev => ({
        ...prev,
        [reviewId]: {
          isHelpful: helpful,
          helpfulCount: result.data.helpfulCount,
          unhelpfulCount: result.data.unhelpfulCount
        }
      }))
      toast.success(result.data.message)
    } else {
      toast.error(result.message || 'Failed to rate review')
    }
  }

  // Using shared utility functions for date formatting and author helpers

  const handleWriteReview = () => {
    if (!currentUser) {
      toast.error('Please log in to write a review')
      return
    }
    setIsWriteReviewModalOpen(true)
  }

  const nextImage = () => {
    if (location?.gallery && location.gallery.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % location.gallery!.length)
    }
  }

  const prevImage = () => {
    if (location?.gallery && location.gallery.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + location.gallery!.length) % location.gallery!.length)
    }
  }

  // Using shared utility functions for formatting and status checking

  const handleLike = async () => {
    if (!location || !currentUser) return
    
    try {
      const response = await fetch(`/api/locations/${location.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'like' }),
      })

      if (response.ok) {
        setIsLiked(!isLiked)
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
        toast.success(isLiked ? 'Removed from likes' : 'Added to likes!')
      }
    } catch (error) {
      console.error('Error handling like:', error)
      toast.error('Failed to update like status')
    }
  }

  const handleSave = async () => {
    if (!location || !currentUser) return
    
    try {
      const response = await fetch(`/api/locations/${location.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'save' }),
      })

      if (response.ok) {
        setIsSaved(!isSaved)
        setSavesCount(prev => isSaved ? prev - 1 : prev + 1)
        toast.success(isSaved ? 'Removed from saved' : 'Saved!')
      }
    } catch (error) {
      console.error('Error handling save:', error)
      toast.error('Failed to update save status')
    }
  }

  const handleAddToBucketList = () => {
    console.log('🔴 DESKTOP: Add to bucket list clicked')
    console.log('🔴 DESKTOP: Current user:', currentUser)
    console.log('🔴 DESKTOP: User bucket lists count:', userBucketLists.length)
    console.log('🔴 DESKTOP: User bucket lists:', userBucketLists)
    console.log('🔴 DESKTOP: Is loading bucket lists:', isLoadingBucketLists)
    console.log('🔴 DESKTOP: Is bucket modal open BEFORE:', isBucketModalOpen)
    
    if (!currentUser) {
      console.log('🔴 DESKTOP: No user - showing error')
      toast.error('Please log in to add to bucket list')
      return
    }
    
    if (isLoadingBucketLists) {
      console.log('🔴 DESKTOP: Still loading bucket lists')
      toast.info('Loading your bucket lists...')
      return
    }
    
    if (userBucketLists.length === 0) {
      console.log('🔴 DESKTOP: No bucket lists - showing create option')
      // Show a helpful message and open create bucket list modal instead
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p>You don't have any bucket lists yet!</p>
          <Button
            size="sm"
            onClick={() => {
              toast.dismiss(t.id)
              // Navigate to bucket list page to create one
              window.open('/bucket-list', '_blank')
            }}
            className="bg-[#ff6b6b] hover:bg-[#ff5555] text-white"
          >
            Create Your First Bucket List
          </Button>
        </div>
      ), {
        duration: 5000,
        style: {
          background: 'white',
          color: 'black',
          border: '1px solid #4ecdc4',
        }
      })
      return
    }
    
    console.log('🔴 DESKTOP: Opening bucket list modal')
    setIsBucketModalOpen(true)
    console.log('🔴 DESKTOP: Modal state set to true, isBucketModalOpen AFTER:', true)
    
    // Force re-render by logging after state change
    setTimeout(() => {
      console.log('🔴 DESKTOP: Modal state after timeout:', isBucketModalOpen)
    }, 100)
  }

  const handleDirectionsClick = () => {
    if (location) {
      handleDirections(location)
    }
  }

  const handleShare = async () => {
    if (!location) return
    
    try {
      const shareUrl = createLocationShareUrl(location.id, location.name, location.slug)
      
      if (navigator.share) {
        await navigator.share({
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing location:', error)
        toast.error('Failed to share location')
      }
    }
  }

  if (!location) return null

  const categoryInfo = {
    color: getCategoryColor(location.categories?.[0]),
    name: getCategoryName(location.categories?.[0])
  }

  const businessStatus = getBusinessStatus(location.businessHours)
  const galleryImages = processGalleryImages(location)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 bg-white rounded-2xl shadow-2xl z-[9999] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#fdecd7] to-white">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="text-white border-0 px-3 py-1 font-medium"
                  style={{ backgroundColor: getCategoryColor(location.categories?.[0]) }}
                >
                  {getCategoryName(location.categories?.[0])}
                </Badge>
                {location.isVerified && (
                  <span className="text-sm bg-[#4ecdc4]/10 text-[#4ecdc4] px-3 py-1 rounded-full font-medium">
                    ✓ Verified
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="hover:bg-[#4ecdc4]/10 text-[#4ecdc4]"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-gray-100 text-gray-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                {/* Left Side - Image Gallery */}
                <div className="relative bg-gray-100">
                  <div className="absolute inset-0">
                    <Image
                      src={galleryImages[currentImageIndex] || getLocationImageUrl(location)}
                      alt={location.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Gallery Navigation */}
                  {galleryImages.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 text-gray-900"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 text-gray-900"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                      
                      {/* Image Indicator */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {galleryImages.length}
                      </div>
                    </>
                  )}

                  {/* Floating Action Buttons */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLike}
                      className={cn(
                        "bg-white/80 hover:bg-white/90 backdrop-blur-sm",
                        isLiked && "text-red-500 bg-red-50/80"
                      )}
                    >
                      <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSave}
                      className={cn(
                        "bg-white/80 hover:bg-white/90 backdrop-blur-sm",
                        isSaved && "text-blue-500 bg-blue-50/80"
                      )}
                    >
                      <Bookmark className={cn("h-5 w-5", isSaved && "fill-current")} />
                    </Button>
                  </div>
                </div>

                {/* Right Side - Details */}
                <div className="flex flex-col overflow-hidden">
                  {/* Quick Info */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {location.averageRating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            <span className="font-semibold">{location.averageRating.toFixed(1)}</span>
                            {location.reviewCount && (
                              <span className="text-gray-500">({location.reviewCount} reviews)</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">Price:</span>
                          <span className="text-sm">{formatPriceRange(location.priceRange)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span className={cn("text-sm font-medium", businessStatus.color)}>
                          {businessStatus.status}
                        </span>
                      </div>
                    </div>

                    {/* Interaction Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {likesCount} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="h-4 w-4" />
                        {savesCount} saves
                      </span>
                    </div>
                  </div>

                  {/* Contact & Address */}
                  <div className="p-6 border-b border-gray-200 space-y-4">
                    {location.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{formatAddress(location.address)}</span>
                      </div>
                    )}

                    {location.contactInfo?.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <a 
                          href={`tel:${location.contactInfo.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {location.contactInfo.phone}
                        </a>
                      </div>
                    )}

                    {location.contactInfo?.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-500" />
                        <a 
                          href={location.contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        onClick={handleDirectionsClick}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Directions
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('🔴 Add Photo clicked, currentUser:', currentUser)
                          if (!currentUser) {
                            toast.error('Please log in to add photos')
                            return
                          }
                          console.log('🔴 Opening photo submission modal')
                          setIsPhotoSubmissionModalOpen(true)
                        }}
                        className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white border-0"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Add Photo
                      </Button>
                      <Button
                        onClick={handleWriteReview}
                        className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Write Review
                      </Button>
                      <Button
                        onClick={handleAddToBucketList}
                        className="bg-gradient-to-r from-[#FFD93D] to-[#FF8E53] hover:from-[#FFEB3B] hover:to-[#FF7043] text-gray-800 border-0"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Add to List
                      </Button>
                    </div>
                  </div>

                  {/* Tabs Section */}
                  <div className="flex-1 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                      <TabsList className="grid w-full grid-cols-3 mx-6 mt-4">
                        <TabsTrigger value="about">About</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
                        <TabsTrigger value="specials">Specials</TabsTrigger>
                      </TabsList>
                      
                      <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <TabsContent value="about" className="space-y-4 mt-4">
                          {location.description && (
                            <div>
                              <h3 className="font-semibold mb-2">Description</h3>
                              <p className="text-gray-700 leading-relaxed">{location.description}</p>
                            </div>
                          )}

                          {location.insiderTips && (
                            <div>
                              <StructuredInsiderTips
                                tips={location.insiderTips}
                                locationName={location.name}
                                compact={false}
                              />
                            </div>
                          )}

                          {location.businessHours && location.businessHours.length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-2">Hours</h3>
                              <div className="space-y-1">
                                {location.businessHours.map((hours, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>{hours.day}</span>
                                    <span>
                                      {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="reviews" className="space-y-4 mt-4">
                          {/* Reviews Header */}
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Reviews ({reviews.length})
                            </h3>
                            <Button
                              onClick={handleWriteReview}
                              size="sm"
                              className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white border-0"
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Write Review
                            </Button>
                          </div>

                          {reviewsLoading ? (
                            <div className="text-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                              <p className="text-gray-500 mt-2">Loading reviews...</p>
                            </div>
                          ) : reviews.length > 0 ? (
                            <div className="space-y-4">
                              {reviews.map((review, index) => {
                                const helpfulState = helpfulStates[review.id]
                                return (
                                  <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                          <Image
                                            src={getAuthorImage(review.author)}
                                            alt={getAuthorName(review.author)}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-gray-900">
                                              {getAuthorName(review.author)}
                                            </h4>
                                            <span className="text-sm text-gray-500">
                                              {formatDate(review.createdAt)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <div className="flex">
                                              {Array.from({ length: 5 }, (_, i) => (
                                                <Star
                                                  key={i}
                                                  className={cn(
                                                    "h-4 w-4",
                                                    i < review.rating ? "text-[#ffe66d] fill-current" : "text-gray-300"
                                                  )}
                                                />
                                              ))}
                                            </div>
                                            {review.visitDate && (
                                              <span className="text-xs text-gray-500">
                                                • Visited {formatDate(review.visitDate)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {review.title && (
                                        <h4 className="font-semibold mb-2">{review.title}</h4>
                                      )}
                                      <p className="text-gray-700 mb-3 leading-relaxed">{review.content}</p>

                                      {/* Pros and Cons */}
                                      {(review.pros?.length || review.cons?.length) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                          {review.pros && review.pros.length > 0 && (
                                            <div className="bg-green-50 p-3 rounded-lg">
                                              <h6 className="font-medium text-green-800 mb-2 flex items-center">
                                                <Check className="h-4 w-4 mr-1" />
                                                Pros
                                              </h6>
                                              <ul className="space-y-1">
                                                {review.pros.map((pro, idx) => (
                                                  <li key={idx} className="text-sm text-green-700">
                                                    • {pro.pro}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          {review.cons && review.cons.length > 0 && (
                                            <div className="bg-red-50 p-3 rounded-lg">
                                              <h6 className="font-medium text-red-800 mb-2 flex items-center">
                                                <X className="h-4 w-4 mr-1" />
                                                Cons
                                              </h6>
                                              <ul className="space-y-1">
                                                {review.cons.map((con, idx) => (
                                                  <li key={idx} className="text-sm text-red-700">
                                                    • {con.con}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Tips */}
                                      {review.tips && (
                                        <div className="bg-blue-50 p-3 rounded-lg mb-3">
                                          <h6 className="font-medium text-blue-800 mb-1 flex items-center">
                                            <AlertTriangle className="h-4 w-4 mr-1" />
                                            Insider Tips
                                          </h6>
                                          <p className="text-sm text-blue-700">{review.tips}</p>
                                        </div>
                                      )}

                                      {/* Helpful Buttons */}
                                      {currentUser && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                          <span className="text-sm text-gray-600">Was this helpful?</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleHelpfulClick(review.id, true)}
                                            className={cn(
                                              "text-xs",
                                              helpfulState?.isHelpful === true && "bg-green-100 text-green-700"
                                            )}
                                          >
                                            👍 Yes ({helpfulState?.helpfulCount || 0})
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleHelpfulClick(review.id, false)}
                                            className={cn(
                                              "text-xs",
                                              helpfulState?.isHelpful === false && "bg-red-100 text-red-700"
                                            )}
                                          >
                                            👎 No ({helpfulState?.unhelpfulCount || 0})
                                          </Button>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <Star className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                              <p className="text-gray-500 mb-6">Be the first to share your experience!</p>
                              <Button
                                onClick={handleWriteReview}
                                className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:from-[#ff5555] hover:to-[#3dbdb4] text-white"
                              >
                                <Edit3 className="h-4 w-4 mr-2" />
                                Write the First Review
                              </Button>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="specials" className="space-y-4 mt-4">
                          {specials.length > 0 ? (
                            specials.map((special, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <h4 className="font-semibold mb-2">{special.title}</h4>
                                  <p className="text-gray-700 mb-2">{special.description}</p>
                                  <div className="text-sm text-gray-500">
                                    Valid: {special.validFrom} - {special.validTo}
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>No current specials</p>
                              <p className="text-sm">Check back later for deals!</p>
                            </div>
                          )}
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Write Review Modal */}
          <WriteReviewModal
            isOpen={isWriteReviewModalOpen}
            onClose={() => setIsWriteReviewModalOpen(false)}
            location={location}
            currentUser={currentUser}
            onSuccess={() => {
              loadReviews()
              setIsWriteReviewModalOpen(false)
            }}
          />

          {/* Bucket List Modal */}
          <AddToBucketListModal
            isOpen={isBucketModalOpen}
            onClose={() => setIsBucketModalOpen(false)}
            location={location}
            userBucketLists={userBucketLists}
            onSuccess={() => loadUserBucketLists()}
          />

          {/* Photo Submission Modal */}
          <PhotoSubmissionModal
            isOpen={isPhotoSubmissionModalOpen}
            onClose={() => {
              console.log('🔴 Closing photo submission modal')
              setIsPhotoSubmissionModalOpen(false)
            }}
            location={location ? {
              id: location.id,
              name: location.name
            } : null}
            user={currentUser ? {
              id: currentUser.id,
              name: currentUser.name || '',
              avatar: currentUser.avatar
            } : null}
            onSuccess={() => {
              console.log('🔴 Photo submission successful')
              setIsPhotoSubmissionModalOpen(false)
              toast.success('Photo submitted for review!')
            }}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Mini marker preview popup component
export function LocationPreview({ location, onViewDetail }: { location: Location; onViewDetail: () => void }) {
  const categoryColor = getCategoryColor(location.categories?.[0])

  const getImageUrl = getLocationImageUrl

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-[#4ecdc4]/20 hover:border-[#4ecdc4]/40 bg-white/80 backdrop-blur-sm" 
      onClick={onViewDetail}
    >
      <div className="relative h-32 w-full">
        <Image
          src={getImageUrl(location)}
          alt={location.name}
          fill
          className="object-cover rounded-t-lg"
        />
        <div className="absolute top-2 left-2">
          <Badge 
            className="text-white text-xs px-2 py-1 border-0"
            style={{ backgroundColor: categoryColor }}
          >
            {getCategoryName(location.categories?.[0])}
          </Badge>
        </div>
        {location.isVerified && (
          <div className="absolute top-2 right-2">
            <span className="text-xs bg-[#4ecdc4]/90 text-white px-2 py-1 rounded-full font-medium">
              ✓
            </span>
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{location.name}</h3>
        
        {location.averageRating && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3 w-3 text-[#ffe66d] fill-current" />
            <span className="text-xs font-medium text-gray-900">{location.averageRating.toFixed(1)}</span>
            {location.reviewCount && (
              <span className="text-xs text-gray-600">({location.reviewCount})</span>
            )}
          </div>
        )}
        
        {location.shortDescription && (
          <p className="text-xs text-gray-600 line-clamp-2">{location.shortDescription}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Main component
export default function LocationDetail({ location, isOpen, onClose, isMobile = false }: LocationDetailProps) {
  const { isMobile: isResponsiveMobile } = useResponsive()
  
  // Determine if we should show mobile version
  const shouldShowMobile = isMobile || isResponsiveMobile

  console.log('🔴 MAIN: LocationDetail props:', {
    locationName: location?.name,
    isOpen,
    isMobileProp: isMobile,
    isResponsiveMobile,
    shouldShowMobile
  })

  if (shouldShowMobile) {
    console.log('🔴 MAIN: Rendering mobile version')
    return (
      <LocationDetailMobile 
        location={location} 
        isOpen={isOpen} 
        onClose={onClose}
      />
    )
  }

  console.log('🔴 MAIN: Rendering desktop version')
  return (
    <LocationDetailDesktop 
      location={location} 
      isOpen={isOpen} 
      onClose={onClose}
    />
  )
}
