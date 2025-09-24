'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Clock, 
  Tag,
  Plus,
  X,
  Loader2
} from 'lucide-react'

interface ComprehensiveClaimModalProps {
  isOpen: boolean
  onClose: () => void
  locationId: string
  locationName: string
  locationData?: any
}

interface ClaimFormData {
  // Basic Information
  contactEmail: string
  businessName: string
  ownerName: string
  ownerTitle: string
  ownerPhone: string
  
  // Business Details
  businessWebsite: string
  businessDescription: string
  businessAddress: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  
  // Verification
  claimMethod: 'email' | 'phone' | 'business_license' | 'tax_id'
  businessLicense: string
  taxId: string
  
  // Location Enhancement
  locationData: {
    name: string
    description: string
    shortDescription: string
    categories: string[]
    businessHours: Array<{
      day: string
      open: string
      close: string
      closed: boolean
    }>
    amenities: string[]
    priceRange: string
  }
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

const PRICE_RANGES = [
  { value: 'free', label: 'Free' },
  { value: 'budget', label: 'Budget' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'expensive', label: 'Expensive' },
  { value: 'luxury', label: 'Luxury' }
]

const AMENITIES_OPTIONS = [
  'WiFi', 'Parking', 'Wheelchair Accessible', 'Pet Friendly', 'Outdoor Seating',
  'Takeout', 'Delivery', 'Reservations', 'Private Dining', 'Live Music',
  'Sports Viewing', 'Happy Hour', 'Brunch', 'Late Night', 'Family Friendly'
]

export function ComprehensiveClaimModal({ 
  isOpen, 
  onClose, 
  locationId, 
  locationName,
  locationData: initialLocationData 
}: ComprehensiveClaimModalProps) {
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ClaimFormData>({
    contactEmail: '',
    businessName: '',
    ownerName: '',
    ownerTitle: '',
    ownerPhone: '',
    businessWebsite: '',
    businessDescription: '',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    claimMethod: 'email',
    businessLicense: '',
    taxId: '',
    locationData: {
      name: locationName,
      description: '',
      shortDescription: '',
      categories: [],
      businessHours: DAYS_OF_WEEK.map(day => ({
        day,
        open: '09:00',
        close: '17:00',
        closed: false
      })),
      amenities: [],
      priceRange: ''
    }
  })

  // Initialize form with location data if available
  useEffect(() => {
    if (initialLocationData) {
      setFormData(prev => ({
        ...prev,
        locationData: {
          ...prev.locationData,
          name: initialLocationData.name || locationName,
          description: initialLocationData.description || '',
          shortDescription: initialLocationData.shortDescription || '',
          categories: initialLocationData.categories || [],
          businessHours: initialLocationData.businessHours || prev.locationData.businessHours,
          amenities: initialLocationData.amenities || [],
          priceRange: initialLocationData.priceRange || ''
        }
      }))
    }
  }, [initialLocationData, locationName])

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.')
      if (keys.length === 1) {
        return { ...prev, [field]: value }
      } else if (keys.length === 2) {
        const firstKey = keys[0] as keyof ClaimFormData
        const secondKey = keys[1] as string
        return {
          ...prev,
          [firstKey]: {
            ...(prev[firstKey] as any),
            [secondKey]: value
          }
        }
      } else if (keys.length === 3) {
        const firstKey = keys[0] as keyof ClaimFormData
        const secondKey = keys[1] as string
        const thirdKey = keys[2] as string
        return {
          ...prev,
          [firstKey]: {
            ...(prev[firstKey] as any),
            [secondKey]: {
              ...((prev[firstKey] as any)[secondKey] || {}),
              [thirdKey]: value
            }
          }
        }
      }
      return prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.contactEmail.trim() || !formData.businessName.trim() || !formData.ownerName.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/locations/${locationId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          claimMethod: formData.claimMethod,
          contactEmail: formData.contactEmail,
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          ownerTitle: formData.ownerTitle,
          ownerPhone: formData.ownerPhone,
          businessWebsite: formData.businessWebsite,
          businessDescription: formData.businessDescription,
          businessAddress: formData.businessAddress,
          businessLicense: formData.businessLicense,
          taxId: formData.taxId,
          locationData: formData.locationData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit claim')
      }

      const result = await response.json()
      toast.success('Business claim submitted successfully! You will be notified once it\'s reviewed.')
      onClose()
    } catch (error) {
      console.error('Error claiming business:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to claim business')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      locationData: {
        ...prev.locationData,
        amenities: prev.locationData.amenities.includes(amenity)
          ? prev.locationData.amenities.filter(a => a !== amenity)
          : [...prev.locationData.amenities, amenity]
      }
    }))
  }

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    setFormData(prev => ({
      ...prev,
      locationData: {
        ...prev.locationData,
        businessHours: prev.locationData.businessHours.map(hour => 
          hour.day === day ? { ...hour, [field]: value } : hour
        )
      }
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Claim This Business
          </DialogTitle>
          <DialogDescription>
            Complete the form below to claim ownership of <strong>{locationName}</strong> and provide comprehensive business information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={currentStep.toString()} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="1">Basic Info</TabsTrigger>
              <TabsTrigger value="2">Business Details</TabsTrigger>
              <TabsTrigger value="3">Verification</TabsTrigger>
              <TabsTrigger value="4">Location Info</TabsTrigger>
            </TabsList>

            {/* Step 1: Basic Information */}
            <TabsContent value="1" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Provide your basic business and contact information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => updateFormData('businessName', e.target.value)}
                        placeholder="Your Business Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Business Email *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => updateFormData('contactEmail', e.target.value)}
                        placeholder="business@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">Owner/Manager Name *</Label>
                      <Input
                        id="ownerName"
                        value={formData.ownerName}
                        onChange={(e) => updateFormData('ownerName', e.target.value)}
                        placeholder="Your Full Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerTitle">Title</Label>
                      <Input
                        id="ownerTitle"
                        value={formData.ownerTitle}
                        onChange={(e) => updateFormData('ownerTitle', e.target.value)}
                        placeholder="Owner, Manager, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">Phone Number</Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      value={formData.ownerPhone}
                      onChange={(e) => updateFormData('ownerPhone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: Business Details */}
            <TabsContent value="2" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Business Details
                  </CardTitle>
                  <CardDescription>
                    Provide detailed information about your business.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Website</Label>
                    <Input
                      id="businessWebsite"
                      type="url"
                      value={formData.businessWebsite}
                      onChange={(e) => updateFormData('businessWebsite', e.target.value)}
                      placeholder="https://yourbusiness.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">Business Description</Label>
                    <Textarea
                      id="businessDescription"
                      value={formData.businessDescription}
                      onChange={(e) => updateFormData('businessDescription', e.target.value)}
                      placeholder="Describe your business, services, and what makes it special..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Business Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                          id="street"
                          value={formData.businessAddress.street}
                          onChange={(e) => updateFormData('businessAddress.street', e.target.value)}
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.businessAddress.city}
                          onChange={(e) => updateFormData('businessAddress.city', e.target.value)}
                          placeholder="Boston"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={formData.businessAddress.state}
                          onChange={(e) => updateFormData('businessAddress.state', e.target.value)}
                          placeholder="MA"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP Code</Label>
                        <Input
                          id="zip"
                          value={formData.businessAddress.zip}
                          onChange={(e) => updateFormData('businessAddress.zip', e.target.value)}
                          placeholder="02101"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 3: Verification */}
            <TabsContent value="3" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Verification Method
                  </CardTitle>
                  <CardDescription>
                    Choose how you'd like to verify your business ownership.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="claimMethod">Verification Method *</Label>
                    <Select
                      value={formData.claimMethod}
                      onValueChange={(value: any) => updateFormData('claimMethod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select verification method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Verification</SelectItem>
                        <SelectItem value="phone">Phone Verification</SelectItem>
                        <SelectItem value="business_license">Business License</SelectItem>
                        <SelectItem value="tax_id">Tax ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.claimMethod === 'business_license' && (
                    <div className="space-y-2">
                      <Label htmlFor="businessLicense">Business License Number</Label>
                      <Input
                        id="businessLicense"
                        value={formData.businessLicense}
                        onChange={(e) => updateFormData('businessLicense', e.target.value)}
                        placeholder="Enter your business license number"
                      />
                    </div>
                  )}

                  {formData.claimMethod === 'tax_id' && (
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID / EIN</Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => updateFormData('taxId', e.target.value)}
                        placeholder="Enter your Tax ID or EIN"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 4: Location Information */}
            <TabsContent value="4" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Information
                  </CardTitle>
                  <CardDescription>
                    Provide additional details about your location.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="locationName">Location Name</Label>
                    <Input
                      id="locationName"
                      value={formData.locationData.name}
                      onChange={(e) => updateFormData('locationData.name', e.target.value)}
                      placeholder="Location display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortDescription">Short Description</Label>
                    <Input
                      id="shortDescription"
                      value={formData.locationData.shortDescription}
                      onChange={(e) => updateFormData('locationData.shortDescription', e.target.value)}
                      placeholder="Brief description for listings"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Full Description</Label>
                    <Textarea
                      id="description"
                      value={formData.locationData.description}
                      onChange={(e) => updateFormData('locationData.description', e.target.value)}
                      placeholder="Detailed description of your location..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <Select
                      value={formData.locationData.priceRange}
                      onValueChange={(value) => updateFormData('locationData.priceRange', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select price range" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Business Hours</Label>
                    <div className="space-y-2">
                      {DAYS_OF_WEEK.map(day => {
                        const dayHours = formData.locationData.businessHours.find(h => h.day === day)
                        return (
                          <div key={day} className="flex items-center gap-4">
                            <div className="w-20 text-sm font-medium">{day}</div>
                            <Checkbox
                              checked={dayHours?.closed || false}
                              onCheckedChange={(checked) => updateBusinessHours(day, 'closed', checked)}
                            />
                            <Label className="text-sm">Closed</Label>
                            {!dayHours?.closed && (
                              <>
                                <Input
                                  type="time"
                                  value={dayHours?.open || '09:00'}
                                  onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                                  className="w-24"
                                />
                                <span>to</span>
                                <Input
                                  type="time"
                                  value={dayHours?.close || '17:00'}
                                  onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                                  className="w-24"
                                />
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Amenities</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {AMENITIES_OPTIONS.map(amenity => (
                        <div key={amenity} className="flex items-center space-x-2">
                          <Checkbox
                            id={amenity}
                            checked={formData.locationData.amenities.includes(amenity)}
                            onCheckedChange={() => toggleAmenity(amenity)}
                          />
                          <Label htmlFor={amenity} className="text-sm">
                            {amenity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={isSubmitting}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
