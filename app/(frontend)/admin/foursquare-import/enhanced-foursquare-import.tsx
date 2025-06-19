'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Download, 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Plus,
  Edit,
  Save,
  X,
  Building,
  ImageIcon,
  Users,
  Tag,
  Settings,
  RefreshCw,
  DollarSign,
  Map,
  Navigation,
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

interface ImportResult {
  foursquareId: string
  locationId?: string
  name: string
  status: 'imported' | 'error'
  error?: string
}

interface EditingLocation {
  foursquarePlace: FoursquarePlace
  locationData: LocationFormData
}

export default function EnhancedFoursquareImport() {
  const [activeTab, setActiveTab] = useState('search')
  const [isLoading, setIsLoading] = useState(false)
  
  // Categories from Payload CMS
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchCategory, setSearchCategory] = useState('ALL')
  const [searchRadius, setSearchRadius] = useState('1000')
  const [searchLimit, setSearchLimit] = useState('20')
  const [excludeChains, setExcludeChains] = useState(false)
  
  // Results state
  const [searchResults, setSearchResults] = useState<FoursquarePlace[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [previewPlace, setPreviewPlace] = useState<FoursquarePlace | null>(null)
  
  // Import state
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [isImporting, setIsImporting] = useState(false)

  // Discovery state
  const [userLatitude, setUserLatitude] = useState('')
  const [userLongitude, setUserLongitude] = useState('')
  const [discoveryRadius, setDiscoveryRadius] = useState('2000')
  const [discoveryResults, setDiscoveryResults] = useState<FoursquarePlace[]>([])

  // Edit modal state
  const [editingLocations, setEditingLocations] = useState<EditingLocation[]>([])
  const [currentEditIndex, setCurrentEditIndex] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // State for tips editing mode
  const [tipsEditMode, setTipsEditMode] = useState<'simple' | 'structured'>('simple')
  const [simpleTipsText, setSimpleTipsText] = useState('')

  // Helper function to find category by ID in hierarchical structure
  const findCategoryById = (categoryId: string, categoriesList: any[]): any => {
    for (const category of categoriesList) {
      if (category.id === categoryId) {
        return category
      }
      if (category.subcategories) {
        const found = findCategoryById(categoryId, category.subcategories)
        if (found) return found
      }
    }
    return null
  }

  // Helper function to find category by name in flat structure
  const findCategoryInFlat = (categoryName: string, categoriesList: any[]): any => {
    const searchInCategories = (cats: any[]): any => {
      for (const category of cats) {
        if (category.name.toLowerCase().includes(categoryName.toLowerCase()) ||
            categoryName.toLowerCase().includes(category.name.toLowerCase())) {
          return category
        }
        if (category.subcategories) {
          const found = searchInCategories(category.subcategories)
          if (found) return found
        }
      }
      return null
    }
    return searchInCategories(categoriesList)
  }

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔄 Fetching categories for Foursquare import...')
        const result = await getCategories()
        console.log('📊 Categories result:', result.docs?.length || 0, 'categories found')
        
        // Transform categories to include hierarchical structure
        const transformedCategories = result.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          description: doc.description,
          source: doc.source || 'manual',
          foursquareIcon: doc.foursquareIcon,
          parent: typeof doc.parent === 'object' && doc.parent?.id ? doc.parent.id : doc.parent,
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
            } else {
              // Add orphaned categories as root categories
              rootCategories.push(category)
            }
          } else {
            rootCategories.push(category)
          }
        })

        console.log('✅ Successfully loaded categories:', {
          total: transformedCategories.length,
          rootCategories: rootCategories.length,
          withSubcategories: rootCategories.filter(cat => cat.subcategories && cat.subcategories.length > 0).length
        })
        
        setCategories(rootCategories)
        
        if (rootCategories.length === 0) {
          console.warn('⚠️ No categories available for selection')
          toast.warning('No categories available. Categories may need to be synced first.')
        }
      } catch (error) {
        console.error("❌ Error fetching categories:", error)
        toast.error('Failed to load categories')
      }
    }
    fetchCategories()
  }, [])

  // Convert Foursquare place to LocationFormData
  const convertToLocationData = (place: FoursquarePlace): LocationFormData => {
    const preview = place.preview
    
    return {
      name: preview.name || '',
      slug: preview.slug || '',
      description: preview.description || '',
      shortDescription: preview.shortDescription || '',
      
      // Try to map to existing categories (support multiple)
      categories: preview.categories && categories.length > 0 
        ? preview.categories
          .map((catName: string) => {
            const match = findCategoryInFlat(catName, categories)
            return match?.id
          })
          .filter(Boolean)
          .slice(0, 3) // Take up to 3 matches
        : undefined,
      
      address: {
        street: preview.address?.street || '',
        city: preview.address?.city || '',
        state: preview.address?.state || '',
        zip: preview.address?.zip || '',
        country: preview.address?.country || 'USA'
      },
      
      coordinates: preview.coordinates || { latitude: 0, longitude: 0 },
      neighborhood: preview.neighborhood || '',
      
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
      
      businessHours: preview.businessHours || [
        { day: "Monday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
        { day: "Tuesday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
        { day: "Wednesday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
        { day: "Thursday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
        { day: "Friday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
        { day: "Saturday" as DayOfWeek, open: "10:00", close: "15:00", closed: false },
        { day: "Sunday" as DayOfWeek, open: "", close: "", closed: true }
      ],
      
      priceRange: preview.priceRange as "free" | "budget" | "moderate" | "expensive" | "luxury" || 'moderate',
      bestTimeToVisit: preview.bestTimeToVisit || [{ season: 'Year-round' }],
      
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
        description: preview.meta?.description || preview.shortDescription || '',
        keywords: preview.meta?.keywords || ''
      },
      
      tags: preview.tags || [],
      gallery: preview.gallery || [],
      featuredImage: undefined,
      
      // Initialize insiderTips as empty array (never a string)
      insiderTips: [],
      
      foursquareId: place.foursquareId
    }
  }

  const handleSearch = async () => {
    if (!searchQuery && !searchLocation && !searchCategory) {
      toast.error('Please provide at least one search parameter')
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      if (searchLocation) params.append('near', searchLocation)
      if (searchCategory && searchCategory !== 'ALL') params.append('category', searchCategory)
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

  const handleDiscover = async () => {
    if (!userLatitude || !userLongitude) {
      toast.error('Please provide coordinates')
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        latitude: userLatitude,
        longitude: userLongitude,
        radius: discoveryRadius,
        limit: '20'
      })

      if (excludeChains) {
        params.append('exclude_chains', 'true')
      }

      const response = await fetch(`/api/foursquare/discover?${params}`)
      const data = await response.json()

      if (data.success) {
        setDiscoveryResults(data.results)
        toast.success(`Discovered ${data.count} places nearby`)
      } else {
        toast.error(data.error || 'Discovery failed')
      }
    } catch (error) {
      console.error('Discovery error:', error)
      toast.error('Failed to discover places')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLatitude(position.coords.latitude.toString())
          setUserLongitude(position.coords.longitude.toString())
          toast.success('Location captured')
        },
        (error) => {
          toast.error('Failed to get location')
        }
      )
    } else {
      toast.error('Geolocation not supported')
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

  const handleStartEditing = () => {
    if (selectedPlaces.size === 0) {
      toast.error('Please select places to edit and import')
      return
    }

    // Convert selected places to editing locations
    const allResults = [...searchResults, ...discoveryResults]
    const placesToEdit = Array.from(selectedPlaces)
      .map(id => allResults.find(place => place.foursquareId === id))
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
      
      // Ensure insiderTips is always an array (never string or undefined)
      const locationData = {
        ...currentEdit.locationData,
        insiderTips: Array.isArray(currentEdit.locationData.insiderTips) 
          ? currentEdit.locationData.insiderTips 
          : []
      }
      
      const result = await createLocation(locationData)
      
      toast.success(`Successfully imported ${currentEdit.locationData.name}`)
      
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
        setActiveTab('results')
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

  const updateCurrentLocationData = (updates: Partial<LocationFormData>) => {
    setEditingLocations(prev => prev.map((edit, index) => 
      index === currentEditIndex 
        ? { ...edit, locationData: { ...edit.locationData, ...updates } }
        : edit
    ))
  }

  const generateBusinessDescription = async (fsqId: string, locationData: any) => {
    if (!locationData.name) {
      toast.error('Please provide location name first')
      return
    }

    setIsSubmittingEdit(true)
    try {
      console.log('🤖 Generating business description for:', locationData.name)
      toast.info('🔍 Generating compelling description with AI...')
      
      const requestBody = {
        locationName: locationData.name,
        website: locationData.contactInfo?.website || '',
        categories: locationData.categories || [],
        description: locationData.description || ''
      }
      
      console.log('🔍 Description request body:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch('/api/foursquare/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🔍 Description response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Description error response body:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Description response data:', data)
      
      if (data.success && data.description) {
        // Update the current editing location with the generated description
        updateCurrentLocationData({ 
          description: data.description 
        })
        
        toast.success('✨ AI business description generated successfully!')
        console.log('✅ Generated description:', data.description)
      } else {
        toast.error(data.error || 'Failed to generate business description')
      }
    } catch (error) {
      console.error('❌ Error generating business description:', error)
      toast.error('Failed to generate business description. Please try again.')
    } finally {
      setIsSubmittingEdit(false)
    }
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
        source: 'user_submitted'
      })).filter(tip => tip.tip && tip.tip.trim())
    }
    
    // Fallback: treat as single tip
    return [{
      category: 'protips',
      tip: text.trim(),
      priority: 'medium',
      isVerified: false,
      source: 'user_submitted'
    }]
  }

  const generateInsiderTips = async (fsqId: string, locationData: any) => {
    if (!locationData.name) {
      toast.error('Please fill in location name first')
      return
    }

    setIsSubmittingEdit(true)
    try {
      console.log('🤖 Generating insider tips for:', locationData.name)
      toast.info('🔍 Generating insider tips with AI...')
      
      const requestBody = {
        locationName: locationData.name,
        website: locationData.contactInfo?.website || '',
        categories: locationData.categories || [],
        description: locationData.description || ''
      }
      
      console.log('🔍 Request body being sent:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch('/api/foursquare/generate-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🔍 Tips response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Tips error response body:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Tips response data:', data)
      
      if (data.success && data.tips && Array.isArray(data.tips)) {
        // Ensure tips array is valid and not empty
        const validTips = data.tips.filter(tip => tip && typeof tip === 'object' && tip.tip)
        
        // Update the current editing location with the structured tips
        updateCurrentLocationData({ 
          insiderTips: validTips.length > 0 ? validTips : []
        })
        
        toast.success(`✨ AI generated ${validTips.length} insider tips successfully!`)
        console.log('✅ Generated tips:', validTips)
      } else {
        toast.error(data.error || 'Failed to generate insider tips')
      }
    } catch (error) {
      console.error('❌ Error generating insider tips:', error)
      toast.error('Failed to generate insider tips. Please try again.')
    } finally {
      setIsSubmittingEdit(false)
    }
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="search">Search Places</TabsTrigger>
          <TabsTrigger value="discover">Discover Nearby</TabsTrigger>
          <TabsTrigger value="edit">Edit & Import ({selectedPlaces.size})</TabsTrigger>
          <TabsTrigger value="results">Import Results</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Places</CardTitle>
              <CardDescription>
                Search for places using various criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category sync warning if no categories */}
              {categories.length === 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Categories Not Available</AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-3">
                      No categories found in the system. You may need to sync categories from Foursquare first.
                    </p>
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
                            toast.success(`Categories synced successfully! Created: ${result.created}, Updated: ${result.updated}`)
                            // Refresh categories
                            window.location.reload()
                          } else {
                            toast.error(result.error || 'Failed to sync categories')
                          }
                        } catch (error) {
                          console.error('Error syncing categories:', error)
                          toast.error('Failed to sync categories')
                        }
                      }}
                      className="bg-[#4ecdc4] hover:bg-[#3dbdb4] text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Categories from Foursquare
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-query">Search Query</Label>
                  <Input
                    id="search-query"
                    placeholder="e.g., coffee, restaurants, museums"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-location">Location</Label>
                  <Input
                    id="search-location"
                    placeholder="e.g., New York, NY or latitude,longitude"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-category">Category</Label>
                  <Select value={searchCategory} onValueChange={setSearchCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="NONE" disabled>
                          No categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-radius">Radius (meters)</Label>
                  <Input
                    id="search-radius"
                    type="number"
                    placeholder="1000"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-limit">Max Results</Label>
                  <Input
                    id="search-limit"
                    type="number"
                    placeholder="20"
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSearch} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search Places
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedPlaces.size} places selected for import
                      </span>
                      <Button 
                        onClick={() => setActiveTab('edit')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit & Import
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discover Nearby Places</CardTitle>
              <CardDescription>
                Find places near specific coordinates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="42.3601"
                    value={userLatitude}
                    onChange={(e) => setUserLatitude(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="-71.0589"
                    value={userLongitude}
                    onChange={(e) => setUserLongitude(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={handleGetCurrentLocation}>
                  <MapPin className="w-4 h-4 mr-2" />
                  Use My Location
                </Button>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="discovery-radius">Discovery Radius (meters)</Label>
                  <Input
                    id="discovery-radius"
                    type="number"
                    value={discoveryRadius}
                    onChange={(e) => setDiscoveryRadius(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-chains"
                  checked={excludeChains}
                  onCheckedChange={(checked) => setExcludeChains(!!checked)}
                />
                <Label htmlFor="exclude-chains">Exclude chain establishments</Label>
              </div>

              <Button 
                onClick={handleDiscover} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Discover Places
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {discoveryResults.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Discovered Places ({discoveryResults.length})</CardTitle>
                    <CardDescription>Places found near your specified location</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allIds = new Set(discoveryResults.map(place => place.foursquareId))
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
                  {discoveryResults.map((place) => (
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedPlaces.size} places selected for import
                      </span>
                      <Button 
                        onClick={() => setActiveTab('edit')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit & Import
                      </Button>
                    </div>
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
                    No places selected. Go to the search or discover tab to select places.
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

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <CardDescription>
                Results from location imports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importResults.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No import results available. Import some places first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {importResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{result.name}</p>
                        {result.status === 'imported' && result.locationId && (
                          <p className="text-sm text-gray-600">
                            Location ID: {result.locationId}
                          </p>
                        )}
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === 'imported' ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Imported
                            </Badge>
                            {result.locationId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/locations/${result.locationId}/edit`, '_blank')}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>
                Category loading and system status information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categories Status */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Category System Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Root Categories:</span>
                      <span className="font-medium">{categories.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Subcategories:</span>
                      <span className="font-medium">
                        {categories.reduce((total, cat) => total + (cat.subcategories?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categories Loaded:</span>
                      <span className={`font-medium ${categories.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {categories.length > 0 ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category Sources */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Category Sources</h4>
                  <div className="space-y-2 text-sm">
                    {(() => {
                      const sources = categories.reduce((acc: any, cat: any) => {
                        const source = cat.source || 'manual'
                        acc[source] = (acc[source] || 0) + 1
                        return acc
                      }, {})
                      
                      return Object.entries(sources).map(([source, count]) => (
                        <div key={source} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{source}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))
                    })()}
                    {Object.keys(categories.reduce((acc: any, cat: any) => {
                      const source = cat.source || 'manual'
                      acc[source] = true
                      return acc
                    }, {})).length === 0 && (
                      <div className="text-gray-500 italic">No categories loaded</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sample Categories */}
              {categories.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Sample Categories (First 5)</h4>
                  <div className="space-y-2">
                    {categories.slice(0, 5).map((category) => (
                      <div key={category.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {category.foursquareIcon && category.foursquareIcon.prefix && category.foursquareIcon.suffix && (
                              <img
                                src={`${category.foursquareIcon.prefix}32${category.foursquareIcon.suffix}`}
                                alt=""
                                className="w-5 h-5"
                              />
                            )}
                            <span className="font-medium">{category.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {category.source || 'manual'}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {category.subcategories?.length || 0} subs
                          </span>
                        </div>
                        {category.description && (
                          <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Category Tree */}
              {categories.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Complete Category Tree</h4>
                  <div className="max-h-80 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    <div className="space-y-1 text-sm">
                      {categories.map((category) => (
                        <div key={category.id} className="space-y-1">
                          <div className="flex items-center gap-2 font-medium text-gray-800">
                            {category.foursquareIcon && category.foursquareIcon.prefix && category.foursquareIcon.suffix && (
                              <img
                                src={`${category.foursquareIcon.prefix}24${category.foursquareIcon.suffix}`}
                                alt=""
                                className="w-4 h-4"
                              />
                            )}
                            <span>{category.name}</span>
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {category.source}
                            </Badge>
                          </div>
                          
                          {/* Subcategories */}
                          {category.subcategories && category.subcategories.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {category.subcategories.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-2 text-gray-600">
                                  {sub.foursquareIcon && sub.foursquareIcon.prefix && sub.foursquareIcon.suffix && (
                                    <img
                                      src={`${sub.foursquareIcon.prefix}16${sub.foursquareIcon.suffix}`}
                                      alt=""
                                      className="w-3 h-3"
                                    />
                                  )}
                                  <span className="text-xs">↳ {sub.name}</span>
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {sub.source}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Actions</h4>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      console.log('🔄 Manual category refresh triggered')
                      window.location.reload()
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Categories
                  </Button>
                  
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/categories')
                        const data = await response.json()
                        console.log('📊 Raw categories API response:', data)
                        toast.info(`API Response: ${data.docs?.length || 0} categories found`)
                      } catch (error) {
                        console.error('❌ Error testing API:', error)
                        toast.error('Failed to test categories API')
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Test API
                  </Button>
                </div>
              </div>

              {/* Warning if no categories */}
              {categories.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Categories Found</AlertTitle>
                  <AlertDescription>
                    The category system appears to be empty. This could be due to:
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      <li>Categories haven't been synced from Foursquare yet</li>
                      <li>All categories are marked as inactive</li>
                      <li>Database connection issues</li>
                      <li>API endpoint problems</li>
                    </ul>
                    <div className="mt-3">
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
                        className="bg-[#4ecdc4] hover:bg-[#3dbdb4] text-white"
                        size="sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Categories Now
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen} modal={true}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          {currentEdit && (
            <>
              <DialogHeader className="flex-shrink-0 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-bold">
                      Edit Location ({currentEditIndex + 1}/{editingLocations.length})
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Customize the details for "{currentEdit.locationData.name}" before importing
                    </DialogDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {editingLocations.length - currentEditIndex - 1} remaining
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditModalOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex-1 min-h-0 flex">
                {/* Left Column - Basic Info & Categories */}
                <div className="w-1/2 pr-4 overflow-y-auto">
                  <div className="space-y-6 py-4">
                    {/* Progress Indicator */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">Import Progress</span>
                        <span className="text-xs text-blue-600">{Math.round((currentEditIndex / editingLocations.length) * 100)}% complete</span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(currentEditIndex / editingLocations.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <Building className="w-5 h-5 mr-2" />
                        Basic Information
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Location Name</Label>
                          <Input
                            id="edit-name"
                            value={currentEdit.locationData.name}
                            onChange={(e) => updateCurrentLocationData({ name: e.target.value })}
                          />
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
                    </div>

                    {/* Categories Section - Enhanced */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <Tag className="w-5 h-5 mr-2" />
                        Categories
                      </h3>
                      
                      <div className="space-y-3">
                        {/* Category Info Banner */}
                        <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">Category Selection</span>
                          </div>
                          {categories.length > 0 ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Available categories:</span>
                                <span className="font-medium">
                                  {categories.length} root categories with {categories.reduce((total, cat) => total + (cat.subcategories?.length || 0), 0)} subcategories
                                </span>
                              </div>
                              <div className="mt-2 text-blue-700">
                                💡 Select up to 5 categories that best describe this location
                              </div>
                            </div>
                          ) : (
                            <div className="text-amber-700 flex items-center space-x-2">
                              <span>⚠️ No categories loaded.</span>
                              <Button
                                onClick={async () => {
                                  try {
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
                                className="h-6 text-xs"
                              >
                                Sync Now
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Category Selector */}
                        {categories.length > 0 ? (
                          <HierarchicalCategorySelector
                            categories={categories}
                            selectedCategories={currentEdit.locationData.categories || []}
                            onSelectionChange={(selectedIds) => {
                              console.log('📝 Category selection changed:', selectedIds)
                              updateCurrentLocationData({ categories: selectedIds })
                            }}
                            placeholder="Choose categories for this location"
                            maxSelections={5}
                            showSearch={true}
                            showBadges={true}
                            allowSubcategorySelection={true}
                            expandedByDefault={false}
                          />
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No Categories Available
                            </h3>
                            <p className="text-gray-600 mb-4">
                              Categories need to be synced from Foursquare before you can select them.
                            </p>
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
                              className="bg-[#4ecdc4] hover:bg-[#3dbdb4] text-white"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Sync Categories from Foursquare
                            </Button>
                          </div>
                        )}
                        
                        {/* Selected Categories Summary */}
                        {currentEdit.locationData.categories && currentEdit.locationData.categories.length > 0 && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-800">
                                Selected Categories ({currentEdit.locationData.categories.length}/5)
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {currentEdit.locationData.categories.map((categoryId) => {
                                const category = findCategoryById(categoryId, categories)
                                return category ? (
                                  <div key={categoryId} className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-green-300">
                                    {category.foursquareIcon && category.foursquareIcon.prefix && category.foursquareIcon.suffix && (
                                      <img
                                        src={`${category.foursquareIcon.prefix}16${category.foursquareIcon.suffix}`}
                                        alt=""
                                        className="w-3 h-3"
                                      />
                                    )}
                                    <span className="text-xs font-medium text-green-800">{category.name}</span>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs px-1 py-0 h-4 border-green-400 text-green-700"
                                    >
                                      {category.source}
                                    </Badge>
                                  </div>
                                ) : (
                                  <div key={categoryId} className="flex items-center space-x-1 bg-red-50 px-2 py-1 rounded-md border border-red-300">
                                    <span className="text-xs text-red-600">Unknown: {categoryId}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Address & Additional Info */}
                <div className="w-1/2 pl-4 border-l overflow-y-auto">
                  <div className="space-y-6 py-4">
                    {/* Address */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <MapPin className="w-5 h-5 mr-2" />
                        Address
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
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
                        
                        <div className="grid grid-cols-2 gap-4">
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

                    {/* Contact Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <Phone className="w-5 h-5 mr-2" />
                        Contact Information
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
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
                      <h3 className="text-lg font-medium flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Additional Information
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
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
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="edit-description-ai">Business Description</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateBusinessDescription(currentEdit.foursquarePlace.foursquareId, currentEdit.locationData)}
                              disabled={isSubmittingEdit}
                              className="text-xs"
                            >
                              <Loader2 className={`w-3 h-3 mr-1 ${isSubmittingEdit ? 'animate-spin' : ''}`} />
                              Generate AI Description
                            </Button>
                          </div>
                          <Textarea
                            id="edit-description-ai"
                            value={currentEdit.locationData.description || ''}
                            onChange={(e) => updateCurrentLocationData({ description: e.target.value })}
                            placeholder="Compelling business description for visitors"
                            className="min-h-[100px]"
                          />
                          <p className="text-xs text-gray-500">
                            💡 AI will generate a compelling description based on the location name, categories, and website (if provided)
                          </p>
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
                                    const tips = stringToStructuredTips(simpleTipsText)
                                    updateCurrentLocationData({ insiderTips: tips.length > 0 ? tips : [] })
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
                                    source: 'user_submitted'
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
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex-shrink-0 flex gap-2 mt-4 pt-4 border-t border-gray-200">
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