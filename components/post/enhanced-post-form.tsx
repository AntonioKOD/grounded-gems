"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, ImageIcon, MapPin, Send, X, Loader2, Video, FileText, Plus, Star, Hash, Tag, Folder, Target, Globe, ArrowLeft, ArrowRight, Check, Upload, Smartphone } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createPost } from "@/app/actions"
import { useLocationSearch, type LocationResult } from "@/hooks/useLocationSearch"
import Image from "next/image"

interface EnhancedPostFormProps {
  user: {
    id: string
    name: string
    avatar?: string
    profileImage?: {
      url: string
    }
  }
  onPostCreated?: () => void
  onCancel?: () => void
  className?: string
}

const STEPS = [
  { id: 1, title: "Capture", description: "Take or upload media", icon: Camera },
  { id: 2, title: "Caption", description: "Write your story", icon: FileText },
  { id: 3, title: "Details", description: "Add location & tags", icon: Tag },
  { id: 4, title: "Share", description: "Review and publish", icon: Send }
]

// Detect if device is mobile - enhanced detection
const isMobile = () => {
  if (typeof window === 'undefined') return false
  
  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isMobileWidth = window.innerWidth <= 768
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  return (hasTouchScreen && isMobileWidth) || isMobileUserAgent
}

export function EnhancedPostForm({ user, onPostCreated, onCancel, className = "" }: EnhancedPostFormProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Basic form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState<"post" | "review" | "recommendation">("post")
  const [rating, setRating] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Media state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedVideos, setSelectedVideos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Location state
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null)
  const [locationQuery, setLocationQuery] = useState("")
  const [showLocationSearch, setShowLocationSearch] = useState(false)

  // Tags state
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Location search hook
  const {
    locations,
    isLoading: isSearchingLocations,
    error: locationError,
    hasSearched,
    searchLocations,
    searchNearMe,
    clearSearch
  } = useLocationSearch()

  // Mobile camera state
  const [isCameraLoading, setIsCameraLoading] = useState(false)

  // Detect mobile device on mount
  useEffect(() => {
    setIsMobileDevice(isMobile())
    
    // Auto-open camera on mobile immediately
    if (isMobile() && currentStep === 1) {
      setIsCameraLoading(true)
      // Use a shorter delay and ensure it triggers
      const timer = setTimeout(() => {
        if (cameraInputRef.current) {
          // Trigger camera directly
          cameraInputRef.current.click()
          // Reset loading after attempt
          setTimeout(() => setIsCameraLoading(false), 1000)
        }
      }, 100) // Reduced delay
      
      return () => clearTimeout(timer)
    }
  }, [])

  // Additional effect to handle step changes on mobile
  useEffect(() => {
    if (isMobileDevice && currentStep === 1 && cameraInputRef.current) {
      setIsCameraLoading(true)
      // Auto-trigger camera when returning to step 1 on mobile
      const timer = setTimeout(() => {
        cameraInputRef.current?.click()
        setTimeout(() => setIsCameraLoading(false), 1000)
      }, 200)
      
      return () => clearTimeout(timer)
    }
  }, [currentStep, isMobileDevice])

  // Handle camera capture (mobile-first) with better mobile handling
  const handleCameraCapture = useCallback(() => {
    if (cameraInputRef.current) {
      setIsCameraLoading(true)
      cameraInputRef.current.click()
      
      // Reset loading state after attempt
      setTimeout(() => setIsCameraLoading(false), 1000)
      
      // Add haptic feedback for mobile
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, [])

  // Check if current step is valid
  const isStepValid = useCallback((step: number) => {
    switch (step) {
      case 1: // Media upload
        return selectedFiles.length > 0 || selectedVideos.length > 0
      case 2: // Caption
        return content.trim().length > 0
      case 3: // Details (optional)
        return true
      case 4: // Review
        return true
      default:
        return false
    }
  }, [selectedFiles.length, selectedVideos.length, content])

  // Navigation functions
  const goToNextStep = useCallback(() => {
    if (currentStep < STEPS.length && isStepValid(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, isStepValid])

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const videoFiles = files.filter(file => file.type.startsWith('video/'))
    
    if (imageFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...imageFiles])
      const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])
    }
    
    if (videoFiles.length > 0) {
      setSelectedVideos(prev => [...prev, ...videoFiles])
      const newPreviewUrls = videoFiles.map(file => URL.createObjectURL(file))
      setVideoPreviewUrls(prev => [...prev, ...newPreviewUrls])
    }
  }, [])

  // Handle file uploads with better error handling
  const handleFileUpload = useCallback(async (file: File, type: 'image' | 'video') => {
    console.log('📤 Starting file upload:', { name: file.name, type: file.type, size: file.size })
    
    // Validate file size before upload
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
    const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2)
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0)
      toast({
        title: "File too large",
        description: `${file.name} is ${sizeMB}MB. Maximum size for ${type}s is ${maxSizeMB}MB.`,
        variant: "destructive",
      })
      return null
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/avi', 'video/quicktime']
    const allowedTypes = type === 'video' ? allowedVideoTypes : allowedImageTypes
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Unsupported file format",
        description: `Please use a supported ${type} format: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`,
        variant: "destructive",
      })
      return null
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', `${type} for post`)

    try {
      console.log('📤 Uploading to /api/upload-media...')
      const response = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('📤 Upload failed:', errorData)
        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('📤 Upload successful:', result.id)
      
      toast({
        title: `${type === 'video' ? 'Video' : 'Image'} uploaded successfully`,
        description: `${file.name} has been uploaded and will be included in your post.`,
      })
      
      return result
    } catch (error) {
      console.error('📤 Upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      })
      return null
    }
  }, [toast])

  // Handle file uploads
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...imageFiles])
      const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])
      
      // Auto-advance to next step on mobile after capture
      if (isMobileDevice && currentStep === 1) {
        setTimeout(() => goToNextStep(), 500)
      }
    }
  }, [isMobileDevice, currentStep, goToNextStep])

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const videoFiles = files.filter(file => file.type.startsWith('video/'))
    
    if (videoFiles.length > 0) {
      setSelectedVideos(prev => [...prev, ...videoFiles])
      const newPreviewUrls = videoFiles.map(file => URL.createObjectURL(file))
      setVideoPreviewUrls(prev => [...prev, ...newPreviewUrls])
      
      // Auto-advance to next step on mobile after capture
      if (isMobileDevice && currentStep === 1) {
        setTimeout(() => goToNextStep(), 500)
      }
    }
  }, [isMobileDevice, currentStep, goToNextStep])

  // Remove media functions
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const removeVideo = useCallback((index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index))
    setVideoPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // Location functions
  const handleLocationSearch = useCallback(async (query: string) => {
    setLocationQuery(query)
    if (query.length >= 2) {
      setShowLocationSearch(true)
      await searchLocations(query)
    } else {
      clearSearch()
      setShowLocationSearch(false)
    }
  }, [searchLocations, clearSearch])

  const handleNearbySearch = useCallback(async () => {
    setShowLocationSearch(true)
    await searchNearMe()
  }, [searchNearMe])

  const handleLocationSelect = useCallback((location: LocationResult) => {
    setSelectedLocation(location)
    setLocationQuery(location.name)
    setShowLocationSearch(false)
    clearSearch()
  }, [clearSearch])

  const handleClearLocation = useCallback(() => {
    setSelectedLocation(null)
    setLocationQuery("")
    clearSearch()
  }, [clearSearch])

  // Tag functions
  const handleTagInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = currentTag.trim()
      if (tag && !tags.includes(tag)) {
        setTags(prev => [...prev, tag])
        setCurrentTag("")
      }
    }
  }, [currentTag, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }, [])

  // Form submission
  const handleSubmit = useCallback(async () => {
    if (!isStepValid(1) || !isStepValid(2)) {
      toast.error("Please complete all required steps")
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", content.trim())
      formData.append("type", type)
      
      if (title.trim()) formData.append("title", title.trim())
      if (type === "review" && rating > 0) formData.append("rating", rating.toString())
      if (selectedLocation) formData.append("locationId", selectedLocation.id)
      
      tags.forEach(tag => formData.append("tags[]", tag))
      selectedFiles.forEach(file => formData.append(`media`, file))
      selectedVideos.forEach(file => formData.append(`videos`, file))

      const result = await createPost(formData)

      if (result.success) {
        toast.success("Posted! 🎉")
        
        // Reset form
        setCurrentStep(1)
        setCompletedSteps([])
        setTitle("")
        setContent("")
        setType("post")
        setRating(0)
        setSelectedLocation(null)
        setLocationQuery("")
        setTags([])
        setSelectedFiles([])
        setSelectedVideos([])
        setPreviewUrls([])
        setVideoPreviewUrls([])
        
        onPostCreated?.()
      } else {
        throw new Error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }, [isStepValid, user.id, content, type, title, rating, selectedLocation, tags, selectedFiles, selectedVideos, onPostCreated])

  // Cleanup
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      videoPreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls, videoPreviewUrls])

  const progress = ((completedSteps.length + (isStepValid(currentStep) ? 1 : 0)) / STEPS.length) * 100

  // Mobile-first capture step
  const renderCaptureStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full"
    >
      {/* Mobile-first camera interface */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-4">
        {(previewUrls.length > 0 || videoPreviewUrls.length > 0) ? (
          // Show previews
          <div className="w-full space-y-4">
            <h2 className="text-xl font-bold text-center" style={{ color: 'var(--color-text)' }}>
              Your Capture
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {previewUrls.map((url, index) => (
                <motion.div
                  key={`image-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-2xl overflow-hidden group"
                >
                  <Image src={url} alt={`Preview ${index + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
              {videoPreviewUrls.map((url, index) => (
                <motion.div
                  key={`video-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-2xl overflow-hidden group"
                >
                  <video src={url} className="w-full h-full object-cover" controls />
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          // Show capture interface
          <div className="w-full text-center space-y-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mx-auto w-32 h-32 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              {isCameraLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-16 w-16 border-4 border-white border-t-transparent rounded-full"
                />
              ) : (
                <Camera className="h-16 w-16 text-white" />
              )}
            </motion.div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                {isCameraLoading 
                  ? "Opening Camera..." 
                  : isMobileDevice 
                    ? "Camera Ready!" 
                    : "Add Your Media"
                }
              </h2>
              <p className="text-gray-600">
                {isCameraLoading 
                  ? "Please allow camera permissions" 
                  : isMobileDevice 
                    ? "Camera should open automatically or tap below" 
                    : "Upload photos and videos to share"
                }
              </p>
            </div>

            {/* Mobile-first action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mx-auto">
              <Button
                type="button"
                onClick={handleCameraCapture}
                className={`flex-1 ${isMobileDevice ? 'h-16' : 'h-14'} text-lg font-semibold rounded-full ${
                  isMobileDevice ? 'animate-pulse' : ''
                }`}
                style={{ 
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  color: 'white'
                }}
              >
                <Camera className={`${isMobileDevice ? 'h-8 w-8' : 'h-6 w-6'} mr-3`} />
                {isMobileDevice ? "📸 Open Camera" : "Take Photo"}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 ${isMobileDevice ? 'h-16' : 'h-14'} text-lg font-semibold rounded-full border-2`}
                style={{ 
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary)'
                }}
              >
                <ImageIcon className={`${isMobileDevice ? 'h-8 w-8' : 'h-6 w-6'} mr-3`} />
                {isMobileDevice ? "📱 Gallery" : "Gallery"}
              </Button>
            </div>

            {!isMobileDevice && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-6 border-2 border-dashed rounded-2xl p-8 transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 text-sm">Or drag and drop files here</p>
              </div>
            )}

            {/* Mobile instruction text */}
            {isMobileDevice && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-4 p-3 bg-blue-50 rounded-2xl border border-blue-200"
              >
                <p className="text-blue-700 text-sm">
                  📋 <strong>Tip:</strong> Allow camera permissions when prompted for the best experience!
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Hidden inputs with enhanced mobile camera support */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment" // Use back camera by default
        multiple={false} // Single capture for mobile simplicity
        onChange={handleFileChange}
        className="hidden"
        // Additional mobile attributes
        style={{ display: 'none' }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture={isMobileDevice ? "environment" : undefined} // Only use capture on mobile
        multiple
        onChange={handleVideoChange}
        className="hidden"
      />
    </motion.div>
  )

  // Caption step
  const renderCaptionStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6 p-4"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Tell Your Story
        </h2>
        <p className="text-gray-600">Add a caption that brings your content to life</p>
      </div>

      {/* Post type selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Post Type
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: "post", label: "Post", icon: FileText },
            { value: "review", label: "Review", icon: Star },
            { value: "recommendation", label: "Tip", icon: Target }
          ] as const).map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={type === value ? "default" : "outline"}
              onClick={() => setType(value)}
              className={`h-12 rounded-2xl transition-all ${
                type === value
                  ? 'text-white'
                  : 'border-2'
              }`}
              style={type === value ? {
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
              } : {
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              <Icon className="h-5 w-5 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content textarea */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Caption *
        </Label>
        <div className="relative">
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening? Share your thoughts... ✨"
            className="min-h-[120px] text-base p-4 rounded-2xl border-2 resize-none"
            style={{
              borderColor: content ? 'var(--color-secondary)' : 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            maxLength={500}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            {content.length}/500
          </div>
        </div>
      </div>

      {/* Rating for reviews */}
      {type === "review" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Rating
          </Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-2 rounded-full transition-all ${
                  rating >= star ? 'text-yellow-500' : 'text-gray-300'
                }`}
              >
                <Star className={`h-8 w-8 ${rating >= star ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )

  // Details step
  const renderDetailsStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6 p-4"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Add Details
        </h2>
        <p className="text-gray-600">Help people discover your content</p>
      </div>

      {/* Location search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Location
        </Label>
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                value={locationQuery}
                onChange={(e) => handleLocationSearch(e.target.value)}
                placeholder="Add location..."
                className="pl-12 h-12 rounded-2xl border-2"
                style={{
                  borderColor: selectedLocation ? 'var(--color-secondary)' : 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleNearbySearch}
              className="h-12 px-4 rounded-2xl border-2"
              style={{
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)'
              }}
            >
              <Target className="h-5 w-5" />
            </Button>
          </div>

          {/* Location results */}
          <AnimatePresence>
            {showLocationSearch && locations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
              >
                {locations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-full flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {location.name}
                      </p>
                      <p className="text-sm text-gray-500">{location.address}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Tags
        </Label>
        <div className="space-y-2">
          <div className="relative">
            <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={handleTagInput}
              placeholder="Add tags..."
              className="pl-12 h-12 rounded-2xl border-2"
              style={{
                borderColor: tags.length > 0 ? 'var(--color-secondary)' : 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  className="px-3 py-1 text-sm rounded-full"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-text)'
                  }}
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  // Review step
  const renderReviewStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6 p-4"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          Ready to Share?
        </h2>
        <p className="text-gray-600">Review your post before publishing</p>
      </div>

      {/* Post preview */}
      <Card className="border-2 rounded-2xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <CardContent className="p-4">
          {/* Author info */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profileImage?.url || user.avatar} alt={user.name} />
              <AvatarFallback style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{user.name}</p>
              <p className="text-sm text-gray-500">
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {selectedLocation && ` • ${selectedLocation.name}`}
              </p>
            </div>
          </div>

          {/* Content */}
          <p className="mb-4 whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
            {content}
          </p>

          {/* Media preview */}
          {(previewUrls.length > 0 || videoPreviewUrls.length > 0) && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {previewUrls.slice(0, 4).map((url, index) => (
                <div key={`preview-${index}`} className="aspect-square rounded-lg overflow-hidden">
                  <Image src={url} alt={`Preview ${index + 1}`} fill className="object-cover" />
                </div>
              ))}
              {videoPreviewUrls.slice(0, 2).map((url, index) => (
                <div key={`video-preview-${index}`} className="aspect-square rounded-lg overflow-hidden relative">
                  <video src={url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Video className="h-8 w-8 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-sm" style={{ color: 'var(--color-primary)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <div className={`w-full h-full flex flex-col bg-white ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profileImage?.url || user.avatar} alt={user.name} />
              <AvatarFallback style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{user.name}</h3>
              <p className="text-sm text-gray-500">Create new post</p>
            </div>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Step {currentStep} of {STEPS.length}</span>
            <span className="text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
        </div>

        {/* Mobile step indicators */}
        <div className="flex justify-between mt-4 sm:hidden">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center gap-1 transition-all ${
                step.id === currentStep
                  ? 'opacity-100'
                  : step.id <= currentStep || completedSteps.includes(step.id)
                  ? 'opacity-75'
                  : 'opacity-30'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step.id === currentStep
                    ? 'text-white'
                    : step.id < currentStep || completedSteps.includes(step.id)
                    ? 'text-white'
                    : 'text-gray-400'
                }`}
                style={
                  step.id === currentStep || step.id < currentStep || completedSteps.includes(step.id)
                    ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }
                    : { backgroundColor: '#e5e7eb' }
                }
              >
                {step.id < currentStep || completedSteps.includes(step.id) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs font-medium">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Desktop step indicators */}
        <div className="hidden sm:flex justify-between mt-4">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                step.id === currentStep
                  ? 'opacity-100'
                  : step.id <= currentStep || completedSteps.includes(step.id)
                  ? 'opacity-75'
                  : 'opacity-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step.id === currentStep
                    ? 'text-white'
                    : step.id < currentStep || completedSteps.includes(step.id)
                    ? 'text-white'
                    : 'text-gray-400'
                }`}
                style={
                  step.id === currentStep || step.id < currentStep || completedSteps.includes(step.id)
                    ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }
                    : { backgroundColor: '#e5e7eb' }
                }
              >
                {step.id < currentStep || completedSteps.includes(step.id) ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {currentStep === 1 && renderCaptureStep()}
          {currentStep === 2 && renderCaptionStep()}
          {currentStep === 3 && renderDetailsStep()}
          {currentStep === 4 && renderReviewStep()}
        </AnimatePresence>
      </div>

      {/* Navigation footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2 h-12 px-6 rounded-2xl border-2"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={goToNextStep}
              disabled={!isStepValid(currentStep)}
              className="flex-1 h-12 text-lg font-semibold rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              Next
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-12 text-lg font-semibold rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Share Post
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnhancedPostForm 