'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Save,
  Building,
  Clock,
  Camera,
  RefreshCw,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getCategories, createLocation, type LocationFormData, type DayOfWeek } from '@/app/actions'
import { HierarchicalCategorySelector } from '@/components/ui/hierarchical-category-selector'

interface FoursquarePlace {
  foursquareId: string
  preview: any
  original: any
  distance?: number
  distanceText?: string
  categories: string[]
  rating?: number
  verified?: boolean
  photos?: number
  tips?: number
}

interface EditingLocation {
  foursquarePlace: FoursquarePlace
  locationData: LocationFormData & {
    coordinates?: { latitude: number; longitude: number }
    foursquareId?: string
  }
}

export default function EnhancedFoursquareImport() {
  const [activeTab, setActiveTab] = useState('search')
  const [isLoading, setIsLoading] = useState(false)
  
  // Categories from Payload CMS
  const [categories, setCategories] = useState<{
    id: string
    name: string
    slug: string
    description?: string
    source: 'manual' | 'foursquare' | 'imported'
    foursquareIcon?: {
      prefix: string
      suffix: string
    }
    subcategories?: any[]
    parent?: string
  }[]>([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchRadius, setSearchRadius] = useState('1000')
  const [searchLimit, setSearchLimit] = useState('20')
  
  // Results state
  const [searchResults, setSearchResults] = useState<FoursquarePlace[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [previewPlace, setPreviewPlace] = useState<FoursquarePlace | null>(null)

  // Edit modal state
  const [editingLocations, setEditingLocations] = useState<EditingLocation[]>([])
  const [currentEditIndex, setCurrentEditIndex] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  
  // Photo fetching state
  const [isFetchingPhotos, setIsFetchingPhotos] = useState(false)
  const [fetchedPhotos, setFetchedPhotos] = useState<Record<string, any[]>>({})
  
  // Manual photo upload state
  const [manualPhotos, setManualPhotos] = useState<Record<string, Array<{ file: File; preview: string; caption: string }>>>({})
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  
  // AI insights state
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [generatedInsights, setGeneratedInsights] = useState<Record<string, any>>({})

  // State for tips editing mode
  const [tipsEditMode, setTipsEditMode] = useState<'simple' | 'structured'>('simple')
  const [simpleTipsText, setSimpleTipsText] = useState('')

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await getCategories()
        
        // Transform categories to include hierarchical structure
        const transformedCategories = result.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          description: doc.description,
          source: doc.source || 'manual',
          foursquareIcon: doc.foursquareIcon,
          parent: doc.parent?.id || doc.parent,
          subcategories: []
        }))

        // Build hierarchical structure
        const categoryMap = new Map(transformedCategories.map(cat => [cat.id, cat]))
        const rootCategories: any[] = []

        transformedCategories.forEach(category => {
          if (category.parent) {
            const parent = categoryMap.get(category.parent)
            if (parent) {
              if (!parent.subcategories) parent.subcategories = []
              parent.subcategories.push(category)
            }
          } else {
            rootCategories.push(category)
          }
        })

        setCategories(rootCategories)
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast.error('Failed to load categories')
      }
    }
    fetchCategories()
  }, [])

  // Convert Foursquare place to LocationFormData
  const convertToLocationData = (place: FoursquarePlace): LocationFormData & {
    coordinates?: { latitude: number; longitude: number }
    foursquareId?: string
  } => {
    const preview = place.preview
    
    // Helper function to format time from HHMM to HH:MM
    const formatTime = (time: string): string => {
      if (!time || time.length !== 4) return ''
      return `${time.slice(0, 2)}:${time.slice(2)}`
    }

    // Map Foursquare business hours to our format
    const mapBusinessHours = () => {
      if (!preview.businessHours) {
        return [
          { day: "Monday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
          { day: "Tuesday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
          { day: "Wednesday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
          { day: "Thursday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
          { day: "Friday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
          { day: "Saturday" as DayOfWeek, open: "10:00", close: "15:00", closed: false },
          { day: "Sunday" as DayOfWeek, open: "", close: "", closed: true }
        ]
      }

      return preview.businessHours.map((hour: any) => ({
        day: hour.day as DayOfWeek,
        open: formatTime(hour.open) || "",
        close: formatTime(hour.close) || "",
        closed: hour.closed || false
      }))
    }

    // Generate slug from name
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }
    
    return {
      name: preview.name || '',
      slug: generateSlug(preview.name || ''),
      description: preview.description || `Discover ${preview.name} - a local gem worth visiting. Located in ${preview.address?.city || 'the area'}, this ${preview.categories?.[0] || 'location'} offers a unique experience for visitors.`,
      shortDescription: preview.shortDescription || `Visit ${preview.name} for a great experience.`,
      
      // Try to map to existing categories
      categories: preview.categories && categories.length > 0 
        ? preview.categories
          .map((catName: string) => {
            const match = categories.find(cat => 
              cat.name.toLowerCase().includes(catName.toLowerCase()) ||
              catName.toLowerCase().includes(cat.name.toLowerCase())
            )
            return match?.id
          })
          .filter(Boolean)
          .slice(0, 1) // Take first match
        : undefined,
      
      address: {
        street: preview.address?.street || '',
        city: preview.address?.city || '',
        state: preview.address?.state || '',
        zip: preview.address?.zip || '',
        country: preview.address?.country || 'USA'
      },
      
      coordinates: preview.coordinates || { latitude: 0, longitude: 0 },
      neighborhood: preview.neighborhood || preview.address?.city || '',
      
      contactInfo: {
        phone: preview.contactInfo?.phone || '',
        email: preview.contactInfo?.email || '',
        website: preview.contactInfo?.website || '',
        socialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: ''
        }
      },
      
      businessHours: mapBusinessHours(),
      
      priceRange: preview.priceRange as "free" | "budget" | "moderate" | "expensive" | "luxury" || 'moderate',
      bestTimeToVisit: preview.bestTimeToVisit || [{ season: 'Year-round' }],
      insiderTips: preview.insiderTips || '',
      
      accessibility: {
        wheelchairAccess: false,
        parking: false,
        other: 'Please verify accessibility information'
      },
      
      status: 'review' as const,
      isFeatured: false,
      isVerified: preview.isVerified || false,
      
      meta: {
        title: preview.meta?.title || `${preview.name} | Sacavia`,
        description: preview.meta?.description || preview.shortDescription || `Discover ${preview.name} on Sacavia`,
        keywords: preview.meta?.keywords || preview.categories?.join(', ') || ''
      },
      
      tags: preview.tags || preview.categories?.map((cat: string) => ({ tag: cat })) || [],
      gallery: [
        // Fetched photos from Foursquare
        ...(fetchedPhotos[place.foursquareId] || []).map((photo, index) => ({
          image: photo.highResUrl,
          caption: photo.caption || `${preview.name} - Photo ${index + 1} (via Foursquare)`
        })),
        // Manual photos (will be uploaded during location creation)
        ...(manualPhotos[place.foursquareId] || []).map((photo, index) => ({
          image: photo.preview, // Will be replaced with actual URL after upload
          caption: photo.caption || `${preview.name} - Manual Photo ${index + 1}`,
          isManual: true,
          file: photo.file
        }))
      ],
      featuredImage: fetchedPhotos[place.foursquareId]?.[0]?.highResUrl || 
                    manualPhotos[place.foursquareId]?.[0]?.preview || 
                    undefined,
      
      foursquareId: place.foursquareId
    }
  }

  const handleSearch = async () => {
    if (!searchQuery && !searchLocation) {
      toast.error('Please provide a search query or location')
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      if (searchLocation) params.append('near', searchLocation)
      if (searchRadius) params.append('radius', searchRadius)
      if (searchLimit) params.append('limit', searchLimit)

      const response = await fetch(`/api/foursquare/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.results)
        setSelectedPlaces(new Set())
        toast.success(`Found ${data.count} places`)
      } else {
        toast.error(data.error || 'Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search places')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePlaceSelection = (foursquareId: string) => {
    const newSelected = new Set(selectedPlaces)
    if (newSelected.has(foursquareId)) {
      newSelected.delete(foursquareId)
    } else {
      newSelected.add(foursquareId)
    }
    setSelectedPlaces(newSelected)
  }

  const fetchPhotosForSelectedPlaces = async () => {
    if (selectedPlaces.size === 0) {
      toast.error('Please select places first')
      return
    }

    setIsFetchingPhotos(true)
    try {
      const fsqIds = Array.from(selectedPlaces)
      
      const response = await fetch('/api/foursquare/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fsq_ids: fsqIds, limit: 10 })
      })

      const data = await response.json()

      if (data.success) {
        const photosMap: Record<string, any[]> = {}
        data.results.forEach((result: any) => {
          if (result.success && result.photos.length > 0) {
            photosMap[result.fsq_id] = result.photos
          }
        })
        
        setFetchedPhotos(prev => ({ ...prev, ...photosMap }))
        
        const totalPhotos = Object.values(photosMap).reduce((sum, photos) => sum + photos.length, 0)
        toast.success(`Fetched ${totalPhotos} photos for ${Object.keys(photosMap).length} places`)
      } else {
        toast.error(data.error || 'Failed to fetch photos')
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
      toast.error('Failed to fetch photos')
    } finally {
      setIsFetchingPhotos(false)
    }
  }

  const fetchPhotosForSinglePlace = async (fsqId: string) => {
    if (fetchedPhotos[fsqId]) {
      toast.info('Photos already fetched for this place')
      return
    }

    try {
      const response = await fetch(`/api/foursquare/photos?fsq_id=${fsqId}&limit=10`)
      const data = await response.json()

      if (data.success && data.photos.length > 0) {
        setFetchedPhotos(prev => ({ ...prev, [fsqId]: data.photos }))
        toast.success(`Fetched ${data.photos.length} photos`)
      } else {
        toast.info('No photos found for this place')
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
      toast.error('Failed to fetch photos')
    }
  }

  const handleManualPhotoUpload = async (fsqId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image must be less than 5MB')
      return
    }

    // Create preview URL
    const preview = URL.createObjectURL(file)
    
    // Add to manual photos
    setManualPhotos(prev => ({
      ...prev,
      [fsqId]: [
        ...(prev[fsqId] || []),
        { file, preview, caption: '' }
      ]
    }))

    toast.success('Photo added successfully')
  }

  const removeManualPhoto = (fsqId: string, index: number) => {
    setManualPhotos(prev => {
      const photos = prev[fsqId] || []
      // Revoke the object URL to free memory
      URL.revokeObjectURL(photos[index].preview)
      
      return {
        ...prev,
        [fsqId]: photos.filter((_, i) => i !== index)
      }
    })
  }

  const updateManualPhotoCaption = (fsqId: string, index: number, caption: string) => {
    setManualPhotos(prev => ({
      ...prev,
      [fsqId]: (prev[fsqId] || []).map((photo, i) => 
        i === index ? { ...photo, caption } : photo
      )
    }))
  }

  const generateInsiderTips = async (fsqId: string, locationData: any) => {
    if (!locationData.contactInfo?.website) {
      toast.error('No website URL available for this location')
      return
    }

    setIsGeneratingInsights(true)
    
    try {
      const response = await fetch('/api/foursquare/generate-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationName: locationData.name,
          website: locationData.contactInfo.website,
          categories: locationData.categories || [],
          description: locationData.description || ''
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate insights: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success && result.tips && Array.isArray(result.tips)) {
        setGeneratedInsights(prev => ({
          ...prev,
          [fsqId]: result
        }))
        
        // Update the current editing location's insider tips
        setEditingLocations(prev => prev.map(loc => 
          loc.foursquarePlace.foursquareId === fsqId 
            ? { 
                ...loc, 
                locationData: { 
                  ...loc.locationData, 
                  insiderTips: result.tips 
                } 
              }
            : loc
        ))
        
        toast.success(`AI-generated ${result.tips.length} insider tips added! (Confidence: ${Math.round(result.confidence * 100)}%)`)
      } else {
        throw new Error(result.error || 'Failed to generate insights')
      }
    } catch (error) {
      console.error('Error generating insights:', error)
      toast.error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  const handleStartEditing = () => {
    if (selectedPlaces.size === 0) {
      toast.error('Please select places to edit and import')
      return
    }

    // Convert selected places to editing locations
    const placesToEdit = Array.from(selectedPlaces)
      .map(id => searchResults.find(place => place.foursquareId === id))
      .filter(Boolean) as FoursquarePlace[]

    const editingData = placesToEdit.map(place => ({
      foursquarePlace: place,
      locationData: convertToLocationData(place)
    }))

    setEditingLocations(editingData)
    setCurrentEditIndex(0)
    setIsEditModalOpen(true)
  }

  const handleSaveCurrentEdit = async () => {
    if (currentEditIndex >= editingLocations.length) return

    setIsSubmittingEdit(true)
    try {
      const currentEdit = editingLocations[currentEditIndex]
      let locationData = { ...currentEdit.locationData }

      // Upload manual photos first if any exist
      const manualPhotosForLocation = manualPhotos[currentEdit.foursquarePlace.foursquareId]
      if (manualPhotosForLocation && manualPhotosForLocation.length > 0) {
        const uploadedPhotos = []
        
        for (const photo of manualPhotosForLocation) {
          try {
            const formData = new FormData()
            formData.append('file', photo.file)
            formData.append('alt', photo.caption || `${locationData.name} - Manual Upload`)

            const response = await fetch('/api/media', {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`Upload failed: ${response.statusText}`)
            }

            const { doc } = await response.json()
            uploadedPhotos.push({
              image: doc.id,
              caption: photo.caption || `${locationData.name} - Photo`
            })
          } catch (error) {
            console.error('Failed to upload manual photo:', error)
            toast.error('Some photos failed to upload')
          }
        }

        // Update gallery with uploaded photos (replace manual ones with uploaded IDs)
        if (uploadedPhotos.length > 0) {
          const existingGallery = locationData.gallery || []
          // Remove manual photos and add uploaded ones
          const nonManualPhotos = existingGallery.filter(item => !item.isManual)
          locationData.gallery = [...nonManualPhotos, ...uploadedPhotos]
          
          // Update featured image if it was a manual photo
          if (locationData.featuredImage?.startsWith('blob:') && uploadedPhotos.length > 0) {
            locationData.featuredImage = uploadedPhotos[0].image
          }
        }
      }
      
      const result = await createLocation(locationData)
      
      toast.success(`Successfully imported ${locationData.name}`)
      
      // Clean up manual photos for this location
      if (manualPhotosForLocation) {
        manualPhotosForLocation.forEach(photo => URL.revokeObjectURL(photo.preview))
        setManualPhotos(prev => {
          const newState = { ...prev }
          delete newState[currentEdit.foursquarePlace.foursquareId]
          return newState
        })
      }
      
      // Move to next location or close modal
      if (currentEditIndex < editingLocations.length - 1) {
        setCurrentEditIndex(currentEditIndex + 1)
      } else {
        // All done
        setIsEditModalOpen(false)
        setCurrentEditIndex(0)
        setEditingLocations([])
        setSelectedPlaces(new Set())
        toast.success('All locations imported successfully!')
      }
    } catch (error) {
      console.error('Error importing location:', error)
      toast.error(`Failed to import ${editingLocations[currentEditIndex].locationData.name}`)
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handleSkipLocation = () => {
    if (currentEditIndex < editingLocations.length - 1) {
      setCurrentEditIndex(currentEditIndex + 1)
    } else {
      setIsEditModalOpen(false)
      setCurrentEditIndex(0)
      setEditingLocations([])
      toast.success('Import process completed')
    }
  }

  const updateCurrentLocationData = (updates: Partial<LocationFormData & {
    coordinates?: { latitude: number; longitude: number }
    foursquareId?: string
  }>) => {
    setEditingLocations(prev => prev.map((edit, index) => 
      index === currentEditIndex 
        ? { ...edit, locationData: { ...edit.locationData, ...updates } }
        : edit
    ))
  }

  // Helper function to convert structured tips to display string
  const structuredTipsToString = (tips: any): string => {
    if (!tips) return ''
    if (typeof tips === 'string') return tips
    if (Array.isArray(tips)) {
      return tips.map((tip, index) => {
        if (typeof tip === 'object' && tip.tip) {
          const categoryLabel = {
            timing: 'Best Times',
            food: 'Food & Drinks',
            secrets: 'Local Secrets',
            protips: 'Pro Tips',
            access: 'Getting There',
            savings: 'Money Saving',
            recommendations: 'What to Order/Try',
            hidden: 'Hidden Features'
          }[tip.category] || 'Pro Tips'
          
          const priorityIndicator = tip.priority === 'high' ? '[ESSENTIAL] ' : tip.priority === 'medium' ? '[HELPFUL] ' : '[NICE TO KNOW] '
          return `${priorityIndicator}${categoryLabel}: ${tip.tip}`
        }
        return typeof tip === 'string' ? tip : ''
      }).filter(Boolean).join('\n\n')
    }
    return String(tips)
  }

  // Improved helper function to convert display string back to structured tips
  const stringToStructuredTips = (text: string): any => {
    if (!text || text.trim() === '') return []
    
    // If it looks like structured tips (contains priority indicators), try to parse
    if (text.includes('[ESSENTIAL]') || text.includes('[HELPFUL]') || text.includes('[NICE TO KNOW]')) {
      const lines = text.split('\n\n').filter(line => line.trim())
      return lines.map((line, index) => {
        // Extract priority
        let priority = 'medium'
        let cleanLine = line.trim()
        if (cleanLine.includes('[ESSENTIAL]')) {
          priority = 'high'
          cleanLine = cleanLine.replace(/\[ESSENTIAL\]\s*/g, '').trim()
        } else if (cleanLine.includes('[HELPFUL]')) {
          priority = 'medium'
          cleanLine = cleanLine.replace(/\[HELPFUL\]\s*/g, '').trim()
        } else if (cleanLine.includes('[NICE TO KNOW]')) {
          priority = 'low'
          cleanLine = cleanLine.replace(/\[NICE TO KNOW\]\s*/g, '').trim()
        }
        
        // Extract category and tip
        let category = 'protips'
        let tipText = cleanLine
        
        const categoryMatches = {
          'Best Times': 'timing',
          'Food & Drinks': 'food',
          'Local Secrets': 'secrets',
          'Pro Tips': 'protips',
          'Getting There': 'access',
          'Money Saving': 'savings',
          'What to Order/Try': 'recommendations',
          'Hidden Features': 'hidden'
        }
        
        for (const [label, cat] of Object.entries(categoryMatches)) {
          const pattern = new RegExp(`${label}\\s*:\\s*`, 'i')
          if (pattern.test(cleanLine)) {
            category = cat
            tipText = cleanLine.replace(pattern, '').trim()
            break
          }
        }
        
        return {
          category,
          tip: tipText || `Tip ${index + 1}`,
          priority,
          isVerified: false,
          source: 'ai_generated'
        }
      }).filter(tip => tip.tip && tip.tip.trim())
    }
    
    // For simple text, split by double newlines and create basic structured tips
    const lines = text.split('\n\n').filter(line => line.trim())
    if (lines.length > 0) {
      return lines.map((line, index) => ({
        category: 'protips',
        tip: line.trim(),
        priority: 'medium',
        isVerified: false,
        source: 'user_edited'
      })).filter(tip => tip.tip && tip.tip.trim())
    }
    
    // Fallback: treat as single tip
    return [{
      category: 'protips',
      tip: text.trim(),
      priority: 'medium',
      isVerified: false,
      source: 'user_edited'
    }]
  }

  const PlaceCard = ({ place, onToggle, isSelected }: { 
    place: FoursquarePlace, 
    onToggle: (id: string) => void, 
    isSelected: boolean 
  }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(place.foursquareId)}
              />
              <CardTitle className="text-lg">{place.preview.name}</CardTitle>
              {place.verified && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {place.categories?.slice(0, 3).map((category, index) => (
                <Badge key={index} variant="secondary">{category}</Badge>
              )) || []}
            </div>
            {place.rating && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {fetchedPhotos[place.foursquareId] && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <Camera className="w-3 h-3 mr-1" />
                {fetchedPhotos[place.foursquareId].length} photos
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPhotosForSinglePlace(place.foursquareId)}
              disabled={!!fetchedPhotos[place.foursquareId]}
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewPlace(place)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{place.preview.address?.street}, {place.preview.address?.city}</span>
          </div>
          {place.distance && (
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium">{place.distanceText}</span>
            </div>
          )}
          {place.preview.contactInfo?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{place.preview.contactInfo.phone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const currentEdit = editingLocations[currentEditIndex]

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Enhanced Foursquare Places Import</h1>
        <p className="text-gray-600">Search, edit, and import places from Foursquare with full customization</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Search Places</TabsTrigger>
          <TabsTrigger value="edit">Edit & Import ({selectedPlaces.size})</TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Foursquare Places</CardTitle>
              <CardDescription>
                Search for places by name and location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="query">Search Query</Label>
                  <Input
                    id="query"
                    placeholder="e.g., coffee shops, pizza"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Boston, MA"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="radius">Radius (meters)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Places
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Search Results ({searchResults.length})</CardTitle>
                    <CardDescription>Found places matching your search criteria</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allIds = new Set(searchResults.map(place => place.foursquareId))
                        setSelectedPlaces(allIds)
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPlaces(new Set())}
                      disabled={selectedPlaces.size === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((place) => (
                    <PlaceCard
                      key={place.foursquareId}
                      place={place}
                      onToggle={togglePlaceSelection}
                      isSelected={selectedPlaces.has(place.foursquareId)}
                    />
                  ))}
                </div>
                
                {selectedPlaces.size > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedPlaces.size} places selected for import
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          onClick={fetchPhotosForSelectedPlaces}
                          disabled={isFetchingPhotos}
                          variant="outline"
                          size="sm"
                        >
                          {isFetchingPhotos ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Fetching Photos...
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 mr-2" />
                              Fetch Photos
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => setActiveTab('edit')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit & Import
                        </Button>
                      </div>
                    </div>
                    
                    {Object.keys(fetchedPhotos).length > 0 && (
                      <div className="text-sm text-blue-700">
                        📸 Photos fetched for {Object.keys(fetchedPhotos).length} places ({Object.values(fetchedPhotos).reduce((sum, photos) => sum + photos.length, 0)} total photos)
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Edit & Import Tab */}
        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit & Import Locations</CardTitle>
              <CardDescription>
                Review and customize location data before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPlaces.size === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No places selected. Go to the search tab to select places.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      Ready to edit and import {selectedPlaces.size} places
                    </p>
                    <p className="text-sm text-blue-700">
                      Each location will open in an editing form where you can customize all details before importing.
                    </p>
                  </div>

                  <Button 
                    onClick={handleStartEditing} 
                    size="lg"
                    className="w-full"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Start Editing & Import Process
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {currentEdit && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Edit Location ({currentEditIndex + 1}/{editingLocations.length})
                </DialogTitle>
                <DialogDescription>
                  Customize the details for "{currentEdit.locationData.name}" before importing
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Location Name</Label>
                      <Input
                        id="edit-name"
                        value={currentEdit.locationData.name}
                        onChange={(e) => updateCurrentLocationData({ name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Categories</Label>
                      {categories.length > 0 ? (
                        <HierarchicalCategorySelector
                          categories={categories}
                          selectedCategories={currentEdit.locationData.categories || []}
                          onSelectionChange={(selectedIds) => updateCurrentLocationData({ categories: selectedIds })}
                          maxSelections={3}
                          placeholder="Select categories for this location"
                          showSearch={true}
                          showBadges={false}
                          allowSubcategorySelection={true}
                          expandedByDefault={false}
                        />
                      ) : (
                        <div className="p-3 border border-gray-200 rounded-lg text-center">
                          <div className="text-sm text-gray-500 mb-2">No categories available</div>
                          <Button
                            onClick={async () => {
                              try {
                                toast.info('Syncing categories from Foursquare...')
                                const response = await fetch('/api/categories/sync-foursquare', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                })
                                const result = await response.json()
                                
                                if (response.ok) {
                                  toast.success(`Categories synced! Created: ${result.created}, Updated: ${result.updated}`)
                                  window.location.reload()
                                } else {
                                  toast.error(result.error || 'Failed to sync categories')
                                }
                              } catch (error) {
                                console.error('Error syncing categories:', error)
                                toast.error('Failed to sync categories')
                              }
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Sync Categories
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={currentEdit.locationData.description}
                      onChange={(e) => updateCurrentLocationData({ description: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Address
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-street">Street Address</Label>
                      <Input
                        id="edit-street"
                        value={currentEdit.locationData.address?.street || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          address: { ...currentEdit.locationData.address, street: e.target.value }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-city">City</Label>
                      <Input
                        id="edit-city"
                        value={currentEdit.locationData.address?.city || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          address: { ...currentEdit.locationData.address, city: e.target.value }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-state">State</Label>
                      <Input
                        id="edit-state"
                        value={currentEdit.locationData.address?.state || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          address: { ...currentEdit.locationData.address, state: e.target.value }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-zip">ZIP Code</Label>
                      <Input
                        id="edit-zip"
                        value={currentEdit.locationData.address?.zip || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          address: { ...currentEdit.locationData.address, zip: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Coordinates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Coordinates
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-latitude">Latitude</Label>
                      <Input
                        id="edit-latitude"
                        type="number"
                        step="any"
                        value={currentEdit.locationData.coordinates?.latitude || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          coordinates: { 
                            ...currentEdit.locationData.coordinates, 
                            latitude: parseFloat(e.target.value) || 0 
                          }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-longitude">Longitude</Label>
                      <Input
                        id="edit-longitude"
                        type="number"
                        step="any"
                        value={currentEdit.locationData.coordinates?.longitude || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          coordinates: { 
                            ...currentEdit.locationData.coordinates, 
                            longitude: parseFloat(e.target.value) || 0 
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Photos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Photos & Media
                  </h3>

                  {/* Featured Image Selection */}
                  <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="text-md font-medium text-blue-900 flex items-center">
                      <Star className="w-4 h-4 mr-2 text-blue-600" />
                      Featured Image Selection
                    </h4>
                    <div className="text-sm text-blue-700 mb-3">
                      Choose which image will be the main featured image displayed in location lists and previews
                    </div>
                    
                    {currentEdit.locationData.featuredImage && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-blue-800">Current Featured Image:</div>
                        <div className="relative inline-block">
                          <img
                            src={currentEdit.locationData.featuredImage}
                            alt="Current featured image"
                            className="w-32 h-24 object-cover rounded-lg border-2 border-blue-300 shadow-md"
                          />
                          <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                            <Star className="w-3 h-3 fill-current" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!currentEdit.locationData.featuredImage && (
                      <div className="text-sm text-gray-600 italic">
                        No featured image selected. Choose one from the photos below.
                      </div>
                    )}
                  </div>

                  {/* Foursquare Photos */}
                  {fetchedPhotos[currentEdit.foursquarePlace.foursquareId] && (
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-700">
                        Photos from Foursquare ({fetchedPhotos[currentEdit.foursquarePlace.foursquareId].length})
                      </h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto">
                        {fetchedPhotos[currentEdit.foursquarePlace.foursquareId].map((photo, index) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.thumbnailUrl}
                              alt={`Photo ${index + 1}`}
                              className={`w-full h-24 object-cover rounded-lg border cursor-pointer transition-all duration-200 ${
                                currentEdit.locationData.featuredImage === photo.highResUrl 
                                  ? 'border-4 border-blue-500 shadow-lg' 
                                  : 'border hover:border-blue-300 hover:shadow-md'
                              }`}
                              onClick={() => updateCurrentLocationData({ featuredImage: photo.highResUrl })}
                            />
                            {currentEdit.locationData.featuredImage === photo.highResUrl && (
                              <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                                <Star className="w-3 h-3 fill-current" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <span className="text-white text-xs font-medium block">
                                  {photo.width} × {photo.height}
                                </span>
                                <span className="text-white text-xs block mt-1">
                                  {currentEdit.locationData.featuredImage === photo.highResUrl ? 'Featured' : 'Set as Featured'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        ✅ These photos will be automatically added to the location's gallery when imported
                        <br />
                        💡 Click on any photo to set it as the featured image
                      </div>
                    </div>
                  )}

                  {/* Manual Photo Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-gray-700">Manual Photo Upload</h4>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`manual-photo-${currentEdit.foursquarePlace.foursquareId}`}
                        onChange={(e) => handleManualPhotoUpload(currentEdit.foursquarePlace.foursquareId, e)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById(`manual-photo-${currentEdit.foursquarePlace.foursquareId}`)
                          input?.click()
                        }}
                        disabled={isUploadingPhoto}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Add Photo
                      </Button>
                    </div>

                    {manualPhotos[currentEdit.foursquarePlace.foursquareId] && manualPhotos[currentEdit.foursquarePlace.foursquareId].length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {manualPhotos[currentEdit.foursquarePlace.foursquareId].map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo.preview}
                              alt={`Manual photo ${index + 1}`}
                              className={`w-full h-24 object-cover rounded-lg border cursor-pointer transition-all duration-200 ${
                                currentEdit.locationData.featuredImage === photo.preview 
                                  ? 'border-4 border-blue-500 shadow-lg' 
                                  : 'border hover:border-blue-300 hover:shadow-md'
                              }`}
                              onClick={() => updateCurrentLocationData({ featuredImage: photo.preview })}
                            />
                            {currentEdit.locationData.featuredImage === photo.preview && (
                              <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                                <Star className="w-3 h-3 fill-current" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateCurrentLocationData({ featuredImage: photo.preview })
                                  }}
                                  className="text-xs"
                                >
                                  {currentEdit.locationData.featuredImage === photo.preview ? 'Featured' : 'Set as Featured'}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeManualPhoto(currentEdit.foursquarePlace.foursquareId, index)
                                    // If this was the featured image, clear it
                                    if (currentEdit.locationData.featuredImage === photo.preview) {
                                      updateCurrentLocationData({ featuredImage: undefined })
                                    }
                                  }}
                                  className="text-xs"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <Input
                                placeholder="Photo caption"
                                value={photo.caption}
                                onChange={(e) => updateManualPhotoCaption(currentEdit.foursquarePlace.foursquareId, index, e.target.value)}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      💡 Upload additional photos that aren't available from Foursquare
                      <br />
                      🌟 Click on any uploaded photo to set it as the featured image
                    </div>
                  </div>

                  {/* Clear Featured Image Option */}
                  {currentEdit.locationData.featuredImage && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCurrentLocationData({ featuredImage: undefined })}
                        className="text-gray-600 hover:text-red-600 hover:border-red-300"
                      >
                        Clear Featured Image
                      </Button>
                    </div>
                  )}

                  {(fetchedPhotos[currentEdit.foursquarePlace.foursquareId] || manualPhotos[currentEdit.foursquarePlace.foursquareId]) && (
                    <Separator />
                  )}
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Contact Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={currentEdit.locationData.contactInfo?.phone || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          contactInfo: { ...currentEdit.locationData.contactInfo, phone: e.target.value }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-website">Website</Label>
                      <Input
                        id="edit-website"
                        value={currentEdit.locationData.contactInfo?.website || ''}
                        onChange={(e) => updateCurrentLocationData({ 
                          contactInfo: { ...currentEdit.locationData.contactInfo, website: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Additional Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-price">Price Range</Label>
                      <Select 
                        value={currentEdit.locationData.priceRange || 'moderate'} 
                        onValueChange={(value) => updateCurrentLocationData({ priceRange: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="budget">Budget ($)</SelectItem>
                          <SelectItem value="moderate">Moderate ($$)</SelectItem>
                          <SelectItem value="expensive">Expensive ($$$)</SelectItem>
                          <SelectItem value="luxury">Luxury ($$$$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit-verified"
                          checked={currentEdit.locationData.isVerified || false}
                          onCheckedChange={(checked) => updateCurrentLocationData({ isVerified: !!checked })}
                        />
                        <Label htmlFor="edit-verified">Verified Location</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Insider Tips</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={tipsEditMode} 
                          onValueChange={(value: 'simple' | 'structured') => {
                            setTipsEditMode(value)
                            if (value === 'simple') {
                              // Convert current tips to simple text for editing
                              setSimpleTipsText(structuredTipsToString(currentEdit.locationData.insiderTips))
                            }
                          }}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Simple Edit</SelectItem>
                            <SelectItem value="structured">Structured</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateInsiderTips(currentEdit.foursquarePlace.foursquareId, currentEdit.locationData)}
                          disabled={isSubmittingEdit}
                          className="text-xs h-8"
                        >
                          <Loader2 className={`w-3 h-3 mr-1 ${isSubmittingEdit ? 'animate-spin' : ''}`} />
                          Generate AI Tips
                        </Button>
                      </div>
                    </div>

                    {tipsEditMode === 'simple' ? (
                      <div className="space-y-2">
                        <Textarea
                          value={simpleTipsText}
                          onChange={(e) => setSimpleTipsText(e.target.value)}
                          placeholder="Enter tips here, separate different tips with double line breaks (Enter twice)..."
                          className="min-h-[120px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateCurrentLocationData({ insiderTips: stringToStructuredTips(simpleTipsText) })
                              toast.success('Tips updated!')
                            }}
                            disabled={!simpleTipsText.trim()}
                            className="text-xs"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Apply Changes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSimpleTipsText('')
                              updateCurrentLocationData({ insiderTips: [] })
                              toast.success('Tips cleared!')
                            }}
                            className="text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Clear All
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          💡 Write tips in plain text. Each paragraph (separated by double line breaks) will become a separate tip.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Array.isArray(currentEdit.locationData.insiderTips) && currentEdit.locationData.insiderTips.length > 0 ? (
                          currentEdit.locationData.insiderTips.map((tip: any, index: number) => (
                            <Card key={index} className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-2">
                                    <Select 
                                      value={tip.category || 'protips'} 
                                      onValueChange={(value) => {
                                        const newTips = [...currentEdit.locationData.insiderTips]
                                        newTips[index] = { ...tip, category: value }
                                        updateCurrentLocationData({ insiderTips: newTips })
                                      }}
                                    >
                                      <SelectTrigger className="w-[140px] h-7">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="timing">⏰ Best Times</SelectItem>
                                        <SelectItem value="food">🍽️ Food & Drinks</SelectItem>
                                        <SelectItem value="secrets">💡 Local Secrets</SelectItem>
                                        <SelectItem value="protips">🎯 Pro Tips</SelectItem>
                                        <SelectItem value="access">🚗 Getting There</SelectItem>
                                        <SelectItem value="savings">💰 Money Saving</SelectItem>
                                        <SelectItem value="recommendations">📱 What to Order/Try</SelectItem>
                                        <SelectItem value="hidden">🎪 Hidden Features</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Select 
                                      value={tip.priority || 'medium'} 
                                      onValueChange={(value) => {
                                        const newTips = [...currentEdit.locationData.insiderTips]
                                        newTips[index] = { ...tip, priority: value }
                                        updateCurrentLocationData({ insiderTips: newTips })
                                      }}
                                    >
                                      <SelectTrigger className="w-[100px] h-7">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="high">🔥 Essential</SelectItem>
                                        <SelectItem value="medium">⭐ Helpful</SelectItem>
                                        <SelectItem value="low">💡 Nice to Know</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newTips = currentEdit.locationData.insiderTips.filter((_: any, i: number) => i !== index)
                                      updateCurrentLocationData({ insiderTips: newTips })
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-red-100"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </Button>
                                </div>
                                <Textarea
                                  value={tip.tip || ''}
                                  onChange={(e) => {
                                    const newTips = [...currentEdit.locationData.insiderTips]
                                    newTips[index] = { ...tip, tip: e.target.value }
                                    updateCurrentLocationData({ insiderTips: newTips })
                                  }}
                                  placeholder="Enter tip here..."
                                  className="min-h-[60px] resize-none"
                                />
                              </div>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No tips yet. Generate AI tips or add manually.</p>
                          </div>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentTips = Array.isArray(currentEdit.locationData.insiderTips) ? currentEdit.locationData.insiderTips : []
                            const newTip = {
                              category: 'protips',
                              tip: '',
                              priority: 'medium',
                              isVerified: false,
                              source: 'user_edited'
                            }
                            updateCurrentLocationData({ insiderTips: [...currentTips, newTip] })
                          }}
                          className="w-full text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add New Tip
                        </Button>
                        
                        <p className="text-xs text-gray-500">
                          💡 Use structured mode to organize tips by category and priority for better user experience.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Business Hours */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Business Hours
                  </h3>
                  
                  <div className="space-y-3">
                    {currentEdit.locationData.businessHours?.map((hours, index) => (
                      <div key={hours.day} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium capitalize">{hours.day}</div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={!hours.closed}
                            onCheckedChange={(checked) => {
                              const newHours = [...(currentEdit.locationData.businessHours || [])]
                              newHours[index] = { ...newHours[index], closed: !checked }
                              updateCurrentLocationData({ businessHours: newHours })
                            }}
                          />
                          <Label className="text-sm">Open</Label>
                        </div>
                        
                        {!hours.closed && (
                          <>
                            <Input
                              type="time"
                              value={hours.open || ''}
                              onChange={(e) => {
                                const newHours = [...(currentEdit.locationData.businessHours || [])]
                                newHours[index] = { ...newHours[index], open: e.target.value }
                                updateCurrentLocationData({ businessHours: newHours })
                              }}
                              placeholder="Opening time"
                            />
                            <Input
                              type="time"
                              value={hours.close || ''}
                              onChange={(e) => {
                                const newHours = [...(currentEdit.locationData.businessHours || [])]
                                newHours[index] = { ...newHours[index], close: e.target.value }
                                updateCurrentLocationData({ businessHours: newHours })
                              }}
                              placeholder="Closing time"
                            />
                          </>
                        )}
                        
                        {hours.closed && (
                          <div className="md:col-span-2 text-gray-500 text-sm italic">Closed</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={handleSkipLocation}>
                  Skip This Location
                </Button>
                <Button 
                  onClick={handleSaveCurrentEdit}
                  disabled={isSubmittingEdit}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Import This Location
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewPlace && (
        <Dialog open={!!previewPlace} onOpenChange={() => setPreviewPlace(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewPlace.preview.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <p><strong>Description:</strong> {previewPlace.preview.description}</p>
                <p><strong>Address:</strong> {previewPlace.preview.address?.street}, {previewPlace.preview.address?.city}</p>
                <p><strong>Categories:</strong> {previewPlace.categories?.join(', ') || 'None'}</p>
                {previewPlace.rating && (
                  <p><strong>Rating:</strong> {previewPlace.rating.toFixed(1)}/5</p>
                )}
                {previewPlace.preview.contactInfo?.phone && (
                  <p><strong>Phone:</strong> {previewPlace.preview.contactInfo.phone}</p>
                )}
                {previewPlace.preview.contactInfo?.website && (
                  <p><strong>Website:</strong> {previewPlace.preview.contactInfo.website}</p>
                )}
                {previewPlace.preview.insiderTips && (
                  <p><strong>Tips:</strong> {previewPlace.preview.insiderTips}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}