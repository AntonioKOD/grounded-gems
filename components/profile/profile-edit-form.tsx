
"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Save, X, Plus, Trash2, Camera, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

import {
  updateUserProfile,
  updateCreatorStatus,
  updateProfileImage,
  checkUsernameChangeCooldown,
  type ProfileUpdateData,
} from "@/app/(frontend)/profile/actions"

// Define the form schema with Zod
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(30, { message: "Username must be less than 30 characters." })
    .regex(/^[a-z0-9_-]+$/, { message: "Username can only contain lowercase letters, numbers, hyphens, and underscores." })
    .optional()
    .or(z.literal('')), // Allow empty string
  bio: z.string()
    .max(500, { message: "Bio must be less than 500 characters." })
    .optional()
    .or(z.literal('')), // Allow empty string
  location: z.object({
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
  }),
  interests: z.array(z.string()).optional(),
  socialLinks: z
    .array(
      z.object({
        platform: z.enum(["instagram", "twitter", "tiktok", "youtube", "website"]),
        url: z.string().url({ message: "Please enter a valid URL." }),
      }),
    )
    .optional(),
  isCreator: z.boolean(),
  creatorLevel: z.enum(["explorer", "hunter", "authority", "expert"]).optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileEditFormProps {
  user: {
    id: string
    name?: string
    username?: string
    bio?: string
    location?: {
      city?: string
      state?: string
      country?: string
    }
    interests?: string[]
    socialLinks?: {
      platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
      url: string
    }[]
    isCreator?: boolean
    creatorLevel?: "explorer" | "hunter" | "authority" | "expert"
    profileImage?: {
      url?: string
    }
  }
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Image upload states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(user.profileImage?.url || null)
  const [profileImageId, setProfileImageId] = useState<string | null>(null)

  // Username cooldown states
  const [usernameCooldown, setUsernameCooldown] = useState<{
    canChange: boolean
    daysRemaining: number
    nextChangeDate: Date | null
    lastChangeDate?: Date
  } | null>(null)
  const [isCheckingCooldown, setIsCheckingCooldown] = useState(false)

  // Check username cooldown on component mount
  useEffect(() => {
    const checkCooldown = async () => {
      try {
        setIsCheckingCooldown(true)
        const cooldownInfo = await checkUsernameChangeCooldown()
        setUsernameCooldown(cooldownInfo)
      } catch (error) {
        console.error("Error checking username cooldown:", error)
        // If there's an error, assume they can change it
        setUsernameCooldown({
          canChange: true,
          daysRemaining: 0,
          nextChangeDate: null
        })
      } finally {
        setIsCheckingCooldown(false)
      }
    }

    checkCooldown()
  }, [])

  // Simulate progress during upload
  const simulateProgress = () => {
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return prev
        }
        return prev + 5
      })
    }, 100)
    return () => clearInterval(interval)
  }

  // Initialize the form with user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || "",
      bio: user.bio || "",
      location: {
        city: user.location?.city || "",
        state: user.location?.state || "",
        country: user.location?.country || "",
      },
      interests: user.interests || [],
      socialLinks: user.socialLinks || [],
      isCreator: user.isCreator ?? false, // Ensure a boolean value
      creatorLevel: user.creatorLevel || "explorer",
    },
  })



  // Trigger file input click programmatically
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    // Size validation (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast.error("Image must be less than 5MB")
      return
    }

    // Set local preview immediately
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      setIsUploading(true)
      setUploadError(null)
      const stopProgress = simulateProgress()

      // Build FormData for Payload's /api/media
      const formData = new FormData()
      formData.append("file", file)
      formData.append("alt", `Profile photo for ${user.name || "user"}`)

      // Send to Payload's media endpoint
      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
        credentials: 'include', // Required for authentication
      })

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
      }

      // Extract the created media document
      const { doc } = await res.json()
      setProfileImageId(doc.id)
      setUploadProgress(100)

      toast.success("Profile photo uploaded successfully")

      // Update the user profile with the new image ID
      await updateProfileImage(doc.id)

      stopProgress()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setUploadError(message)
      toast.error(`Could not upload image: ${message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Remove profile image
  const handleRemoveImage = async () => {
    try {
      setIsUploading(true)
      await updateProfileImage(null)
      setImagePreview(null)
      setProfileImageId(null)
      toast.success("Profile photo removed")
    } catch (error) {
      toast.error("Failed to remove profile photo")
        console.error("Error removing profile photo:", error)
    } finally {
      setIsUploading(false)
    }
  }

  // Add a new interest field
  const addInterest = () => {
    const currentInterests = form.getValues("interests") || []
    form.setValue("interests", [...currentInterests, ""])
  }

  // Remove an interest field
  const removeInterest = (index: number) => {
    const currentInterests = form.getValues("interests") || []
    form.setValue(
      "interests",
      currentInterests.filter((_, i) => i !== index),
    )
  }

  // Add a new social link field
  const addSocialLink = () => {
    const currentLinks = form.getValues("socialLinks") || []
    form.setValue("socialLinks", [...currentLinks, { platform: "instagram", url: "" }])
  }

  // Remove a social link field
  const removeSocialLink = (index: number) => {
    const currentLinks = form.getValues("socialLinks") || []
    form.setValue(
      "socialLinks",
      currentLinks.filter((_, i) => i !== index),
    )
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user.name) return "U"
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true)

    try {
      // Prepare profile data, only including fields that have changed
      const profileData: ProfileUpdateData = {
        name: data.name,
        bio: data.bio || undefined, // Convert empty string to undefined
        location: {
          city: data.location.city || undefined,
          state: data.location.state || undefined,
          country: data.location.country || undefined,
        },
        interests: data.interests?.filter(interest => interest.trim() !== ""), // Filter out empty interests
        socialLinks: data.socialLinks,
      }

      // Only include username if it's actually being changed
      const currentUsername = user.username || ""
      const newUsername = data.username || ""
      
      if (newUsername !== currentUsername) {
        // Only validate and include username if it's actually changing
        if (newUsername.trim()) {
          profileData.username = newUsername
        } else {
          // If user is clearing the username, allow it
          profileData.username = ""
        }
      }
      // If username is the same, don't include it in the update

      // Show what's being updated
      const changes = []
      if (data.name !== user.name) changes.push('name')
      if (data.bio !== user.bio) changes.push('bio')
      if (newUsername !== currentUsername) changes.push('username')
      if (JSON.stringify(data.location) !== JSON.stringify(user.location)) changes.push('location')
      if (JSON.stringify(data.interests) !== JSON.stringify(user.interests)) changes.push('interests')
      if (JSON.stringify(data.socialLinks) !== JSON.stringify(user.socialLinks)) changes.push('social links')
      
      if (changes.length > 0) {
        console.log('Updating profile fields:', changes.join(', '))
      }

      const profileResult = await updateUserProfile(profileData)

      if (!profileResult.success) {
        throw new Error(profileResult.error || "Failed to update profile")
      }

      // Then update creator status if it has changed
      if (data.isCreator !== user.isCreator || data.creatorLevel !== user.creatorLevel) {
        const creatorResult = await updateCreatorStatus(
          data.isCreator,
          data.isCreator ? data.creatorLevel : undefined,
        )

        if (!creatorResult.success) {
          throw new Error(creatorResult.error || "Failed to update creator status")
        }
      }

      toast.success("Profile updated successfully")
      router.push(`/profile/${user.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-muted">
                  {imagePreview ? (
                    <Image
                      src={imagePreview || "/placeholder.svg"}
                      alt="Profile preview"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Avatar className="w-32 h-32">
                      <AvatarFallback className="text-4xl">{getInitials()}</AvatarFallback>
                    </Avatar>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                      <div className="w-20 bg-black/40 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-white h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />

                {!isUploading && (
                  <div className="absolute bottom-0 right-0 left-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex bg-black/70 rounded-full p-1 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={triggerFileInput}
                        className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white"
                        type="button"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>

                      {imagePreview && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveImage}
                          className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-medium text-lg mb-2">Profile Photo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a photo to make your profile more personal.
                  <br />
                  Recommended size: 300x300px (Max: 5MB)
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerFileInput}
                  type="button"
                  disabled={isUploading}
                  className="mr-2"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {imagePreview ? "Change Photo" : "Upload Photo"}
                </Button>

                {imagePreview && (
                  <Button variant="outline" size="sm" onClick={handleRemoveImage} type="button" disabled={isUploading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Photo
                  </Button>
                )}

                {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
              </div>
            </div>

            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormDescription>This is your public display name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Username Field */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="your_username" 
                      {...field} 
                      value={field.value || ""}
                      disabled={isCheckingCooldown || (usernameCooldown?.canChange === false)}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Your unique username (letters, numbers, hyphens, and underscores only).
                    {isCheckingCooldown && (
                      <span className="block text-sm text-gray-500 mt-1">
                        Checking username change availability...
                      </span>
                    )}
                    {usernameCooldown && !usernameCooldown.canChange && (
                      <span className="block text-sm text-orange-600 mt-1">
                        You can change your username again in {usernameCooldown.daysRemaining} day(s). 
                        Next change available: {usernameCooldown.nextChangeDate?.toLocaleDateString()}
                      </span>
                    )}
                    {usernameCooldown && usernameCooldown.canChange && usernameCooldown.lastChangeDate && (
                      <span className="block text-sm text-green-600 mt-1">
                        Username can be changed. Last changed: {usernameCooldown.lastChangeDate.toLocaleDateString()}
                      </span>
                    )}
                    {usernameCooldown && usernameCooldown.canChange && !usernameCooldown.lastChangeDate && (
                      <span className="block text-sm text-blue-600 mt-1">
                        Username can be changed anytime.
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bio Field */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself"
                      className="resize-none min-h-[120px]"
                      {...field}
                      value={field.value || ""}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormDescription>
                    Share a brief description about yourself.
                    <span className="block text-xs text-muted-foreground mt-1">
                      {(field.value || "").length}/500 characters
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Location</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="location.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="State/Province" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Country" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Interests Fields */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Interests</h3>
                <Button type="button" variant="outline" size="sm" onClick={addInterest}>
                  <Plus className="h-4 w-4 mr-1" /> Add Interest
                </Button>
              </div>

              {form.watch("interests")?.map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`interests.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Interest" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInterest(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Social Links Fields */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Social Links</h3>
                <Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
                  <Plus className="h-4 w-4 mr-1" /> Add Link
                </Button>
              </div>

              {form.watch("socialLinks")?.map((_, index) => (
                <div key={index} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`socialLinks.${index}.platform`}
                    render={({ field }) => (
                      <FormItem className="w-1/3">
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Platform" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="twitter">Twitter</SelectItem>
                              <SelectItem value="tiktok">TikTok</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="website">Website</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`socialLinks.${index}.url`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="URL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocialLink(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Creator Status Fields */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">Creator Settings</h3>

              <FormField
                control={form.control}
                name="isCreator"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Creator Status</FormLabel>
                      <FormDescription>Enable creator features and showcase your expertise.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("isCreator") && (
                <FormField
                  control={form.control}
                  name="creatorLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creator Level</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your creator level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="explorer">Local Explorer</SelectItem>
                          <SelectItem value="hunter">Hidden Gem Hunter</SelectItem>
                          <SelectItem value="authority">Local Authority</SelectItem>
                          <SelectItem value="expert">Destination Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Select the creator level that best describes your expertise.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
