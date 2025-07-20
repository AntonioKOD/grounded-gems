"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, MapPin, Loader2, X, Send, ImageIcon, Video, Smile, AlertCircle, CheckCircle, Info } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { HEICImageUpload } from "@/components/ui/heic-image-upload"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

  // State for user data
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

  // Debug state
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // Validate form
  useEffect(() => {
    const newErrors: string[] = []
    
    if (!postContent.trim()) {
      newErrors.push("Please write something to share")
    }
    
    if (postContent.length > 500) {
      newErrors.push("Caption cannot exceed 500 characters")
    }
    
    setErrors(newErrors)
    setIsValid(newErrors.length === 0)
  }, [postContent])

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

  // Handle file selection from HEIC upload component
  const handleFileSelected = (file: File, conversionInfo?: any) => {
    // Validate file size
    const maxSizeMB = 50 // 50MB max per file
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    
    if (file.size > maxSizeBytes) {
      toast.error(`${file.name} is too large. Maximum size is ${maxSizeMB}MB`)
      return
    }
    
    // Check total size of all selected files
    const currentTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
    const newTotalSize = currentTotalSize + file.size
    const totalSizeMB = newTotalSize / 1024 / 1024
    
    if (totalSizeMB > 100) {
      toast.error(`Total file size (${totalSizeMB.toFixed(1)}MB) would exceed 100MB limit`)
      return
    }
    
    setSelectedFiles(prev => [...prev, file])
    
    if (conversionInfo) {
      console.log('HEIC conversion info:', conversionInfo)
      toast.success(`HEIC converted: ${conversionInfo.compressionRatio.toFixed(1)}% size reduction`)
    }
    
    toast.success(`Added ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
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
    console.error('Upload error:', error)
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
      console.error('Error searching locations:', error)
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
      // Prepare post data
      const postData: any = {
        content: postContent,
        type: "post",
        location: selectedLocation ? selectedLocation.id : undefined,
      }

      // Add media if uploaded
      if (uploadedMediaIds.length > 0) {
        // Separate Live Photos (converted HEIC) from regular images and videos
        const livePhotos = uploadedMediaIds.slice(0, selectedFiles.filter(f => f.type === 'image/jpeg' && f.name.includes('converted')).length)
        const regularImages = uploadedMediaIds.slice(livePhotos.length, uploadedMediaIds.length)
        
        postData.livePhotos = livePhotos
        postData.photos = regularImages
      }

      console.log('Submitting post with data:', postData)

      const response = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create post")
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
      console.error("Error creating post:", error)
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
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-gray-500"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Debug Info */}
      {showDebugInfo && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="text-sm text-blue-800">
            <p><strong>Debug Info:</strong></p>
            <p>Selected Files: {selectedFiles.length}</p>
            <p>Uploaded Media IDs: {uploadedMediaIds.length}</p>
            <p>Form Valid: {isValid ? 'Yes' : 'No'}</p>
            <p>Errors: {errors.length}</p>
          </div>
        </div>
      )}

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
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Media</TabsTrigger>
                <TabsTrigger value="status">Upload Status</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-4">
                <HEICImageUpload
                  onFileSelected={handleFileSelected}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  maxSizeInMB={10}
                  multiple={true}
                  showPreview={true}
                  showDetailedLogs={true}
                  autoUpload={true}
                  uploadEndpoint="/api/media"
                  className="w-full"
                />
              </TabsContent>
              
              <TabsContent value="status" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Selected Files</span>
                    <Badge variant="secondary">{selectedFiles.length}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Uploaded Media</span>
                    <Badge variant="secondary">{uploadedMediaIds.length}</Badge>
                  </div>
                  
                  {uploadedMediaIds.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Media ready for post
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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