"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, MapPin, Loader2, X, Send, ImageIcon, Video, Smile, AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { HEICImageUpload } from "@/components/ui/heic-image-upload"

import { uploadFileInChunks, shouldUseChunkedUpload, getOptimalChunkSize } from "@/lib/chunked-upload"
import { useUser } from "@/context/user-context"

interface UserData {
  id: string
  name?: string
  email: string
  avatar?: string
  profileImage?: {
    url: string
  }
}

interface MobilePostFormProps {
  onSuccess?: () => void
  className?: string
}

export default function MobilePostForm({ 
  onSuccess,
  className = "" 
}: MobilePostFormProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user, isLoading, isAuthenticated } = useUser()

  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [postContent, setPostContent] = useState("")
  const [locationName, setLocationName] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string; address: string } | null>(null)
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [locationQuery, setLocationQuery] = useState("")
  const [locationResults, setLocationResults] = useState<Array<{ id: string; name: string; address: string }>>([])
  const [isSearchingLocations, setIsSearchingLocations] = useState(false)
  const [showLocationResults, setShowLocationResults] = useState(false)

  // Media state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedMediaIds, setUploadedMediaIds] = useState<string[]>([])
  const [isProcessingFiles, setIsProcessingFiles] = useState(false)

  // Validation state
  const [errors, setErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)



  // Validate form
  useEffect(() => {
    const newErrors: string[] = []
    
    if (!postContent.trim()) {
      newErrors.push("Please write something to share")
    }
    
    if (postContent.length > 500) {
      newErrors.push("Caption cannot exceed 500 characters")
    }
    
    // Check if we have content or media
    if (!postContent.trim() && selectedFiles.length === 0) {
      newErrors.push("Please add some content or media to your post")
    }
    
    setErrors(newErrors)
    setIsValid(newErrors.length === 0)
  }, [postContent, selectedFiles.length])

  // Check authentication status
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please log in to create a post")
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  // Handle file selection from HEIC upload component
  const handleFileSelected = (file: File, conversionInfo?: any) => {
    // Check for Live Photo limitations
    const isLivePhoto = file.type === 'image/heic' || file.type === 'image/heif'
    const currentLivePhotos = selectedFiles.filter(f => 
      f.type === 'image/heic' || f.type === 'image/heif'
    ).length
    
    if (isLivePhoto && currentLivePhotos >= 1) {
      toast.warning(
        "📱 Live Photo Limit: Only 1 Live Photo supported per post. Additional Live Photos will be converted to regular photos.",
        { 
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
            border: '2px solid #f59e0b',
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '500'
          }
        }
      )
    }
    
    // Validate file size - reduced limit for better reliability
    const maxSizeMB = 25 // 25MB max per file (reduced from 50MB)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    
    if (file.size > maxSizeBytes) {
      toast.error(`${file.name} is too large. Maximum size is ${maxSizeMB}MB`)
      return
    }
    
    // Check total size of all selected files - reduced limit
    const currentTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
    const newTotalSize = currentTotalSize + file.size
    const totalSizeMB = newTotalSize / 1024 / 1024
    
    if (totalSizeMB > 50) { // Reduced from 100MB to 50MB
      toast.error(`Total file size (${totalSizeMB.toFixed(1)}MB) would exceed 50MB limit`)
      return
    }
    
    setSelectedFiles(prev => [...prev, file])
    
    if (conversionInfo) {
      toast.success(`Live Photo converted: ${conversionInfo.compressionRatio.toFixed(1)}% size reduction`)
    }
    
    // Show appropriate message based on file type
    if (isLivePhoto) {
      toast.success(`Added Live Photo: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
    } else {
      toast.success(`Added ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
    }
  }

  // Handle upload completion
  const handleUploadComplete = (result: any) => {
    if (Array.isArray(result)) {
      const mediaIds = result.map(item => item.id)
      setUploadedMediaIds(prev => [...prev, ...mediaIds])
    } else {
      setUploadedMediaIds(prev => [...prev, result.id])
    }
    
    toast.success("Media uploaded successfully!")
  }

  // Handle upload error
  const handleUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`)
  }

  // Search locations
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setLocationResults([])
      setShowLocationResults(false)
      return
    }

    setIsSearchingLocations(true)
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setLocationResults(data.locations || [])
        setShowLocationResults(true)
      }
    } catch (error) {
      // Silently handle location search errors
    } finally {
      setIsSearchingLocations(false)
    }
  }

  const handleLocationSelect = (location: { id: string; name: string; address: string }) => {
    setSelectedLocation(location)
    setLocationName(location.name)
    setShowLocationResults(false)
    setLocationQuery("")
  }

  const handleLocationClear = () => {
    setSelectedLocation(null)
    setLocationName("")
    setLocationQuery("")
  }

  const resetForm = () => {
    setPostContent("")
    setLocationName("")
    setSelectedLocation(null)
    setSelectedFiles([])
    setUploadedMediaIds([])
    setErrors([])
    setIsValid(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValid || isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      // Step 1: Upload media files first if any
      let mediaIds: string[] = []
      
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          
          // Type guard to ensure file exists
          if (!file) {
            continue
          }
          
          const fileSizeMB = file.size / 1024 / 1024
          
          try {
            // Determine upload method based on file size
            const shouldChunk = shouldUseChunkedUpload(file, 5 * 1024 * 1024) // Use chunked for files > 5MB
            const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            
            let uploadResult
            
            if (shouldChunk) {
              // Use Vercel Blob for large files (bypasses 4.5MB limit)
              const formData = new FormData()
              formData.append('file', file)
              formData.append('alt', file.name)
              
              const blobResponse = await fetch('/api/upload/blob', {
                method: 'POST',
                body: formData,
              })
              
              if (!blobResponse.ok) {
                let errorMessage = `Failed to upload ${file.name}`
                
                try {
                  const errorData = await blobResponse.json()
                  errorMessage = errorData.message || errorMessage
                } catch (parseError) {
                  errorMessage = `Upload failed for ${file.name}`
                }
                
                throw new Error(errorMessage)
              }
              
              try {
                uploadResult = await blobResponse.json()
              } catch (parseError) {
                throw new Error(`Upload failed for ${file.name}`)
              }
              
              if (!uploadResult.success) {
                throw new Error(uploadResult.message || 'Upload failed')
              }
                          } else {
                // Use regular upload for smaller files
                const uploadEndpoint = isProduction ? '/api/media/production' : '/api/media'
                
                const formData = new FormData()
                formData.append('file', file)
                formData.append('alt', file.name)
                
                const uploadResponse = await fetch(uploadEndpoint, {
                  method: 'POST',
                  body: formData,
                })
                
                if (!uploadResponse.ok) {
                  let errorMessage = `Failed to upload ${file.name}`
                  
                  try {
                    const errorData = await uploadResponse.json()
                    errorMessage = errorData.message || errorMessage
                  } catch (parseError) {
                    errorMessage = `Upload failed for ${file.name}`
                  }
                  
                  throw new Error(errorMessage)
                }
                
                try {
                  uploadResult = await uploadResponse.json()
                } catch (parseError) {
                  throw new Error(`Upload failed for ${file.name}`)
                }
              }
            
            if (uploadResult.id) {
              mediaIds.push(uploadResult.id)
            } else {
              throw new Error(`Upload failed for ${file.name}`)
            }
            
            // Small delay between uploads
            if (i < selectedFiles.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
          } catch (uploadError) {
            toast.error(`Failed to upload ${file.name}`)
            return
          }
        }
      }
      
      // Step 2: Create post with media IDs (not files)
      const postData: any = {
        content: postContent,
        type: "post",
        location: selectedLocation ? selectedLocation.id : undefined,
      }

      // Add media IDs if uploaded
      if (mediaIds.length > 0) {
        // All uploaded media goes to photos array
        postData.photos = mediaIds
      }

      // Check total payload size before sending
      const payloadSize = JSON.stringify(postData).length
      const payloadSizeMB = payloadSize / 1024 / 1024
      
      if (payloadSizeMB > 4.5) {
        toast.error(`Post data too large. Please reduce content or remove some media.`)
        return
      }

      // Use production endpoint if in production environment
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      const endpoint = isProduction ? "/api/posts/create-production" : "/api/posts/create"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to create a post")
          router.push("/login")
          return
        }
        
        let errorMessage = "Failed to create post"
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          errorMessage = "Server error occurred"
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success("Post created successfully!")
        resetForm()
        if (onSuccess) {
          onSuccess()
        }
      } else {
        throw new Error(result.message || "Failed to create post")
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Please log in to create a post</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {user.profileImage ? (
                <AvatarImage src={user.profileImage.url} alt={user.name || "User"} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(user.name || user.email)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="font-semibold text-gray-900">{user.name || "User"}</h1>
              <p className="text-sm text-gray-500">Create a new post</p>
            </div>
          </div>
          
          <div></div>
        </div>
      </div>



      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Content Input */}
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <Textarea
              ref={textareaRef}
              placeholder="What's happening around you? Share your discovery..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[120px] border-0 resize-none text-lg focus:ring-0"
              maxLength={500}
            />
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Smile className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">Add emoji</span>
              </div>
              <span className="text-sm text-gray-500">
                {postContent.length}/500
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Media Upload */}
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Live Photo Support Info - Mobile Friendly */}
              <Alert className="bg-amber-50 border border-amber-200 text-amber-800">
                <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <AlertDescription className="text-xs leading-relaxed">
                  <strong>Live Photo Support:</strong> 1 Live Photo per post. Additional photos will be converted automatically.
                </AlertDescription>
              </Alert>
              
              <HEICImageUpload
                showLivePhotoWarning={false}
                onFileSelected={handleFileSelected}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxSizeInMB={10}
                multiple={true}
                showPreview={true}
                showDetailedLogs={false}
                autoUpload={true}
                uploadEndpoint="/api/media"
                className="w-full"
              />
              
              {/* Live Photo Detection Banner */}
              {selectedFiles.some(f => f.type === 'image/heic' || f.type === 'image/heif') && (
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📱</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">
                        Live Photos Detected
                      </p>
                      <p className="text-xs text-blue-600">
                        {selectedFiles.filter(f => f.type === 'image/heic' || f.type === 'image/heif').length} Live Photo(s) will be processed
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">Location</span>
              </div>
              
              {selectedLocation ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">{selectedLocation.name}</p>
                    <p className="text-sm text-blue-700">{selectedLocation.address}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLocationClear}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Search for a location..."
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value)
                      searchLocations(e.target.value)
                    }}
                    className="border-gray-300"
                  />
                  
                  {isSearchingLocations && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching locations...
                    </div>
                  )}
                  
                  {showLocationResults && locationResults.length > 0 && (
                    <div className="space-y-1">
                      {locationResults.map((location) => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => handleLocationSelect(location)}
                          className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
                        >
                          <p className="font-medium">{location.name}</p>
                          <p className="text-gray-500">{location.address}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Creating Post...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Share Post
            </>
          )}
        </Button>
      </form>
    </div>
  )
} 