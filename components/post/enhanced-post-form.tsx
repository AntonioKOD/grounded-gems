"use client"

import { useState, useRef } from "react"
import { Camera, ImageIcon, MapPin, Sparkles, Send, X, Loader2, Heart, Smile, Hash, AtSign } from "lucide-react"
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
  }
  onClose?: () => void
  onPostCreated?: () => void
  className?: string
}

export default function EnhancedPostForm({ user, onClose, onPostCreated, className }: EnhancedPostFormProps) {
  const [content, setContent] = useState("")
  const [location, setLocation] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [currentStep, setCurrentStep] = useState<'content' | 'details'>('content')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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

      const result = await createPost(formData)

      if (result.success) {
        toast.success("Post shared! ✨")
        setContent("")
        setLocation("")
        removeImage()
        setShowLocationInput(false)
        setCurrentStep('content')
        
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative ${className}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Content Area */}
        <div className="space-y-4">
          {/* Content Input */}
          <div className="relative">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening? ✨"
              className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder-white/50 resize-none text-lg p-4 rounded-2xl backdrop-blur-sm focus:bg-white/10 transition-all"
              maxLength={500}
            />
            <div className="absolute bottom-3 right-3 text-white/40 text-sm">
              {content.length}/500
            </div>
          </div>

          {/* Image Preview */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10"
              >
                <div className="relative h-64">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
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
                className="relative"
              >
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location..."
                    className="pl-12 bg-white/5 border-white/10 text-white placeholder-white/50 h-12 rounded-2xl backdrop-blur-sm focus:bg-white/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationInput(false)
                      setLocation("")
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          {/* Media & Options */}
          <div className="flex items-center gap-2">
            {/* Photo Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/10 transition-all"
            >
              <Camera className="h-5 w-5 text-white" />
            </motion.button>

            {/* Location Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLocationInput(!showLocationInput)}
              className={`p-3 backdrop-blur-sm rounded-full border border-white/10 transition-all ${
                showLocationInput || location 
                  ? 'bg-purple-500/30 text-purple-200' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <MapPin className="h-5 w-5" />
            </motion.button>

            {/* Emoji Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/10 transition-all"
            >
              <Smile className="h-5 w-5 text-white" />
            </motion.button>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            whileHover={isFormValid() ? { scale: 1.05 } : {}}
            whileTap={isFormValid() ? { scale: 0.95 } : {}}
            className={`px-8 py-3 rounded-full font-bold text-base transition-all flex items-center gap-2 ${
              isFormValid() && !isSubmitting
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Share
              </>
            )}
          </motion.button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </form>
    </motion.div>
  )
} 