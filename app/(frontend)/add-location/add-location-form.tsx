/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AlertTriangle, Building, Camera, CheckCircle2,Clock, Compass, ExternalLink, Globe, ImageIcon, Info, Link2, Loader2, MapPin, Plus, Save, Settings, Tag, Trash2, Upload, Users, X } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { createLocation, type LocationFormData, type DayOfWeek } from "@/app/actions"
import { getCategories } from "@/app/actions"

interface UserData {
  id: string
  name?: string
  email: string
}

export default function AddLocationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const slugInputRef = useRef<HTMLInputElement>(null)
  
  // State for categories and user data
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [user, setUser] = useState<UserData | null>(null)
  const [formProgress, setFormProgress] = useState(0)
  
  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [showSlugInfo, setShowSlugInfo] = useState(false)

  // Form state
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formSubmitType, setFormSubmitType] = useState<"publish" | "draft">("publish")
  const [slugEdited, setSlugEdited] = useState(false)

  // Basic info
  const [locationName, setLocationName] = useState("")
  const [locationSlug, setLocationSlug] = useState("")
  const [locationCategory, setLocationCategory] = useState("")
  const [locationDescription, setLocationDescription] = useState("")
  const [shortDescription, setShortDescription] = useState("")

  // Media
  const [locationImage, setLocationImage] = useState<string | null>(null)
  const [gallery, setGallery] = useState<{ image: string; caption?: string }[]>([])

  // Tags
  const [tags, setTags] = useState<{ tag: string }[]>([])
  const [newTag, setNewTag] = useState("")

  // Address
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "USA",
    neighborhood: "",
  })

  // Contact & Business
  const [contactInfo, setContactInfo] = useState({
    phone: "",
    email: "",
    website: "",
    socialMedia: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
    },
  })

  // Business hours
  const [businessHours, setBusinessHours] = useState<
    Array<{
      day: DayOfWeek
      open?: string
      close?: string
      closed?: boolean
    }>
  >([
    { day: "Monday", open: "09:00", close: "17:00", closed: false },
    { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
    { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
    { day: "Thursday", open: "09:00", close: "17:00", closed: false },
    { day: "Friday", open: "09:00", close: "17:00", closed: false },
    { day: "Saturday", open: "10:00", close: "15:00", closed: false },
    { day: "Sunday", open: "", close: "", closed: true },
  ])

  // Price range
  const [priceRange, setPriceRange] = useState<string>("")

  // Visitor info
  const [bestTimeToVisit, setBestTimeToVisit] = useState<{ season: string }[]>([])
  const [newSeason, setNewSeason] = useState("")
  const [insiderTips, setInsiderTips] = useState("")

  // Accessibility
  const [accessibility, setAccessibility] = useState({
    wheelchairAccess: false,
    parking: false,
    other: "",
  })

  // Status
  const [status, setStatus] = useState<"draft" | "review" | "published" | "archived">("draft")
  const [isFeatured, setIsFeatured] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  // Partnership
  const [hasPartnership, setHasPartnership] = useState(false)
  const [partnershipDetails, setPartnershipDetails] = useState({
    partnerName: "",
    partnerContact: "",
    details: "",
  })

  // SEO
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    keywords: "",
  })

  // Fetch categories and user data on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await getCategories()
        setCategories(result.docs.map((doc: any) => ({ id: doc.id, name: doc.name })))
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again later.",
          variant: "destructive",
        })
      }
    }

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        if (!res.ok) {
          throw new Error("Failed to fetch user data")
        }
        
        const { user } = await res.json()
        setUser(user)
      } catch (error) {
        console.error("Error fetching user:", error)
        toast({
          title: "Authentication Error",
          description: "Please log in to add a location.",
          variant: "destructive",
        })
        router.push("/login")
      }
    }

    fetchCategories()
    fetchUser()
  }, [toast, router])

  // Calculate form progress
  useEffect(() => {
    // Calculate form completion progress
    let completedFields = 0
    let totalFields = 0

    // Basic info (5 fields)
    totalFields += 5
    if (locationName) completedFields++
    if (locationSlug) completedFields++
    if (locationCategory) completedFields++
    if (shortDescription) completedFields++
    if (locationDescription) completedFields++

    // Media (2 fields)
    totalFields += 2
    if (locationImage) completedFields++
    if (gallery.length > 0) completedFields++

    // Location (5 fields)
    totalFields += 5
    if (address.street) completedFields++
    if (address.city) completedFields++
    if (address.state) completedFields++
    if (address.zip) completedFields++
    if (address.country) completedFields++

    // Contact (3 fields)
    totalFields += 3
    if (contactInfo.phone || contactInfo.email) completedFields++
    if (contactInfo.website) completedFields++
    if (Object.values(contactInfo.socialMedia).some(val => val)) completedFields++

    // Calculate percentage
    const progress = Math.round((completedFields / totalFields) * 100)
    setFormProgress(progress)
  }, [
    locationName, locationSlug, locationCategory, shortDescription, locationDescription,
    locationImage, gallery, address, contactInfo
  ])

  // Handle slug generation and validation
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .trim()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setLocationName(name)
    
    // Auto-generate slug if user hasn't manually edited it
    if (!slugEdited) {
      setLocationSlug(generateSlug(name))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawSlug = e.target.value
    const formattedSlug = generateSlug(rawSlug)
    setLocationSlug(formattedSlug)
    setSlugEdited(true)
    
    // Clear slug error if it's valid now
    if (formErrors.slug && formattedSlug) {
      const newErrors = { ...formErrors }
      delete newErrors.slug
      setFormErrors(newErrors)
    }
  }

  const handleSlugFocus = () => {
    setShowSlugInfo(true)
  }

  const handleSlugBlur = () => {
    setShowSlugInfo(false)
  }

  // Reset form
  const resetForm = () => {
    // Basic info
    setLocationName("")
    setLocationSlug("")
    setLocationCategory("")
    setLocationDescription("")
    setShortDescription("")
    setSlugEdited(false)

    // Media
    setLocationImage(null)
    setGallery([])

    // Tags
    setTags([])
    setNewTag("")

    // Address
    setAddress({
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "USA",
      neighborhood: "",
    })

    // Contact & Business
    setContactInfo({
      phone: "",
      email: "",
      website: "",
      socialMedia: {
        facebook: "",
        twitter: "",
        instagram: "",
        linkedin: "",
      },
    })

    // Business hours
    setBusinessHours([
      { day: "Monday", open: "09:00", close: "17:00", closed: false },
      { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
      { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
      { day: "Thursday", open: "09:00", close: "17:00", closed: false },
      { day: "Friday", open: "09:00", close: "17:00", closed: false },
      { day: "Saturday", open: "10:00", close: "15:00", closed: false },
      { day: "Sunday", open: "", close: "", closed: true },
    ])

    // Price range
    setPriceRange("")

    // Visitor info
    setBestTimeToVisit([])
    setNewSeason("")
    setInsiderTips("")

    // Accessibility
    setAccessibility({
      wheelchairAccess: false,
      parking: false,
      other: "",
    })

    // Status
    setStatus("draft")
    setIsFeatured(false)
    setIsVerified(false)

    // Partnership
    setHasPartnership(false)
    setPartnershipDetails({
      partnerName: "",
      partnerContact: "",
      details: "",
    })

    // SEO
    setMeta({
      title: "",
      description: "",
      keywords: "",
    })

    // Reset form state
    setFormErrors({})
    setActiveTab("basic")

    toast({
      title: "Form Reset",
      description: "The form has been reset successfully.",
    })
  }

  // Image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setLocationImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setGallery([...gallery, { image: event.target?.result as string }])
      }
      reader.readAsDataURL(file)
    }
  }

  const removeGalleryImage = (index: number) => {
    setGallery(gallery.filter((_, i) => i !== index))
  }

  const updateGalleryCaption = (index: number, caption: string) => {
    const updatedGallery = [...gallery]
    updatedGallery[index].caption = caption
    setGallery(updatedGallery)
  }

  // Tag handling
  const addTag = () => {
    if (newTag.trim()) {
      setTags([...tags, { tag: newTag.trim() }])
      setNewTag("")
    }
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  // Season handling
  const addSeason = () => {
    if (newSeason.trim()) {
      setBestTimeToVisit([...bestTimeToVisit, { season: newSeason.trim() }])
      setNewSeason("")
    }
  }

  const removeSeason = (index: number) => {
    setBestTimeToVisit(bestTimeToVisit.filter((_, i) => i !== index))
  }

  // Business hours handling
  const updateBusinessHour = (index: number, field: "open" | "close" | "closed", value: string | boolean) => {
    const updatedHours = [...businessHours]
    if (field === "closed") {
      updatedHours[index].closed = value as boolean
      if (value === true) {
        updatedHours[index].open = ""
        updatedHours[index].close = ""
      }
    } else {
      updatedHours[index][field] = value as string
    }
    setBusinessHours(updatedHours)
  }

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!locationName) errors.name = "Location name is required"
    if (!locationSlug) errors.slug = "URL slug is required"
    if (!locationDescription) errors.description = "Description is required"

    if (!address.street) errors.street = "Street address is required"
    if (!address.city) errors.city = "City is required"
    if (!address.state) errors.state = "State is required"
    if (!address.zip) errors.zip = "ZIP code is required"
    if (!address.country) errors.country = "Country is required"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Form submission
  const prepareSubmission = (saveAsDraft = false) => {
    if (!validateForm() && !saveAsDraft) {
      // Find the first tab with an error and switch to it
      if (formErrors.name || formErrors.slug || formErrors.description) {
        setActiveTab("basic")
      } else if (formErrors.street || formErrors.city || formErrors.state || formErrors.zip || formErrors.country) {
        setActiveTab("location")
      }

      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      })

      return
    }

    setFormSubmitType(saveAsDraft ? "draft" : "publish")
    setShowConfirmDialog(true)
  }

  const handleSubmit = async (saveAsDraft = false) => {
    setIsSubmitting(true)
    setShowConfirmDialog(false)

    try {
      const formData: LocationFormData = {
        // Basic
        name: locationName,
        slug: locationSlug,
        description: locationDescription || "",
        shortDescription: shortDescription || undefined,

        // Media
        featuredImage: locationImage || undefined,
        gallery: gallery.length > 0 ? gallery : undefined,

        // Taxonomy
        categories: locationCategory ? [locationCategory] : undefined,
        tags: tags.length > 0 ? tags : undefined,

        // Address
        address: {
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country,
        },
        neighborhood: address.neighborhood || undefined,

        // Contact & Business
        contactInfo: {
          phone: contactInfo.phone || undefined,
          email: contactInfo.email || undefined,
          website: contactInfo.website || undefined,
          socialMedia: {
            facebook: contactInfo.socialMedia.facebook || undefined,
            twitter: contactInfo.socialMedia.twitter || undefined,
            instagram: contactInfo.socialMedia.instagram || undefined,
            linkedin: contactInfo.socialMedia.linkedin || undefined,
          },
        },

        businessHours: businessHours,
        priceRange: ["free", "budget", "moderate", "expensive", "luxury"].includes(priceRange || "")
          ? (priceRange as "free" | "budget" | "moderate" | "expensive" | "luxury")
          : undefined,

        // Visitor Info
        bestTimeToVisit: bestTimeToVisit.length > 0 ? bestTimeToVisit : undefined,
        insiderTips: insiderTips || undefined,

        accessibility: {
          wheelchairAccess: accessibility.wheelchairAccess || undefined,
          parking: accessibility.parking || undefined,
          other: accessibility.other || undefined,
        },

        // Status
        status: saveAsDraft ? "draft" : status,
        isFeatured: isFeatured || undefined,
        isVerified: isVerified || undefined,

        // Monetization
        hasBusinessPartnership: hasPartnership || undefined,
        partnershipDetails: hasPartnership
          ? {
              partnerName: partnershipDetails.partnerName || undefined,
              partnerContact: partnershipDetails.partnerContact || undefined,
              details: partnershipDetails.details || undefined,
            }
          : undefined,

        // SEO & Metadata
        meta: {
          title: meta.title || undefined,
          description: meta.description || undefined,
          keywords: meta.keywords || undefined,
        },
        createdBy: user?.id,
      }

      const newLoc = await createLocation(formData)
      console.log("Location created successfully:", newLoc)

      // Show success dialog
      setShowSuccessDialog(true)

      // Show success toast
      toast({
        title: "Location Added",
        description: `${locationName} has been successfully ${saveAsDraft ? "saved as draft" : "published"}.`,
      })
    } catch (error) {
      console.error("Error creating location:", error)

      // Handle validation errors
      if (error instanceof Error) {
        const errorMessage = error.message

        // Check for specific field errors
        if (errorMessage.includes("Description")) {
          setFormErrors({
            ...formErrors,
            description: "Description field is invalid. Please check the requirements.",
          })
          setActiveTab("basic")

          toast({
            title: "Validation Error",
            description: "The description field is invalid. Please check the requirements.",
            variant: "destructive",
          })
        } else {
          // Generic error handling
          toast({
            title: "Error",
            description: `Failed to create location: ${errorMessage}`,
            variant: "destructive",
          })
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Form progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Add New Location</h1>
          <Badge variant={formProgress >= 75 ? "default" : formProgress >= 50 ? "secondary" : "outline"}>
            {formProgress}% Complete
          </Badge>
        </div>
        <Progress value={formProgress} className="h-2" />
      </div>

      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#FF6B6B]/10 to-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Location Details</CardTitle>
              <CardDescription>Share a location with the community</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-gray-500 hover:text-[#FF6B6B]"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Reset Form</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all form fields</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            prepareSubmission(false)
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 border-b overflow-x-auto">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="hidden md:inline">Basic Info</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden md:inline">Media</span>
                </TabsTrigger>
                <TabsTrigger value="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden md:inline">Location</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden md:inline">Contact</span>
                </TabsTrigger>
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="hidden md:inline">Details</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">Settings</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="location-name" className="text-base font-medium flex items-center">
                      Location Name <span className="text-red-500 ml-1">*</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The name of your location as it will appear to users</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="location-name"
                      value={locationName}
                      onChange={handleNameChange}
                      placeholder="Enter location name"
                      className={`h-12 text-base ${formErrors.name ? "border-red-500" : ""}`}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-slug" className="text-base font-medium flex items-center">
                      URL Slug <span className="text-red-500 ml-1">*</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The URL-friendly version of the name</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">/locations/</span>
                      </div>
                      <Input
                        id="location-slug"
                        ref={slugInputRef}
                        value={locationSlug}
                        onChange={handleSlugChange}
                        onFocus={handleSlugFocus}
                        onBlur={handleSlugBlur}
                        placeholder="url-friendly-slug"
                        className={`h-12 text-base pl-[5.5rem] ${formErrors.slug ? "border-red-500" : ""}`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Link2 className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    {formErrors.slug && <p className="text-red-500 text-sm">{formErrors.slug}</p>}
                    
                    {showSlugInfo && (
                      <Alert className="bg-blue-50 text-blue-800 border-blue-200 mt-2">
                        <AlertDescription className="flex items-start">
                          <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>
                            URL slugs must be lowercase, contain only letters, numbers, and hyphens. 
                            Spaces will be converted to hyphens automatically.
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {locationSlug && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        <span>Will be accessible at: <span className="font-medium">yourdomain.com/locations/{locationSlug}</span></span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-category" className="text-base font-medium">
                      Category
                    </Label>
                    <Select value={locationCategory} onValueChange={setLocationCategory}>
                      <SelectTrigger id="location-category" className="h-12 text-base">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="short-description" className="text-base font-medium">
                        Short Description
                      </Label>
                      <span className="text-xs text-muted-foreground">{shortDescription.length}/100</span>
                    </div>
                    <Input
                      id="short-description"
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="Brief summary of this location"
                      maxLength={100}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-description" className="text-base font-medium flex items-center">
                      Full Description <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className={`${formErrors.description ? "border-red-500 rounded-md" : ""}`}>
                      <Textarea
                        id="location-description"
                        placeholder="Write a detailed description of the location"
                        className="min-h-[150px] p-4 text-base"
                        onChange={(e) => setLocationDescription(e.target.value)}
                        value={locationDescription}
                      />
                    </div>
                    {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag, index) => (
                        <div key={index} className="flex items-center bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-full px-3 py-1.5">
                          <span className="text-sm">{tag.tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="ml-2 text-[#FF6B6B]/70 hover:text-[#FF6B6B]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag"
                        className="flex-1 h-12 text-base"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addTag()
                          }
                        }}
                      />
                      <Button type="button" onClick={addTag} size="sm" variant="secondary" className="h-12 px-4">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Featured Image</Label>

                    {!locationImage ? (
                      <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
                        <div className="bg-[#FF6B6B]/10 rounded-full p-3 mb-3">
                          <ImageIcon className="h-8 w-8 text-[#FF6B6B]" />
                        </div>
                        <p className="text-base text-muted-foreground text-center mb-2">
                          Drag and drop an image, or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                          Recommended size: 1200 x 800 pixels (Max: 5MB)
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="location-image-upload"
                          onChange={handleImageUpload}
                        />
                        <label htmlFor="location-image-upload">
                          <Button variant="outline" size="lg" className="cursor-pointer" type="button">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </Button>
                        </label>
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden h-[300px] border">
                        <Image
                          src={locationImage || "/placeholder.svg"}
                          alt="Location preview"
                          className="w-full h-full object-cover"
                          fill
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white/90 hover:bg-white"
                              onClick={() => setLocationImage(null)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                            <label htmlFor="location-image-upload">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white/90 hover:bg-white cursor-pointer"
                                type="button"
                              >
                                <Camera className="h-4 w-4 mr-1" />
                                Change
                              </Button>
                            </label>
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="location-image-upload"
                              onChange={handleImageUpload}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Gallery Images</Label>
                      <Badge variant="outline" className="font-normal">
                        {gallery.length} images
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gallery.map((item, index) => (
                        <Card key={index} className="overflow-hidden border">
                          <div className="relative h-[150px]">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={`Gallery image ${index + 1}`}
                              className="object-cover"
                              fill
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white/90 hover:bg-white"
                                onClick={() => removeGalleryImage(index)}
                                type="button"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <Input
                              placeholder="Add caption"
                              value={item.caption || ""}
                              onChange={(e) => updateGalleryCaption(index, e.target.value)}
                              className="text-sm"
                            />
                          </CardContent>
                        </Card>
                      ))}

                      <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center justify-center h-[220px] bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer">
                        <div className="bg-[#FF6B6B]/10 rounded-full p-2 mb-3">
                          <Plus className="h-6 w-6 text-[#FF6B6B]" />
                        </div>
                        <p className="text-base text-muted-foreground text-center mb-2">Add to gallery</p>
                        <p className="text-sm text-muted-foreground text-center mb-4">Max file size: 5MB</p>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="gallery-image-upload"
                          onChange={handleGalleryImageUpload}
                        />
                        <label htmlFor="gallery-image-upload">
                          <Button variant="outline" size="sm" className="cursor-pointer" type="button">
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Image
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="location-address" className="text-base font-medium flex items-center">
                      Street Address <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="location-address"
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        placeholder="Enter address"
                        className={`h-12 text-base ${formErrors.street ? "border-red-500" : ""}`}
                      />
                      <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#FF6B6B]" />
                      {formErrors.street && <p className="text-red-500 text-sm">{formErrors.street}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-neighborhood" className="text-base font-medium">
                      Neighborhood
                    </Label>
                    <Input
                      id="location-neighborhood"
                      value={address.neighborhood}
                      onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                      placeholder="e.g., Downtown, West Side"
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location-city" className="text-base font-medium flex items-center">
                        City <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="location-city"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        placeholder="City"
                        className={`h-12 text-base ${formErrors.city ? "border-red-500" : ""}`}
                      />
                      {formErrors.city && <p className="text-red-500 text-sm">{formErrors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-state" className="text-base font-medium flex items-center">
                        State/Province <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="location-state"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        placeholder="State"
                        className={`h-12 text-base ${formErrors.state ? "border-red-500" : ""}`}
                      />
                      {formErrors.state && <p className="text-red-500 text-sm">{formErrors.state}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-zip" className="text-base font-medium flex items-center">
                        ZIP/Postal Code <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="location-zip"
                        value={address.zip}
                        onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                        placeholder="ZIP Code"
                        className={`h-12 text-base ${formErrors.zip ? "border-red-500" : ""}`}
                      />
                      {formErrors.zip && <p className="text-red-500 text-sm">{formErrors.zip}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-country" className="text-base font-medium flex items-center">
                        Country <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="location-country"
                        value={address.country}
                        onChange={(e) => setAddress({ ...address, country: e.target.value })}
                        placeholder="Country"
                        className={`h-12 text-base ${formErrors.country ? "border-red-500" : ""}`}
                      />
                      {formErrors.country && <p className="text-red-500 text-sm">{formErrors.country}</p>}
                    </div>
                  </div>

                  <div className="mt-4 bg-muted/10 p-4 rounded-lg border border-dashed">
                    <div className="flex items-center mb-3">
                      <Compass className="h-5 w-5 text-[#FF6B6B] mr-2" />
                      <Label className="text-base font-medium">Map Preview</Label>
                    </div>
                    <div className="h-[300px] rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="h-8 w-8 text-[#FF6B6B]/50 mx-auto mb-2" />
                        <p className="text-muted-foreground">Map will be displayed after address is geocoded</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          The exact location will be determined automatically using geocoding.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Contact & Hours Tab */}
            <TabsContent value="contact" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center mb-2">
                    <Users className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Contact Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location-phone" className="text-base font-medium">
                        Phone Number
                      </Label>
                      <Input
                        id="location-phone"
                        type="tel"
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                        placeholder="Enter phone number"
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-email" className="text-base font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="location-email"
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                        placeholder="Enter email address"
                        className="h-12 text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-website" className="text-base font-medium">
                      Website
                    </Label>
                    <Input
                      id="location-website"
                      type="url"
                      value={contactInfo.website}
                      onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })}
                      placeholder="https://"
                      className="h-12 text-base"
                    />
                  </div>

                  <Separator />

                  <Accordion type="single" collapsible defaultValue="social-media">
                    <AccordionItem value="social-media">
                      <AccordionTrigger className="text-base font-medium">
                        <div className="flex items-center">
                          <Globe className="h-5 w-5 text-[#FF6B6B] mr-2" />
                          Social Media
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="location-facebook" className="text-base font-medium">
                              Facebook
                            </Label>
                            <Input
                              id="location-facebook"
                              value={contactInfo.socialMedia.facebook}
                              onChange={(e) =>
                                setContactInfo({
                                  ...contactInfo,
                                  socialMedia: { ...contactInfo.socialMedia, facebook: e.target.value },
                                })
                              }
                              placeholder="Facebook URL or username"
                              className="h-12 text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location-twitter" className="text-base font-medium">
                              Twitter
                            </Label>
                            <Input
                              id="location-twitter"
                              value={contactInfo.socialMedia.twitter}
                              onChange={(e) =>
                                setContactInfo({
                                  ...contactInfo,
                                  socialMedia: { ...contactInfo.socialMedia, twitter: e.target.value },
                                })
                              }
                              placeholder="Twitter URL or username"
                              className="h-12 text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location-instagram" className="text-base font-medium">
                              Instagram
                            </Label>
                            <Input
                              id="location-instagram"
                              value={contactInfo.socialMedia.instagram}
                              onChange={(e) =>
                                setContactInfo({
                                  ...contactInfo,
                                  socialMedia: { ...contactInfo.socialMedia, instagram: e.target.value },
                                })
                              }
                              placeholder="Instagram URL or username"
                              className="h-12 text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location-linkedin" className="text-base font-medium">
                              LinkedIn
                            </Label>
                            <Input
                              id="location-linkedin"
                              value={contactInfo.socialMedia.linkedin}
                              onChange={(e) =>
                                setContactInfo({
                                  ...contactInfo,
                                  socialMedia: { ...contactInfo.socialMedia, linkedin: e.target.value },
                                })
                              }
                              placeholder="LinkedIn URL"
                              className="h-12 text-base"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Separator />

                  <div className="flex items-center mb-2">
                    <Clock className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Business Hours</h3>
                  </div>
                  <div className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                    {businessHours.map((hours, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <Label className="font-medium">{hours.day}</Label>
                        </div>
                        <div className="col-span-3 flex items-center">
                          <Checkbox
                            id={`closed-${hours.day}`}
                            checked={hours.closed}
                            onCheckedChange={(checked) => updateBusinessHour(index, "closed", !!checked)}
                            className="mr-2"
                          />
                          <Label htmlFor={`closed-${hours.day}`} className="text-sm">
                            Closed
                          </Label>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="time"
                            value={hours.open || ""}
                            onChange={(e) => updateBusinessHour(index, "open", e.target.value)}
                            disabled={hours.closed}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="time"
                            value={hours.close || ""}
                            onChange={(e) => updateBusinessHour(index, "close", e.target.value)}
                            disabled={hours.closed}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="location-price-range" className="text-base font-medium">
                      Price Range
                    </Label>
                    <Select value={priceRange} onValueChange={setPriceRange}>
                      <SelectTrigger id="location-price-range" className="h-12 text-base">
                        <SelectValue placeholder="Select price range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="budget">Budget ($)</SelectItem>
                        <SelectItem value="moderate">Moderate ($$)</SelectItem>
                        <SelectItem value="expensive">Expensive ($$$)</SelectItem>
                        <SelectItem value="luxury">Luxury ($$$$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center mb-2">
                    <Tag className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Visitor Information</h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium block mb-2">Best Time to Visit</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {bestTimeToVisit.map((item, index) => (
                        <div key={index} className="flex items-center bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-full px-3 py-1.5">
                          <span className="text-sm">{item.season}</span>
                          <button
                            type="button"
                            onClick={() => removeSeason(index)}
                            className="ml-2 text-[#FF6B6B]/70 hover:text-[#FF6B6B]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newSeason}
                        onChange={(e) => setNewSeason(e.target.value)}
                        placeholder="e.g., Summer, Weekday mornings"
                        className="flex-1 h-12 text-base"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addSeason()
                          }
                        }}
                      />
                      <Button type="button" onClick={addSeason} size="sm" variant="secondary" className="h-12 px-4">
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-insider-tips" className="text-base font-medium">
                      Insider Tips
                    </Label>
                    <Textarea
                      id="location-insider-tips"
                      value={insiderTips}
                      onChange={(e) => setInsiderTips(e.target.value)}
                      placeholder="Share insider knowledge about this location"
                      className="min-h-[120px] text-base"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center mb-2">
                    <Settings className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Accessibility</h3>
                  </div>
                  <div className="space-y-3 bg-muted/10 p-4 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wheelchair-access"
                        checked={accessibility.wheelchairAccess}
                        onCheckedChange={(checked) =>
                          setAccessibility({ ...accessibility, wheelchairAccess: !!checked })
                        }
                      />
                      <Label htmlFor="wheelchair-access" className="text-base">Wheelchair Accessible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="parking-available"
                        checked={accessibility.parking}
                        onCheckedChange={(checked) => setAccessibility({ ...accessibility, parking: !!checked })}
                      />
                      <Label htmlFor="parking-available" className="text-base">Parking Available</Label>
                    </div>
                    <div className="mt-3">
                      <Label htmlFor="accessibility-other" className="text-base font-medium">
                        Other Accessibility Features
                      </Label>
                      <Input
                        id="accessibility-other"
                        value={accessibility.other}
                        onChange={(e) => setAccessibility({ ...accessibility, other: e.target.value })}
                        placeholder="e.g., Braille menus, hearing loop"
                        className="mt-1 h-12 text-base"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="p-0">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center mb-2">
                    <Settings className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Status & Visibility</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-status" className="text-base font-medium">
                      Publication Status
                    </Label>
                    <Select
                      value={status}
                      onValueChange={(value) => setStatus(value as "draft" | "review" | "published" | "archived")}
                    >
                      <SelectTrigger id="location-status" className="h-12 text-base">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="review">Under Review</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="location-featured"
                      checked={isFeatured}
                      onCheckedChange={(checked) => setIsFeatured(!!checked)}
                    />
                    <Label htmlFor="location-featured" className="text-base">Feature this location</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="location-verified"
                      checked={isVerified}
                      onCheckedChange={(checked) => setIsVerified(!!checked)}
                    />
                    <Label htmlFor="location-verified" className="text-base">Mark as verified location</Label>
                  </div>

                  <Separator />

                  <div className="flex items-center mb-2">
                    <Users className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Business Partnership</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-partnership"
                        checked={hasPartnership}
                        onCheckedChange={(checked) => setHasPartnership(!!checked)}
                      />
                      <Label htmlFor="has-partnership" className="text-base">This location has a business partnership</Label>
                    </div>

                    {hasPartnership && (
                      <div className="space-y-3 bg-muted/10 p-4 rounded-lg border mt-2">
                        <div className="space-y-2">
                          <Label htmlFor="partner-name" className="text-base font-medium">
                            Partner Name
                          </Label>
                          <Input
                            id="partner-name"
                            value={partnershipDetails.partnerName}
                            onChange={(e) =>
                              setPartnershipDetails({
                                ...partnershipDetails,
                                partnerName: e.target.value,
                              })
                            }
                            placeholder="Business partner name"
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="partner-contact" className="text-base font-medium">
                            Partner Contact
                          </Label>
                          <Input
                            id="partner-contact"
                            value={partnershipDetails.partnerContact}
                            onChange={(e) =>
                              setPartnershipDetails({
                                ...partnershipDetails,
                                partnerContact: e.target.value,
                              })
                            }
                            placeholder="Contact information"
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="partnership-details" className="text-base font-medium">
                            Partnership Details
                          </Label>
                          <Textarea
                            id="partnership-details"
                            value={partnershipDetails.details}
                            onChange={(e) =>
                              setPartnershipDetails({
                                ...partnershipDetails,
                                details: e.target.value,
                              })
                            }
                            placeholder="Describe the partnership details"
                            className="min-h-[120px] text-base"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center mb-2">
                    <Globe className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">SEO & Metadata</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="meta-title" className="text-base font-medium">
                        Meta Title
                      </Label>
                      <Input
                        id="meta-title"
                        value={meta.title}
                        onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                        placeholder="SEO title (if different from location name)"
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta-description" className="text-base font-medium">
                        Meta Description
                      </Label>
                      <Textarea
                        id="meta-description"
                        value={meta.description}
                        onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                        placeholder="SEO description"
                        className="min-h-[100px] text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta-keywords" className="text-base font-medium">
                        Keywords
                      </Label>
                      <Input
                        id="meta-keywords"
                        value={meta.keywords}
                        onChange={(e) => setMeta({ ...meta, keywords: e.target.value })}
                        placeholder="Comma-separated keywords"
                        className="h-12 text-base"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>

          <CardFooter className="p-6 flex flex-col sm:flex-row gap-3 border-t bg-muted/5">
            <Button
              type="submit"
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 transition-all duration-300 h-12 text-base font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Add Location
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5 h-12 text-base font-medium"
              onClick={(e) => {
                e.preventDefault()
                prepareSubmission(true)
              }}
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-5 w-5" />
              Save as Draft
            </Button>
            <div className="flex-1 flex justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-12 text-base font-medium text-gray-500"
                      onClick={() => setResetDialogOpen(true)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      <span className="hidden sm:inline">Reset Form</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all form fields</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {formSubmitType === "draft" ? "save this location as a draft" : "publish this location"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(formSubmitType === "draft")}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            >
              {formSubmitType === "draft" ? "Save as Draft" : "Publish Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Location Added Successfully
            </DialogTitle>
            <DialogDescription>
              Your location has been {formSubmitType === "draft" ? "saved as a draft" : "published"} successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false)
                resetForm()
              }}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            >
              Add Another Location
            </Button>
            <Button variant="outline" onClick={() => router.push("/map")}>
              View All Locations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Reset Form
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all form fields. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetForm} className="bg-red-500 hover:bg-red-600 text-white">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
