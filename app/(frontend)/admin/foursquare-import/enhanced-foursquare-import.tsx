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
  Settings
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
      bestTimeToVisit: preview.bestTimeToVisit || [],
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
        description: preview.meta?.description || preview.shortDescription || '',
        keywords: preview.meta?.keywords || ''
      },
      
      tags: preview.tags || [],
      gallery: preview.gallery || [],
      featuredImage: undefined,
      
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
      const result = await createLocation(currentEdit.locationData)
      
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search Places</TabsTrigger>
          <TabsTrigger value="discover">Discover Nearby</TabsTrigger>
          <TabsTrigger value="edit">Edit & Import ({selectedPlaces.size})</TabsTrigger>
          <TabsTrigger value="results">Import Results</TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Foursquare Places</CardTitle>
              <CardDescription>
                Search for places by name, location, or category
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={searchCategory} onValueChange={setSearchCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      <SelectItem value="RESTAURANT">Restaurants</SelectItem>
                      <SelectItem value="CAFE">Cafes</SelectItem>
                      <SelectItem value="BAR">Bars</SelectItem>
                      <SelectItem value="MUSEUM">Museums</SelectItem>
                      <SelectItem value="PARK">Parks</SelectItem>
                      <SelectItem value="SHOPPING_MALL">Shopping</SelectItem>
                      <SelectItem value="HOTEL">Hotels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                      <Label>Categories</Label>
                      <HierarchicalCategorySelector
                        categories={categories}
                        selectedCategories={currentEdit.locationData.categories || []}
                        onSelectionChange={(selectedIds) => 
                          updateCurrentLocationData({ categories: selectedIds })
                        }
                        placeholder="Select categories for this location"
                        maxSelections={5}
                        showSearch={true}
                      />
                      {currentEdit.locationData.categories && currentEdit.locationData.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentEdit.locationData.categories.map((categoryId) => {
                            const category = findCategoryById(categoryId, categories)
                            return category ? (
                              <Badge key={categoryId} variant="secondary" className="text-xs">
                                {category.name}
                              </Badge>
                            ) : null
                          })}
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
                  <h3 className="text-lg font-medium flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Additional Information
                  </h3>
                  
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-tips">Insider Tips</Label>
                    <Textarea
                      id="edit-tips"
                      value={currentEdit.locationData.insiderTips || ''}
                      onChange={(e) => updateCurrentLocationData({ insiderTips: e.target.value })}
                      placeholder="Share helpful tips for visitors"
                    />
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