"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Clock, ImageIcon, X, Upload } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Image from "next/image"



// Sample locations data
const LOCATIONS = [
  { id: 1, name: "Central Park", type: "Park" },
  { id: 2, name: "Blue Note Jazz Club", type: "Music Venue" },
  { id: 3, name: "Metropolitan Museum", type: "Museum" },
  { id: 4, name: "The Rooftop Bar", type: "Bar" },
  { id: 5, name: "Riverside Cafe", type: "Restaurant" },
  { id: 6, name: "Tech Innovation Hub", type: "Conference Center" },
]

export default function AddEventForm() {
  const [date, setDate] = useState<Date>()
  const [eventImage, setEventImage] = useState<string | null>(null)
  const [eventType, setEventType] = useState("in-person")
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [createNewLocation, setCreateNewLocation] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  

  

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      console.log("No file selected")
      return
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Show preview immediately
      const reader = new FileReader()
      reader.onload = (event) => {
        setEventImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      try {
        setUploadProgress(10) // Start progress indication

        // Create FormData for Payload CMS upload
        const formData = new FormData()
        formData.append("file", file)
        formData.append("alt", `Event image: ${file.name}`)

        console.log("Uploading to /api/media")

        // Upload to Payload CMS Media collection via our proxy endpoint
        const response = await fetch("/api/media", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }

        // Get the media object from Payload
        const { doc } = await response.json()
        console.log("Upload successful, doc:", doc)

        // Update the image state with the media ID or URL
        // Note: You might need to adjust this depending on how you want to store/display the image
        setEventImage(doc.url || `/api/media/${doc.id}`) // Use URL if available, otherwise construct one

        setUploadProgress(100)
        setTimeout(() => setUploadProgress(0), 500) // Reset progress after a short delay

        console.log("Upload complete:", doc)
      } catch (error) {
        console.error("Upload failed:", error)
        setUploadProgress(0)
      } finally {
        // Reset the file input so it can be used again
        if (e.target) e.target.value = ""
      }
    }
  }

  const removeImage = () => {
    setEventImage(null)
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }


  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#FF6B6B]/10 to-white p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
        <p className="text-gray-600">Share your event with the community</p>
      </div>

      <div className="p-6">
        <form className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

            <div>
              <Label htmlFor="event-title">
                Event Title <span className="text-red-500">*</span>
              </Label>
              <Input id="event-title" placeholder="Enter event title" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <RadioGroup value={eventType} onValueChange={setEventType} className="flex space-x-4 mt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="in-person" id="in-person" />
                  <Label htmlFor="in-person" className="cursor-pointer">
                    In-Person
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="cursor-pointer">
                    Online
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="event-category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select>
                <SelectTrigger id="event-category" className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="food">Food & Drink</SelectItem>
                  <SelectItem value="arts">Arts & Culture</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event-description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea id="event-description" placeholder="Describe your event" className="mt-1 min-h-[120px]" />
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Date and Time</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#4ECDC4]" />
                      {date ? format(date, "PPP") : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-start-time">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Input id="event-start-time" type="time" />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="event-end-time">End Time</Label>
                  <div className="relative mt-1">
                    <Input id="event-end-time" type="time" />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="recurring-event" />
              <Label htmlFor="recurring-event">This is a recurring event</Label>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {eventType === "online" ? "Online Details" : "Location"}
            </h3>

            {eventType === "online" ? (
              <div>
                <Label htmlFor="meeting-link">
                  Meeting Link <span className="text-red-500">*</span>
                </Label>
                <Input id="meeting-link" placeholder="Enter meeting URL" className="mt-1" />
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch id="create-new-location" checked={createNewLocation} onCheckedChange={setCreateNewLocation} />
                  <Label htmlFor="create-new-location">Create a new location</Label>
                </div>

                {createNewLocation ? (
                  <div className="space-y-4 border-l-2 border-[#4ECDC4] pl-4">
                    <div>
                      <Label htmlFor="new-location-name">
                        Location Name <span className="text-red-500">*</span>
                      </Label>
                      <Input id="new-location-name" placeholder="Enter location name" className="mt-1" />
                    </div>

                    <div>
                      <Label htmlFor="new-location-address">
                        Address <span className="text-red-500">*</span>
                      </Label>
                      <Input id="new-location-address" placeholder="Enter address" className="mt-1" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="new-location-city">City</Label>
                        <Input id="new-location-city" placeholder="City" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="new-location-state">State</Label>
                        <Input id="new-location-state" placeholder="State" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="new-location-zip">ZIP Code</Label>
                        <Input id="new-location-zip" placeholder="ZIP Code" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="new-location-country">Country</Label>
                        <Input id="new-location-country" placeholder="Country" defaultValue="USA" className="mt-1" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new-location-type">Location Type</Label>
                      <Select>
                        <SelectTrigger id="new-location-type" className="mt-1">
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

                    <div className="flex items-center space-x-2">
                      <Switch id="save-location" defaultChecked />
                      <Label htmlFor="save-location">Save this location for future events</Label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="existing-location">
                      Select Location <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedLocation || undefined} onValueChange={setSelectedLocation}>
                      <SelectTrigger id="existing-location" className="mt-1">
                        <SelectValue placeholder="Choose a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATIONS.map((location) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name} ({location.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-2">
                      Don&apos;t see your location?{" "}
                      <Button variant="link" className="p-0 h-auto" onClick={() => setCreateNewLocation(true)}>
                        Create a new one
                      </Button>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Event Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Event Image</h3>

            {!eventImage ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center"
                onClick={triggerFileInput}
              >
                <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 text-center mb-2">Drag and drop an image, or click to browse</p>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="event-image-upload"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <label htmlFor="event-image-upload">
                  <div className="cursor-pointer">
                    <Button variant="outline" size="sm" type="button" onClick={triggerFileInput}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden h-[200px]">
                <Image
                  src={eventImage || "/placeholder.svg"}
                  alt="Event preview"
                  className="w-full h-full object-cover"
                  fill
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                    Uploading: {uploadProgress.toFixed(0)}%
                    <div className="h-1 bg-gray-700 mt-1">
                      <div className="h-1 bg-white" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
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
                <Label htmlFor="event-capacity">Maximum Capacity</Label>
                <Input
                  id="event-capacity"
                  type="number"
                  placeholder="Enter maximum number of attendees"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="event-organizer">Organizer</Label>
                <Input id="event-organizer" placeholder="Enter organizer name" className="mt-1" />
              </div>
            </div>

            <div>
              <Label htmlFor="event-website">Website</Label>
              <Input id="event-website" type="url" placeholder="https://" className="mt-1" />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Make this event public</p>
                <p className="text-sm text-gray-500">Public events will be visible to everyone on Local Explorer</p>
              </div>
              <Switch id="event-public" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Request to be featured</p>
                <p className="text-sm text-gray-500">Featured events appear on the homepage and get more visibility</p>
              </div>
              <Switch id="event-featured" />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="submit" className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 transition-all duration-300 shadow-md">
              Create Event
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
