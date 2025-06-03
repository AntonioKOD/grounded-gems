"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, MapPin, Loader2, X, Send, ImageIcon, Video, Smile, AlertCircle, CheckCircle } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { createPost } from "@/app/actions"

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
  const [showLocationInput, setShowLocationInput] = useState(false)

  // Media state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraLoading, setIsCameraLoading] = useState(false)

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
  const processFiles = (files: File[]) => {
    const MAX_FILES = 5
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    
    if (selectedFiles.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`)
      return
    }
    
    const validFiles: File[] = []
    const newPreviewUrls: string[] = []
    
    for (const file of files) {
      // Validate size
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} is too large. Max size: 10MB`)
        continue
      }
      
      // Validate type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a supported file type`)
        continue
      }
      
      validFiles.push(file)
      newPreviewUrls.push(URL.createObjectURL(file))
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])
      toast.success(`Added ${validFiles.length} file(s)`)
    }
  }

  // File input handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFiles(files)
    }
  }

  // Remove file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  // Reset form
  const resetForm = () => {
    setPostContent("")
    setLocationName("")
    setSelectedFiles([])
    previewUrls.forEach(url => URL.revokeObjectURL(url))
    setPreviewUrls([])
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

    try {
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", postContent.trim())
      formData.append("type", "post")

      if (locationName.trim()) {
        formData.append("locationName", locationName.trim())
      }
      
      selectedFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          formData.append("media", file)
        } else if (file.type.startsWith('video/')) {
          formData.append("videos", file)
        }
      })

      const result = await createPost(formData)

      if (result.success) {
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
                className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-2xl"
              >
                {previewUrls.map((url, index) => {
                  const file = selectedFiles[index]
                  const isVideo = file?.type.startsWith('video/')
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                    >
                      {isVideo ? (
                        <video src={url} className="w-full h-full object-cover" muted />
                      ) : (
                        <Image src={url} alt={`Preview ${index + 1}`} fill className="object-cover" />
                      )}
                      
                      {/* Remove button - larger for mobile */}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ minHeight: '32px', minWidth: '32px' }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      
                      {/* File type indicator */}
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        {isVideo ? 'VID' : 'IMG'}
                      </div>
                    </motion.div>
                  )
                })}
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
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Add location (optional)"
                      className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500"
                      style={{ fontSize: isMobileDevice ? '16px' : '14px' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowLocationInput(false)
                        setLocationName("")
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop Drag & Drop Area */}
            {!isMobileDevice && selectedFiles.length === 0 && (
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
                    Or use the buttons below • Max 5 files, 10MB each
                  </p>
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
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} text-green-600 hover:text-green-700 hover:bg-green-50 transition-all flex-shrink-0`}
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
                  onClick={() => videoInputRef.current?.click()}
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-all flex-shrink-0`}
                  style={{ minHeight: '40px', minWidth: '60px' }}
                >
                  <Video className="h-4 w-4" />
                  {!isMobileDevice && <span className="ml-1">Video</span>}
                </Button>

                {/* Location Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size={isMobileDevice ? "sm" : "sm"}
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className={`${isMobileDevice ? 'h-10 px-2 text-xs' : 'h-9 px-3'} transition-all flex-shrink-0 ${
                    showLocationInput || locationName 
                      ? 'text-orange-600 bg-orange-50' 
                      : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                  }`}
                  style={{ minHeight: '40px', minWidth: '60px' }}
                >
                  <MapPin className="h-4 w-4" />
                  {!isMobileDevice && <span className="ml-1">Location</span>}
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
              accept="image/*,video/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Capture photo or video"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-label="Choose photos from gallery"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
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
