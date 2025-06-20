"use client"

import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
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

export function PhotoSubmissionModal({ 
  isOpen, 
  onClose, 
  location, 
  user, 
  onSuccess 
}: PhotoSubmissionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [category, setCategory] = useState("exterior")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [qualityScore, setQualityScore] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form
  const resetForm = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setCaption("")
    setCategory("exterior")
    setTags([])
    setNewTag("")
    setUploadProgress(0)
    setQualityScore(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle file selection with HEIC support
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Import HEIC utilities
    const { isValidImageFile, processImageFile, isHEICFile } = await import('@/lib/heic-converter')

    // Validate file type (including HEIC)
    if (!isValidImageFile(file)) {
      toast.error('Please select a valid image file (including HEIC)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    try {
      // Show processing message for HEIC files
      if (isHEICFile(file)) {
        toast.info('Converting HEIC file...')
      }

      // Process file (convert HEIC if needed)
      const result = await processImageFile(file, { quality: 0.9, format: 'JPEG' })
      
      if (result.wasConverted) {
        toast.success(`HEIC file converted successfully! Size reduced by ${result.conversionInfo?.compressionRatio.toFixed(1)}%`)
      }

      setSelectedFile(result.file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(result.file)

      // Quick quality assessment for immediate feedback
      const img = new Image()
      img.onload = () => {
        const score = assessImageQuality(img.width, img.height, result.file.size, result.file.type)
        setQualityScore(score)
      }
      img.src = URL.createObjectURL(result.file)

    } catch (error) {
      console.error('Error processing image:', error)
      toast.error('Failed to process image file')
    }
  }

  // Simple quality assessment for immediate feedback
  const assessImageQuality = (width: number, height: number, size: number, type: string): number => {
    let score = 0
    
    // Resolution check
    if (width >= 1200 && height >= 800) score += 40
    else if (width >= 800 && height >= 600) score += 30
    else if (width >= 600 && height >= 400) score += 20
    else score += 10

    // File size check
    if (size >= 500000 && size <= 5000000) score += 30 // 500KB - 5MB is optimal
    else if (size >= 100000) score += 20
    else score += 10

    // Format check
    if (type.includes('jpeg') || type.includes('jpg')) score += 20
    else if (type.includes('png')) score += 18
    else if (type.includes('webp')) score += 15
    else score += 10

    // General quality assumption (would need AI in production)
    score += 10

    return Math.min(100, score)
  }

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // Handle submission
  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select a photo')
      return
    }

    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      // First upload the image to media collection
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('alt', `${location.name} photo`)

      setUploadProgress(25)

      const uploadResponse = await fetch('/api/media', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Required for authentication
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      const { doc: mediaDoc } = await uploadResponse.json()
      setUploadProgress(50)

      // Submit photo for review
      const submissionResponse = await fetch(`/api/locations/${location.id}/photo-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          photoId: mediaDoc.id,
          caption: caption.trim(),
          category,
          tags: tags.filter(tag => tag.trim()),
        }),
      })

      setUploadProgress(75)

      if (!submissionResponse.ok) {
        const error = await submissionResponse.json()
        throw new Error(error.error || 'Failed to submit photo')
      }

      const result = await submissionResponse.json()
      setUploadProgress(100)

      toast.success(result.submission.message || 'Photo submitted successfully!')
      
      if (onSuccess) {
        onSuccess()
      }
      
      resetForm()
      onClose()

    } catch (error) {
      console.error('Error submitting photo:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit photo')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  // Get quality score styling
  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQualityScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Quality'
    if (score >= 60) return 'Good Quality'
    if (score >= 40) return 'Fair Quality'
    return 'Needs Improvement'
  }

  if (!isOpen || !location || !user) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100010] bg-black/50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF6B6B]/10 rounded-full p-2">
                <Camera className="h-5 w-5 text-[#FF6B6B]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submit Photo</h2>
                <p className="text-sm text-gray-500">Add a photo to {location.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">Contributing to {location.name}</p>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Photo *</Label>
              
              {!previewUrl ? (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#FF6B6B] hover:bg-[#FF6B6B]/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-[#FF6B6B]/10 rounded-full p-3 w-fit mx-auto mb-3">
                    <Upload className="h-8 w-8 text-[#FF6B6B]" />
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-1">Choose a photo</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop or click to select
                  </p>
                  <p className="text-xs text-gray-400">
                    Max 10MB • JPG, PNG, WebP, HEIC
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.heic,.heif"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        resetForm()
                      }}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {qualityScore !== null && (
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex items-center gap-1", getQualityScoreColor(qualityScore))}>
                              <Star className="h-4 w-4 fill-current" />
                              <span className="font-medium">Quality Score: {qualityScore}/100</span>
                            </div>
                          </div>
                          <Badge 
                            variant={qualityScore >= 80 ? "default" : qualityScore >= 60 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {getQualityScoreLabel(qualityScore)}
                          </Badge>
                        </div>
                        {qualityScore < 60 && (
                          <p className="text-xs text-gray-600 mt-2">
                            Consider using a higher resolution, well-lit photo for better approval chances.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>



            {/* Category Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exterior">Exterior</SelectItem>
                  <SelectItem value="interior">Interior</SelectItem>
                  <SelectItem value="food_drinks">Food & Drinks</SelectItem>
                  <SelectItem value="atmosphere">Atmosphere</SelectItem>
                  <SelectItem value="menu">Menu</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Caption */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Caption (Optional)</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe what's in this photo..."
                className="resize-none"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 text-right">{caption.length}/200</p>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tags (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTag}
                  disabled={!newTag.trim() || tags.length >= 5}
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">Add up to 5 tags to help categorize your photo</p>
            </div>

            <Separator />

            {/* Quality Guidelines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Photo Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {QUALITY_GUIDELINES.map((guideline, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <guideline.icon className={cn("h-4 w-4", guideline.color)} />
                      <span className="text-sm text-gray-700">{guideline.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Photos are reviewed for quality and relevance before being added to the location gallery.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isSubmitting}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress < 50 ? 'Uploading...' : 'Submitting...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Submit Photo
                </div>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {isSubmitting && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div 
                className="h-full bg-[#FF6B6B] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
} 