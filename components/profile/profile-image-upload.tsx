"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Camera, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateProfileImage } from "@/app/(frontend)/profile/actions"

interface ProfileImageUploadProps {
  userId: string
  currentImage?: string
  name?: string
}

export function ProfileImageUpload({ userId, currentImage, name = "User" }: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get initials for avatar fallback
  const getInitials = () => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }

    // Create a preview immediately for better UX
    const localPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(localPreviewUrl)

    // Start upload process
    setIsUploading(true)
    setUploadError(null)

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 10
      })
    }, 200)

    try {
      // Build FormData for Payload's /api/media
      const formData = new FormData()
      formData.append("file", file)
      formData.append("alt", `Profile image for ${name}`)

      console.log("Uploading to /api/media")

      // Send to Payload's media endpoint
      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
      }

      // Extract the created document
      const { doc } = await res.json()
      console.log("Upload successful, doc:", doc)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Update the user's profile with the media ID
      const updateResult = await updateProfileImage(userId, doc.id)

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update profile image")
      }

      toast.success("Profile image updated successfully")
    } catch (error) {
      console.error("Error uploading profile image:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to upload image")

      // Reset preview on error
      setPreviewUrl(null)

      toast.error(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleCancelPreview = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="h-32 w-32 border-4 border-white shadow-md">
          {previewUrl ? (
            <div className="w-full h-full relative">
              <Image
                src={previewUrl || "/placeholder.svg"}
                alt="Profile preview"
                fill
                className="object-cover rounded-full"
              />
            </div>
          ) : currentImage ? (
            <AvatarImage src={currentImage || "/placeholder.svg"} alt={name} />
          ) : (
            <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B] text-4xl">{getInitials()}</AvatarFallback>
          )}
        </Avatar>

        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300 ease-in-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleButtonClick}
          >
            <Camera className="h-8 w-8 text-white" />
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <div className="flex gap-2">
        {previewUrl && !isUploading ? (
          <Button type="button" variant="outline" size="sm" onClick={handleCancelPreview}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        ) : !isUploading ? (
          <Button type="button" variant="outline" size="sm" onClick={handleButtonClick}>
            <Upload className="h-4 w-4 mr-1" />
            Upload Photo
          </Button>
        ) : null}
      </div>

      {uploadError && <div className="text-red-500 text-sm text-center max-w-xs">{uploadError}</div>}
    </div>
  )
}
