"use client"

import { useState, useRef } from "react"
import { Camera, ImageIcon, MapPin, Send, X, Loader2, Smile, Video, FileText, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { createPost } from "@/app/actions"
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
  onClose?: () => void
  onPostCreated?: () => void
  className?: string
}

export default function EnhancedPostForm({ user, onClose, onPostCreated, className }: EnhancedPostFormProps) {
  const [content, setContent] = useState("")
  const [location, setLocation] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB")
        return
      }
      
      setImage(file)
      setVideo(null)
      setVideoPreview(null)
      setMediaType('image')
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
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
      setImage(null)
      setImagePreview(null)
      setMediaType('video')
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeMedia = () => {
    setImage(null)
    setVideo(null)
    setImagePreview(null)
    setVideoPreview(null)
    setMediaType('none')
    if (imageInputRef.current) imageInputRef.current.value = ""
    if (videoInputRef.current) videoInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      toast.error("Please write something!")
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("content", content.trim())
      formData.append("type", "post")
      
      if (location.trim()) {
        formData.append("locationName", location.trim())
      }
      
      if (image) {
        formData.append("image", image)
      }

      if (video) {
        formData.append("video", video)
      }

      const result = await createPost(formData)

      if (result.success) {
        toast.success("Post shared! ✨")
        setContent("")
        setLocation("")
        removeMedia()
        setShowLocationInput(false)
        
        // Notify parent components
        onPostCreated?.()
        
        // Dispatch custom event for feed refresh
        window.dispatchEvent(new CustomEvent('postCreated'))
        
        // Close form
        onClose?.()
      } else {
        toast.error(result.message || "Failed to share post")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Something went wrong. Try again!")
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

  const isFormValid = () => {
    return content.trim().length > 0
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      <form onSubmit={handleSubmit} className="p-4">
        {/* Header with User Avatar */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 ring-2 ring-gray-100">
            <AvatarImage 
              src={user.profileImage?.url || user.avatar || "/placeholder.svg"} 
              alt={user.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">Share your thoughts</p>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content Input - More Compact */}
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? ✨"
            className="min-h-[80px] resize-none border-0 bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-gray-100 p-3 text-base"
            maxLength={500}
          />

          {/* Character Counter */}
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>{content.length}/500</span>
            {mediaType !== 'none' && (
              <span className="text-purple-500 font-medium">
                {mediaType === 'image' ? '📷 Photo' : '🎥 Video'} added
              </span>
            )}
          </div>

          {/* Media Preview - Compact */}
          <AnimatePresence>
            {(imagePreview || videoPreview) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
              >
                <div className="relative h-40">
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
                    onClick={removeMedia}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location Input - Compact */}
          <AnimatePresence>
            {showLocationInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location..."
                    className="pl-9 h-9 bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationInput(false)
                      setLocation("")
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Bar - More Compact */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          {/* Media & Options */}
          <div className="flex items-center gap-1">
            {/* Photo Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="h-8 px-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
            >
              <Camera className="h-4 w-4" />
            </Button>

            {/* Video Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              className="h-8 px-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50"
            >
              <Video className="h-4 w-4" />
            </Button>

            {/* Location Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLocationInput(!showLocationInput)}
              className={`h-8 px-2 transition-colors ${
                showLocationInput || location 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <MapPin className="h-4 w-4" />
            </Button>

            {/* Emoji Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Submit Button - More Compact */}
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            size="sm"
            className={`h-8 px-4 text-sm font-medium transition-all ${
              isFormValid() && !isSubmitting
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-3 w-3 mr-1" />
                Post
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
      </form>
    </div>
  )
} 