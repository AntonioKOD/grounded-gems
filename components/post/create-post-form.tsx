"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Camera,
  CheckCircle2,
  ImageIcon,
  Loader2,
  MapPin,
  Star,
  Upload,
  X,
  AlertTriangle,
  MessageSquare,
  ArrowLeft,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { createPost } from "@/app/actions"

interface UserData {
  id: string
  name?: string
  email: string
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
  const [postType, setPostType] = useState<"post" | "review" | "recommendation">("post")

  // Location (for reviews and recommendations)
  const [locationName, setLocationName] = useState("")

  // Rating (for reviews)
  const [rating, setRating] = useState<number>(0)

  // Media
  const [postImage, setPostImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
    if (postType === "review" || postType === "recommendation") {
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

    // Calculate percentage
    const progress = Math.round((completedFields / totalFields) * 100)
    setFormProgress(progress)
  }, [postContent, postTitle, postType, locationName, rating, postImage])

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

  // Reset form
  const resetForm = () => {
    setPostTitle("")
    setPostContent("")
    setPostType("post")
    setLocationName("")
    setRating(0)
    setPostImage(null)
    setImagePreview(null)
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
  }

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!postContent.trim()) {
      errors.content = "Post content is required"
    }

    if ((postType === "review" || postType === "recommendation") && !locationName.trim()) {
      errors.locationName = "Location name is required for reviews and recommendations"
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#FF6B6B]" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Create Post</h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Progress indicator - Mobile optimized */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <Badge variant="outline" className="text-xs">
            {formProgress}% Complete
          </Badge>
        </div>
        <Progress value={formProgress} className="h-2" />
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-4 pb-32 md:pb-24">
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#FF6B6B]/10 to-white border-b">
                <CardTitle className="text-xl md:text-2xl">Share Your Experience</CardTitle>
              </CardHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  prepareSubmission()
                }}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="px-4 md:px-6 pt-4 md:pt-6 border-b">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="content" className="flex items-center gap-2 text-sm">
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Content</span>
                        <span className="sm:hidden">Write</span>
                      </TabsTrigger>
                      <TabsTrigger value="media" className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Media</span>
                        <span className="sm:hidden">Photo</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Content Tab */}
                  <TabsContent value="content" className="p-0 m-0">
                    <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                      <div className="space-y-4 md:space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="post-type" className="text-sm md:text-base font-medium">
                            Post Type
                          </Label>
                          <RadioGroup
                            value={postType}
                            onValueChange={(value) => setPostType(value as "post" | "review" | "recommendation")}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="post" id="post-type-post" />
                              <Label htmlFor="post-type-post" className="cursor-pointer text-sm">
                                Regular Post
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="review" id="post-type-review" />
                              <Label htmlFor="post-type-review" className="cursor-pointer text-sm">
                                Review
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="recommendation" id="post-type-recommendation" />
                              <Label htmlFor="post-type-recommendation" className="cursor-pointer text-sm">
                                Recommendation
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="post-title" className="text-sm md:text-base font-medium">
                            Title (Optional)
                          </Label>
                          <Input
                            id="post-title"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder="Add a title to your post"
                            className="h-10 md:h-12 text-sm md:text-base"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="post-content" className="text-sm md:text-base font-medium flex items-center">
                            Content <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <div className={`${formErrors.content ? "border-red-500 rounded-md" : ""}`}>
                            <Textarea
                              id="post-content"
                              placeholder="What's on your mind?"
                              className="min-h-[120px] md:min-h-[150px] p-3 md:p-4 text-sm md:text-base resize-none"
                              onChange={(e) => setPostContent(e.target.value)}
                              value={postContent}
                            />
                          </div>
                          {formErrors.content && <p className="text-red-500 text-xs md:text-sm">{formErrors.content}</p>}
                        </div>

                        {(postType === "review" || postType === "recommendation") && (
                          <div className="space-y-2">
                            <Label htmlFor="location-name" className="text-sm md:text-base font-medium flex items-center">
                              Location Name <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div className="relative">
                              <Input
                                id="location-name"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                placeholder="Enter location name"
                                className={`h-10 md:h-12 text-sm md:text-base pl-10 ${formErrors.locationName ? "border-red-500" : ""}`}
                              />
                              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-[#FF6B6B]" />
                            </div>
                            {formErrors.locationName && <p className="text-red-500 text-xs md:text-sm">{formErrors.locationName}</p>}
                          </div>
                        )}

                        {postType === "review" && (
                          <div className="space-y-2">
                            <Label htmlFor="rating" className="text-sm md:text-base font-medium flex items-center">
                              Rating <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  className="focus:outline-none p-1"
                                >
                                  <Star
                                    className={`h-6 w-6 md:h-8 md:w-8 ${
                                      star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            {formErrors.rating && <p className="text-red-500 text-xs md:text-sm">{formErrors.rating}</p>}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </TabsContent>

                  {/* Media Tab */}
                  <TabsContent value="media" className="p-0 m-0">
                    <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                      <div className="space-y-4 md:space-y-5">
                        <div className="space-y-3">
                          <Label className="text-sm md:text-base font-medium">Image (Optional)</Label>

                          {!imagePreview ? (
                            <div
                              className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 md:p-8 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer min-h-[200px]"
                              onClick={triggerFileInput}
                            >
                              <div className="bg-[#FF6B6B]/10 rounded-full p-3 mb-3">
                                <ImageIcon className="h-6 w-6 md:h-8 md:w-8 text-[#FF6B6B]" />
                              </div>
                              <p className="text-sm md:text-base text-muted-foreground text-center mb-2">
                                Tap to add an image
                              </p>
                              <p className="text-xs md:text-sm text-muted-foreground text-center mb-4">
                                Supports JPEG, PNG, WebP, GIF, HEIC, and more • Max: 10MB
                              </p>
                              {/* Hidden file inputs */}
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/bmp,image/tiff"
                                className="hidden"
                                id="post-image-upload"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                disabled={isUploading}
                              />
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/bmp,image/tiff"
                                capture="environment"
                                className="hidden"
                                id="post-camera-upload"
                                ref={cameraInputRef}
                                onChange={handleImageUpload}
                                disabled={isUploading}
                              />
                              
                              {/* Upload buttons */}
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer h-12"
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => cameraInputRef.current?.click()}
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Camera className="h-4 w-4 mr-2" />
                                      Take Photo
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer h-12"
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Choose Photo
                                    </>
                                  )}
                                </Button>
                              </div>
                              {uploadError && <p className="text-red-500 text-xs md:text-sm mt-2">{uploadError}</p>}
                            </div>
                          ) : (
                            <div className="relative rounded-lg overflow-hidden h-[250px] md:h-[300px] border">
                              <Image
                                src={imagePreview || "/placeholder.svg"}
                                alt="Post preview"
                                className="w-full h-full object-cover"
                                fill
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white/90 hover:bg-white"
                                    onClick={() => {
                                      setPostImage(null)
                                      setImagePreview(null)
                                      if (fileInputRef.current) {
                                        fileInputRef.current.value = ""
                                      }
                                      if (cameraInputRef.current) {
                                        cameraInputRef.current.value = ""
                                      }
                                    }}
                                    type="button"
                                    disabled={isUploading}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white/90 hover:bg-white cursor-pointer"
                                    type="button"
                                    disabled={isUploading}
                                    onClick={triggerFileInput}
                                  >
                                    {isUploading ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <Camera className="h-4 w-4 mr-1" />
                                    )}
                                    Change
                                  </Button>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/bmp,image/tiff"
                                    capture="environment"
                                    className="hidden"
                                    id="post-image-upload-change"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                  />
                                </div>
                              </div>
                              {isUploading && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                                  <div className="h-1 bg-gray-700 mt-1">
                                    <div className="h-1 bg-white" style={{ width: `${uploadProgress}%` }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </TabsContent>
                </Tabs>
              </form>
            </Card>
          </div>
        </ScrollArea>

        {/* Fixed Bottom Action Bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pb-6 safe-area-bottom shadow-lg">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <Button
              onClick={prepareSubmission}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 transition-all duration-300 h-12 text-base font-medium flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Create Post
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-12 text-base font-medium text-gray-500 sm:w-auto"
              onClick={() => setResetDialogOpen(true)}
              disabled={isSubmitting}
            >
              <X className="h-5 w-5 mr-2" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      </div>

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
    </div>
  )
}
