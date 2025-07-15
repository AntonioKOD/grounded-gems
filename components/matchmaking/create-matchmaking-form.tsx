
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "sonner"
import { Loader2, Plus, Trash, CalendarIcon } from "lucide-react"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Custom components
import  LocationSearch  from "@/components/event/location-search"

// Types
import type { MatchmakingSession } from "@/types/matchmaking"

// Define the form schema with Zod
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),

  // Sport details
  sportType: z.string().min(1, "Please select a sport type"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select a skill level",
  }),

  // Location
  location: z.string().min(1, "Please select a location"),
  virtualUrl: z.string().url().optional().or(z.literal("")),

  // Time window
  timeWindow: z
    .object({
      start: z.date({
        required_error: "Please select a start date",
      }),
      end: z.date({
        required_error: "Please select an end date",
      }),
    })
    .refine((data) => data.end > data.start, {
      message: "End date must be after start date",
      path: ["end"],
    }),

  // Participants
  minPlayers: z.number().int().min(2, "Minimum 2 players required"),
  maxPlayers: z.number().int().min(2, "Minimum 2 players required"),

  // Preferences
  preferences: z
    .object({
      ageRange: z
        .object({
          min: z.number().int().min(0, "Must be 0 or greater").optional(),
          max: z.number().int().min(0, "Must be 0 or greater").optional(),
        })
        .optional(),
      gender: z.enum(["any", "male", "female"]).optional(),
      availability: z
        .array(
          z.object({
            day: z.string().min(1, "Day is required"),
            timeSlot: z.string().min(1, "Time slot is required"),
          }),
        )
        .optional(),
    })
    .optional(),

  // Settings
  autoMatch: z.boolean(),
  status: z
    .enum(["draft", "open", "in_progress", "completed", "cancelled"], {
      required_error: "Status is required",
    }),
})

type FormValues = z.infer<typeof formSchema>

// Props for the form component
interface MatchmakingFormProps {
  initialData?: Partial<MatchmakingSession>
  userId: string
  isAdmin?: boolean
}

// Helper to map initialData.location to LocationSearch Location type
function mapLocationToSearchLocation(loc: any): any {
  if (!loc) return null
  return {
    id: loc.id,
    name: loc.name,
    description: loc.description,
    address: typeof loc.address === 'string' ? undefined : loc.address,
    featuredImage: loc.featuredImage?.url ? { url: loc.featuredImage.url } : undefined,
    categories: Array.isArray(loc.categories)
      ? loc.categories.map((c: any) => (typeof c === 'string' ? { name: c } : c))
      : undefined,
  }
}

export default function MatchmakingForm({ initialData, userId, isAdmin = false }: MatchmakingFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availabilityItems, setAvailabilityItems] = useState<{ day: string; timeSlot: string }[]>(
    initialData?.preferences?.availability || [],
  )
  const isEditMode = Boolean(initialData?.id)

  // Check if user has permission to edit
  const canEdit = isAdmin || initialData?.organizer?.id === userId

  // Initialize form with default values or existing data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      sportType: initialData?.sportType || "",
      skillLevel: initialData?.skillLevel || "intermediate",
      location: initialData?.location?.id || "",
      virtualUrl: initialData?.virtualUrl || "",
      timeWindow: {
        start: initialData?.timeWindow?.start ? new Date(initialData.timeWindow.start) : new Date(),
        end: initialData?.timeWindow?.end ? new Date(initialData.timeWindow.end) : new Date(),
      },
      minPlayers: initialData?.minPlayers || 2,
      maxPlayers: initialData?.maxPlayers || 4,
      preferences: {
        ageRange: initialData?.preferences?.ageRange || { min: 18, max: 65 },
        gender: initialData?.preferences?.gender || "any",
        availability: initialData?.preferences?.availability || [],
      },
      autoMatch: initialData?.autoMatch ?? true,
      status: initialData?.status || "draft",
    },
  })

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (isEditMode && !canEdit) {
      toast.error("You don't have permission to edit this session")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare the data for submission
      const sessionData = {
        ...data,
        preferences: {
          ...data.preferences,
          availability: availabilityItems,
        },
        // Add organizer if creating new session
        ...(isEditMode ? {} : { organizer: userId }),
      }

      console.log("Submitting session data:", sessionData)

      // In a real app, this would be an API call
      // For now, we'll simulate a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (isEditMode) {
        toast.success("Matchmaking session updated successfully")
      } else {
        toast.success("Matchmaking session created successfully")
      }

      // Redirect to the session page or list
      router.push(isEditMode ? `/matchmaking/${initialData?.id}` : "/matchmaking")
      router.refresh()
    } catch (error) {
      console.error("Error submitting matchmaking session:", error)
      toast.error(
        isEditMode
          ? "Failed to update matchmaking session. Please try again."
          : "Failed to create matchmaking session. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle location selection
  const handleLocationSelect = (location: any) => {
    console.log("Selected location:", location)
  }

  // Add availability item
  const addAvailabilityItem = () => {
    setAvailabilityItems([...availabilityItems, { day: "monday", timeSlot: "morning" }])
  }

  // Remove availability item
  const removeAvailabilityItem = (index: number) => {
    setAvailabilityItems(availabilityItems.filter((_, i) => i !== index))
  }

  // Update availability item
  const updateAvailabilityItem = (index: number, field: "day" | "timeSlot", value: string) => {
    const newItems = [...availabilityItems]
    const prev = newItems[index] || { day: '', timeSlot: '' }
    newItems[index] = {
      day: field === 'day' ? value : prev.day || '',
      timeSlot: field === 'timeSlot' ? value : prev.timeSlot || ''
    }
    setAvailabilityItems(newItems)
  }

  // If editing and no permission, show message
  if (isEditMode && !canEdit) {
    return (
      <Alert>
        <AlertDescription>You don&apos;t have permission to edit this matchmaking session.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="location">Location & Time</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Provide the basic details for your matchmaking session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Tennis Doubles Match" {...field} />
                      </FormControl>
                      <FormDescription>A clear, descriptive title for your matchmaking session</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your matchmaking session..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide details about the session, what to expect, and any requirements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sport Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a sport" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tennis">Tennis</SelectItem>
                            <SelectItem value="soccer">Soccer</SelectItem>
                            <SelectItem value="basketball">Basketball</SelectItem>
                            <SelectItem value="volleyball">Volleyball</SelectItem>
                            <SelectItem value="badminton">Badminton</SelectItem>
                            <SelectItem value="golf">Golf</SelectItem>
                            <SelectItem value="running">Running</SelectItem>
                            <SelectItem value="swimming">Swimming</SelectItem>
                            <SelectItem value="cycling">Cycling</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>The type of sport for this matchmaking session</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="skillLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skill Level *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select skill level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>The skill level required for participants</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>The current status of this matchmaking session</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location & Time Tab */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle>Location & Time</CardTitle>
                <CardDescription>Set where and when your matchmaking session will take place</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <LocationSearch
                          selectedLocation={mapLocationToSearchLocation(initialData?.location) || null}
                          onLocationSelect={(location) => {
                            field.onChange(location?.id || "")
                          }}
                        />
                      </FormControl>
                      <FormDescription>Search for and select a location for your matchmaking session</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="virtualUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Virtual URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., https://zoom.us/j/123456789" {...field} />
                      </FormControl>
                      <FormDescription>If this is a virtual or hybrid event, provide a meeting URL</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="timeWindow.start"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date & Time *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? format(field.value, "PPP h:mm a") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            <div className="p-3 border-t border-border">
                              <div className="flex items-center justify-center space-x-2">
                                <Input
                                  type="time"
                                  value={field.value ? format(field.value, "HH:mm") : ""}
                                  onChange={(e) => {
                                    const timeValue = e.target.value || "00:00"
                                    const [hoursStr, minutesStr] = timeValue.split(":")
                                    const hours = hoursStr || "0"
                                    const minutes = minutesStr || "0"
                                    const newDate = new Date(field.value || new Date())
                                    newDate.setHours(Number.parseInt(hours, 10))
                                    newDate.setMinutes(Number.parseInt(minutes, 10))
                                    field.onChange(newDate)
                                  }}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>When the matchmaking session starts</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeWindow.end"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date & Time *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? format(field.value, "PPP h:mm a") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            <div className="p-3 border-t border-border">
                              <div className="flex items-center justify-center space-x-2">
                                <Input
                                  type="time"
                                  value={field.value ? format(field.value, "HH:mm") : ""}
                                  onChange={(e) => {
                                    const timeValue = e.target.value || "00:00"
                                    const [hoursStr, minutesStr] = timeValue.split(":")
                                    const hours = hoursStr || "0"
                                    const minutes = minutesStr || "0"
                                    const newDate = new Date(field.value || new Date())
                                    newDate.setHours(Number.parseInt(hours, 10))
                                    newDate.setMinutes(Number.parseInt(minutes, 10))
                                    field.onChange(newDate)
                                  }}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>When the matchmaking session ends</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>Configure participant limits and matching settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="minPlayers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Players *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            {...field}
                            onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormDescription>The minimum number of players required</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxPlayers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Players *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            {...field}
                            onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormDescription>The maximum number of players allowed</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="autoMatch"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Automatic Matching</FormLabel>
                        <FormDescription>
                          Automatically match participants when the session reaches maximum capacity
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isEditMode && initialData?.participants && initialData.participants.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Current Participants</h3>
                    <div className="border rounded-md p-4">
                      <div className="grid grid-cols-1 gap-2">
                        {initialData.participants.map((participant, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {participant.name?.charAt(0) || "U"}
                              </div>
                              <span>{participant.name || "Unknown User"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isEditMode && initialData?.matchedGroups && initialData.matchedGroups.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Matched Groups</h3>
                    <div className="border rounded-md p-4">
                      {initialData.matchedGroups.map((matchedGroup, groupIndex) => (
                        <div key={groupIndex} className="mb-4 last:mb-0">
                          <h4 className="font-medium mb-2">Group {groupIndex + 1}</h4>
                          <div className="grid grid-cols-1 gap-2 pl-4">
                            {matchedGroup.group.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-center space-x-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                  {item.user.name?.charAt(0) || "U"}
                                </div>
                                <span className="text-sm">{item.user.name || "Unknown User"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Set preferences for matching participants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Age Range (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="preferences.ageRange.min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="e.g., 18"
                              {...field}
                              onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10) || undefined)}
                              value={field.value === undefined ? "" : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="preferences.ageRange.max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="e.g., 65"
                              {...field}
                              onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10) || undefined)}
                              value={field.value === undefined ? "" : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="preferences.gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Gender Preference</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="any" />
                            </FormControl>
                            <FormLabel className="font-normal">Any Gender</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="male" />
                            </FormControl>
                            <FormLabel className="font-normal">Male Only</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="female" />
                            </FormControl>
                            <FormLabel className="font-normal">Female Only</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>Preferred gender for participants</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium">Availability (Optional)</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addAvailabilityItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Slot
                    </Button>
                  </div>

                  {availabilityItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                      No availability preferences set. Add time slots if you have specific availability requirements.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {availabilityItems.map((item, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className="grid grid-cols-2 gap-4 flex-1">
                            <div>
                              <FormLabel className={index !== 0 ? "sr-only" : ""}>Day</FormLabel>
                              <Select
                                value={item.day}
                                onValueChange={(value) => updateAvailabilityItem(index, "day", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monday">Monday</SelectItem>
                                  <SelectItem value="tuesday">Tuesday</SelectItem>
                                  <SelectItem value="wednesday">Wednesday</SelectItem>
                                  <SelectItem value="thursday">Thursday</SelectItem>
                                  <SelectItem value="friday">Friday</SelectItem>
                                  <SelectItem value="saturday">Saturday</SelectItem>
                                  <SelectItem value="sunday">Sunday</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FormLabel className={index !== 0 ? "sr-only" : ""}>Time Slot</FormLabel>
                              <Select
                                value={item.timeSlot}
                                onValueChange={(value) => updateAvailabilityItem(index, "timeSlot", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                                  <SelectItem value="afternoon">Afternoon (12PM-5PM)</SelectItem>
                                  <SelectItem value="evening">Evening (5PM-9PM)</SelectItem>
                                  <SelectItem value="night">Night (9PM-12AM)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAvailabilityItem(index)}
                            className="mt-8"
                          >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Session" : "Create Session"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
