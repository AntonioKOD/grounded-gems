"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, ImageIcon, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import SimpleMap from "@/components/simple-map"
import Image from "next/image"

export default function AddLocationForm() {
  const [locationImage, setLocationImage] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.006 })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setLocationImage(event.target?.result as string)
      }
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const removeImage = () => {
    setLocationImage(null)
  }

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#4ECDC4]/10 to-white p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Add New Location</h2>
        <p className="text-gray-600">Share a location with the community</p>
      </div>

      <div className="p-6">
        <form className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

            <div>
              <Label htmlFor="location-name">
                Location Name <span className="text-red-500">*</span>
              </Label>
              <Input id="location-name" placeholder="Enter location name" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="location-type">
                Location Type <span className="text-red-500">*</span>
              </Label>
              <Select>
                <SelectTrigger id="location-type" className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venue">Venue</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="cafe">Café</SelectItem>
                  <SelectItem value="park">Park</SelectItem>
                  <SelectItem value="museum">Museum</SelectItem>
                  <SelectItem value="theater">Theater</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location-description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea id="location-description" placeholder="Describe this location" className="mt-1 min-h-[120px]" />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Address</h3>

            <div>
              <Label htmlFor="location-address">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1">
                <Input id="location-address" placeholder="Enter address" />
                <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#4ECDC4]" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="location-city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input id="location-city" placeholder="City" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="location-state">
                  State/Province <span className="text-red-500">*</span>
                </Label>
                <Input id="location-state" placeholder="State" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="location-zip">
                  ZIP/Postal Code <span className="text-red-500">*</span>
                </Label>
                <Input id="location-zip" placeholder="ZIP Code" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="location-country">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Input id="location-country" placeholder="Country" defaultValue="USA" className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="block mb-2">Pin Location on Map</Label>
              <div className="h-[300px] rounded-lg overflow-hidden">
                <SimpleMap height="300px" center={[coordinates.lat, coordinates.lng]} zoom={15} />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Click on the map to set the exact location or adjust the coordinates manually below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-lat">Latitude</Label>
                <Input
                  id="location-lat"
                  type="number"
                  step="0.000001"
                  value={coordinates.lat}
                  onChange={(e) => setCoordinates({ ...coordinates, lat: Number.parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="location-lng">Longitude</Label>
                <Input
                  id="location-lng"
                  type="number"
                  step="0.000001"
                  value={coordinates.lng}
                  onChange={(e) => setCoordinates({ ...coordinates, lng: Number.parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Location Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Location Image</h3>

            {!locationImage ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
                <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 text-center mb-2">Drag and drop an image, or click to browse</p>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="location-image-upload"
                  onChange={handleImageUpload}
                />
                <label htmlFor="location-image-upload">
                  <Button variant="outline" size="sm" className="cursor-pointer" type="button">
                    Upload Image
                  </Button>
                </label>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden h-[200px]">
                <Image
                  src={locationImage || "/placeholder.svg"}
                  alt="Location preview"
                  className="w-full h-full object-cover"
                    fill
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-phone">Phone Number</Label>
                <Input id="location-phone" type="tel" placeholder="Enter phone number" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="location-website">Website</Label>
                <Input id="location-website" type="url" placeholder="https://" className="mt-1" />
              </div>
            </div>

            <div>
              <Label htmlFor="location-hours">Operating Hours</Label>
              <Textarea
                id="location-hours"
                placeholder="e.g., Mon-Fri: 9am-5pm, Sat: 10am-3pm, Sun: Closed"
                className="mt-1"
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Make this location public</p>
                <p className="text-sm text-gray-500">Public locations will be visible to everyone on Local Explorer</p>
              </div>
              <Switch id="location-public" defaultChecked />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 transition-all duration-300 shadow-md">
              Add Location
            </Button>
            <Button type="button" variant="outline" className="border-gray-300">
              Save as Draft
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
