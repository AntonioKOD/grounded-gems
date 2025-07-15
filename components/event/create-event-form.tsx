
"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { Upload, X, Loader2, Calendar, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { createEvent } from "@/app/(frontend)/events/actions"
import type { EventFormData } from "@/types/event"
import LocationSearch from "@/components/event/location-search"
import PrivacySelector from "@/components/event/privacy-selector"

interface Location {
  id: string
  name: string
  description?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  featuredImage?: {
    url: string
  }
  categories?: Array<{
    name: string
  }>
}

// Define the simplified form schema with Zod
const eventFormSchema = z
  .object({
    name: z.string().min(5, { message: "Title must be at least 5 characters" }).max(100),
    slug: z.string().min(3, { message: "Slug must be at least 3 characters" }),
    description: z.string().min(20, { message: "Description must be at least 20 characters" }),

    // Taxonomy
    category: z.enum(["entertainment", "education", "social", "business", "other"]),
    eventType: z.enum([
      "workshop",
      "concert",
      "meetup",
      "social_event",
      "other_event",
    ]),

    // Timing
    startDate: z.date({ required_error: "Start date is required" }),
    startTime: z.string({ required_error: "Start time is required" }),
    endDate: z.date().optional(),
    endTime: z.string().optional(),
    durationMinutes: z.number().min(15).max(1440).optional(),

    // Location
    location: z.string({ required_error: "Location is required" }),

    // Capacity
    capacity: z.number().int().positive().optional(),

    // Privacy
    privacy: z.enum(["public", "private"]),
    privateAccess: z.array(z.string()).default([]),

    // Status
    status: z.enum(["draft", "published", "cancelled", "postponed"]),

    // Tags
    tags: z.array(z.string()).default([]),

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

// Helper function to combine date and time
const combineDateTime = (date: Date, time: string): string => {
  const dateStr = format(date, "yyyy-MM-dd")
  return `${dateStr}T${time}`
}

export default function CreateEventForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentTag, setCurrentTag] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form setup
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      category: "social",
      eventType: "social_event",
      startDate: new Date(),
      startTime: "18:00",
      endDate: undefined,
      endTime: "",
      durationMinutes: 120,
      location: "",
      capacity: undefined,
      privacy: "public",
      privateAccess: [],
      status: "draft",
      tags: [],
      meta: {
        title: "",
        description: "",
      },
    },
  })

  const watchCategory = form.watch("category")
  const watchPrivacy = form.watch("privacy")

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        console.log("Fetching current user...")
        const response = await fetch("/api/users/me")
        console.log("User API response status:", response.status)
        
        if (response.ok) {
          const userData = await response.json()
          console.log("User data:", userData)
          setCurrentUser(userData.user)
        } else {
          console.error("Failed to fetch current user:", response.status)
          const errorData = await response.json().catch(() => ({}))
          console.error("Error details:", errorData)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }

    fetchCurrentUser()
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    const title = form.watch("name")
    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      form.setValue("slug", slug)
    }
  }, [form.watch("name")])

  // Auto-generate meta title from event name
  useEffect(() => {
    const name = form.watch("name")
    if (name && !form.watch("meta.title")) {
      form.setValue("meta.title", name)
    }
  }, [form.watch("name")])

  // Auto-generate meta description from description
  useEffect(() => {
    const description = form.watch("description")
    if (description && !form.watch("meta.description")) {
      const metaDesc = description.length > 160 ? description.substring(0, 157) + "..." : description
      form.setValue("meta.description", metaDesc)
    }
  }, [form.watch("description")])

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: EventFormValues) => {
    if (!currentUser) {
      toast.error("You must be logged in to create an event")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare event data
      const eventData: EventFormData = {
        ...data,
        organizer: currentUser.id,
        startDate: combineDateTime(data.startDate, data.startTime),
        endDate: data.endDate && data.endTime ? combineDateTime(data.endDate, data.endTime) : undefined,
        // Remove form-specific fields
        startTime: undefined,
        endTime: undefined,
      }

      // Handle image upload if present
      if (imageFile) {
        const formData = new FormData()
        formData.append("file", imageFile)
        
        const uploadResponse = await fetch("/api/upload-media", {
          method: "POST",
          body: formData,
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          eventData.image = uploadResult.id
        }
      }

      const result = await createEvent(eventData)

      if (result.success) {
        toast.success("Event created successfully!")
        router.push(`/events/${result.event?.id}`)
      } else {
        toast.error(result.error || "Failed to create event")
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
        const date = new Date()
        date.setHours(hour, minute, 0, 0)
        const timeString = format(date, "HH:mm")
        options.push(timeString)
      }
    }
    return options
  }

  // Event type options
  const eventTypeOptions = [
    { label: "Workshop", value: "workshop" },
    { label: "Concert", value: "concert" },
    { label: "Meetup", value: "meetup" },
    { label: "Social Event", value: "social_event" },
    { label: "Other", value: "other_event" },
  ]

  // Category options
  const categoryOptions = [
    { label: "Entertainment", value: "entertainment" },
    { label: "Education", value: "education" },
    { label: "Social", value: "social" },
    { label: "Business", value: "business" },
    { label: "Other", value: "other" },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Event</CardTitle>
            <CardDescription>Fill out the form below to create your event</CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
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
              </CardContent>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details">
              <CardContent className="space-y-6">
                {/* Start Date */}
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
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Start Time */}
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
                        <SelectContent>
                          {generateTimeOptions().map((time) => (
                            <SelectItem key={time} value={time}>
                              {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* End Date */}
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
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Leave empty if event ends on the same day.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* End Time */}
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
                        <SelectContent>
                          {generateTimeOptions().map((time) => (
                            <SelectItem key={time} value={time}>
                              {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Leave empty if using duration instead.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duration */}
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="120"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Event duration in minutes (used if end time is not specified).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Capacity */}
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Maximum number of attendees.</FormDescription>
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

                {/* Tags */}
                <div className="space-y-2">
                  <FormLabel>Tags</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (currentTag.trim()) {
                            const currentTags = form.getValues("tags") || []
                            if (!currentTags.includes(currentTag.trim())) {
                              form.setValue("tags", [...currentTags, currentTag.trim()])
                            }
                            setCurrentTag("")
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentTag.trim()) {
                          const currentTags = form.getValues("tags") || []
                          if (!currentTags.includes(currentTag.trim())) {
                            form.setValue("tags", [...currentTags, currentTag.trim()])
                          }
                          setCurrentTag("")
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(form.watch("tags") || []).map((tag, index) => (
                      <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => {
                            const currentTags = form.getValues("tags") || []
                            form.setValue("tags", currentTags.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <FormDescription>Add tags to help users find your event.</FormDescription>
                </div>
              </CardContent>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location">
              <CardContent className="space-y-6">
                {/* Location Search */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <LocationSearch
                          onLocationSelect={(location) => {
                            field.onChange(location.id)
                            setSelectedLocation(location)
                          }}
                          selectedLocation={selectedLocation}
                        />
                      </FormControl>
                      <FormDescription>
                        Search for a location where your event will take place.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

            {/* Privacy Tab */}
            <TabsContent value="privacy">
              <CardContent>
                <PrivacySelector
                  privacy={watchPrivacy}
                  onPrivacyChange={(privacy) => form.setValue("privacy", privacy)}
                  privateAccess={form.watch("privateAccess") || []}
                  onPrivateAccessChange={(userIds) => form.setValue("privateAccess", userIds)}
                  currentUserId={currentUser?.id || ""}
                />
                
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                    <p><strong>Debug Info:</strong></p>
                    <p>Current User: {currentUser ? `${currentUser.name} (${currentUser.id})` : 'Not loaded'}</p>
                    <p>Current User ID: {currentUser?.id || 'Not set'}</p>
                    <p>Privacy: {watchPrivacy}</p>
                    <p>Private Access Count: {(form.watch("privateAccess") || []).length}</p>
                    <p>User Loading: {currentUser ? 'Loaded' : 'Loading...'}</p>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>

          <CardContent className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Event...
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
