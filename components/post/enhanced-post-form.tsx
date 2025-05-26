"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, MapPin, Star, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface EnhancedPostFormProps {
  user: {
    id: string
    name: string
    avatar?: string
  }
  onClose?: () => void
  onPostCreated?: () => void
  className?: string
}

export default function EnhancedPostForm({ user, onClose, onPostCreated, className }: EnhancedPostFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [postType, setPostType] = useState<"post" | "review" | "recommendation">("post")
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [rating, setRating] = useState<number>(0)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  // Remove selected image
  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      toast.error("Please enter some content for your post")
      return
    }

    if ((postType === "review" || postType === "recommendation") && !location) {
      toast.error("Please specify a location for your review/recommendation")
      return
    }

    if (postType === "review" && rating === 0) {
      toast.error("Please provide a rating for your review")
      return
    }

    setIsSubmitting(true)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", content)
      formData.append("type", postType)
      if (title) formData.append("title", title)
      if (location) formData.append("locationName", location)
      if (rating > 0) formData.append("rating", rating.toString())
      if (selectedImage) formData.append("image", selectedImage)

      // Import and call server action
      const { createPost } = await import("@/app/actions")
      const result = await createPost(formData)

      if (result.success) {
        toast.success("Post created successfully!")
        
        // Reset form
        setContent("")
        setTitle("")
        setLocation("")
        setRating(0)
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        
        // Call callbacks
        if (onPostCreated) {
          onPostCreated()
        } else {
          // Fallback to router refresh if no callback provided
          router.refresh()
        }
        
        if (onClose) onClose()
      } else {
        toast.error(result.message || "Failed to create post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Failed to create post. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Check if form is valid for submission
  const isFormValid = () => {
    if (!content.trim()) return false
    if (postType === "review") {
      return rating > 0 && location.trim().length > 0
    }
    if (postType === "recommendation") {
      return location.trim().length > 0
    }
    return true
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-gray-500">Posting {postType}</p>
            </div>
          </div>

          {/* Post Type Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={postType === "post" ? "default" : "outline"}
              size="sm"
              onClick={() => setPostType("post")}
              className={cn(
                "flex-1 h-10 text-xs sm:text-sm",
                postType === "post" && "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
              )}
            >
              Post
            </Button>
            <Button
              type="button"
              variant={postType === "review" ? "default" : "outline"}
              size="sm"
              onClick={() => setPostType("review")}
              className={cn(
                "flex-1 h-10 text-xs sm:text-sm",
                postType === "review" && "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
              )}
            >
              Review
            </Button>
            <Button
              type="button"
              variant={postType === "recommendation" ? "default" : "outline"}
              size="sm"
              onClick={() => setPostType("recommendation")}
              className={cn(
                "flex-1 h-10 text-xs sm:text-sm",
                postType === "recommendation" && "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
              )}
            >
              Recommend
            </Button>
          </div>

          {/* Title (optional) */}
          {(postType === "review" || postType === "recommendation") && (
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Add a title for your ${postType}...`}
                className="h-11 focus-visible:ring-[#FF6B6B] text-base"
              />
            </div>
          )}

          {/* Location Input (required for reviews and recommendations) */}
          {(postType === "review" || postType === "recommendation") && (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Location
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location name..."
                className="h-11 focus-visible:ring-[#FF6B6B] text-base"
              />
            </div>
          )}

          {/* Rating (only for reviews) */}
          {postType === "review" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Star className="h-4 w-4" />
                Rating
                <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={rating >= value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRating(value)}
                    className={cn(
                      "h-10 w-10 p-0 touch-manipulation",
                      rating >= value && "bg-yellow-400 hover:bg-yellow-500 border-yellow-400"
                    )}
                  >
                    <Star className={cn("h-4 w-4", rating >= value && "fill-current")} />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-medium">
              Content
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === "post"
                  ? "What's on your mind?"
                  : postType === "review"
                  ? "Write your review..."
                  : "Share your recommendation..."
              }
              className="min-h-[80px] focus-visible:ring-[#FF6B6B] text-base resize-none"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Selected image"
                  className="w-full h-32 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleRemoveImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-20 border-dashed border-2 touch-manipulation"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-xs text-gray-500">Add image</span>
                </div>
              </Button>
            )}
          </div>
        </div>

        {/* Fixed Action Buttons */}
        <div className="flex-shrink-0 border-t bg-white p-3 safe-area-bottom">
          <div className="flex gap-3">
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-11 text-base"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className="flex-1 h-11 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Posting...</span>
                </div>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
} 