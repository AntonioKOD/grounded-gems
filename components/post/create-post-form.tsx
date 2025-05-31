"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, MapPin, Loader2, X, Send } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
  const imageInputRef = useRef<HTMLInputElement>(null)

  // State for user data
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [postContent, setPostContent] = useState("")
  const [locationName, setLocationName] = useState("")
  const [postImage, setPostImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showLocationInput, setShowLocationInput] = useState(false)

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

  // Image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    // Size guard (5MB for simplicity)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error("Please select a JPEG, PNG, or WebP image")
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setPostImage(file)
  }

  // Reset form
  const resetForm = () => {
    setPostContent("")
    setLocationName("")
    setPostImage(null)
    setImagePreview(null)
    setShowLocationInput(false)
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error("Please log in to create a post")
      return
    }

    if (!postContent.trim()) {
      toast.error("Please write something to share")
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", postContent)
      formData.append("type", "post")

      if (locationName.trim()) {
        formData.append("locationName", locationName)
      }
      
      if (postImage) {
        formData.append("image", postImage)
      }

      const result = await createPost(formData)

      if (result.success) {
        toast.success("Post shared successfully!")
        resetForm()
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
    <Card className={`${isEmbedded ? "border-0 shadow-none bg-transparent" : "shadow-sm border border-gray-200"} ${className}`}>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Header */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={user.profileImage?.url || user.avatar || "/placeholder.svg"} 
                alt={user.name || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-blue-500 text-white font-medium">
                {getInitials(user.name || "User")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">Share with your community</p>
            </div>
          </div>

          {/* Content Input */}
          <Textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What's on your mind? Share your thoughts, experiences, or discoveries..."
            className="min-h-[120px] resize-none border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            maxLength={500}
            required
          />

          {/* Character Counter */}
          <div className="text-right">
            <span className="text-xs text-gray-400">{postContent.length}/500</span>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <div className="relative h-48">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPostImage(null)
                    setImagePreview(null)
                    if (imageInputRef.current) {
                      imageInputRef.current.value = ""
                    }
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Location Input */}
          {showLocationInput && (
            <div className="relative">
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Add location (optional)"
                className="border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
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
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {/* Media Options */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                className="h-9 px-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              >
                <Camera className="h-4 w-4 mr-1" />
                Photo
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationInput(!showLocationInput)}
                className={`h-9 px-3 ${
                  showLocationInput || locationName 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <MapPin className="h-4 w-4 mr-1" />
                Location
              </Button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !postContent.trim()}
              size="sm"
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share
                </>
              )}
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
        </form>
      </CardContent>
    </Card>
  )
}
