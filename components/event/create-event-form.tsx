/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { Upload, X, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { createEvent } from "@/app/(frontend)/events/actions"
import type { EventFormData } from "@/types/event"
// Import the LocationSearch component
import { LocationSearch } from "@/components/event/location-search"


// Define the form schema with Zod
const eventFormSchema = z
  .object({
    name: z.string().min(5, { message: "Title must be at least 5 characters" }).max(100),
    slug: z.string().min(3, { message: "Slug must be at least 3 characters" }),
    description: z.string().min(20, { message: "Description must be at least 20 characters" }),

    // Taxonomy
    category: z.enum(["entertainment", "education", "social", "business", "sports", "other"]),
    eventType: z.enum([
      "workshop",
      "concert",
      "meetup",
      "webinar",
      "sports_matchmaking",
      "sports_tournament",
      "social_event",
      "other_event",
    ]),
    sportType: z
      .enum(["tennis", "soccer", "basketball", "volleyball", "running", "cycling", "swimming", "golf", "other_sport"])
      .optional(),

    // Timing
    startDate: z.date({ required_error: "Start date is required" }),
    startTime: z.string({ required_error: "Start time is required" }),
    endDate: z.date().optional(),
    endTime: z.string().optional(),

    // Location
    location: z.string({ required_error: "Location is required" }),

    // Capacity
    capacity: z.number().int().positive().optional(),

    // Status
    status: z.enum(["draft", "published", "cancelled", "postponed"]),

    // Meta
    meta: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Ensure end date/time is after start date/time if provided
      if (data.endDate && data.endTime) {
        const startDateTime = new Date(`${format(data.startDate, "yyyy-MM-dd")}T${data.startTime}`)
        const endDateTime = new Date(`${format(data.endDate, "yyyy-MM-dd")}T${data.endTime}`)
        return endDateTime > startDateTime
      }
      return true
    },
    {
      message: "End date/time must be after start date/time",
      path: ["endDate"],
    },
  )

type EventFormValues = z.infer<typeof eventFormSchema>

export default function CreateEventForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [eventImage, setEventImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  // Add this state at the top of your component:
  const [selectedLocation, setSelectedLocation] = useState<{
    id: string
    name: string
    address: string
  } | null>(null)

  // Default form values
  const defaultValues: Partial<EventFormValues> = {
    name: "",
    slug: "",
    description: "",
    category: "social",
    eventType: "meetup",
    startDate: new Date(),
    startTime: format(new Date().setMinutes(Math.ceil(new Date().getMinutes() / 15) * 15), "HH:mm"),
    location: "",
    capacity: 10,
    status: "draft",
  }

  // Initialize form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: "onChange",
  })

  // Watch form values for conditional rendering
  const watchCategory = form.watch("category")
  const watchEventType = form.watch("eventType")

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me")
        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data.user)
        } else {
          // Redirect to login if not authenticated
          toast.error("Please log in to create an event")
          router.push("/login")
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
        toast.error("Please log in to create an event")
        router.push("/login")
      }
    }

    fetchCurrentUser()
  }, [router])

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true)
      try {
        const response = await fetch("/api/locations")
        if (response.ok) {
          const data = await response.json()
          setLocations(data.locations)
        } else {
          toast.error("Failed to load locations")
        }
      } catch (error) {
        console.error("Error fetching locations:", error)
        toast.error("Failed to load locations")
      } finally {
        setIsLoadingLocations(false)
      }
    }

    fetchLocations()
  }, [])

  // Generate slug from name
  useEffect(() => {
    const name = form.watch("name")
    if (name && !form.getValues("slug")) {
      const slug = name
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-")
      form.setValue("slug", slug)
    }
  }, [form.watch("name"), form])

  // Trigger file input click programmatically
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    // Size validation (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast.error("Image must be less than 5MB")
      return
    }

    // Set local preview
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Store file for later upload
    setEventImage(file)

    // Simulate upload progress for better UX
    setIsUploading(true)
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setUploadProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setIsUploading(false)
        toast.success("Image ready for upload")
      }
    }, 100)
  }

  // Handle form submission
  const onSubmit = async (data: EventFormValues) => {
    if (!currentUser) {
      toast.error("Please log in to create an event")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare form data
      const formData: EventFormData = {
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : undefined,
        image: eventImage,
        locationType: "physical", // or "online" or "hybrid" based on your needs
        organizer: {
          id: currentUser.id as string,
          name: currentUser.name,
          profileImage: currentUser.avatar
        },
        visibility: "public" // or "private" based on your needs
      }

      // Create event
      const result = await createEvent(formData, currentUser.id, currentUser.name, currentUser.avatar)

      if (result.success) {
        toast.success("Event created successfully!")

        // Redirect to event page
        if (result.eventId) {
          router.push(`/events/${result.eventId}`)
        } else {
          router.push("/events")
        }
      } else {
        throw new Error(result.error || "Failed to create event")
      }
    } catch (error) {
      console.error("Error creating event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create event")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate time options for select
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, "0")
        const m = minute.toString().padStart(2, "0")
        options.push(`${h}:${m}`)
      }
    }
    return options
  }

  // Event type options
  const eventTypeOptions = [
    { label: "Workshop", value: "workshop" },
    { label: "Concert", value: "concert" },
    { label: "Meetup", value: "meetup" },
    { label: "Webinar", value: "webinar" },
    { label: "Sports Matchmaking", value: "sports_matchmaking" },
    { label: "Sports Tournament", value: "sports_tournament" },
    { label: "Social Event", value: "social_event" },
    { label: "Other", value: "other_event" },
  ]

  // Category options
  const categoryOptions = [
    { label: "Entertainment", value: "entertainment" },
    { label: "Education", value: "education" },
    { label: "Social", value: "social" },
    { label: "Business", value: "business" },
    { label: "Sports", value: "sports" },
    { label: "Other", value: "other" },
  ]

  // Sport type options
  const sportTypeOptions = [
    { label: "Tennis", value: "tennis" },
    { label: "Soccer", value: "soccer" },
    { label: "Basketball", value: "basketball" },
    { label: "Volleyball", value: "volleyball" },
    { label: "Running", value: "running" },
    { label: "Cycling", value: "cycling" },
    { label: "Swimming", value: "swimming" },
    { label: "Golf", value: "golf" },
    { label: "Other", value: "other_sport" },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Event</CardTitle>
            <CardDescription>Fill out the form below to create your event</CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>
            </div>

            {/* Basic Info Tab */}
            <TabsContent value="basic">
              <CardContent className="space-y-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event title" {...field} />
                      </FormControl>
                      <FormDescription>Give your event a clear, descriptive title.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Slug */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="event-slug" {...field} />
                      </FormControl>
                      <FormDescription>URL-friendly identifier (auto-generated from title).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your event" className="min-h-[120px]" {...field} />
                      </FormControl>
                      <FormDescription>Provide details about what participants can expect.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select the main category for your event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Event Type */}
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Select the type of event you&apos;re creating.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sport Type - Only show if category is sports */}
                {watchCategory === "sports" && (
                  <FormField
                    control={form.control}
                    name="sportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sport Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sport type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sportTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Select the specific sport for this event.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Event Image */}
                <div className="space-y-2">
                  <FormLabel>Event Image</FormLabel>

                  {!imagePreview ? (
                    <div
                      className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={triggerFileInput}
                    >
                      <div className="bg-[#FF6B6B]/10 rounded-full p-3 mb-3">
                        <Upload className="h-6 w-6 text-[#FF6B6B]" />
                      </div>
                      <p className="text-base text-muted-foreground text-center mb-2">
                        Drag and drop an image, or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        Recommended size: 1200 x 800 pixels (Max: 5MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        type="button"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading... {uploadProgress.toFixed(0)}%
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden h-[200px] border">
                      <Image
                        src={imagePreview || "/placeholder.svg"}
                        alt="Event preview"
                        className="w-full h-full object-cover"
                        fill
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-white/90 hover:bg-white rounded-full"
                          onClick={() => {
                            setEventImage(null)
                            setImagePreview(null)
                          }}
                          type="button"
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {isUploading && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                          <div className="h-1 bg-gray-700 mt-1">
                            <div className="h-1 bg-white w-full" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                          Uploading... {uploadProgress.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details">
              <CardContent className="space-y-6">
                {/* Start Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : field.value}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>The date your event starts.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select start time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px] overflow-auto">
                            {generateTimeOptions().map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>The time your event starts.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* End Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>The date your event ends.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select end time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px] overflow-auto">
                            {generateTimeOptions().map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>The time your event ends.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Capacity */}
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Participants</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Enter maximum participants"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>The maximum number of participants allowed for this event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="postponed">Postponed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Current status of the event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location">
              <CardContent className="space-y-6">
                {/* Location (from locations collection) */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <LocationSearch
                          value={field.value}
                          onChange={field.onChange}
                          onLocationSelect={(location) => {
                            field.onChange(location.id)
                            // Optionally store the location name and address for display
                            setSelectedLocation({
                              id: location.id,
                              name: location.name,
                              address: location.address,
                            })
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Select from existing locations or add a new one. The location includes details like address,
                        business hours, and accessibility information.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Optionally, display the selected location details: */}
                {selectedLocation && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">{selectedLocation.name}</p>
                    <p className="text-muted-foreground">{selectedLocation.address}</p>
                  </div>
                )}

                {/* Meta Information */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-lg font-medium">SEO & Meta Information</h3>

                  <FormField
                    control={form.control}
                    name="meta.title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter meta title" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>Title for search engines (defaults to event name if empty).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meta.description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter meta description" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>Description for search engines.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>

          <CardContent className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
