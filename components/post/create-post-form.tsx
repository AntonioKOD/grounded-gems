"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  Save,
  Star,
  Trash2,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createPost } from "@/app/actions"
import { toast } from "sonner"

interface CreatePostFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  variant?: "default" | "profile";
}

export default function CreatePostForm({ onSuccess, onCancel, className }: CreatePostFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // User state
  const [user, setUser] = useState<{ id: string; name: string; avatar?: string } | null>(null)

  // Form progress
  const [formProgress, setFormProgress] = useState(0)

  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formSubmitType, setFormSubmitType] = useState<"publish" | "draft">("publish")

  // Post content
  const [postTitle, setPostTitle] = useState("")
  const [postContent, setPostContent] = useState("")
  const [postType, setPostType] = useState<"post" | "review" | "recommendation">("post")

  // Location (for reviews and recommendations)
  const [locationName, setLocationName] = useState("")
  const [rating, setRating] = useState<number>(5)

  // Media
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [imageId, setImageId] = useState<string | null>(null)

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch user data")
        }

        const { user } = await response.json()
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

    // Required fields
    totalFields += 2 // Content is always required
    if (postContent) completedFields++

    // Optional fields that count toward progress
    totalFields += 3 // Title, image, location
    if (postTitle) completedFields++
    if (imagePreview) completedFields++

    // Location is required for reviews and recommendations
    if (postType === "review" || postType === "recommendation") {
      if (locationName) completedFields++
    } else {
      completedFields++ // Auto-complete for regular posts
    }

    // Calculate percentage
    const progress = Math.round((completedFields / totalFields) * 100)
    setFormProgress(progress)
  }, [postTitle, postContent, postType, locationName, imagePreview])

  // Image handling
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    // Size validation
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be less than 5 MB")
      return
    }

    // Set file for form submission
    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Simulate upload progress
    setIsUploading(true)
    setUploadError(null)

    // Simulate progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setUploadProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setIsUploading(false)
        toast.success("Image ready for upload")
      }
    }, 200)
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageFile(null)
    setImageId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!postContent.trim()) {
      errors.content = "Post content is required"
    }

    if ((postType === "review" || postType === "recommendation") && !locationName.trim()) {
      errors.location = "Location name is required for reviews and recommendations"
    }

    if (postType === "review" && (rating < 1 || rating > 5)) {
      errors.rating = "Rating must be between 1 and 5"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Reset form
  const resetForm = () => {
    setPostTitle("")
    setPostContent("")
    setPostType("post")
    setLocationName("")
    setRating(5)
    setImagePreview(null)
    setImageFile(null)
    setImageId(null)
    setFormErrors({})
    setResetDialogOpen(false)

    toast.success("Form has been reset")
  }

  // Form submission
  const prepareSubmission = (saveAsDraft = false) => {
    if (!validateForm() && !saveAsDraft) {
      toast.error("Please fix the errors in the form before submitting")
      return
    }

    setFormSubmitType(saveAsDraft ? "draft" : "publish")
    setShowConfirmDialog(true)
  }

  const handleSubmit = async (saveAsDraft = false) => {
    setIsSubmitting(true)
    setShowConfirmDialog(false)

    try {
      const formData = new FormData()

      // Add basic post data
      formData.append('userId', user?.id || "")
      formData.append("content", postContent)
      formData.append("type", postType)

      if (postTitle) formData.append("title", postTitle)
      if (locationName) formData.append("locationName", locationName)
      if (postType === "review") formData.append("rating", rating.toString())
      if (imageFile) formData.append("image", imageFile)

      // Add status
      formData.append("status", saveAsDraft ? "draft" : "published")

      // Submit the form
      const result = await createPost(formData)

      if (result.success) {
        setShowSuccessDialog(true)
        toast.success(`Post ${saveAsDraft ? "saved as draft" : "published"} successfully!`)

        // Call success callback if provided
        if (onSuccess) onSuccess()
      } else {
        toast.error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("An error occurred while creating your post")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p>Loading user information...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`shadow-md border ${className}`}>
      <CardHeader className="bg-gradient-to-r from-[#FF6B6B]/10 to-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Create Post</CardTitle>
            <CardDescription>Share your thoughts, experiences, or recommendations</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={formProgress >= 75 ? "default" : formProgress >= 50 ? "secondary" : "outline"}>
              {formProgress}% Complete
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-500 hover:text-[#FF6B6B]"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset form</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Progress value={formProgress} className="h-1 mt-2" />
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          prepareSubmission(false)
        }}
      >
        <CardContent className="p-6 space-y-6">
          {/* Post Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="post-type" className="text-base font-medium">
              Post Type
            </Label>
            <Select
              value={postType}
              onValueChange={(value: "post" | "review" | "recommendation") => setPostType(value)}
            >
              <SelectTrigger id="post-type" className="h-12">
                <SelectValue placeholder="Select post type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Regular Post</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="post-title" className="text-base font-medium flex items-center">
              Title
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 ml-1 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Optional for regular posts, recommended for reviews and recommendations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="post-title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Add a title to your post (optional)"
              className="h-12"
            />
          </div>

          {/* Location (for reviews and recommendations) */}
          {(postType === "review" || postType === "recommendation") && (
            <div className="space-y-2">
              <Label htmlFor="location-name" className="text-base font-medium flex items-center">
                Location Name
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="location-name"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Enter location name"
                  className={`h-12 ${formErrors.location ? "border-red-500" : ""}`}
                />
                <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#FF6B6B]" />
              </div>
              {formErrors.location && <p className="text-red-500 text-sm">{formErrors.location}</p>}
            </div>
          )}

          {/* Rating (for reviews) */}
          {postType === "review" && (
            <div className="space-y-2">
              <Label htmlFor="rating" className="text-base font-medium">
                Rating
              </Label>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                    <Star
                      className={`h-6 w-6 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                    />
                  </button>
                ))}
              </div>
              {formErrors.rating && <p className="text-red-500 text-sm">{formErrors.rating}</p>}
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="post-content" className="text-base font-medium flex items-center">
              Content
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <div className={`${formErrors.content ? "border-red-500 rounded-md" : ""}`}>
              <Textarea
                id="post-content"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What would you like to share?"
                className="min-h-[150px] p-4"
              />
            </div>
            {formErrors.content && <p className="text-red-500 text-sm">{formErrors.content}</p>}
          </div>

          <Separator />

          {/* Image Upload */}
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
                <Button variant="outline" size="lg" className="cursor-pointer" type="button" disabled={isUploading}>
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
                      onClick={removeImage}
                      type="button"
                      disabled={isUploading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
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

          {/* Help text for post types */}
          {postType === "review" && (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <AlertDescription className="flex items-start">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  Reviews should include your honest opinion about a location you&apos;ve visited. Adding a rating and image
                  helps others make informed decisions.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {postType === "recommendation" && (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
              <AlertDescription className="flex items-start">
                <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  Recommendations are suggestions for places others might enjoy. Be specific about what makes this
                  location special.
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

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
                Publish Post
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5 h-12 text-base font-medium"
            onClick={(e) => {
              e.preventDefault()
              prepareSubmission(true)
            }}
            disabled={isSubmitting}
          >
            <Save className="mr-2 h-5 w-5" />
            Save as Draft
          </Button>
          <div className="flex-1 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              className="h-12 text-base font-medium text-gray-500"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </CardFooter>
      </form>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to {formSubmitType === "draft" ? "save this post as a draft" : "publish this post"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(formSubmitType === "draft")}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            >
              {formSubmitType === "draft" ? "Save as Draft" : "Publish Post"}
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
              Post {formSubmitType === "draft" ? "Saved" : "Published"} Successfully
            </DialogTitle>
            <DialogDescription>
              Your post has been {formSubmitType === "draft" ? "saved as a draft" : "published"} successfully.
            </DialogDescription>
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
              Reset Form
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all form fields. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetForm} className="bg-red-500 hover:bg-red-600 text-white">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
