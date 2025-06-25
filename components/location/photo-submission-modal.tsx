"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { 
  Camera, 
  Upload, 
  X, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Star,
  Image as ImageIcon,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { convertHeicToJpeg } from "@/lib/heic-converter"

interface PhotoSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  location: {
    id: string
    name: string
  } | null
  user: {
    id: string
    name: string
    avatar?: string
  } | null
  onSuccess?: () => void
}

const QUALITY_GUIDELINES = [
  { icon: CheckCircle, text: "High resolution (at least 800x600)", color: "text-green-600" },
  { icon: CheckCircle, text: "Well-lit and clear focus", color: "text-green-600" },
  { icon: CheckCircle, text: "Relevant to the location", color: "text-green-600" },
  { icon: AlertCircle, text: "No blurry or dark images", color: "text-red-600" },
  { icon: AlertCircle, text: "Respect privacy and property rights", color: "text-red-600" },
  { icon: AlertCircle, text: "No inappropriate content", color: "text-red-600" },
]

const PHOTO_CATEGORIES = [
  { value: "exterior", label: "Exterior/Building" },
  { value: "interior", label: "Interior/Atmosphere" },
  { value: "food_drinks", label: "Food & Drinks" },
  { value: "atmosphere", label: "Atmosphere/Ambiance" },
  { value: "menu", label: "Menu/Signage" },
  { value: "staff", label: "Staff/Service" },
  { value: "events", label: "Events/Activities" },
  { value: "other", label: "Other" },
]

export function PhotoSubmissionModal({ 
  isOpen, 
  onClose, 
  location, 
  user, 
  onSuccess 
}: PhotoSubmissionModalProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [category, setCategory] = useState("exterior")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [qualityScore, setQualityScore] = useState<number | null>(null)
  const [showQualityAnalysis, setShowQualityAnalysis] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ensure we're on the client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null)
      setPreviewUrl(null)
      setCaption("")
      setCategory("exterior")
      setTags([])
      setNewTag("")
      setUploadProgress(0)
      setQualityScore(null)
      setShowQualityAnalysis(false)
    }
  }, [isOpen])

  console.log('🎯 PhotoSubmissionModal rendered with props:', {
    isOpen,
    hasLocation: !!location,
    hasUser: !!user,
    locationName: location?.name,
    userName: user?.name,
    mounted
  })

  // Don't render anything until we're mounted on the client
  if (!mounted) {
    console.log('❌ PhotoSubmissionModal - Not mounted yet')
    return null
  }

  if (!isOpen || !location || !user) {
    console.log('❌ PhotoSubmissionModal - Early return due to:', {
      notOpen: !isOpen,
      noLocation: !location,
      noUser: !user
    })
    return null
  }

  console.log('✅ PhotoSubmissionModal - Rendering modal content')

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Convert HEIC to JPEG if needed
      let processedFile = file
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        processedFile = await convertHeicToJpeg(file)
      }

      setSelectedFile(processedFile)
      
      // Create preview URL
      const url = URL.createObjectURL(processedFile)
      setPreviewUrl(url)

      // Analyze image quality
      analyzeImageQuality(processedFile)
    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Error processing image file')
    }
  }

  const analyzeImageQuality = (file: File) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Simple blur detection (variance of pixel differences)
      let totalVariance = 0
      for (let i = 0; i < data.length; i += 4) {
        if (i + 4 < data.length) {
          const currentPixel = (data[i] + data[i + 1] + data[i + 2]) / 3
          const nextPixel = (data[i + 4] + data[i + 5] + data[i + 6]) / 3
          totalVariance += Math.abs(currentPixel - nextPixel)
        }
      }

      const averageVariance = totalVariance / (data.length / 4)
      const blurScore = Math.min(100, Math.max(0, averageVariance / 2))
      
      // Resolution score
      const resolutionScore = Math.min(100, (img.width * img.height) / 10000)
      
      // File size score
      const sizeScore = Math.min(100, (file.size / 1024 / 1024) * 50) // 2MB = 100 score
      
      // Overall quality score
      const overallScore = Math.round((blurScore * 0.4 + resolutionScore * 0.4 + sizeScore * 0.2))
      
      setQualityScore(overallScore)
      setShowQualityAnalysis(true)
    }
    img.src = URL.createObjectURL(file)
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async () => {
    if (!selectedFile || !location || !user) {
      toast.error('Please select a photo to upload')
      return
    }

    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      // Step 1: Upload the file first
      console.log('📁 Starting file upload...')
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('alt', caption || `Photo for ${location.name}`)

      const uploadResponse = await fetch('/api/upload-media', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        throw new Error(uploadError.error || 'Failed to upload photo')
      }

      const uploadResult = await uploadResponse.json()
      console.log('📁 File upload successful:', uploadResult)

      // Step 2: Submit the photo submission with the uploaded media ID
      console.log('📝 Submitting photo submission...')
      const submissionData = {
        photoId: uploadResult.id,
        caption: caption,
        category: category,
        tags: tags,
      }

      const submissionResponse = await fetch(`/api/locations/${location.id}/photo-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      if (!submissionResponse.ok) {
        const errorData = await submissionResponse.json()
        throw new Error(errorData.error || 'Failed to submit photo')
      }

      const result = await submissionResponse.json()
      
      toast.success('Photo submitted successfully! It will be reviewed before being published.')
      
      if (onSuccess) {
        onSuccess()
      }
      
      onClose()
    } catch (error) {
      console.error('Error submitting photo:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit photo')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF6B6B]/10 rounded-full p-2">
              <Camera className="w-5 h-5 text-[#FF6B6B]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Photo</h2>
              <p className="text-sm text-gray-600">Share your experience at {location.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo Upload Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Upload Photo *</Label>
            
            {!previewUrl ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#FF6B6B] transition-colors cursor-pointer"
                onClick={triggerFileInput}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Click to upload photo</p>
                <p className="text-sm text-gray-600">JPG, PNG, HEIC up to 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                      setQualityScore(null)
                      setShowQualityAnalysis(false)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quality Analysis */}
                {showQualityAnalysis && qualityScore !== null && (
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Photo Quality Score: {qualityScore}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={cn(
                            "h-2 rounded-full transition-all",
                            qualityScore >= 80 ? "bg-green-500" :
                            qualityScore >= 60 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${qualityScore}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {qualityScore >= 80 ? "Excellent quality!" :
                         qualityScore >= 60 ? "Good quality" : "Consider taking a better photo"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Photo Details */}
          <div className="space-y-4">
            <Label htmlFor="caption" className="text-base font-medium">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Describe your photo or experience..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-sm text-gray-500">{caption.length}/500 characters</p>
          </div>

          {/* Category Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button onClick={addTag} variant="outline" disabled={!newTag.trim()}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Quality Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Photo Quality Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {QUALITY_GUIDELINES.map((guideline, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <guideline.icon className={cn("w-4 h-4", guideline.color)} />
                    <span className="text-sm text-gray-700">{guideline.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isSubmitting}
              className="flex-1 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Photo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 