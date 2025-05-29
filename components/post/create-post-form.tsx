"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, MapPin, Loader2, X, Send, Video, Smile, Globe, Users, Lock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

export default function CreatePostForm({ 
  isEmbedded = false, 
  onSuccess,
  className = "" 
}: CreatePostFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // State for user data
  const [user, setUser] = useState<UserData | null>(null)
  const [formProgress, setFormProgress] = useState(0)

  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // Form state
  const [activeTab, setActiveTab] = useState("content")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Post content
  const [postTitle, setPostTitle] = useState("")
  const [postContent, setPostContent] = useState("")
  const [postType, setPostType] = useState<"post" | "review" | "recommendation" | "tip">("post")

  // Location (for reviews and recommendations)
  const [locationName, setLocationName] = useState("")

  // Rating (for reviews)
  const [rating, setRating] = useState<number>(0)

  // Media
  const [postImage, setPostImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none')

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // UI state
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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

  // Calculate form progress
  useEffect(() => {
    let completedFields = 0
    let totalFields = 0

    // Content (required)
    totalFields += 1
    if (postContent) completedFields++

    // Title (optional)
    if (postTitle) completedFields++
    totalFields += 1

    // Type-specific fields
    if (postType === "review" || postType === "recommendation" || postType === "tip") {
      totalFields += 1
      if (locationName) completedFields++
    }

    if (postType === "review") {
      totalFields += 1
      if (rating > 0) completedFields++
    }

    // Image (optional)
    if (postImage) completedFields++
    totalFields += 1

    // Video (optional)
    if (video) completedFields++
    totalFields += 1

    // Calculate percentage
    const progress = Math.round((completedFields / totalFields) * 100)
    setFormProgress(progress)
  }, [postContent, postTitle, postType, locationName, rating, postImage, video])

  // Trigger file input click programmatically
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Image handling with enhanced format support
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB for social media

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    // Size guard
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be less than 10MB")
      return
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
      'image/avif',
      'image/bmp',
      'image/tiff'
    ]

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error("Please select a valid image format (JPEG, PNG, WebP, GIF, HEIC, etc.)")
      return
    }

    // For HEIC files, show a loading state since they might need conversion
    if (file.type.toLowerCase().includes('heic') || file.type.toLowerCase().includes('heif')) {
      toast.info("Processing HEIC image...")
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.onerror = () => {
      toast.error("Failed to read image file")
    }
    reader.readAsDataURL(file)

    // Store file for later upload
    setPostImage(file)

    // Simulate upload progress for better UX
    setIsUploading(true)
    setUploadError(null)

    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setUploadProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setIsUploading(false)
        toast.success("Image ready for upload")
      }
    }, 100)
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (50MB limit for videos)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Video must be less than 50MB")
        return
      }

      // Check video format
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/avi']
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a valid video format (MP4, WebM, OGG, MOV, AVI)")
        return
      }
      
      setVideo(file)
      setPostImage(null)
      setImagePreview(null)
      setMediaType('video')
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Reset form
  const resetForm = () => {
    setPostTitle("")
    setPostContent("")
    setPostType("post")
    setLocationName("")
    setRating(0)
    setPostImage(null)
    setImagePreview(null)
    setVideo(null)
    setVideoPreview(null)
    setMediaType('none')
    setFormErrors({})
    setActiveTab("content")
    setFormProgress(0)
    
    // Clear file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ""
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = ""
    }
  }

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!postContent.trim()) {
      errors.content = "Post content is required"
    }

    if ((postType === "review" || postType === "recommendation" || postType === "tip") && !locationName.trim()) {
      errors.locationName = "Location name is required for reviews, recommendations, and tips"
    }

    if (postType === "review" && rating === 0) {
      errors.rating = "Rating is required for reviews"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Form submission
  const prepareSubmission = () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting")
      return
    }
    setShowConfirmDialog(true)
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please log in to create a post")
      return
    }

    setIsSubmitting(true)
    setShowConfirmDialog(false)

    try {
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", postContent)
      formData.append("type", postType)

      if (postTitle) formData.append("title", postTitle)
      if (locationName) formData.append("locationName", locationName)
      if (rating > 0) formData.append("rating", rating.toString())
      if (postImage) formData.append("image", postImage)
      if (video) formData.append("video", video)

      const result = await createPost(formData)

      if (result.success) {
        setShowSuccessDialog(true)
        toast.success("Post created successfully!")
      } else {
        toast.error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("An error occurred while creating the post")
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

  const getPrivacyIcon = () => {
    switch (postType) {
      case "public": return <Globe className="h-3 w-3" />
      case "friends": return <Users className="h-3 w-3" />
      case "private": return <Lock className="h-3 w-3" />
    }
  }

  if (isLoading) {
    return (
      <Card className={`${isEmbedded ? "border-0 shadow-none" : ""} ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className={`${isEmbedded ? "border-0 shadow-none" : ""} ${className}`}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Please log in to create a post</p>
            <Button onClick={() => window.location.href = "/login"}>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${isEmbedded ? "border-0 shadow-none" : "max-w-2xl mx-auto"} ${className}`}>
      {!isEmbedded && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            ✨ Create New Post
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="p-4 space-y-4">
        {/* User Header */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-gray-100">
            <AvatarImage 
              src={user.profileImage?.url || user.avatar || "/placeholder.svg"} 
              alt={user.name || "User"}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
              {getInitials(user.name || "User")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{user.name}</p>
            <div className="flex items-center gap-2">
              <Select value={postType} onValueChange={(value: any) => setPostType(value as any)}>
                <SelectTrigger className="w-auto h-6 px-2 text-xs border-0 bg-gray-100">
                  <div className="flex items-center gap-1">
                    {getPrivacyIcon()}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Friends
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Post Type Selector */}
        <div className="flex gap-2">
          {["post", "review", "recommendation", "tip"].map((type) => (
            <Button
              key={type}
              type="button"
              variant={postType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setPostType(type as any)}
              className="h-7 px-3 text-xs capitalize"
            >
              {type}
            </Button>
          ))}
        </div>

        {/* Title Input (for reviews and tips) */}
        {postType !== "post" && (
          <Input
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder={`${postType === 'review' ? 'Review' : postType === 'recommendation' ? 'Recommendation' : 'Tip'} title...`}
            className="text-sm"
            maxLength={100}
          />
        )}

        {/* Content Input */}
        <Textarea
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder={`What's ${postType === 'review' ? 'your review' : postType === 'recommendation' ? 'your recommendation' : postType === 'tip' ? 'your tip' : 'on your mind'}? ✨`}
          className="min-h-[100px] resize-none border-0 bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-gray-100"
          maxLength={1000}
        />

        {/* Character Counter */}
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>{postContent.length}/1000</span>
          {mediaType !== 'none' && (
            <span className="text-purple-500 font-medium">
              {mediaType === 'image' ? '📷 Photo' : '🎥 Video'} added
            </span>
          )}
        </div>

        {/* Media Preview */}
        <AnimatePresence>
          {(imagePreview || videoPreview) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
            >
              <div className="relative h-48">
                {imagePreview && (
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                )}
                {videoPreview && (
                  <video
                    src={videoPreview}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                )}
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => {
                    setPostImage(null)
                    setImagePreview(null)
                    setVideo(null)
                    setVideoPreview(null)
                    setMediaType('none')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                    if (cameraInputRef.current) {
                      cameraInputRef.current.value = ""
                    }
                    if (videoInputRef.current) {
                      videoInputRef.current.value = ""
                    }
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location Input */}
        <AnimatePresence>
          {showLocationInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Add location..."
                  className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500"
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

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Media & Options */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="h-8 px-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
            >
              <Camera className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              className="h-8 px-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50"
            >
              <Video className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLocationInput(!showLocationInput)}
              className={`h-8 px-2 transition-colors ${
                showLocationInput || locationName 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <MapPin className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            onClick={prepareSubmission}
            disabled={isSubmitting || !postContent.trim()}
            size="sm"
            className={`px-6 transition-all ${
              !isSubmitting && postContent.trim()
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create {postType}
              </>
            )}
          </Button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif"
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/mov,video/avi"
          onChange={handleVideoUpload}
          className="hidden"
        />
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Confirm Post Creation</DialogTitle>
            <DialogDescription>Are you sure you want to create this {postType}?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 w-full sm:w-auto">
              Create Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Post Created Successfully
            </DialogTitle>
            <DialogDescription>Your {postType} has been published successfully.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={() => {
                setShowSuccessDialog(false)
                resetForm()
              }}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 w-full sm:w-auto"
            >
              Create Another Post
            </Button>
            <Button variant="outline" onClick={() => router.push("/feed")} className="w-full sm:w-auto">
              View Feed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Cancel Post Creation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will discard your post. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetForm()
                router.push("/feed")
              }}
              className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto"
            >
              Discard Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
