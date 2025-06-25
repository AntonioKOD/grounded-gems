'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LocationSearch } from '@/components/ui/location-search'

import { GuideLocationsManager } from '@/components/ui/guide-locations-manager'
import { 
  Plus, 
  X, 
  Save, 
  Eye,
  DollarSign,
  Lightbulb,
  FileText,
  Settings,
  CheckCircle,
  AlertCircle,
  MapPin,
  Image,
  Clock,
  Search,
  Upload,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Image Upload Component
interface ImageUploadProps {
  onImageUpload: (file: File) => Promise<{ url: string; alt: string }>
  currentImage?: { url: string; alt: string }
  onImageChange: (image: { url: string; alt: string }) => void
  onImageRemove: () => void
  placeholder?: string
  aspectRatio?: string
  id?: string
}

function ImageUpload({ 
  onImageUpload, 
  currentImage, 
  onImageChange, 
  onImageRemove, 
  placeholder = "Upload an image",
  aspectRatio = "aspect-video",
  id = "image-upload"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB')
      return
    }

    setUploading(true)
    try {
      const result = await onImageUpload(file)
      onImageChange(result)
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  return (
    <div className="space-y-4">
      {currentImage ? (
        <div className="relative">
          <div className={`${aspectRatio} relative overflow-hidden rounded-lg border-2 border-gray-200`}>
            <img
              src={currentImage.url}
              alt={currentImage.alt}
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onImageRemove}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`${aspectRatio} border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center">
            {uploading ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{placeholder}</p>
                  <p className="text-xs text-gray-500">Drag & drop or click to upload</p>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  id={id}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(id)?.click()}
                >
                  Choose File
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {currentImage && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alt Text (for accessibility)</Label>
          <Input
            placeholder="Describe the image for screen readers"
            value={currentImage.alt}
            onChange={(e) => onImageChange({ ...currentImage, alt: e.target.value })}
            className="h-10 text-sm border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg"
          />
        </div>
      )}
    </div>
  )
}

interface LocationOption {
  id: string
  name: string
  fullName: string
  address: any
  neighborhood?: string
  coordinates?: { latitude: number; longitude: number }
  averageRating: number
  reviewCount: number
  categories: any[]
  imageUrl?: string
  isVerified: boolean
}

interface GuideLocation {
  id: string
  location: LocationOption
  order: number
  description?: string
  estimatedTime?: number // in minutes
  tips?: string[]
  isRequired: boolean
}

interface GuideFormData {
  title: string
  description: string
  primaryLocation: string // Main location/city for the guide
  locations: GuideLocation[] // Multiple locations to visit
  difficulty: string
  duration: {
    value: number
    unit: 'hours' | 'days'
  }
  pricing: {
    type: 'free' | 'paid' | 'pwyw'
    price?: number
    suggestedPrice?: number
  }
  highlights: Array<{ highlight: string }>
  content: string
  insiderTips: Array<{
    category: string
    tip: string
    priority: 'high' | 'medium' | 'low'
  }>
  tags: Array<{ tag: string }>
  language: string
  featuredImage?: string // Media document ID
  itinerary: Array<{
    time: string
    activity: string
    description: string
    location?: string
    tips?: string
  }>
  meta: {
    title?: string
    description?: string
    keywords?: string
  }
}

// Removed static category options - now fetched dynamically from API

const difficultyOptions = [
  { label: 'Easy - Accessible to everyone', value: 'easy' },
  { label: 'Moderate - Some walking/planning required', value: 'moderate' },
  { label: 'Challenging - Requires good fitness/preparation', value: 'challenging' },
  { label: 'Expert - For experienced travelers', value: 'expert' },
]

const tipCategories = [
  { label: '💡 Local Secrets', value: 'secrets' },
  { label: '⏰ Best Times', value: 'timing' },
  { label: '💰 Money Saving', value: 'savings' },
  { label: '🚗 Getting Around', value: 'transport' },
  { label: '📱 Apps & Tools', value: 'tools' },
  { label: '🎯 Pro Tips', value: 'protips' },
  { label: '⚠️ Things to Avoid', value: 'avoid' },
]

export default function GuideCreationForm() {
  const [activeTab, setActiveTab] = useState('basics')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState<GuideFormData>({
    title: '',
    description: '',
    primaryLocation: '',
    locations: [],
    difficulty: '',
    duration: { value: 1, unit: 'hours' },
    pricing: { type: 'free' },
    highlights: [{ highlight: '' }],
    content: '',
    insiderTips: [],
    tags: [],
    language: 'en',
    featuredImage: undefined,
    itinerary: [],
    meta: {
      title: '',
      description: '',
      keywords: ''
    }
  })

  const updateFormData = (updates: Partial<GuideFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Generate unique ID for locations
  const generateLocationId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Add a new location to the guide
  const addLocation = (location: LocationOption) => {
    const newGuideLocation: GuideLocation = {
      id: generateLocationId(),
      location,
      order: formData.locations.length + 1,
      description: '',
      estimatedTime: 60, // Default 1 hour
      tips: [],
      isRequired: formData.locations.length === 0 // First location is required
    }

    updateFormData({
      locations: [...formData.locations, newGuideLocation]
    })

    // If this is the first location, set as primary
    if (formData.locations.length === 0) {
      updateFormData({
        primaryLocation: location.id
      })
    }
  }

  // Remove a location from the guide
  const removeLocation = (locationId: string) => {
    const updatedLocations = formData.locations
      .filter(loc => loc.id !== locationId)
      .map((loc, index) => ({ ...loc, order: index + 1 }))

    updateFormData({ locations: updatedLocations })

    // If removing the primary location, update primary
    const removedLocation = formData.locations.find(loc => loc.id === locationId)
    if (removedLocation && removedLocation.location.id === formData.primaryLocation) {
      const newPrimary = updatedLocations[0]?.location.id || ''
      updateFormData({ primaryLocation: newPrimary })
    }
  }

  // Update location details
  const updateLocationDetails = (locationId: string, updates: Partial<Omit<GuideLocation, 'id' | 'location'>>) => {
    const updatedLocations = formData.locations.map(loc =>
      loc.id === locationId ? { ...loc, ...updates } : loc
    )
    updateFormData({ locations: updatedLocations })
  }

  // Reorder locations
  const reorderLocation = (locationId: string, direction: 'up' | 'down') => {
    const currentIndex = formData.locations.findIndex(loc => loc.id === locationId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= formData.locations.length) return

    const updatedLocations = [...formData.locations]
    const [movedLocation] = updatedLocations.splice(currentIndex, 1)
    updatedLocations.splice(newIndex, 0, movedLocation)

    // Update order numbers
    const reorderedLocations = updatedLocations.map((loc, index) => ({
      ...loc,
      order: index + 1
    }))

    updateFormData({ locations: reorderedLocations })
  }

  const addHighlight = () => {
    if (formData.highlights.length < 10) {
      updateFormData({
        highlights: [...formData.highlights, { highlight: '' }]
      })
    }
  }

  const removeHighlight = (index: number) => {
    if (formData.highlights.length > 1) {
      updateFormData({
        highlights: formData.highlights.filter((_, i) => i !== index)
      })
    }
  }

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...formData.highlights]
    newHighlights[index] = { highlight: value }
    updateFormData({ highlights: newHighlights })
  }

  const addInsiderTip = () => {
    updateFormData({
      insiderTips: [...formData.insiderTips, {
        category: 'protips',
        tip: '',
        priority: 'medium'
      }]
    })
  }

  const removeInsiderTip = (index: number) => {
    updateFormData({
      insiderTips: formData.insiderTips.filter((_, i) => i !== index)
    })
  }

  const updateInsiderTip = (index: number, field: string, value: string) => {
    const newTips = [...formData.insiderTips]
    newTips[index] = { ...newTips[index], [field]: value }
    updateFormData({ insiderTips: newTips })
  }

  const addTag = (tagValue: string) => {
    if (tagValue.trim() && !formData.tags.some(tag => tag.tag === tagValue.trim())) {
      updateFormData({
        tags: [...formData.tags, { tag: tagValue.trim() }]
      })
    }
  }

  const removeTag = (index: number) => {
    updateFormData({
      tags: formData.tags.filter((_, i) => i !== index)
    })
  }

  // Featured Image handlers
  const setFeaturedImage = (image: { url: string; alt: string }) => {
    updateFormData({ featuredImage: image.url })
  }

  const removeFeaturedImage = () => {
    updateFormData({ featuredImage: undefined })
  }

  // Itinerary handlers
  const addItineraryItem = () => {
    updateFormData({
      itinerary: [...formData.itinerary, {
        time: '',
        activity: '',
        description: '',
        location: '',
        tips: ''
      }]
    })
  }

  const removeItineraryItem = (index: number) => {
    updateFormData({
      itinerary: formData.itinerary.filter((_, i) => i !== index)
    })
  }

  const updateItineraryItem = (index: number, field: string, value: string) => {
    const updatedItinerary = [...formData.itinerary]
    updatedItinerary[index] = { ...updatedItinerary[index], [field]: value }
    updateFormData({ itinerary: updatedItinerary })
  }

  // Meta handlers
  const updateMeta = (field: 'title' | 'description' | 'keywords', value: string) => {
    updateFormData({
      meta: { ...formData.meta, [field]: value }
    })
  }

  // File upload handler
  const handleUpload = async (file: File): Promise<{ url: string; alt: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error('Upload failed')
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Upload failed')
    }
    
    return {
      url: data.id, // Return the media document ID
      alt: file.name // Default alt text to filename
    }
  }

  const handleSubmit = async (status: 'draft' | 'review') => {
    setIsSubmitting(true)
    console.log('🚀 Form submitting with status:', status)
    
    try {
      // Prepare the data for submission
      const submitData = {
        title: formData.title,
        description: formData.description,
        primaryLocation: formData.primaryLocation,
        locations: formData.locations.map(loc => ({
          location: loc.location.id,
          order: loc.order,
          description: loc.description || '',
          estimatedTime: loc.estimatedTime || 60,
          tips: (loc.tips || []).map(tip => ({ tip })),
          isRequired: loc.isRequired
        })),
        difficulty: formData.difficulty,
        duration: formData.duration,
        pricing: formData.pricing,
        highlights: formData.highlights,
        content: formData.content,
        insiderTips: formData.insiderTips,
        tags: formData.tags,
        language: formData.language,
        featuredImage: formData.featuredImage,
        itinerary: formData.itinerary,
        meta: formData.meta,
        status
      }

      const response = await fetch('/api/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response not ok:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log('✅ Guide created successfully with status:', data.guide?.status)
        const successMessage = status === 'draft' ? 'saved as draft' : 'submitted for review'
        toast.success(`Guide ${successMessage}!`)
        
        // Redirect to success page with status
        router.push(`/guides/create/success?status=${status}`)
      } else {
        console.error('❌ Failed to create guide:', data.error)
        toast.error(data.error || 'Failed to save guide')
      }
    } catch (error) {
      console.error('Error saving guide:', error)
      toast.error('Failed to save guide')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    return formData.title.trim() && 
           formData.description.trim() && 
           formData.locations.length > 0 && 
           formData.difficulty &&
           formData.highlights.some(h => h.highlight.trim()) &&
           formData.content.trim() &&
           formData.featuredImage &&
           formData.tags.length > 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Mobile-optimized header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">Create Your Guide</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Share your expertise and start earning
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-4xl">
        {/* Mobile-first progress indicator */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">
              {Object.values({
                title: formData.title.trim(),
                description: formData.description.trim(),
                locations: formData.locations.length > 0,
                highlights: formData.highlights.some(h => h.highlight.trim()),
                content: formData.content.trim(),
                featuredImage: !!formData.featuredImage,
                tags: formData.tags.length > 0
              }).filter(Boolean).length}/6 fields completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(Object.values({
                  title: formData.title.trim(),
                  description: formData.description.trim(),
                  locations: formData.locations.length > 0,
                  highlights: formData.highlights.some(h => h.highlight.trim()),
                  content: formData.content.trim(),
                  featuredImage: !!formData.featuredImage,
                  tags: formData.tags.length > 0
                }).filter(Boolean).length / 6) * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Mobile-optimized tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto bg-white border border-gray-200 rounded-xl p-1">
              <TabsTrigger 
                value="basics" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B6B]/10 data-[state=active]:to-[#4ECDC4]/10 data-[state=active]:text-[#FF6B6B]"
              >
                <FileText className="h-4 w-4" />
                <span>Basics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="locations" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B6B]/10 data-[state=active]:to-[#4ECDC4]/10 data-[state=active]:text-[#FF6B6B]"
              >
                <MapPin className="h-4 w-4" />
                <span>Locations</span>
              </TabsTrigger>
              <TabsTrigger 
                value="content" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B6B]/10 data-[state=active]:to-[#4ECDC4]/10 data-[state=active]:text-[#FF6B6B]"
              >
                <FileText className="h-4 w-4" />
                <span>Content</span>
              </TabsTrigger>
              <TabsTrigger 
                value="itinerary" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B6B]/10 data-[state=active]:to-[#4ECDC4]/10 data-[state=active]:text-[#FF6B6B]"
              >
                <Clock className="h-4 w-4" />
                <span>Itinerary</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tips" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B6B]/10 data-[state=active]:to-[#4ECDC4]/10 data-[state=active]:text-[#FF6B6B]"
              >
                <Lightbulb className="h-4 w-4" />
                <span>Tips</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B6B]/10 data-[state=active]:to-[#4ECDC4]/10 data-[state=active]:text-[#FF6B6B]"
              >
                <Settings className="h-4 w-4" />
                <span>Final</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Basics Tab */}
          <TabsContent value="basics" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Basic Information</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Essential details about your guide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">Guide Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Hidden Food Gems of Downtown Portland"
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    maxLength={100}
                    className="h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
                  />
                  <p className="text-xs text-gray-500">{formData.title.length}/100 characters</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="A compelling description that will attract users to your guide..."
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    maxLength={500}
                    rows={4}
                    className="text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl resize-none"
                  />
                  <p className="text-xs text-gray-500">{formData.description.length}/500 characters</p>
                </div>

                {/* Difficulty, Duration */}
                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-sm font-medium">Difficulty *</Label>
                    <Select value={formData.difficulty} onValueChange={(value) => updateFormData({ difficulty: value })}>
                      <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl">
                        <SelectValue placeholder="Select difficulty..." />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Duration *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.duration.value}
                        onChange={(e) => updateFormData({
                          duration: { ...formData.duration, value: parseInt(e.target.value) || 1 }
                        })}
                        className="flex-1 h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
                      />
                      <Select 
                        value={formData.duration.unit} 
                        onValueChange={(value: 'hours' | 'days') => updateFormData({
                          duration: { ...formData.duration, unit: value }
                        })}
                      >
                        <SelectTrigger className="w-24 h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4 p-4 bg-gradient-to-r from-[#FF6B6B]/5 to-[#4ECDC4]/5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-[#FF6B6B]" />
                    <Label className="text-sm font-medium">Pricing Strategy</Label>
                  </div>
                  <Select 
                    value={formData.pricing.type} 
                    onValueChange={(value: 'free' | 'paid' | 'pwyw') => updateFormData({
                      pricing: { type: value }
                    })}
                  >
                    <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">🎁 Free - Build audience</SelectItem>
                      <SelectItem value="paid">💰 Fixed Price - Set your rate</SelectItem>
                      <SelectItem value="pwyw">🤝 Pay What You Want - Let users decide</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.pricing.type === 'paid' && (
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-medium">Price (USD) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0.99"
                        placeholder="9.99"
                        value={formData.pricing.price || ''}
                        onChange={(e) => updateFormData({
                          pricing: { ...formData.pricing, price: parseFloat(e.target.value) || undefined }
                        })}
                        className="h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
                      />
                    </div>
                  )}

                  {formData.pricing.type === 'pwyw' && (
                    <div className="space-y-2">
                      <Label htmlFor="suggestedPrice" className="text-sm font-medium">Suggested Price (USD)</Label>
                      <Input
                        id="suggestedPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="5.00"
                        value={formData.pricing.suggestedPrice || ''}
                        onChange={(e) => updateFormData({
                          pricing: { ...formData.pricing, suggestedPrice: parseFloat(e.target.value) || undefined }
                        })}
                        className="h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
                      />
                    </div>
                  )}
                </div>

                {/* Highlights */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Key Highlights *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addHighlight}
                      disabled={formData.highlights.length >= 10}
                      className="h-8 px-3 text-xs border-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white rounded-lg"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.highlights.map((highlight, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Highlight ${index + 1} (e.g., "Best sunset view in the city")`}
                          value={highlight.highlight}
                          onChange={(e) => updateHighlight(index, e.target.value)}
                          maxLength={150}
                          className="flex-1 h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
                        />
                        {formData.highlights.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeHighlight(index)}
                            className="h-12 w-12 border-2 border-red-200 text-red-500 hover:bg-red-50 rounded-xl"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Add 3-10 compelling highlights that make your guide special
                  </p>
                </div>

                {/* Featured Image */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Featured Image *</Label>
                  <div className="space-y-3">
                    <ImageUpload
                      onImageUpload={async (file: File) => {
                        const result = await handleUpload(file)
                        setFeaturedImage(result)
                        return result
                      }}
                      currentImage={formData.featuredImage ? { url: `/api/media/${formData.featuredImage}`, alt: '' } : undefined}
                      onImageChange={setFeaturedImage}
                      onImageRemove={removeFeaturedImage}
                      placeholder="Upload a featured image for your guide"
                      aspectRatio="aspect-video"
                      id="featured-image-upload"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    This image will be used in guide listings and previews
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Guide Locations</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Add all the places travelers should visit in your guide
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GuideLocationsManager
                  locations={formData.locations}
                  onAddLocation={addLocation}
                  onRemoveLocation={removeLocation}
                  onUpdateLocation={updateLocationDetails}
                  onReorderLocation={reorderLocation}
                  className="w-full"
                />
                
                {formData.locations.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                      Guide Route Summary
                    </h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>• {formData.locations.length} location{formData.locations.length !== 1 ? 's' : ''} added</p>
                      <p>• Total estimated time: {Math.floor(formData.locations.reduce((total, loc) => total + (loc.estimatedTime || 0), 0) / 60)}h {formData.locations.reduce((total, loc) => total + (loc.estimatedTime || 0), 0) % 60}m</p>
                      <p>• Primary location: {formData.locations[0]?.location.name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Guide Content</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  The main content that will make your guide valuable
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-sm font-medium">Main Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your comprehensive guide content here. Include detailed descriptions, recommendations, tips, and any other valuable information that will help travelers..."
                    value={formData.content}
                    onChange={(e) => updateFormData({ content: e.target.value })}
                    rows={12}
                    className="text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl resize-none min-h-[300px]"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Provide detailed, valuable content that justifies your guide's pricing</span>
                    <span>{formData.content.length} characters</span>
                  </div>
                </div>

                {/* Writing Tips */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Writing Tips
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Start with an engaging introduction</li>
                    <li>• Include specific details and personal experiences</li>
                    <li>• Add practical information (hours, prices, locations)</li>
                    <li>• Use clear headings and sections</li>
                    <li>• End with a compelling conclusion</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Itinerary Tab */}
          <TabsContent value="itinerary" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Detailed Itinerary</CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Create a step-by-step timeline for your guide (optional)
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addItineraryItem}
                    className="w-full sm:w-auto h-10 text-sm border-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Activity
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {formData.itinerary.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No itinerary items yet. Add a detailed timeline to help travelers plan their day.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.itinerary.map((item, index) => (
                      <Card key={index} className="p-4 border-2 border-gray-100 rounded-xl">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-medium text-base">Activity {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItineraryItem(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Time</Label>
                              <Input
                                placeholder="e.g., 9:00 AM or Morning"
                                value={item.time}
                                onChange={(e) => updateItineraryItem(index, 'time', e.target.value)}
                                className="h-10 text-sm border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Activity</Label>
                              <Input
                                placeholder="e.g., Visit the main square"
                                value={item.activity}
                                onChange={(e) => updateItineraryItem(index, 'activity', e.target.value)}
                                maxLength={100}
                                className="h-10 text-sm border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <Textarea
                              placeholder="Describe what travelers should do and expect..."
                              value={item.description}
                              onChange={(e) => updateItineraryItem(index, 'description', e.target.value)}
                              maxLength={300}
                              rows={3}
                              className="text-sm border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg resize-none"
                            />
                            <p className="text-xs text-gray-500">{item.description.length}/300 characters</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Location (optional)</Label>
                              <Input
                                placeholder="Specific address or place name"
                                value={item.location || ''}
                                onChange={(e) => updateItineraryItem(index, 'location', e.target.value)}
                                className="h-10 text-sm border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Tips (optional)</Label>
                              <Input
                                placeholder="Additional tips for this activity"
                                value={item.tips || ''}
                                onChange={(e) => updateItineraryItem(index, 'tips', e.target.value)}
                                maxLength={200}
                                className="h-10 text-sm border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Insider Tips</CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Share your local knowledge and secrets
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addInsiderTip}
                    className="w-full sm:w-auto h-10 text-sm border-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tip
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {formData.insiderTips.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No tips yet. Share your insider knowledge to make your guide valuable.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.insiderTips.map((tip, index) => (
                      <Card key={index} className="p-4 border-2 border-gray-100 rounded-xl">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-medium text-base">Tip {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInsiderTip(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 mb-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Category</Label>
                            <Select 
                              value={tip.category} 
                              onValueChange={(value) => updateInsiderTip(index, 'category', value)}
                            >
                              <SelectTrigger className="h-10 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tipCategories.map(category => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Priority</Label>
                            <Select 
                              value={tip.priority} 
                              onValueChange={(value: 'high' | 'medium' | 'low') => updateInsiderTip(index, 'priority', value)}
                            >
                              <SelectTrigger className="h-10 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">🔥 Essential</SelectItem>
                                <SelectItem value="medium">⭐ Helpful</SelectItem>
                                <SelectItem value="low">💡 Nice to Know</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Tip</Label>
                          <Textarea
                            placeholder="Share your insider knowledge..."
                            value={tip.tip}
                            onChange={(e) => updateInsiderTip(index, 'tip', e.target.value)}
                            maxLength={300}
                            rows={3}
                            className="text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-lg resize-none"
                          />
                          <p className="text-xs text-gray-500">{tip.tip.length}/300 characters</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Guide Settings</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Final settings and tags for your guide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Tags */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Add a tag and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = ''
                        }
                      }}
                      className="h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl"
                    />
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer px-3 py-1 text-sm rounded-lg">
                          {tag.tag}
                          <X 
                            className="h-3 w-3 ml-1" 
                            onClick={() => removeTag(index)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Language</Label>
                  <Select 
                    value={formData.language} 
                    onValueChange={(value) => updateFormData({ language: value })}
                  >
                    <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-[#4ECDC4] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                      <SelectItem value="fr">🇫🇷 French</SelectItem>
                      <SelectItem value="de">🇩🇪 German</SelectItem>
                      <SelectItem value="it">🇮🇹 Italian</SelectItem>
                      <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SEO & Meta Information */}
                <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  <h4 className="font-medium text-purple-900 flex items-center">
                    <Search className="h-5 w-5 mr-2" />
                    SEO & Meta Information
                  </h4>
                  <p className="text-sm text-purple-700">
                    Optional SEO settings to help your guide rank better in search results
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">SEO Title</Label>
                      <Input
                        placeholder="Leave blank to use guide title"
                        value={formData.meta.title || ''}
                        onChange={(e) => updateMeta('title', e.target.value)}
                        maxLength={60}
                        className="h-10 text-sm border-2 border-purple-200 focus:border-purple-400 rounded-lg"
                      />
                      <p className="text-xs text-purple-600">{formData.meta.title?.length || 0}/60 characters</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">SEO Description</Label>
                      <Textarea
                        placeholder="Leave blank to use guide description"
                        value={formData.meta.description || ''}
                        onChange={(e) => updateMeta('description', e.target.value)}
                        maxLength={160}
                        rows={3}
                        className="text-sm border-2 border-purple-200 focus:border-purple-400 rounded-lg resize-none"
                      />
                      <p className="text-xs text-purple-600">{formData.meta.description?.length || 0}/160 characters</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Keywords</Label>
                      <Input
                        placeholder="Comma-separated keywords (e.g., travel, food, culture)"
                        value={formData.meta.keywords || ''}
                        onChange={(e) => updateMeta('keywords', e.target.value)}
                        className="h-10 text-sm border-2 border-purple-200 focus:border-purple-400 rounded-lg"
                      />
                      <p className="text-xs text-purple-600">Keywords help search engines understand your content</p>
                    </div>
                  </div>
                </div>

                {/* Form Status */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-gray-200">
                  <h4 className="font-medium mb-3 text-gray-900 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Form Completion Status
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      {formData.title.trim() ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>Title</span>
                    </div>
                    <div className="flex items-center">
                      {formData.description.trim() ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>Description</span>
                    </div>
                    <div className="flex items-center">
                      {formData.locations.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>Locations ({formData.locations.length})</span>
                    </div>
                    <div className="flex items-center">
                      {formData.highlights.some(h => h.highlight.trim()) ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>Highlights</span>
                    </div>
                    <div className="flex items-center">
                      {formData.content.trim() ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>Main content</span>
                    </div>
                    <div className="flex items-center">
                      {formData.featuredImage ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>Featured image</span>
                    </div>
                    <div className="flex items-center">
                      {formData.tags.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <span>Tags ({formData.tags.length})</span>
                    </div>
                    <div className="flex items-center">
                      {formData.insiderTips.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                      )}
                      <span>Insider tips ({formData.insiderTips.length})</span>
                    </div>
                    <div className="flex items-center">
                      {formData.itinerary.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                      )}
                      <span>Itinerary ({formData.itinerary.length})</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mobile-Optimized Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-6 -mx-4 sm:mx-0 sm:static sm:bg-transparent sm:border-0 sm:p-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm border-2 border-gray-300 hover:border-gray-400 rounded-xl"
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            
            <Button
              onClick={() => handleSubmit('review')}
              disabled={isSubmitting || !isFormValid()}
              className="flex-1 sm:flex-none h-12 sm:h-10 text-base sm:text-sm bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isFormValid() ? 'Submit for Review' : 'Complete Required Fields'}
            </Button>
          </div>
          
          {/* Mobile progress summary */}
          <div className="mt-3 sm:hidden text-center text-xs text-gray-500">
            {Object.values({
              title: formData.title.trim(),
              description: formData.description.trim(),
              locations: formData.locations.length > 0,
              highlights: formData.highlights.some(h => h.highlight.trim()),
              content: formData.content.trim(),
              featuredImage: !!formData.featuredImage,
              tags: formData.tags.length > 0
            }).filter(Boolean).length}/6 fields completed
          </div>
        </div>
      </div>
    </div>
  )
} 