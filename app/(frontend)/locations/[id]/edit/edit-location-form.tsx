'use client'

import React, { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { 
  Save,
  Upload,
  X,
  Plus,
  Loader2
} from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getCategories, type LocationFormData, type DayOfWeek } from "@/app/actions"
import { HierarchicalCategorySelector } from "@/components/ui/hierarchical-category-selector"

interface Location {
  id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  featuredImage?: { url: string } | string
  gallery?: Array<{ image: string; caption?: string }>
  categories?: Array<string | { id: string; name: string }>
  tags?: Array<{ tag: string }>
  address?: string | Record<string, string>
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
    socialMedia?: {
      facebook?: string
      twitter?: string
      instagram?: string
      linkedin?: string
    }
  }
  businessHours?: Array<{
    day: string
    open?: string
    close?: string
    closed?: boolean
  }>
  priceRange?: string
  bestTimeToVisit?: Array<{ season: string }>
  insiderTips?: string
  accessibility?: {
    wheelchairAccess?: boolean
    parking?: boolean
    other?: string
  }
  status: 'draft' | 'review' | 'published' | 'archived'
  isFeatured?: boolean
  isVerified?: boolean
  hasBusinessPartnership?: boolean
  partnershipDetails?: {
    partnerName?: string
    partnerContact?: string
    details?: string
  }
  meta?: {
    title?: string
    description?: string
    keywords?: string
  }
  createdBy?: string
}

interface EditLocationFormProps {
  location: Location
  currentUser: { id: string; name?: string; email?: string } | null
  onSuccess?: () => void
  onCancel?: () => void
}

export default function EditLocationForm({ location, currentUser, onSuccess, onCancel }: EditLocationFormProps) {
  console.log('📝 EditLocationForm rendered with location:', location?.name, 'ID:', location?.id);
  
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryFileInputRef = useRef<HTMLInputElement>(null)

  // State for categories
  const [isLoading, setIsLoading] = useState(false)
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

  // Form state
  const [activeTab, setActiveTab] = useState("basic")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Basic info - pre-populate with existing data
  const [locationName, setLocationName] = useState(location.name || "")
  const [locationSlug, setLocationSlug] = useState(location.slug || "")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [locationDescription, setLocationDescription] = useState(location.description || "")
  const [shortDescription, setShortDescription] = useState(location.shortDescription || "")
  
  console.log('📝 Form initialized with data:', {
    name: locationName,
    slug: locationSlug,
    description: locationDescription,
    shortDescription: shortDescription
  });

  // Media
  const [locationImage, setLocationImage] = useState<string | null>(null)
  const [locationImagePreview, setLocationImagePreview] = useState<string | null>(null)
  const [gallery, setGallery] = useState<{ image: string; caption?: string; tempId?: string }[]>([])

  // Tags
  const [tags, setTags] = useState<{ tag: string }[]>(location.tags || [])
  const [newTag, setNewTag] = useState("")

  // Address - normalize existing address data
  const [address, setAddress] = useState(() => {
    if (typeof location.address === 'string') {
      // Parse string address into components (basic parsing)
      const parts = location.address.split(', ')
      return {
        street: parts[0] || "",
        city: parts[1] || "",
        state: parts[2] || "",
        zip: parts[3] || "",
        country: parts[4] || "USA",
        neighborhood: "",
      }
    } else if (location.address && typeof location.address === 'object') {
      return {
        street: location.address.street || "",
        city: location.address.city || "",
        state: location.address.state || "",
        zip: location.address.zip || "",
        country: location.address.country || "USA",
        neighborhood: "",
      }
    }
    return {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "USA",
      neighborhood: "",
    }
  })

  // Contact & Business
  const [contactInfo, setContactInfo] = useState({
    phone: location.contactInfo?.phone || "",
    email: location.contactInfo?.email || "",
    website: location.contactInfo?.website || "",
    socialMedia: {
      facebook: location.contactInfo?.socialMedia?.facebook || "",
      twitter: location.contactInfo?.socialMedia?.twitter || "",
      instagram: location.contactInfo?.socialMedia?.instagram || "",
      linkedin: location.contactInfo?.socialMedia?.linkedin || "",
    },
  })

  // Business hours - normalize existing data
  const [businessHours, setBusinessHours] = useState<
    Array<{
      day: DayOfWeek
      open?: string
      close?: string
      closed?: boolean
    }>
  >(() => {
    // Default business hours template
    const defaultHours: Array<{
      day: DayOfWeek
      open?: string
      close?: string
      closed?: boolean
    }> = [
      { day: "Monday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
      { day: "Tuesday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
      { day: "Wednesday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
      { day: "Thursday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
      { day: "Friday" as DayOfWeek, open: "09:00", close: "17:00", closed: false },
      { day: "Saturday" as DayOfWeek, open: "10:00", close: "15:00", closed: false },
      { day: "Sunday" as DayOfWeek, open: "", close: "", closed: true },
    ]

    if (location.businessHours && location.businessHours.length > 0) {
      // Merge existing hours with defaults
      return defaultHours.map(defaultDay => {
        const existingDay = location.businessHours?.find(h => h.day === defaultDay.day)
        return existingDay ? {
          ...defaultDay,
          day: defaultDay.day, // Ensure the day is properly typed
          open: existingDay.open,
          close: existingDay.close,
          closed: existingDay.closed,
        } : defaultDay
      })
    }

    return defaultHours
  })

  // Price range
  const [priceRange, setPriceRange] = useState<string>(location.priceRange || "")

  // Visitor info
  const [bestTimeToVisit, setBestTimeToVisit] = useState<{ season: string }[]>(location.bestTimeToVisit || [])
  const [newSeason, setNewSeason] = useState("")
  const [insiderTips, setInsiderTips] = useState(location.insiderTips || "")

  // Accessibility
  const [accessibility, setAccessibility] = useState({
    wheelchairAccess: location.accessibility?.wheelchairAccess || false,
    parking: location.accessibility?.parking || false,
    other: location.accessibility?.other || "",
  })

  // Status
  const [status, setStatus] = useState<"draft" | "review" | "published" | "archived">(location.status || "draft")
  const [isFeatured, setIsFeatured] = useState(location.isFeatured || false)
  const [isVerified, setIsVerified] = useState(location.isVerified || false)

  // Partnership
  const [hasPartnership, setHasPartnership] = useState(location.hasBusinessPartnership || false)
  const [partnershipDetails, setPartnershipDetails] = useState({
    partnerName: location.partnershipDetails?.partnerName || "",
    partnerContact: location.partnershipDetails?.partnerContact || "",
    details: location.partnershipDetails?.details || "",
  })

  // SEO
  const [meta, setMeta] = useState({
    title: location.meta?.title || "",
    description: location.meta?.description || "",
    keywords: location.meta?.keywords || "",
  })

  // Load categories and set up initial state
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
          subcategories: [] as any[]
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

        // Set the initial category selection - now supports multiple categories
        if (location.categories && location.categories.length > 0) {
          const categoryIds = location.categories.map(cat => 
            typeof cat === 'string' ? cat : cat.id
          ).filter(Boolean)
          setSelectedCategories(categoryIds)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast.error('Failed to load categories')
      }
    }

    fetchCategories()

    // Set initial image preview if location has featured image
    if (location.featuredImage) {
      const imageUrl = typeof location.featuredImage === 'string' 
        ? location.featuredImage 
        : location.featuredImage.url
      setLocationImagePreview(imageUrl)
    }

    // Set initial gallery if location has gallery
    if (location.gallery) {
      setGallery(location.gallery)
    }
  }, [location])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setLocationName(name)
    
    // Only auto-generate slug if it hasn't been manually edited
    if (!locationSlug || locationSlug === generateSlug(locationName)) {
      setLocationSlug(generateSlug(name))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationSlug(e.target.value)
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const triggerGalleryFileInput = () => {
    if (galleryFileInputRef.current) {
      galleryFileInputRef.current.click()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        setLocationImage(result.imageId)
        setLocationImagePreview(result.url)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeGalleryImage = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index))
  }

  const updateGalleryCaption = (index: number, caption: string) => {
    setGallery(prev => prev.map((item, i) => 
      i === index ? { ...item, caption } : item
    ))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.some(tag => tag.tag === newTag.trim())) {
      setTags(prev => [...prev, { tag: newTag.trim() }])
      setNewTag("")
    }
  }

  const removeTag = (index: number) => {
    setTags(prev => prev.filter((_, i) => i !== index))
  }

  const addSeason = () => {
    if (newSeason.trim() && !bestTimeToVisit.some(season => season.season === newSeason.trim())) {
      setBestTimeToVisit(prev => [...prev, { season: newSeason.trim() }])
      setNewSeason("")
    }
  }

  const removeSeason = (index: number) => {
    setBestTimeToVisit(prev => prev.filter((_, i) => i !== index))
  }

  const updateBusinessHour = (index: number, field: "open" | "close" | "closed", value: string | boolean) => {
    console.log(`🕐 Updating business hour ${index}, field: ${field}, value:`, value);
    setBusinessHours(prev => {
      const updated = prev.map((hour, i) => 
        i === index ? { ...hour, [field]: value } : hour
      );
      console.log('🕐 Updated business hours:', updated);
      return updated;
    });
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!locationName.trim()) errors.name = "Location name is required"
    if (!locationSlug.trim()) errors.slug = "Slug is required"
    if (!locationDescription.trim()) errors.description = "Description is required"
    if (!selectedCategories || selectedCategories.length === 0) errors.categories = "At least one category is required"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (saveAsDraft = false) => {
    console.log('🚀 Form submission started, saveAsDraft:', saveAsDraft);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return
    }

    console.log('✅ Form validation passed');
    setIsLoading(true)
    try {
      const formData: Partial<LocationFormData> = {
        name: locationName,
        slug: locationSlug,
        description: locationDescription,
        shortDescription,
        featuredImage: locationImage || undefined,
        gallery,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        tags,
        address,
        contactInfo,
        businessHours,
        priceRange: priceRange as any,
        bestTimeToVisit,
        insiderTips,
        accessibility,
        status: saveAsDraft ? "draft" : "published",
        isFeatured,
        isVerified,
        hasBusinessPartnership: hasPartnership,
        partnershipDetails: hasPartnership ? partnershipDetails : undefined,
        meta,
      }

      const finalData = {
        ...formData,
        status: saveAsDraft ? 'draft' : 'published',
      }

      // Debug: Log the data being sent
      console.log('📤 Sending update data:', JSON.stringify(finalData, null, 2));
      
      const apiUrl = `/api/locations/${location.id}/edit`;
      console.log('🌐 API URL being called:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalData),
      })

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response URL:', response.url);

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Update successful:', result);
        toast.success(`Location ${saveAsDraft ? 'saved as draft' : 'updated'} successfully!`)
        
        // Call success callback if provided, otherwise redirect
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/profile/${currentUser?.id}/location-dashboard`)
        }
      } else {
        const errorData = await response.json()
        console.log('❌ Update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update location')
      }
    } catch (error) {
      console.error('Error updating location:', error)
      toast.error('Failed to update location')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Location</CardTitle>
        <CardDescription>Update your location information</CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        {/* Basic Info Tab */}
        <TabsContent value="basic">
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={locationName}
                onChange={handleNameChange}
                placeholder="Enter location name"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={locationSlug}
                onChange={handleSlugChange}
                placeholder="url-friendly-name"
                className={formErrors.slug ? "border-red-500" : ""}
              />
              {formErrors.slug && <p className="text-sm text-red-500">{formErrors.slug}</p>}
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Categories (Select up to 3) *
              </Label>
              <HierarchicalCategorySelector
                categories={categories}
                selectedCategories={selectedCategories}
                onSelectionChange={setSelectedCategories}
                maxSelections={3}
                placeholder="Choose categories that best describe your location"
                showSearch={true}
                showBadges={true}
                allowSubcategorySelection={true}
              />
              {formErrors.categories && <p className="text-sm text-red-500">{formErrors.categories}</p>}
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <Label htmlFor="short-description">Short Description</Label>
              <Input
                id="short-description"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief one-line description"
                maxLength={100}
              />
              <p className="text-sm text-gray-500">{shortDescription.length}/100 characters</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="Detailed description of the location"
                className={`min-h-[120px] ${formErrors.description ? "border-red-500" : ""}`}
              />
              {formErrors.description && <p className="text-sm text-red-500">{formErrors.description}</p>}
            </div>

            {/* Featured Image */}
            <div className="space-y-2">
              <Label>Featured Image</Label>
              {!locationImagePreview ? (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={triggerFileInput}
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 text-center">
                    Click to upload featured image
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden h-[200px] border">
                  <Image
                    src={locationImagePreview}
                    alt="Featured image"
                    className="w-full h-full object-cover"
                    fill
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-white/90 hover:bg-white rounded-full"
                      onClick={() => {
                        setLocationImage(null)
                        setLocationImagePreview(null)
                      }}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag.tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <CardContent className="space-y-6">
            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={address.street}
                    onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Boston"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="MA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code</Label>
                  <Input
                    id="zip"
                    value={address.zip}
                    onChange={(e) => setAddress(prev => ({ ...prev, zip: e.target.value }))}
                    placeholder="02101"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Price Range */}
            <div className="space-y-2">
              <Label htmlFor="price-range">Price Range</Label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select price range" />
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

            {/* Best Time to Visit */}
            <div className="space-y-2">
              <Label>Best Time to Visit</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newSeason}
                  onChange={(e) => setNewSeason(e.target.value)}
                  placeholder="e.g., Spring, Summer"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSeason())}
                />
                <Button type="button" onClick={addSeason} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {bestTimeToVisit.map((season, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {season.season}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeSeason(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Insider Tips */}
            <div className="space-y-2">
              <Label htmlFor="insider-tips">Insider Tips</Label>
              <Textarea
                id="insider-tips"
                value={insiderTips}
                onChange={(e) => setInsiderTips(e.target.value)}
                placeholder="Share insider tips for visitors"
                className="min-h-[100px]"
              />
            </div>

            {/* Accessibility */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Accessibility</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="wheelchair"
                    checked={accessibility.wheelchairAccess}
                    onCheckedChange={(checked) => 
                      setAccessibility(prev => ({ ...prev, wheelchairAccess: !!checked }))
                    }
                  />
                  <Label htmlFor="wheelchair">Wheelchair Accessible</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="parking"
                    checked={accessibility.parking}
                    onCheckedChange={(checked) => 
                      setAccessibility(prev => ({ ...prev, parking: !!checked }))
                    }
                  />
                  <Label htmlFor="parking">Parking Available</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessibility-other">Other Accessibility Features</Label>
                  <Textarea
                    id="accessibility-other"
                    value={accessibility.other}
                    onChange={(e) => setAccessibility(prev => ({ ...prev, other: e.target.value }))}
                    placeholder="Describe other accessibility features"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <CardContent className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={contactInfo.website}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <Separator />

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={contactInfo.socialMedia.facebook}
                    onChange={(e) => setContactInfo(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                    }))}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={contactInfo.socialMedia.twitter}
                    onChange={(e) => setContactInfo(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                    }))}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={contactInfo.socialMedia.instagram}
                    onChange={(e) => setContactInfo(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                    }))}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={contactInfo.socialMedia.linkedin}
                    onChange={(e) => setContactInfo(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, linkedin: e.target.value }
                    }))}
                    placeholder="https://linkedin.com/company/yourcompany"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Business Hours */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Hours</h3>
              <div className="space-y-3">
                {businessHours.map((hour, index) => (
                  <div key={hour.day} className="flex items-center gap-4">
                    <div className="w-24">
                      <Label>{hour.day}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!hour.closed}
                        onCheckedChange={(checked) => 
                          updateBusinessHour(index, "closed", !checked)
                        }
                      />
                      <Label className="text-sm">Open</Label>
                    </div>
                    {!hour.closed && (
                      <>
                        <Input
                          type="time"
                          value={hour.open || ""}
                          onChange={(e) => updateBusinessHour(index, "open", e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <Input
                          type="time"
                          value={hour.close || ""}
                          onChange={(e) => updateBusinessHour(index, "close", e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                    {hour.closed && (
                      <span className="text-sm text-gray-500">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flags */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featured"
                    checked={isFeatured}
                    onCheckedChange={(checked) => setIsFeatured(!!checked)}
                  />
                  <Label htmlFor="featured">Featured Location</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified"
                    checked={isVerified}
                    onCheckedChange={(checked) => setIsVerified(!!checked)}
                  />
                  <Label htmlFor="verified">Verified Location</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="partnership"
                    checked={hasPartnership}
                    onCheckedChange={(checked) => setHasPartnership(!!checked)}
                  />
                  <Label htmlFor="partnership">Has Business Partnership</Label>
                </div>
              </div>
            </div>

            {/* Partnership Details */}
            {hasPartnership && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Partnership Details</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="partner-name">Partner Name</Label>
                    <Input
                      id="partner-name"
                      value={partnershipDetails.partnerName}
                      onChange={(e) => setPartnershipDetails(prev => ({ ...prev, partnerName: e.target.value }))}
                      placeholder="Partner organization name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-contact">Partner Contact</Label>
                    <Input
                      id="partner-contact"
                      value={partnershipDetails.partnerContact}
                      onChange={(e) => setPartnershipDetails(prev => ({ ...prev, partnerContact: e.target.value }))}
                      placeholder="partner@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partner-details">Partnership Details</Label>
                    <Textarea
                      id="partner-details"
                      value={partnershipDetails.details}
                      onChange={(e) => setPartnershipDetails(prev => ({ ...prev, details: e.target.value }))}
                      placeholder="Describe the partnership arrangement"
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* SEO Meta */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">SEO & Meta</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="meta-title">Meta Title</Label>
                  <Input
                    id="meta-title"
                    value={meta.title}
                    onChange={(e) => setMeta(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="SEO title (leave empty to use location name)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-description">Meta Description</Label>
                  <Textarea
                    id="meta-description"
                    value={meta.description}
                    onChange={(e) => setMeta(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="SEO description"
                    maxLength={160}
                  />
                  <p className="text-sm text-gray-500">{meta.description.length}/160 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-keywords">Keywords</Label>
                  <Input
                    id="meta-keywords"
                    value={meta.keywords}
                    onChange={(e) => setMeta(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>

      <CardFooter className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={() => onCancel ? onCancel() : router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              console.log('🔘 Save as Draft button clicked');
              handleSubmit(true);
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              console.log('🔘 Update Location button clicked');
              handleSubmit(false);
            }}
            disabled={isLoading}
            className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Location
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
} 