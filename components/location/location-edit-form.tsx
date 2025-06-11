"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  X,
  Plus,
  Save,
  Shield,
  Users,
  Wifi,
  Car,
  CreditCard,
  Volume2,
  VolumeX,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

interface LocationEditFormProps {
  location: Location
  onSave: (updatedLocation: LocationFormData) => Promise<void>
  onCancel: () => void
  isVisible?: boolean
}

interface Location {
  id?: string
  name?: string
  description?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  phone?: string
  website?: string
  priceRange?: string
  categories?: Array<{ id: string; name: string } | string>
  hours?: Record<string, { open: string; close: string; closed: boolean }>
  amenities?: string[]
  specialties?: string[]
  socialMedia?: {
    instagram?: string
    facebook?: string
    twitter?: string
  }
  isPublic?: boolean
  acceptsReservations?: boolean
  hasDelivery?: boolean
  hasTakeout?: boolean
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  stats?: {
    views?: number
    photos?: number
    reviews?: number
    saves?: number
  }
}

interface LocationFormData {
  name: string
  description: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  phone: string
  website: string
  priceRange: string
  categories: string[]
  hours: Record<string, { open: string; close: string; closed: boolean }>
  amenities: string[]
  specialties: string[]
  socialMedia: {
    instagram: string
    facebook: string
    twitter: string
  }
  isPublic: boolean
  acceptsReservations: boolean
  hasDelivery: boolean
  hasTakeout: boolean
  metadata: Record<string, unknown>
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]

const PRICE_RANGES = [
  { value: '$', label: '$ - Inexpensive' },
  { value: '$$', label: '$$ - Moderate' },
  { value: '$$$', label: '$$$ - Expensive' },
  { value: '$$$$', label: '$$$$ - Very Expensive' },
]

const AMENITIES = [
  { id: 'wifi', label: 'Free WiFi', icon: Wifi },
  { id: 'parking', label: 'Parking Available', icon: Car },
  { id: 'cards', label: 'Credit Cards Accepted', icon: CreditCard },
  { id: 'accessible', label: 'Wheelchair Accessible', icon: Users },
  { id: 'outdoor', label: 'Outdoor Seating', icon: Wifi },
  { id: 'delivery', label: 'Delivery Available', icon: Car },
  { id: 'takeout', label: 'Takeout Available', icon: Users },
  { id: 'reservations', label: 'Accepts Reservations', icon: Shield },
  { id: 'live_music', label: 'Live Music', icon: Volume2 },
  { id: 'quiet', label: 'Quiet Atmosphere', icon: VolumeX },
]

export function LocationEditForm({ 
  location, 
  onSave, 
  onCancel, 
  isVisible = true 
}: LocationEditFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    website: '',
    priceRange: '',
    categories: [] as string[],
    hours: {} as Record<string, { open: string; close: string; closed: boolean }>,
    amenities: [] as string[],
    specialties: [] as string[],
    socialMedia: {
      instagram: '',
      facebook: '',
      twitter: '',
    },
    isPublic: true,
    acceptsReservations: false,
    hasDelivery: false,
    hasTakeout: false,
    metadata: {} as Record<string, unknown>,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [newSpecialty, setNewSpecialty] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<Array<{
    id: string
    name: string
    slug?: string
    description?: string
    source?: string
    foursquareIcon?: {
      prefix: string
      suffix: string
    }
    subcategories?: Array<{
      id: string
      name: string
      slug?: string
      description?: string
      source?: string
      foursquareIcon?: {
        prefix: string
        suffix: string
      }
    }>
  }>>([])

  // Initialize form data
  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        address: location.address || '',
        city: location.city || '',
        state: location.state || '',
        zipCode: location.zipCode || '',
        country: location.country || 'US',
        phone: location.phone || '',
        website: location.website || '',
        priceRange: location.priceRange || '',
        categories: location.categories?.map((cat: { id: string; name: string } | string) => 
          typeof cat === 'string' ? cat : cat.id
        ) || [],
        hours: location.hours || {},
        amenities: location.amenities || [],
        specialties: location.specialties || [],
        socialMedia: {
          instagram: location.socialMedia?.instagram || '',
          facebook: location.socialMedia?.facebook || '',
          twitter: location.socialMedia?.twitter || '',
        },
        isPublic: location.isPublic !== false,
        acceptsReservations: location.acceptsReservations || false,
        hasDelivery: location.hasDelivery || false,
        hasTakeout: location.hasTakeout || false,
        metadata: location.metadata || {},
      })
      setSelectedCategories(location.categories?.map((cat: { id: string; name: string } | string) => 
        typeof cat === 'string' ? cat : cat.id
      ) || [])
    }
  }, [location])

  // Load categories
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setAvailableCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedInputChange = (parent: keyof LocationFormData, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as Record<string, unknown>),
        [field]: value
      }
    }))
  }

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value
        }
      }
    }))
  }

  const toggleAmenity = (amenityId: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }))
  }

  const toggleCategory = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId]
    
    setSelectedCategories(newCategories)
    setFormData(prev => ({
      ...prev,
      categories: newCategories
    }))
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('Name and address are required')
      return
    }

    setIsLoading(true)

    try {
      await onSave(formData)
      toast.success('Location updated successfully!')
    } catch (error) {
      console.error('Error saving location:', error)
      toast.error('Failed to update location')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Location</h1>
          <p className="text-gray-600">Update your location information</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </div>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter location name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your location..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="priceRange">Price Range</Label>
                  <Select 
                    value={formData.priceRange} 
                    onValueChange={(value) => handleInputChange('priceRange', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableCategories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.id}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <Label htmlFor={category.id} className="text-sm">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Specialties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Add a specialty..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSpecialty()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSpecialty}
                  disabled={!newSpecialty.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {specialty}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeSpecialty(specialty)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => handleNestedInputChange('socialMedia', 'instagram', e.target.value)}
                  placeholder="@yourusername"
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => handleNestedInputChange('socialMedia', 'facebook', e.target.value)}
                  placeholder="facebook.com/yourpage"
                />
              </div>
              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={formData.socialMedia.twitter}
                  onChange={(e) => handleNestedInputChange('socialMedia', 'twitter', e.target.value)}
                  placeholder="@yourusername"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hours */}
        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24">
                    <Label className="capitalize font-medium">{day}</Label>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      checked={formData.hours[day]?.closed || false}
                      onCheckedChange={(checked) => 
                        handleHoursChange(day, 'closed', checked)
                      }
                    />
                    <Label className="text-sm">Closed</Label>
                  </div>
                  {!formData.hours[day]?.closed && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={formData.hours[day]?.open || ''}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={formData.hours[day]?.close || ''}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amenities */}
        <TabsContent value="amenities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Amenities & Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AMENITIES.map((amenity) => (
                  <div key={amenity.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={amenity.id}
                      checked={formData.amenities.includes(amenity.id)}
                      onCheckedChange={() => toggleAmenity(amenity.id)}
                    />
                    <amenity.icon className="h-4 w-4 text-gray-500" />
                    <Label htmlFor={amenity.id} className="text-sm">
                      {amenity.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <Label>Accepts Reservations</Label>
                </div>
                <Switch
                  checked={formData.acceptsReservations}
                  onCheckedChange={(checked) => handleInputChange('acceptsReservations', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-gray-500" />
                  <Label>Delivery Available</Label>
                </div>
                <Switch
                  checked={formData.hasDelivery}
                  onCheckedChange={(checked) => handleInputChange('hasDelivery', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <Label>Takeout Available</Label>
                </div>
                <Switch
                  checked={formData.hasTakeout}
                  onCheckedChange={(checked) => handleInputChange('hasTakeout', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibility & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Public Visibility</Label>
                  <p className="text-sm text-gray-500">
                    Make this location visible to all users
                  </p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Location created: {new Date(location?.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Last updated: {new Date(location?.updatedAt).toLocaleDateString()}
              </p>
              {location?.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#FF6B6B]">
                      {location.stats.views || 0}
                    </div>
                    <div className="text-sm text-gray-500">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#FF6B6B]">
                      {location.stats.photos || 0}
                    </div>
                    <div className="text-sm text-gray-500">Photos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#FF6B6B]">
                      {location.stats.reviews || 0}
                    </div>
                    <div className="text-sm text-gray-500">Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#FF6B6B]">
                      {location.stats.saves || 0}
                    </div>
                    <div className="text-sm text-gray-500">Saves</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
} 