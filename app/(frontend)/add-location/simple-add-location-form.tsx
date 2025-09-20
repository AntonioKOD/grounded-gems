"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { MapPin, Plus, Loader2, Building, Tag } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CategorySearch from "@/components/ui/category-search"

export default function SimpleAddLocationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading } = useAuth()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state - only essential fields
  const [name, setName] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "USA"
  })
  const [insiderTip, setInsiderTip] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<any[]>([])
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Geocoding function to convert address to coordinates
  const geocodeAddress = async (addressData: { street: string; city: string; state: string; zip: string; country: string }) => {
    const fullAddress = [addressData.street, addressData.city, addressData.state, addressData.zip, addressData.country]
      .filter(Boolean)
      .join(', ')

    if (!fullAddress.trim()) {
      throw new Error('Please provide a complete address')
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
    )

    if (!response.ok) {
      throw new Error('Failed to geocode address')
    }

    const data = await response.json()
    
    if (!data.features || data.features.length === 0) {
      throw new Error('Address not found. Please check your address and try again.')
    }

    const [longitude, latitude] = data.features[0].geometry.coordinates
    return { latitude, longitude }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add a location",
        variant: "destructive",
      })
      return
    }

    // Validate required fields
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Location name is required",
        variant: "destructive",
      })
      return
    }

    if (!shortDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Short description is required",
        variant: "destructive",
      })
      return
    }

    // Validate address fields
    if (!address.street.trim() || !address.city.trim() || !address.state.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a complete address (street, city, and state are required)",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    setIsGeocoding(true)

    try {
      // Geocode the address to get coordinates
      const coordinates = await geocodeAddress(address)
      
      const locationData = {
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        coordinates: coordinates,
        // Categories
        categories: selectedCategories.map(cat => cat.id),
        // Optional insider tip
        insiderTips: insiderTip.trim() ? [{
          category: 'general',
          tip: insiderTip.trim(),
          priority: 'medium',
          isVerified: false,
          source: 'user_submitted',
          status: 'pending'
        }] : undefined
      }

      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create location')
      }

      const result = await response.json()
      
      toast({
        title: "🎉 Location Added Successfully!",
        description: `${name} has been added to the community!`,
      })

      // Redirect to the new location
      router.push(`/locations/${result.location.slug || result.location.id}`)

    } catch (error) {
      console.error('Error creating location:', error)
      
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to create location",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
      setIsGeocoding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add a Location</h1>
        <p className="text-gray-600">
          Share a hidden gem with the community. Just the basics to get started!
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Location Details
          </CardTitle>
          <CardDescription>
            Fill in the essential information about this location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-medium">
                Location Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Joe's Coffee Shop"
                className="h-12 text-base"
                required
              />
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Short Description *
              </Label>
              <Textarea
                id="description"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Tell us what makes this place special (140-300 characters)"
                className="min-h-[100px] text-base"
                maxLength={300}
                required
              />
              <p className="text-sm text-gray-500">
                {shortDescription.length}/300 characters
              </p>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categories (Optional)
              </Label>
              <CategorySearch
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                placeholder="Search for categories like 'Restaurant', 'Coffee Shop', 'Park'..."
                maxSelections={3}
              />
            </div>

            {/* Address */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Address *
              </Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street" className="text-sm">
                    Street Address
                  </Label>
                  <Input
                    id="street"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    placeholder="e.g., 123 Main Street"
                    className="h-12"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="e.g., San Francisco"
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm">
                      State
                    </Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="e.g., CA"
                      className="h-12"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-sm">
                      ZIP Code
                    </Label>
                    <Input
                      id="zip"
                      value={address.zip}
                      onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                      placeholder="e.g., 94102"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={address.country}
                      onChange={(e) => setAddress({ ...address, country: e.target.value })}
                      placeholder="e.g., USA"
                      className="h-12"
                    />
                  </div>
                </div>
              </div>
              <Alert>
                <AlertDescription>
                  We'll automatically find the exact location from your address.
                </AlertDescription>
              </Alert>
            </div>

            {/* Optional Insider Tip */}
            <div className="space-y-2">
              <Label htmlFor="tip" className="text-base font-medium">
                Insider Tip (Optional)
              </Label>
              <Textarea
                id="tip"
                value={insiderTip}
                onChange={(e) => setInsiderTip(e.target.value)}
                placeholder="Share a local secret or tip about this place..."
                className="min-h-[80px] text-base"
                maxLength={280}
              />
              <p className="text-sm text-gray-500">
                {insiderTip.length}/280 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 h-14 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isGeocoding ? 'Finding Location...' : 'Adding Location...'}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Add to Community
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info about claiming */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Business Owner?</h3>
            <p className="text-gray-600 mb-4">
              If you own this business, you can claim it after it's added to get full control and add detailed information.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/map')}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Find Your Business
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
