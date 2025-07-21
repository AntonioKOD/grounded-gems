"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, MapPin, Loader2, X, Send, ImageIcon, Video, Smile, AlertCircle, CheckCircle, Upload } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { upload } from '@vercel/blob/client'
import heic2any from "heic2any";

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
// Remove the server action import
// import { createPost } from "@/app/actions"

interface UserData {
  id: string
  name?: string
  email: string
  avatar?: string
  profileImage?: {
    url: string
  }
}

interface CreatePostFormProps {
  isEmbedded?: boolean
  onSuccess?: () => void
  className?: string
}

// Enhanced mobile detection
const isMobile = () => {
  if (typeof window === 'undefined') return false
  
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isMobileWidth = window.innerWidth <= 768
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  return (hasTouchScreen && isMobileWidth) || isMobileUserAgent
}

export default function CreatePostForm({ 
  isEmbedded = false, 
  onSuccess,
  className = "" 
}: CreatePostFormProps) {
  const router = useRouter()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // State for user data
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Form state
  const [postContent, setPostContent] = useState("")
  const [locationName, setLocationName] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string; address: string } | null>(null)
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [locationQuery, setLocationQuery] = useState("")
  const [locationResults, setLocationResults] = useState<Array<{ id: string; name: string; address: string }>>([])
  const [isSearchingLocations, setIsSearchingLocations] = useState(false)
  const [showLocationResults, setShowLocationResults] = useState(false)

  // Media state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [videoDurations, setVideoDurations] = useState<Record<number, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isProcessingFiles, setIsProcessingFiles] = useState(false)
  

  const [uploadedMediaIds, setUploadedMediaIds] = useState<string[]>([])

  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({})

  // Validation state
  const [errors, setErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    setIsMobileDevice(isMobile())
  }, [])

  // Validate form
  useEffect(() => {
    const newErrors: string[] = []
    
    if (!postContent.trim()) {
      newErrors.push("Please write something to share")
    }
    
    if (postContent.length > 500) {
      newErrors.push("Caption cannot exceed 500 characters")
    }
    
    setErrors(newErrors)
    setIsValid(newErrors.length === 0)
  }, [postContent])

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch user data")
        }

        const { user } = await res.json()
        setUser(user)
      } catch (error) {
        console.error("Error fetching user:", error)
        toast.error("Please log in to create a post")
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [router])

  // Enhanced camera capture
  const handleCameraCapture = async () => {
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
  }




  // Enhanced file handling with validation
  const processFiles = async (files: File[]) => {
    const MAX_FILES = 5
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
    
    console.log('📝 processFiles: Starting file processing...', {
      totalFiles: files.length,
      currentSelectedFiles: selectedFiles.length,
      fileTypes: files.map(f => f.type),
      fileNames: files.map(f => f.name)
    })
    
    if (selectedFiles.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`)
      return
    }
    
    setIsProcessingFiles(true)
    
    const validFiles: File[] = []
    const newPreviewUrls: string[] = []
    
    for (const file of files) {
      console.log(`📝 Processing file: ${file.name}`, {
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        isImage: file.type.startsWith('image/'),
        isVideo: file.type.startsWith('video/')
      })
      
      // Validate file type and size based on type
      if (file.type.startsWith('image/')) {
        // Validate image size
        if (file.size > MAX_IMAGE_SIZE) {
          console.log(`📝 Image file too large: ${file.name}`)
          toast.error(`${file.name} is too large. Max size for images: 10MB`)
          continue
        }
        
        // Validate image format - comprehensive support for modern and legacy formats (excluding Live Photos)
        const allowedImageTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
          'image/avif', 'image/bmp', 'image/tiff', 'image/tif',
          'image/ico', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/jp2', 'image/jpx',
          'image/jpm', 'image/psd', 'image/raw', 'image/x-portable-bitmap', 'image/x-portable-pixmap'
        ]
        // Check if this is a HEIC/HEIF file (Live Photos)
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
        if (isHeic) {
          try {
            toast.info(`Converting ${file.name} to JPEG...`);
            const jpegBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.8,
            });
            const jpegFile = new File(
              [jpegBlob as BlobPart],
              file.name.replace(/\.(heic|heif)$/i, ".jpg"),
              { type: "image/jpeg" }
            );
            validFiles.push(jpegFile);
            newPreviewUrls.push(URL.createObjectURL(jpegFile));
            toast.success(`${file.name} converted to JPEG!`);
          } catch (err) {
            toast.error(`Failed to convert ${file.name}: ${err instanceof Error ? err.message : err}`);
            continue;
          }
          continue; // Skip the rest of the image logic for this file
        }
        if (!allowedImageTypes.includes(file.type.toLowerCase())) {
          console.log(`📝 Invalid image type: ${file.type}`)
          toast.error(`${file.name} is not a supported image format. Supported formats: JPEG, PNG, WebP, GIF, SVG, AVIF, BMP, TIFF, ICO, and more.`)
          continue
        }
        console.log(`📝 Image file validated: ${file.name}`)
      } else if (file.type.startsWith('video/')) {
        console.log(`📝 Processing video file: ${file.name}`)
        
        // Validate video size
        if (file.size > MAX_VIDEO_SIZE) {
          console.log(`📝 Video file too large: ${file.name}`)
          toast.error(`${file.name} is too large. Max size for videos: 50MB`)
          continue
        }
        
        // Validate video format - match backend validation
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/quicktime', 'video/avi']
        if (!allowedVideoTypes.includes(file.type.toLowerCase())) {
          console.log(`📝 Invalid video type: ${file.type}`)
          toast.error(`${file.name} is not a supported video format. Please use MP4, WebM, OGG, MOV, or AVI.`)
          continue
        }
        
        console.log(`📝 Video file validated: ${file.name}`)
        
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
      } else {
        console.log(`📝 Unsupported file type: ${file.type}`)
        toast.error(`${file.name} is not a supported file type. Please choose images or videos only.`)
        continue
      }
      
      validFiles.push(file)
      newPreviewUrls.push(URL.createObjectURL(file))
      console.log(`📝 File added to valid files: ${file.name}`)
    }
    
    console.log(`📝 File processing complete:`, {
      totalFiles: files.length,
      validFiles: validFiles.length,
      validFileTypes: validFiles.map(f => f.type),
      validFileNames: validFiles.map(f => f.name)
    })
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])
      
      // Load video durations
      validFiles.forEach((file, index) => {
        if (file.type.startsWith('video/')) {
          console.log(`📝 Loading video duration for: ${file.name}`)
          const video = document.createElement('video')
          video.src = newPreviewUrls[index] || ''
          video.onloadedmetadata = () => {
            const duration = video.duration
            const minutes = Math.floor(duration / 60)
            const seconds = Math.floor(duration % 60)
            const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`
            console.log(`📝 Video duration loaded: ${file.name} - ${durationString}`)
            setVideoDurations(prev => ({
              ...prev,
              [selectedFiles.length + index]: durationString
            }))
          }
        }
      })
      
      toast.success(`Added ${validFiles.length} file(s)`)
    }
    
    setIsProcessingFiles(false)
  }

  // File input handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    console.log('📝 handleFileChange: Files selected:', {
      totalFiles: files.length,
      fileTypes: files.map(f => f.type),
      fileNames: files.map(f => f.name),
      inputType: e.target.accept
    })
    
    if (files.length > 0) {
      await processFiles(files)
    } else {
      console.log('📝 handleFileChange: No files selected')
    }
    e.target.value = ''
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFiles(files)
    }
  }

  // Remove file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index] || '')
      return prev.filter((_, i) => i !== index)
    })
    
    // Clean up video duration
    setVideoDurations(prev => {
      const newDurations = { ...prev }
      delete newDurations[index]
      // Re-index remaining durations
      const reindexed: Record<number, string> = {}
      Object.entries(newDurations).forEach(([key, value]) => {
        const keyIndex = parseInt(key)
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = value
        } else if (keyIndex < index) {
          reindexed[keyIndex] = value
        }
      })
      return reindexed
    })
    
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  // Location search functionality
  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setLocationResults([])
      setShowLocationResults(false)
      return
    }

    setIsSearchingLocations(true)
    try {
      const response = await fetch(`/api/locations/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.locations) {
          const formattedLocations = data.locations.map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            address: typeof loc.address === 'string' 
              ? loc.address 
              : [loc.address?.street, loc.address?.city, loc.address?.state].filter(Boolean).join(', ')
          }))
          setLocationResults(formattedLocations)
          setShowLocationResults(true)
        } else {
          setLocationResults([])
          setShowLocationResults(false)
        }
      } else {
        console.error('Location search failed:', response.statusText)
        setLocationResults([])
        setShowLocationResults(false)
      }
    } catch (error) {
      console.error('Location search error:', error)
      setLocationResults([])
      setShowLocationResults(false)
    } finally {
      setIsSearchingLocations(false)
    }
  }

  // Debounced location search
  useEffect(() => {
    if (locationQuery.length < 2) {
      setLocationResults([])
      setShowLocationResults(false)
      return
    }

    const timeoutId = setTimeout(() => {
      searchLocations(locationQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [locationQuery])

  // Handle location selection
  const handleLocationSelect = (location: { id: string; name: string; address: string }) => {
    setSelectedLocation(location)
    setLocationName(location.name)
    setLocationQuery("")
    setShowLocationResults(false)
    setLocationResults([])
  }

  // Handle location clear
  const handleLocationClear = () => {
    setSelectedLocation(null)
    setLocationName("")
    setLocationQuery("")
    setShowLocationResults(false)
    setLocationResults([])
  }

  // Reset form
  const resetForm = () => {
    setPostContent("")
    setLocationName("")
    setSelectedLocation(null)
    setLocationQuery("")
    setLocationResults([])
    setShowLocationResults(false)
    setSelectedFiles([])
    previewUrls.forEach(url => URL.revokeObjectURL(url))
    setPreviewUrls([])
    setVideoDurations({})
    setShowLocationInput(false)
    setErrors([])
    
    // Reset file inputs
    if (imageInputRef.current) imageInputRef.current.value = ""
    if (videoInputRef.current) videoInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error("Please log in to create a post")
      return
    }

    if (!isValid) {
      toast.error("Please fix the errors before submitting")
      return
    }

    setIsSubmitting(true)

      // All files are regular files (Live Photos are filtered out during processing)
      const regularFiles = selectedFiles

      console.log('📝 Form submission - file breakdown:', {
        totalFiles: selectedFiles.length,
        regularFiles: regularFiles.length,
        regularFileNames: regularFiles.map(f => f.name)
      })

      try {
        const formData = new FormData()
      formData.append("content", postContent.trim())
      formData.append("postType", "general")

      if (selectedLocation) {
        formData.append("locationId", selectedLocation.id)
      } else if (locationName.trim()) {
        // Handle location name if no location selected
        formData.append("locationName", locationName.trim())
      }
      
      // Enhanced debugging for file processing
      console.log('📝 handleSubmit: Processing regular files for submission...', {
        totalFiles: regularFiles.length,
        fileTypes: regularFiles.map(f => f.type),
        fileNames: regularFiles.map(f => f.name),
        fileSizes: regularFiles.map(f => `${f.name}: ${(f.size / 1024 / 1024).toFixed(2)}MB`)
      })
      
      regularFiles.forEach((file, index) => {
        console.log(`📝 Processing regular file ${index + 1}: ${file.name}`, {
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          isImage: file.type.startsWith('image/'),
          isVideo: file.type.startsWith('video/')
        })
        
        if (file.type.startsWith('image/')) {
          formData.append("images", file)
          console.log(`📝 Added regular image to FormData: ${file.name}`)
        } else if (file.type.startsWith('video/')) {
          formData.append("videos", file)
          console.log(`📝 Added video to FormData: ${file.name}`)
        }
      })



      // Debug info
      console.log('📝 CreatePostForm: Submitting post with files:', {
        totalFiles: regularFiles.length,
        imageFiles: regularFiles.filter(f => f.type.startsWith('image/')).length,
        videoFiles: regularFiles.filter(f => f.type.startsWith('video/')).length,
        fileTypes: regularFiles.map(f => f.type),
        fileSizes: regularFiles.map(f => `${f.name}: ${(f.size / 1024 / 1024).toFixed(2)}MB`)
      })

      // Use API route instead of server action
      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      })

      const result = await response.json()

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
        resetForm()
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
        
        if (onSuccess) {
          onSuccess()
        } else if (!isEmbedded) {
          router.push("/feed")
        }
      } else {
        console.error('📝 API returned success: false:', result)
        toast.error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Something went wrong. Please try again.")
      
      // Error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    } finally {
      setIsSubmitting(false)
    }
  }



  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  if (isLoading) {
    return (
      <Card className={`${isEmbedded ? "border-0 shadow-none bg-transparent" : "shadow-sm"} ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className={`${isEmbedded ? "border-0 shadow-none bg-transparent" : "shadow-sm"} ${className}`}>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Please log in to create a post</p>
            <Button onClick={() => router.push("/login")} size="sm">
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={`${isEmbedded ? "border-0 shadow-none bg-transparent" : "shadow-sm border border-gray-200"} overflow-hidden`}>
        <CardContent className="p-4 md:p-6">
          {/* Error Display */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
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
                className="mb-4"
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
            className="mb-4"
          >
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Live Photos Not Supported:</strong> iPhone Live Photos (HEIC/HEIF format) are not yet supported. Please convert to regular photos before uploading. Support coming soon!
              </AlertDescription>
            </Alert>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Header */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 md:h-12 md:w-12 ring-2 ring-gray-200">
                <AvatarImage 
                  src={user.profileImage?.url || user.avatar || "/placeholder.svg"} 
                  alt={user.name || "User"}
                  className="object-cover" 
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  {getInitials(user.name || "User")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">Share with your community</p>
              </div>
              {isValid && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-green-600"
                >
                  <CheckCircle className="h-5 w-5" />
                </motion.div>
              )}
            </div>

            {/* Content Input - Mobile optimized */}
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's on your mind? Share your thoughts, experiences, or discoveries..."
                className={`min-h-[120px] md:min-h-[100px] resize-none text-base md:text-sm transition-all ${
                  isMobileDevice ? 'text-lg leading-relaxed' : ''
                } ${
                  errors.length > 0 ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                }`}
                style={{ fontSize: isMobileDevice ? '16px' : '14px' }} // Prevent zoom on iOS
                maxLength={500}
                required
              />
              
              {/* Character Counter */}
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  {postContent.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Smile className="h-3 w-3 mr-1" />
                      Looking good!
                    </Badge>
                  )}
                </div>
                <span className={`text-xs ${
                  postContent.length > 450 ? 'text-red-500 font-medium' : 'text-gray-400'
                }`}>
                  {postContent.length}/500
                </span>
              </div>
            </div>



            {/* Media Preview Grid */}
            {previewUrls.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3"
              >
                <h4 className="text-sm font-medium text-gray-700">Media Preview</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-2xl max-w-lg mx-auto">
                  {previewUrls.map((url, index) => {
                    const file = selectedFiles[index]
                    const isVideo = file?.type.startsWith('video/')
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100"
                        style={{ maxHeight: '140px' }}
                      >
                              {isVideo ? (
          <>
            <video 
              src={url} 
              className="w-full h-full object-cover" 
              autoPlay
              muted 
              loop
              playsInline
              preload="auto"
              onClick={(e) => {
                e.stopPropagation()
                const video = e.currentTarget
                if (video.muted) {
                  video.muted = false
                } else {
                  video.muted = true
                }
              }}
            />
            {/* Sound indicator - tap to unmute */}
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Video className="h-3 w-3" />
              <span className="text-[10px]">TAP</span>
            </div>
          </>
        ) : (
                          <Image 
                            src={url} 
                            alt={`Preview ${index + 1}`} 
                            fill 
                            className="object-cover" 
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 140px"
                          />
                        )}
                        
                        {/* Remove button - larger for mobile */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ minHeight: '32px', minWidth: '32px' }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        
                        {/* File type indicator */}
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                          {isVideo ? (
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              VID
                            </span>
                          ) : file?.type === 'image/heic' || file?.type === 'image/heif' ? (
                            <span className="flex items-center gap-1">
                              <Upload className="h-3 w-3" />
                              LIVE
                            </span>
                          ) : (
                            'IMG'
                          )}
                        </div>
                        
                        {/* Video duration */}
                        {isVideo && videoDurations[index] && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                            {videoDurations[index]}
                          </div>
                        )}
                        

                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Location Input */}
            <AnimatePresence>
              {showLocationInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {/* Selected Location Display */}
                  {selectedLocation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-900">{selectedLocation.name}</p>
                            <p className="text-sm text-blue-700">{selectedLocation.address}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleLocationClear}
                          className="text-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Location Search Input */}
                  {!selectedLocation && (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        placeholder="Search for a location..."
                        className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500"
                        style={{ fontSize: isMobileDevice ? '16px' : '14px' }}
                        onFocus={() => {
                          if (locationQuery.length >= 2) {
                            setShowLocationResults(true)
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding results to allow for clicks
                          setTimeout(() => {
                            setShowLocationResults(false)
                          }, 200)
                        }}
                      />
                      {isSearchingLocations && (
                        <Loader2 className="absolute right-12 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowLocationInput(false)
                          handleLocationClear()
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Search Results Dropdown */}
                      {showLocationResults && (locationResults.length > 0 || locationQuery.length >= 2) && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
                          {locationResults.length > 0 ? (
                            <>
                              <div className="p-2 border-b bg-gray-50 text-xs text-gray-600 font-medium">
                                Found {locationResults.length} location{locationResults.length !== 1 ? 's' : ''}
                              </div>
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
                            </>
                          ) : (
                            <div className="p-3 text-center text-gray-500">
                              <p className="text-sm">No locations found for "{locationQuery}"</p>
                              <p className="text-xs mt-1">You can still type a custom location name</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Location Input Fallback */}
                  {!selectedLocation && locationQuery.length === 0 && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          // Switch to manual input mode
                          setLocationQuery("")
                          setShowLocationResults(false)
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Or type a custom location name
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop Drag & Drop Area */}
            {!isMobileDevice && selectedFiles.length === 0 && (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50 scale-105' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="text-gray-400">
                      <ImageIcon className="h-8 w-8 mx-auto" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {isDragging ? 'Drop your files here!' : 'Drag & drop photos/videos here'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Or use the buttons below • Max 5 files • Images: 10MB, Videos: 50MB
                    </p>
                  </div>
                </div>
                

              </div>
            )}



            {/* Actions Row */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              {/* Media Options - Mobile optimized */}
              <div className="flex items-center gap-1 md:gap-2 overflow-x-auto flex-shrink-0">
                {/* Camera Button - Primary on mobile */}
                <Button
                  type="button"
                  variant="ghost"
                  size={isMobileDevice ? "sm" : "sm"}
                  onClick={handleCameraCapture}
                  disabled={isCameraLoading}
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all flex-shrink-0`}
                  style={{ minHeight: '40px', minWidth: '60px' }}
                >
                  {isCameraLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {!isMobileDevice && <span className="ml-1">Camera</span>}
                </Button>

                {/* Gallery Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size={isMobileDevice ? "sm" : "sm"}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isProcessingFiles}
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} text-green-600 hover:text-green-700 hover:bg-green-50 transition-all flex-shrink-0 disabled:opacity-50`}
                  style={{ minHeight: '40px', minWidth: '60px' }}
                >
                  <ImageIcon className="h-4 w-4" />
                  {!isMobileDevice && <span className="ml-1">Photos</span>}
                </Button>

                {/* Video Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size={isMobileDevice ? "sm" : "sm"}
                  onClick={() => {
                    console.log('📹 Video button clicked')
                    console.log('📹 Video input ref:', videoInputRef.current)
                    if (videoInputRef.current) {
                      console.log('📹 Triggering video input click')
                      videoInputRef.current.click()
                    } else {
                      console.error('📹 Video input ref is null')
                    }
                  }}
                  disabled={isProcessingFiles}
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-all flex-shrink-0 disabled:opacity-50`}
                  style={{ minHeight: '40px', minWidth: '60px' }}
                >
                  {isProcessingFiles ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {!isMobileDevice && <span className="ml-1">Videos</span>}
                </Button>

                {/* Location Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size={isMobileDevice ? "sm" : "sm"}
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} transition-all flex-shrink-0 ${
                    showLocationInput || selectedLocation || locationName 
                      ? 'text-orange-600 bg-orange-50' 
                      : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                  }`}
                  style={{ minHeight: '40px', minWidth: '60px' }}
                >
                  <MapPin className="h-4 w-4" />
                  {!isMobileDevice && <span className="ml-1">{selectedLocation ? selectedLocation.name.slice(0, 8) + '...' : 'Location'}</span>}
                </Button>
              </div>

              {/* Submit Button - Always visible and prominent on mobile */}
              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                size={isMobileDevice ? "sm" : "sm"}
                className={`${isMobileDevice ? 'h-10 px-4 text-sm' : 'h-9 px-4'} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2`}
                style={{ minHeight: '40px', minWidth: isMobileDevice ? '80px' : '60px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    {isMobileDevice ? "..." : "Sharing..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    {isMobileDevice ? "Share" : "Share"}
                  </>
                )}
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/bmp,image/tiff,image/tif,image/ico,image/x-icon,image/vnd.microsoft.icon,image/jp2,image/jpx,image/jpm,image/psd,image/raw,image/x-portable-bitmap,image/x-portable-pixmap,video/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Capture photo or video"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/bmp,image/tiff,image/tif,image/ico,image/x-icon,image/vnd.microsoft.icon,image/jp2,image/jpx,image/jpm,image/psd,image/raw,image/x-portable-bitmap,image/x-portable-pixmap"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-label="Choose photos from gallery"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.ogg,.mov,.avi,.m4v,.3gp,.flv,.wmv,.mkv"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-label="Choose videos from gallery"
            />
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
