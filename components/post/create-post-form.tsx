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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
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

export default function CreatePostForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Image handling
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    // Size guard
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be less than 5 MB")
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
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
    toast.info("Form has been reset")
  }

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!postContent) errors.content = "Post content is required"

    if ((postType === "review" || postType === "recommendation") && !locationName) {
      errors.locationName = "Location name is required for reviews and recommendations"
    }

    if (postType === "review" && rating === 0) {
      errors.rating = "Please provide a rating for your review"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Form submission
  const prepareSubmission = () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form before submitting")
      return
    }

    setShowConfirmDialog(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setShowConfirmDialog(false)

    try {
      if (!user) {
        throw new Error("You must be logged in to create a post")
      }

      // Create FormData for submission
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", postContent)
      formData.append("type", postType)

      if (postTitle) {
        formData.append("title", postTitle)
      }

      if (postType === "review" || postType === "recommendation") {
        formData.append("locationName", locationName)
      }

      if (postType === "review" && rating > 0) {
        formData.append("rating", rating.toString())
      }

      if (postImage) {
        formData.append("image", postImage)
      }

      // Submit the form
      const result = await createPost(formData)

      if (result.success) {
        setShowSuccessDialog(true)
        toast.success("Post created successfully!")
      } else {
        throw new Error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error(`Failed to create post: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Form progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Create New Post</h1>
          <Badge variant={formProgress >= 75 ? "default" : formProgress >= 50 ? "secondary" : "outline"}>
            {formProgress}% Complete
          </Badge>
        </div>
        <Progress value={formProgress} className="h-2" />
      </div>

      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#FF6B6B]/10 to-white border-b">
          <CardTitle className="text-2xl">Share Your Experience</CardTitle>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            prepareSubmission()
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 border-b overflow-x-auto">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Content</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Media</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content Tab */}
            <TabsContent value="content" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="post-type" className="text-base font-medium">
                      Post Type
                    </Label>
                    <RadioGroup
                      value={postType}
                      onValueChange={(value) => setPostType(value as "post" | "review" | "recommendation")}
                      className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="post" id="post-type-post" />
                        <Label htmlFor="post-type-post" className="cursor-pointer">
                          Regular Post
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="review" id="post-type-review" />
                        <Label htmlFor="post-type-review" className="cursor-pointer">
                          Review
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="recommendation" id="post-type-recommendation" />
                        <Label htmlFor="post-type-recommendation" className="cursor-pointer">
                          Recommendation
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="post-title" className="text-base font-medium">
                      Title (Optional)
                    </Label>
                    <Input
                      id="post-title"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Add a title to your post"
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="post-content" className="text-base font-medium flex items-center">
                      Content <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className={`${formErrors.content ? "border-red-500 rounded-md" : ""}`}>
                      <Textarea
                        id="post-content"
                        placeholder="What's on your mind?"
                        className="min-h-[150px] p-4 text-base"
                        onChange={(e) => setPostContent(e.target.value)}
                        value={postContent}
                      />
                    </div>
                    {formErrors.content && <p className="text-red-500 text-sm">{formErrors.content}</p>}
                  </div>

                  {(postType === "review" || postType === "recommendation") && (
                    <div className="space-y-2">
                      <Label htmlFor="location-name" className="text-base font-medium flex items-center">
                        Location Name <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="location-name"
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          placeholder="Enter location name"
                          className={`h-12 text-base pl-10 ${formErrors.locationName ? "border-red-500" : ""}`}
                        />
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#FF6B6B]" />
                      </div>
                      {formErrors.locationName && <p className="text-red-500 text-sm">{formErrors.locationName}</p>}
                    </div>
                  )}

                  {postType === "review" && (
                    <div className="space-y-2">
                      <Label htmlFor="rating" className="text-base font-medium flex items-center">
                        Rating <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-8 w-8 ${
                                star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {formErrors.rating && <p className="text-red-500 text-sm">{formErrors.rating}</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Image (Optional)</Label>

                    {!imagePreview ? (
                      <div
                        className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={triggerFileInput}
                      >
                        <div className="bg-[#FF6B6B]/10 rounded-full p-3 mb-3">
                          <ImageIcon className="h-8 w-8 text-[#FF6B6B]" />
                        </div>
                        <p className="text-base text-muted-foreground text-center mb-2">
                          Drag and drop an image, or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                          Recommended size: 1200 x 800 pixels (Max: 5MB)
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="post-image-upload"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                        <Button
                          variant="outline"
                          size="lg"
                          className="cursor-pointer"
                          type="button"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading... {uploadProgress.toFixed(0)}%
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </>
                          )}
                        </Button>
                        {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden h-[300px] border">
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
                              accept="image/*"
                              className="hidden"
                              id="post-image-upload"
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

          <CardFooter className="p-6 flex flex-col sm:flex-row gap-3 border-t bg-muted/5">
            <Button
              type="submit"
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 transition-all duration-300 h-12 text-base font-medium"
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
            <div className="flex-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-12 text-base font-medium text-gray-500"
                onClick={() => setResetDialogOpen(true)}
                disabled={isSubmitting}
              >
                <X className="h-5 w-5 mr-2" />
                <span>Cancel</span>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Post Creation</DialogTitle>
            <DialogDescription>Are you sure you want to create this {postType}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
              Create Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Post Created Successfully
            </DialogTitle>
            <DialogDescription>Your {postType} has been published successfully.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false)
                resetForm()
              }}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            >
              Create Another Post
            </Button>
            <Button variant="outline" onClick={() => router.push("/feed")}>
              View Feed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Cancel Post Creation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will discard your post. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetForm()
                router.push("/feed")
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Discard Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
