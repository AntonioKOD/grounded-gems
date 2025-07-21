"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Camera, ImageIcon, MapPin, Send, X, Loader2, Video, FileText, Plus, Star, Hash, Tag, Folder, Target, Globe, ArrowLeft, ArrowRight, Check, Upload, Smartphone, AlertCircle, CheckCircle, Smile } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
// import { createPost } from "@/app/actions"
import { useLocationSearch, type LocationResult } from "@/hooks/useLocationSearch"
import Image from "next/image"
import { cn } from "@/lib/utils"

import { getImageUrl } from "@/lib/image-utils"

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
  onClose?: () => void
  className?: string
}

const STEPS = [
  { id: 1, title: "Content", description: "Add media & write your story", icon: Camera },
  { id: 2, title: "Share", description: "Review and publish", icon: Send }
] as const

// Enhanced mobile detection - memoized
const isMobile = () => {
  if (typeof window === 'undefined') return false
  
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isMobileWidth = window.innerWidth <= 768
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  return (hasTouchScreen && isMobileWidth) || isMobileUserAgent
}

// Form validation - memoized
const validateStep = (step: number, data: {
  selectedFiles: File[]
  selectedVideos: File[]
  content: string
  title: string
  type: string
  rating: number
}) => {
  const errors: string[] = []
  
  if (step === 1) {
    // Step 1: Content - require either content or media
    if (!data.content.trim() && data.selectedFiles.length === 0 && data.selectedVideos.length === 0) {
      errors.push("Please add some content or media to share")
    }
    
    if (data.content.length > 500) {
      errors.push("Content cannot exceed 500 characters")
    }
  }
  
  if (step === 2) {
    // Step 2: Share - final validation
    if (!data.content.trim() && data.selectedFiles.length === 0 && data.selectedVideos.length === 0) {
      errors.push("Please add some content or media to share")
    }
    
    if (data.type === "review" && data.rating === 0) {
      errors.push("Please add a rating for your review")
    }
  }
  
  return errors
}

export function EnhancedPostForm({ user, onPostCreated, onCancel, onClose, className = "" }: EnhancedPostFormProps) {
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  
  // Camera state
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isProcessingFiles, setIsProcessingFiles] = useState(false)

  // Basic form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState<"post" | "review" | "recommendation">("post")
  const [rating, setRating] = useState<number>(0)

  // Media state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedVideos, setSelectedVideos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([])

  // Location state (simplified - removing problematic location search hook)
  const [locationName, setLocationName] = useState("")
  const [locationQuery, setLocationQuery] = useState("")
  const [isSearchingLocations, setIsSearchingLocations] = useState(false)
  const [showLocationResults, setShowLocationResults] = useState(false)
  const [locationResults, setLocationResults] = useState<LocationResult[]>([])

  // Tags state
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")

  // Detect mobile device on mount only
  useEffect(() => {
    setIsMobileDevice(isMobile())
  }, [])

  // Memoized validation data
  const validationData = useMemo(() => ({
    selectedFiles,
    selectedVideos,
    content,
    title,
    type,
    rating
  }), [selectedFiles, selectedVideos, content, title, type, rating])

  // Validate current step - properly memoized
  const isStepValid = useMemo(() => {
    const stepErrors = validateStep(currentStep, validationData)
    setErrors(stepErrors)
    return stepErrors.length === 0
  }, [currentStep, validationData])

  // Navigation functions with proper dependencies
  const goToNextStep = useCallback(() => {
    if (currentStep < STEPS.length && isStepValid) {
      setCompletedSteps(prev => [...prev, currentStep])
      setCurrentStep(prev => prev + 1)
      setErrors([])
      
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }, [currentStep, isStepValid])

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      setErrors([])
    }
  }, [currentStep])

  // Enhanced camera capture
  const handleCameraCapture = useCallback(async () => {
    if (!cameraInputRef.current) return
    
    setIsCameraLoading(true)
    setCameraError(null)
    
    try {
      // Check camera permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop())
      }
      
      cameraInputRef.current.click()
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(100)
      }
      
    } catch (error) {
      console.error('Camera access error:', error)
      setCameraError("Camera access denied. Please use gallery instead.")
      toast.error("Camera access denied. Please use gallery instead.")
    } finally {
      setTimeout(() => setIsCameraLoading(false), 1000)
    }
  }, [])

  // Enhanced drag and drop with better feedback
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const videoFiles = files.filter(file => file.type.startsWith('video/'))
    
    if (imageFiles.length > 0 || videoFiles.length > 0) {
      processFiles(files)
      toast.success(`Added ${imageFiles.length + videoFiles.length} file(s)`)
    } else {
      toast.error("Please drop image or video files only")
    }
  }, [])

  // Process files with validation and progress - removed auto-advancing logic
  const processFiles = useCallback(async (files: File[]) => {
    const MAX_FILES = 10
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
    
    console.log('📝 EnhancedPostForm: Starting file processing...', {
      totalFiles: files.length,
      currentFileCount: selectedFiles.length + selectedVideos.length,
      fileTypes: files.map(f => f.type),
      fileNames: files.map(f => f.name)
    })
    
    const currentFileCount = selectedFiles.length + selectedVideos.length
    if (currentFileCount + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`)
      return
    }
    
    const validFiles: File[] = []
    const validImages: File[] = []
    const validVideos: File[] = []

    
    for (const file of files) {
      console.log(`📝 Processing file: ${file.name}`, {
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        isImage: file.type.startsWith('image/'),
        isVideo: file.type.startsWith('video/'),
        isLivePhoto: file.type === 'image/heic' || file.type === 'image/heif'
      })
      
      // Validate file type
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE) {
          console.log(`📝 Image file too large: ${file.name}`)
          toast.error(`${file.name} is too large. Max size: 10MB`)
          continue
        }
        // Comprehensive image format support (excluding Live Photos)
        const allowedImageTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
          'image/avif', 'image/bmp', 'image/tiff', 'image/tif',
          'image/ico', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/jp2', 'image/jpx',
          'image/jpm', 'image/psd', 'image/raw', 'image/x-portable-bitmap', 'image/x-portable-pixmap'
        ]
        if (!allowedImageTypes.includes(file.type.toLowerCase())) {
          console.log(`📝 Invalid image type: ${file.type}`)
          toast.error(`${file.name} is not a supported image format. Supported formats: JPEG, PNG, WebP, GIF, SVG, AVIF, BMP, TIFF, ICO, and more. Live Photos (HEIC/HEIF) are not yet supported.`)
          continue
        }
        
        // Check for Live Photos - currently not supported
        if (file.type === 'image/heic' || file.type === 'image/heif') {
          console.log(`📝 Live Photo detected but not supported: ${file.name}`)
          toast.error(`${file.name} is a Live Photo. Please convert to regular photo before uploading. Live Photo support is coming soon!`)
          continue // Skip this file
        }
        
        validImages.push(file)
        validFiles.push(file)
        console.log(`📝 Image file validated: ${file.name}`)
      } else if (file.type.startsWith('video/')) {
        console.log(`📝 Processing video file: ${file.name}`)
        
        if (file.size > MAX_VIDEO_SIZE) {
          console.log(`📝 Video file too large: ${file.name}`)
          toast.error(`${file.name} is too large. Max size: 50MB`)
          continue
        }
        
        // Enhanced video format support
        const allowedVideoTypes = [
          'video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/quicktime', 'video/avi',
          'video/m4v', 'video/3gp', 'video/flv', 'video/wmv', 'video/mkv'
        ]
        if (!allowedVideoTypes.includes(file.type.toLowerCase())) {
          console.log(`📝 Invalid video type: ${file.type}`)
          toast.error(`${file.name} is not a supported video format. Please use MP4, WebM, OGG, MOV, AVI, or other common formats.`)
          continue
        }
        
        // Check video duration (optional - prevent extremely long videos)
        const video = document.createElement('video')
        video.src = URL.createObjectURL(file)
        try {
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
              console.log(`📝 Video duration: ${video.duration} seconds`)
              if (video.duration > 600) { // 10 minutes max
                reject(new Error('Video too long'))
              } else {
                resolve(video.duration)
              }
            }
            video.onerror = () => reject(new Error('Invalid video'))
          })
          console.log(`📝 Video duration check passed: ${file.name}`)
        } catch (error) {
          console.log(`📝 Video duration check failed: ${file.name}`, error)
          toast.error(`${file.name} is invalid or too long (max 10 minutes).`)
          URL.revokeObjectURL(video.src)
          continue
        }
        
        validVideos.push(file)
        validFiles.push(file)
        console.log(`📝 Video file validated: ${file.name}`)
      } else {
        console.log(`📝 Unsupported file type: ${file.type}`)
        toast.error(`${file.name} is not a supported file type. Please choose images or videos only.`)
        continue
      }
    }
    
    console.log(`📝 File processing complete:`, {
      totalFiles: files.length,
      validFiles: validFiles.length,
      validImages: validImages.length,
      validVideos: validVideos.length,

      validFileTypes: validFiles.map(f => f.type),
      validFileNames: validFiles.map(f => f.name)
    })
    
    if (validFiles.length === 0) return
    

    
    // Add files and create previews
    setSelectedFiles(prev => [...prev, ...validImages])
    setSelectedVideos(prev => [...prev, ...validVideos])
    
    // Create preview URLs
    const imagePreviewUrls = validImages.map(file => URL.createObjectURL(file))
    const videoPreviewUrls = validVideos.map(file => URL.createObjectURL(file))
    
    setPreviewUrls(prev => [...prev, ...imagePreviewUrls])
    setVideoPreviewUrls(prev => [...prev, ...videoPreviewUrls])
  }, [selectedFiles.length, selectedVideos.length])

  // Enhanced file change handlers
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
    // Reset input to allow same file selection
    e.target.value = ''
  }, [processFiles])

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📹 Video input change event triggered')
    console.log('📹 Video input files:', e.target.files)
    const files = Array.from(e.target.files || [])
    console.log('📹 Video files selected:', files.length)
    if (files.length > 0) {
      console.log('📹 Video file details:', files.map(f => ({ name: f.name, type: f.type, size: f.size })))
      processFiles(files)
    } else {
      console.log('📹 No video files selected')
    }
    // Reset input to allow same file selection
    e.target.value = ''
  }, [processFiles])

  // Remove media with confirmation
  const removeFile = useCallback((index: number, type: 'image' | 'video') => {
    if (type === 'image') {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
      setPreviewUrls(prev => {
        URL.revokeObjectURL(prev[index] || '')
        return prev.filter((_, i) => i !== index)
      })
    } else {
      setSelectedVideos(prev => prev.filter((_, i) => i !== index))
      setVideoPreviewUrls(prev => {
        URL.revokeObjectURL(prev[index] || '')
        return prev.filter((_, i) => i !== index)
      })
    }
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }, [])

  // Enhanced tag functions
  const handleTagInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = currentTag.trim().toLowerCase()
      
      if (!tag) return
      
      if (tag.length < 2) {
        toast.error("Tags must be at least 2 characters long")
        return
      }
      
      if (tag.length > 20) {
        toast.error("Tags cannot exceed 20 characters")
        return
      }
      
      if (tags.length >= 10) {
        toast.error("Maximum 10 tags allowed")
        return
      }
      
      if (tags.includes(tag)) {
        toast.error("Tag already added")
        return
      }
      
      setTags(prev => [...prev, tag])
      setCurrentTag("")
      
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
    }
  }, [currentTag, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }, [])

  // Enhanced form submission
  const handleSubmit = useCallback(async () => {
    // Final validation
    for (let step = 1; step <= 2; step++) { // Only validate required steps
      const stepErrors = validateStep(step, validationData)
      if (stepErrors.length > 0) {
        toast.error(`Please complete step ${step}`)
        setCurrentStep(step)
        return
      }
    }

    setIsSubmitting(true)
    setMediaUploadProgress(0)

    try {
      console.log('📝 EnhancedPostForm: Starting form submission...', {
        contentLength: content.length,
        imageFiles: selectedFiles.length,
        videoFiles: selectedVideos.length,
        fileTypes: [...selectedFiles.map(f => f.type), ...selectedVideos.map(f => f.type)],
        fileNames: [...selectedFiles.map(f => f.name), ...selectedVideos.map(f => f.name)]
      })
      
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", content.trim())
      formData.append("type", type)
      
      if (title.trim()) formData.append("title", title.trim())
      if (type === "review" && rating > 0) formData.append("rating", rating.toString())
      if (locationName.trim()) formData.append("locationName", locationName.trim())
      
      tags.forEach(tag => formData.append("tags[]", tag))
      
      // Add media files with enhanced debugging
      console.log('📝 Adding image files to FormData...')
      selectedFiles.forEach((file, index) => {
        console.log(`📝 Adding image ${index + 1}: ${file.name} (${file.type})`)
        formData.append(`images`, file)
        setMediaUploadProgress((index + 1) / (selectedFiles.length + selectedVideos.length) * 50)
      })
      
      console.log('📝 Adding video files to FormData...')
      selectedVideos.forEach((file, index) => {
        console.log(`📝 Adding video ${index + 1}: ${file.name} (${file.type})`)
        formData.append(`videos`, file)
        setMediaUploadProgress(50 + ((index + 1) / selectedVideos.length) * 50)
      })

      console.log('📝 Submitting to API...')
      // Use API route instead of server action
      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      })

      console.log('📝 API response received:', {
        status: response.status,
        statusText: response.statusText
      })

      const result = await response.json()
      console.log('📝 API result:', result)

      if (!response.ok) {
        console.error('📝 API response error:', {
          status: response.status,
          statusText: response.statusText,
          result: result
        })
        throw new Error(result.message || 'Failed to create post')
      }

      if (result.success) {
        console.log('📝 Post created successfully:', result)
        toast.success("Post shared successfully!")
        
        // Reset form
        setCurrentStep(1)
        setCompletedSteps([])
        setTitle("")
        setContent("")
        setType("post")
        setRating(0)
        setLocationName("")
        setTags([])
        setSelectedFiles([])
        setSelectedVideos([])
        setPreviewUrls([])
        setVideoPreviewUrls([])
        setErrors([])
        
        // Add success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
        
        // Call onPostCreated callback
        onPostCreated?.()
        
        // Redirect to feed
        window.location.href = "/feed"
      } else {
        console.error('📝 API returned success: false:', result)
        throw new Error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create post")
      
      // Add error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    } finally {
      setIsSubmitting(false)
      setMediaUploadProgress(0)
    }
  }, [validationData, user.id, content, type, title, rating, locationName, tags, selectedFiles, selectedVideos, onPostCreated])

  // Cleanup
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      videoPreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls, videoPreviewUrls])

  // Memoized progress calculation
  const progress = useMemo(() => {
    return ((completedSteps.length + (isStepValid ? 1 : 0)) / STEPS.length) * 100
  }, [completedSteps.length, isStepValid])

  // Get user initials - memoized
  const userInitials = useMemo(() => {
    return user.name.substring(0, 2).toUpperCase()
  }, [user.name])

  // Enhanced location search hook
  const { searchLocations, isLoading: isSearching } = useLocationSearch()

  // Handle location selection
  const handleLocationSelect = useCallback((location: LocationResult) => {
    setLocationName(location.name)
    setLocationQuery("")
    setShowLocationResults(false)
    setIsSearchingLocations(false)
  }, [])

  // Mobile-first content step with enhanced UX - memoized
  const renderContentStep = useCallback(() => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full"
    >
      {/* Error alerts */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4"
          >
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        {cameraError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4"
          >
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {cameraError}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        

      </AnimatePresence>

      {/* Live Photo Warning */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="p-4"
      >
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Live Photos Not Supported:</strong> iPhone Live Photos (HEIC/HEIF format) are not yet supported. Please convert to regular photos before uploading. Support coming soon!
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Content Input */}
      <div className="flex-1 p-4 space-y-4">
        {/* Content Textarea */}
        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm font-medium text-gray-700">
            What's on your mind?
          </Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts, experiences, or discoveries..."
            className="min-h-[120px] resize-none text-base"
            maxLength={500}
          />
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              {content.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Smile className="h-3 w-3 mr-1" />
                  Looking good!
                </Badge>
              )}
            </div>
            <span className={`text-xs ${
              content.length > 450 ? 'text-red-500 font-medium' : 'text-gray-400'
            }`}>
              {content.length}/500
            </span>
          </div>
        </div>

        {/* Media Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700">
              Add Media (Optional)
            </Label>
            <span className="text-xs text-gray-500">
              {selectedFiles.length + selectedVideos.length}/10
            </span>
          </div>

          {(previewUrls.length > 0 || videoPreviewUrls.length > 0) ? (
            // Show previews with enhanced mobile grid
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {previewUrls.map((url, index) => (
                  <motion.div
                    key={`image-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square rounded-2xl overflow-hidden group bg-gray-100"
                    style={{ maxHeight: '160px' }}
                  >
                    <Image 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 160px"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index, 'image')}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity touch:opacity-100"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                      IMG
                    </div>
                  </motion.div>
                ))}
                
                {videoPreviewUrls.map((url, index) => (
                  <motion.div
                    key={`video-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square rounded-2xl overflow-hidden group bg-gray-100"
                    style={{ maxHeight: '160px' }}
                  >
                    <video src={url} className="w-full h-full object-cover" muted playsInline />
                    <button
                      type="button"
                      onClick={() => removeFile(index, 'video')}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity touch:opacity-100"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                      VID
                    </div>
                  </motion.div>
                ))}
                
                {/* Add more button */}
                {selectedFiles.length + selectedVideos.length < 10 && (
                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-gray-400 transition-colors bg-gray-50"
                    style={{ minHeight: '44px', maxHeight: '160px' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="h-8 w-8 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Add</span>
                  </motion.button>
                )}
              </div>
            </div>
          ) : (
            // Show capture interface with improved mobile UX
            <div className="text-center space-y-4">
              <motion.div
                animate={{ scale: isCameraLoading ? [1, 1.1, 1] : [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
              >
                {isCameraLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-12 w-12 border-4 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <Camera className="h-12 w-12 text-white" />
                )}
              </motion.div>
              
              <div>
                <h3 className="text-lg font-semibold mb-1 text-gray-900">
                  {isCameraLoading 
                    ? "Opening Camera..." 
                    : "Add Photos & Videos"
                  }
                </h3>
                <p className="text-gray-600 text-sm">
                  {isCameraLoading 
                    ? "Please allow camera permissions when prompted" 
                    : "Take photos/videos or choose from gallery"
                  }
                </p>
              </div>

              {/* Mobile-optimized action buttons */}
              <div className="flex gap-3 justify-center">
                {/* Camera Button */}
                <Button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={isCameraLoading}
                  className="h-12 px-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  style={{ minHeight: '48px', minWidth: '80px' }}
                >
                  {isCameraLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Camera
                    </>
                  )}
                </Button>

                {/* Gallery Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size={isMobileDevice ? "sm" : "sm"}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFiles}
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} text-green-600 hover:text-green-700 hover:bg-green-50 transition-all flex-shrink-0 disabled:opacity-50`}
                  style={{ minHeight: '40px', minWidth: '60px' }}
                >
                  <ImageIcon className="h-4 w-4" />
                  {!isMobileDevice && <span className="ml-1">Media</span>}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Location Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Location (Optional)
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Search for a location..."
              className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500"
            />
            {isSearchingLocations && (
              <Loader2 className="absolute right-12 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          
          {/* Location Results */}
          {showLocationResults && locationResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
              {locationResults.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleLocationSelect(location)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-600">{location.address}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post Type and Rating */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Post Type
            </Label>
            <Select value={type} onValueChange={(value: "post" | "review" | "recommendation") => setType(value)}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "review" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Rating
              </Label>
              <Select value={rating.toString()} onValueChange={(value) => setRating(parseInt(value))}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⭐ 1 Star</SelectItem>
                  <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  ), [content, selectedFiles, selectedVideos, previewUrls, videoPreviewUrls, errors, cameraError, isCameraLoading, isProcessingFiles, locationQuery, showLocationResults, locationResults, type, rating, isSearchingLocations, handleCameraCapture, removeFile, handleLocationSelect, handleFileChange, handleVideoChange])

  // Caption step - memoized
  const renderCaptionStep = useCallback(() => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6 p-4"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">
          Tell Your Story
        </h2>
        <p className="text-gray-600">Add a caption that brings your content to life</p>
      </div>

      {/* Post type selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900">
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
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  : 'border-2 border-blue-500 text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Icon className="h-5 w-5 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content textarea */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm font-medium text-gray-900">
          Caption *
        </Label>
        <div className="relative">
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening? Share your thoughts..."
            className="min-h-[120px] text-base p-4 rounded-2xl border-2 resize-none text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
          <Label className="text-sm font-medium text-gray-900">
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
  ), [type, content, rating])

  // Details step - memoized
  const renderDetailsStep = useCallback(() => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6 p-4"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">
          Add Details
        </h2>
        <p className="text-gray-600">Help people discover your content</p>
      </div>

      {/* Location search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-900">
          Location
        </Label>
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Add location..."
                className="pl-12 h-12 rounded-2xl border-2 border-gray-300 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-900">
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
              className="pl-12 h-12 rounded-2xl border-2 border-gray-300 focus:border-blue-500 text-gray-900"
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800"
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
  ), [locationName, currentTag, tags, handleTagInput, removeTag])

  // Review step - memoized
  const renderReviewStep = useCallback(() => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6 p-4"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">
          Ready to Share?
        </h2>
        <p className="text-gray-600">Review your post before publishing</p>
      </div>

      {/* Post preview */}
      <Card className="border-2 rounded-2xl overflow-hidden border-gray-200">
        <CardContent className="p-4">
          {/* Author info */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getImageUrl(user.profileImage?.url || user.avatar)} alt={user.name} />
              <AvatarFallback className="bg-blue-500 text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {locationName && ` • ${locationName}`}
              </p>
            </div>
          </div>

          {/* Content */}
          <p className="mb-4 whitespace-pre-wrap text-gray-900">
            {content}
          </p>

          {/* Media preview */}
          {(previewUrls.length > 0 || videoPreviewUrls.length > 0) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Media Preview</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md mx-auto">
                {previewUrls.slice(0, 6).map((url, index) => (
                  <div key={`preview-${index}`} className="aspect-square rounded-lg overflow-hidden bg-gray-100" style={{ maxHeight: '120px' }}>
                    <Image 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 120px"
                    />
                  </div>
                ))}
                {videoPreviewUrls.slice(0, 3).map((url, index) => (
                  <div key={`video-preview-${index}`} className="aspect-square rounded-lg overflow-hidden relative bg-gray-100" style={{ maxHeight: '120px' }}>
                    <video src={url} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-sm text-blue-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  ), [user.profileImage?.url, user.avatar, user.name, userInitials, type, locationName, content, previewUrls, videoPreviewUrls, tags])

  return (
    <div className={`w-full h-full flex flex-col bg-white ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getImageUrl(user.profileImage?.url || user.avatar)} alt={user.name} />
              <AvatarFallback className="bg-blue-500 text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-500">Create new post</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
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
                    ? 'text-white bg-gradient-to-br from-blue-500 to-purple-600'
                    : step.id < currentStep || completedSteps.includes(step.id)
                    ? 'text-white bg-gradient-to-br from-blue-500 to-purple-600'
                    : 'text-gray-400 bg-gray-200'
                }`}
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
                    ? 'text-white bg-gradient-to-br from-blue-500 to-purple-600'
                    : step.id < currentStep || completedSteps.includes(step.id)
                    ? 'text-white bg-gradient-to-br from-blue-500 to-purple-600'
                    : 'text-gray-400 bg-gray-200'
                }`}
              >
                {step.id < currentStep || completedSteps.includes(step.id) ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">
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
          {currentStep === 1 && renderContentStep()}
          {currentStep === 2 && renderReviewStep()}
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
            className="flex items-center gap-2 h-10 px-4 rounded-2xl border-2 border-gray-300 text-gray-700 hover:border-gray-400 flex-shrink-0"
            style={{ minWidth: '80px' }}
          >
            <ArrowLeft className="h-4 w-4" />
            {isMobileDevice ? "Back" : "Back"}
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={goToNextStep}
              disabled={!isStepValid}
              className="flex-1 h-10 text-base font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 min-w-0"
              style={{ minWidth: '100px' }}
            >
              {isMobileDevice ? "Next" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-10 text-base font-semibold rounded-2xl text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 min-w-0"
              style={{ minWidth: '100px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isMobileDevice ? "Sharing..." : "Sharing..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isMobileDevice ? "Share" : "Share Post"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/bmp,image/tiff,image/tif,image/ico,image/x-icon,image/vnd.microsoft.icon,image/jp2,image/jpx,image/jpm,image/psd,image/raw,image/x-portable-bitmap,image/x-portable-pixmap,video/*"
        capture="environment"
        multiple={false}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Capture photo or video"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/bmp,image/tiff,image/tif,image/ico,image/x-icon,image/vnd.microsoft.icon,image/jp2,image/jpx,image/jpm,image/psd,image/raw,image/x-portable-bitmap,image/x-portable-pixmap,video/*,.mp4,.webm,.ogg,.mov,.avi,.m4v,.3gp,.flv,.wmv,.mkv"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-label="Choose photos and videos from gallery"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.ogg,.mov,.avi,.m4v,.3gp,.flv,.wmv,.mkv"
        multiple
        onChange={handleVideoChange}
        className="hidden"
        aria-label="Choose videos from gallery"
      />
    </div>
  )
}

export default EnhancedPostForm 