"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { MapPin, Plus, Loader2, Building, Upload, X, Image as ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CategorySearch from "@/components/ui/category-search"
import Image from "next/image"

export default function UltraSimpleForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading } = useAuth()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [geocodingError, setGeocodingError] = useState<string | null>(null)
  const [useManualCoordinates, setUseManualCoordinates] = useState(false)
  const [manualLatitude, setManualLatitude] = useState("")
  const [manualLongitude, setManualLongitude] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state - minimal fields only
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<any[]>([])

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please select only image files",
        variant: "destructive",
      })
      return
    }

    // Limit to 3 images max
    const newFiles = [...uploadedImages, ...validFiles].slice(0, 3)
    setUploadedImages(newFiles)

    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file))
    setImagePreviews(newPreviews)
  }

  const removeImage = (index: number) => {
    const newFiles = uploadedImages.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    setUploadedImages(newFiles)
    setImagePreviews(newPreviews)
  }

  // Geocoding function
  const geocodeAddress = async (addressString: string) => {
    if (!addressString.trim()) {
      throw new Error('Please provide an address')
    }

    // Check if Mapbox token is available
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_SECRET_MAPBOX_ACCESS_TOKEN
    if (!mapboxToken || mapboxToken === 'your-mapbox-access-token-here') {
      throw new Error('Mapbox access token is not configured. Please contact support.')
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressString)}.json?access_token=${mapboxToken}`
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Mapbox API error:', response.status, errorText)
        throw new Error(`Failed to geocode address (${response.status}). Please check your address and try again.`)
      }

      const data = await response.json()
      
      if (!data.features || data.features.length === 0) {
        throw new Error('Address not found. Please check your address and try again.')
      }

      const [longitude, latitude] = data.features[0].geometry.coordinates
      
      // Validate coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
          isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates returned. Please try a different address.')
      }

      return { latitude, longitude }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error while geocoding address. Please check your connection and try again.')
    }
  }

  // Upload images to server
  const uploadImages = async (files: File[]) => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', file.name)
      
      const response = await fetch('/api/upload/blob', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload image')
      }
      
      const result = await response.json()
      return {
        id: result.id,
        url: result.url,
        filename: result.filename
      }
    })
    
    return Promise.all(uploadPromises)
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

    if (!description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive",
      })
      return
    }

    if (!useManualCoordinates && !address.trim()) {
      toast({
        title: "Validation Error",
        description: "Address is required",
        variant: "destructive",
      })
      return
    }

    if (useManualCoordinates && (!manualLatitude.trim() || !manualLongitude.trim())) {
      toast({
        title: "Validation Error",
        description: "Please enter both latitude and longitude",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    setIsGeocoding(true)
    setGeocodingError(null)

    try {
      let coordinates: { latitude: number; longitude: number }
      
      if (useManualCoordinates) {
        // Use manual coordinates
        const lat = parseFloat(manualLatitude)
        const lng = parseFloat(manualLongitude)
        
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Please enter valid latitude and longitude numbers')
        }
        
        if (lat < -90 || lat > 90) {
          throw new Error('Latitude must be between -90 and 90')
        }
        
        if (lng < -180 || lng > 180) {
          throw new Error('Longitude must be between -180 and 180')
        }
        
        coordinates = { latitude: lat, longitude: lng }
      } else {
        // Geocode the address
        try {
          coordinates = await geocodeAddress(address)
        } catch (geocodingErr) {
          setIsGeocoding(false)
          setGeocodingError(geocodingErr instanceof Error ? geocodingErr.message : 'Geocoding failed')
          
          // Show error but don't prevent submission - let user choose manual coordinates
          toast({
            title: "Address not found",
            description: "We couldn't find that address. You can enter coordinates manually or try a different address.",
            variant: "destructive",
          })
          
          setUseManualCoordinates(true)
          return // Stop here to let user enter manual coordinates
        }
      }
      
      setIsGeocoding(false)
      
      // Upload images if any
      let mediaIds: string[] = []
      if (uploadedImages.length > 0) {
        try {
          const uploadResults = await uploadImages(uploadedImages)
          mediaIds = uploadResults.filter(result => result.id).map(result => result.id)
          console.log('Images uploaded successfully, media IDs:', mediaIds)
        } catch (imageError) {
          console.warn('Image upload failed, but continuing with location creation:', imageError)
          // Continue with location creation even if image upload fails
        }
      }
      
      // Parse address string into address object
      const parseAddressString = (addressString: string) => {
        if (!addressString.trim()) return null
        
        // Try to parse the address into components
        // This is a simple parser - could be enhanced with more sophisticated parsing
        const parts = addressString.split(',').map(part => part.trim())
        
        if (parts.length >= 2) {
          return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zip: parts[3] || '',
            country: parts[4] || 'US' // Default to US if not specified
          }
        } else {
          // If we can't parse it properly, store the full address in the street field
          return {
            street: addressString,
            city: '',
            state: '',
            zip: '',
            country: 'US'
          }
        }
      }

      const locationData = {
        name: name.trim(),
        shortDescription: description.trim(),
        coordinates: coordinates,
        address: parseAddressString(address),
        categories: selectedCategories.map(cat => cat.id),
        // Link uploaded images to the location
        featuredImage: mediaIds[0] || undefined,
        gallery: mediaIds.map((mediaId, index) => ({
          image: mediaId,
          isPrimary: index === 0,
          order: index
        }))
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
      
      const successMessage = mediaIds.length > 0 
        ? `${name} has been added to the community! ${mediaIds.length} image(s) uploaded successfully.`
        : `${name} has been added to the community!`
      
      toast({
        title: "🎉 Location Added Successfully!",
        description: successMessage,
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
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add a Location</h1>
        <p className="text-gray-600">
          Quick and easy - just the essentials to get your location on the map!
        </p>
        <div className="mt-4 text-sm text-gray-500">
          ⏱️ Takes less than 1 minute to complete
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Location Details
          </CardTitle>
          <CardDescription>
            Fill in the basic information about this location
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                What makes this place special? *
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what makes this place special (2-3 sentences)"
                className="min-h-[80px] text-base"
                maxLength={200}
                required
              />
              <p className="text-sm text-gray-500">
                {description.length}/200 characters
              </p>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Full Address *
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setGeocodingError(null)
                  setUseManualCoordinates(false)
                }}
                placeholder="e.g., 123 Main St, Boston, MA 02101"
                className="h-12 text-base"
                required
              />
              <p className="text-xs text-gray-500">
                We'll automatically find the exact location from your address.
              </p>
              
              {/* Geocoding Error Display */}
              {geocodingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 mb-2">{geocodingError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUseManualCoordinates(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Enter coordinates manually
                  </Button>
                </div>
              )}
              
              {/* Manual Coordinates Input */}
              {useManualCoordinates && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm font-medium text-blue-800">
                      Enter coordinates manually
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="latitude" className="text-xs text-blue-700">
                        Latitude
                      </Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={manualLatitude}
                        onChange={(e) => setManualLatitude(e.target.value)}
                        placeholder="42.3601"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude" className="text-xs text-blue-700">
                        Longitude
                      </Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={manualLongitude}
                        onChange={(e) => setManualLongitude(e.target.value)}
                        placeholder="-71.0589"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUseManualCoordinates(false)
                        setGeocodingError(null)
                        setManualLatitude("")
                        setManualLongitude("")
                      }}
                      className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      Try address again
                    </Button>
                    <p className="text-xs text-blue-600 flex items-center">
                      💡 You can find coordinates on Google Maps by right-clicking on a location
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Category (Optional)
              </Label>
              <CategorySearch
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                placeholder="Search categories..."
                maxSelections={1}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Photos (Optional)
              </Label>
              
              {/* Upload Button */}
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadedImages.length >= 3}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Add Photos ({uploadedImages.length}/3)
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {uploadedImages.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {uploadedImages.length} photo{uploadedImages.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
