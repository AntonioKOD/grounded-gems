/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Clock, MapPin, ImageIcon, X } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

export default function CreateEventForm() {
  const [date, setDate] = useState<Date>()
  const [formType, setFormType] = useState("event")
  const [eventImage, setEventImage] = useState<string | null>(null)
  const [locationImage, setLocationImage] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "event" | "location") => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (type === "event") {
          setEventImage(event.target?.result as string)
        } else {
          setLocationImage(event.target?.result as string)
        }
      }
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const removeImage = (type: "event" | "location") => {
    if (type === "event") {
      setEventImage(null)
    } else {
      setLocationImage(null)
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#4ECDC4]/10 to-white p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Add to Local Explorer</h2>
        <p className="text-gray-600">Share an event or location with the community</p>
      </div>

      <Tabs defaultValue="event" className="p-6" onValueChange={setFormType}>
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="event" className="text-base">
            Create Event
          </TabsTrigger>
          <TabsTrigger value="location" className="text-base">
            Add Location
          </TabsTrigger>
        </TabsList>

        <TabsContent value="event" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-title">
                  Event Title <span className="text-red-500">*</span>
                </Label>
                <Input id="event-title" placeholder="Enter event title" className="mt-1" />
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

            <div className="space-y-4">
              <div>
                <Label htmlFor="event-location">
                  Location <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <Input id="event-location" placeholder="Enter location" />
                  <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#4ECDC4]" />
                </div>
              </div>

              <div>
                <Label htmlFor="event-description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea id="event-description" placeholder="Describe your event" className="mt-1 min-h-[120px]" />
              </div>

              <div>
                <Label>Event Image</Label>
                {!eventImage ? (
                  <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 text-center mb-2">Drag and drop an image, or click to browse</p>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="event-image-upload"
                      onChange={(e) => handleImageUpload(e, "event")}
                    />
                    <label htmlFor="event-image-upload">
                      <Button variant="outline" size="sm" className="cursor-pointer" type="button">
                        Upload Image
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="mt-1 relative rounded-lg overflow-hidden h-[150px]">
                    <Image
                      src={eventImage || "/placeholder.svg"}
                      alt="Event preview"
                      className="w-full h-full object-cover"
                        width={150}
                        height={150}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                      onClick={() => removeImage("event")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch id="event-featured" />
            <Label htmlFor="event-featured">Request to be featured</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Create Event</Button>
          </div>
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
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
                <Label htmlFor="location-address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <Input id="location-address" placeholder="Enter address" />
                  <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#4ECDC4]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location-city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input id="location-city" placeholder="City" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="location-zip">
                    ZIP Code <span className="text-red-500">*</span>
                  </Label>
                  <Input id="location-zip" placeholder="ZIP Code" className="mt-1" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="location-description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="location-description"
                  placeholder="Describe this location"
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div>
                <Label>Location Image</Label>
                {!locationImage ? (
                  <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 text-center mb-2">Drag and drop an image, or click to browse</p>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="location-image-upload"
                      onChange={(e) => handleImageUpload(e, "location")}
                    />
                    <label htmlFor="location-image-upload">
                      <Button variant="outline" size="sm" className="cursor-pointer" type="button">
                        Upload Image
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="mt-1 relative rounded-lg overflow-hidden h-[150px]">
                    <Image
                      src={locationImage || "/placeholder.svg"}
                      alt="Location preview"
                      className="w-full h-full object-cover"
                      width={150}
                        height={150}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                      onClick={() => removeImage("location")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch id="location-public" defaultChecked />
            <Label htmlFor="location-public">Make this location public</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">Add Location</Button>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
