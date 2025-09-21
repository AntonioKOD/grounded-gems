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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Building2, Mail, Phone, Globe, Clock, FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EnhancedClaimModalProps {
  isOpen: boolean
  onClose: () => void
  locationId: string
  locationName: string
  locationData?: any
}

interface ClaimFormData {
  // Step 1: Basic Information
  contactEmail: string
  businessName: string
  ownerName: string
  ownerTitle: string
  ownerPhone: string
  
  // Step 2: Business Details
  businessWebsite: string
  businessDescription: string
  businessAddress: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  
  // Step 3: Verification
  claimMethod: 'email' | 'phone' | 'business_license' | 'tax_id'
  businessLicense: string
  taxId: string
  additionalDocuments: string[]
  
  // Step 4: Location Enhancement
  locationData: {
    name: string
    description: string
    shortDescription: string
    categories: string[]
    businessHours: any[]
    amenities: string[]
    priceRange: string
  }
}

export function EnhancedClaimModal({ 
  isOpen, 
  onClose, 
  locationId, 
  locationName,
  locationData: initialLocationData 
}: EnhancedClaimModalProps) {
  const router = useRouter()
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
    additionalDocuments: [],
    locationData: {
      name: locationName,
      description: '',
      shortDescription: '',
      categories: [],
      businessHours: [],
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
          businessHours: initialLocationData.businessHours || [],
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
              ...((prev[firstKey] as any)[secondKey] as any),
              [thirdKey]: value
            }
          }
        }
      }
      return prev
    })
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.contactEmail && formData.businessName && formData.ownerName)
      case 2:
        return !!(formData.businessDescription && formData.businessAddress.street && formData.businessAddress.city)
      case 3:
        return !!(formData.claimMethod && (formData.businessLicense || formData.taxId))
      case 4:
        return !!(formData.locationData.name && formData.locationData.shortDescription)
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    } else {
      toast.error('Please fill in all required fields')
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error('Please complete all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/locations/${locationId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit claim')
      }

      const result = await response.json()
      
      toast.success('Claim submitted successfully! You will be notified once it\'s reviewed.')
      onClose()
      
      // Optionally redirect to claim status page
      // router.push(`/locations/${locationId}/claim-status`)
      
    } catch (error) {
      console.error('Error submitting claim:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit claim')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentStep(1)
      onClose()
    }
  }

  const steps = [
    { id: 1, title: 'Basic Info', icon: Building2 },
    { id: 2, title: 'Business Details', icon: Globe },
    { id: 3, title: 'Verification', icon: FileText },
    { id: 4, title: 'Location Details', icon: CheckCircle2 }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Claim {locationName}
          </DialogTitle>
          <DialogDescription>
            Complete the claim process to take ownership of this business listing.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isActive 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'border-gray-300 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        <Tabs value={currentStep.toString()} className="w-full">
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
                    <Label htmlFor="ownerTitle">Title/Position</Label>
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
                  Provide additional business information and address.
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
                  <Label htmlFor="businessDescription">Business Description *</Label>
                  <Textarea
                    id="businessDescription"
                    value={formData.businessDescription}
                    onChange={(e) => updateFormData('businessDescription', e.target.value)}
                    placeholder="Describe your business, services, and what makes it unique..."
                    rows={4}
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Business Address *</Label>
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
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.businessAddress.state}
                        onChange={(e) => updateFormData('businessAddress.state', e.target.value)}
                        placeholder="State"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={formData.businessAddress.zip}
                        onChange={(e) => updateFormData('businessAddress.zip', e.target.value)}
                        placeholder="12345"
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
                  <FileText className="h-5 w-5" />
                  Verification Documents
                </CardTitle>
                <CardDescription>
                  Provide verification documents to prove your business ownership.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="claimMethod">Verification Method *</Label>
                  <Select value={formData.claimMethod} onValueChange={(value) => updateFormData('claimMethod', value)}>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessLicense">Business License Number</Label>
                    <Input
                      id="businessLicense"
                      value={formData.businessLicense}
                      onChange={(e) => updateFormData('businessLicense', e.target.value)}
                      placeholder="License Number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / EIN</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => updateFormData('taxId', e.target.value)}
                      placeholder="Tax ID"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Verification Process</p>
                      <p>Our team will review your documents and may contact you for additional verification. This process typically takes 2-3 business days.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Location Enhancement */}
          <TabsContent value="4" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Location Details
                </CardTitle>
                <CardDescription>
                  Enhance your location listing with additional details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locationName">Location Name *</Label>
                  <Input
                    id="locationName"
                    value={formData.locationData.name}
                    onChange={(e) => updateFormData('locationData.name', e.target.value)}
                    placeholder="Business Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description *</Label>
                  <Textarea
                    id="shortDescription"
                    value={formData.locationData.shortDescription}
                    onChange={(e) => updateFormData('locationData.shortDescription', e.target.value)}
                    placeholder="Brief description of your business..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.locationData.description}
                    onChange={(e) => updateFormData('locationData.description', e.target.value)}
                    placeholder="Detailed description of your business, services, and offerings..."
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceRange">Price Range</Label>
                    <Select value={formData.locationData.priceRange} onValueChange={(value) => updateFormData('locationData.priceRange', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select price range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="$">$ - Budget Friendly</SelectItem>
                        <SelectItem value="$$">$$ - Moderate</SelectItem>
                        <SelectItem value="$$$">$$$ - Upscale</SelectItem>
                        <SelectItem value="$$$$">$$$$ - Luxury</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
