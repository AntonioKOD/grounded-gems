"use client"

import type React from "react"

import { useEffect, useState, useRef, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Building,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  ImageIcon,
  Info,
  Link2,
  Loader2,
  MapPin,
  Plus,
  Save,
  Settings,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { createLocation, type LocationFormData, type DayOfWeek } from "@/app/actions"
import { getCategories } from "@/app/actions"
import { HierarchicalCategorySelector } from "@/components/ui/hierarchical-category-selector"
import PrivateAccessSelector from "@/components/location/private-access-selector"

interface UserData {
  id: string
  name?: string
  email: string
}

export default function AddLocationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const slugInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryFileInputRef = useRef<HTMLInputElement>(null)

  // State for categories and user data
  const [categories, setCategories] = useState<{
    id: string
    name: string
    slug: string
    description?: string
    source: 'manual' | 'foursquare' | 'imported'
    foursquareIcon?: {
      prefix: string
      suffix: string
    }
    subcategories?: any[]
    parent?: string
  }[]>([])
  const {user, isLoading} = useAuth()
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
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{ isDuplicate: boolean; message?: string; existingLocation?: any } | null>(null)

  // Basic info
  const [locationName, setLocationName] = useState("")
  const [locationSlug, setLocationSlug] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [locationDescription, setLocationDescription] = useState("")
  const [shortDescription, setShortDescription] = useState("")

  // Media
  const [locationImage, setLocationImage] = useState<string | null>(null)
  const [gallery, setGallery] = useState<{ image: string; caption?: string; tempId?: string }[]>([])

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

  // Status (always set to review for verification)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  // Partnership
  const [hasPartnership, setHasPartnership] = useState(false)
  const [partnershipDetails, setPartnershipDetails] = useState({
    partnerName: "",
    partnerContact: "",
    details: "",
  })

  // Privacy settings
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')
  const [privateAccess, setPrivateAccess] = useState<string[]>([])

  // SEO
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    keywords: "",
  })

  // Auto-populate SEO metadata from title and description
  useEffect(() => {
    if (locationName && !meta.title) {
      setMeta(prev => ({ ...prev, title: locationName }))
    }
  }, [locationName, meta.title])

  useEffect(() => {
    if (shortDescription && !meta.description) {
      setMeta(prev => ({ ...prev, description: shortDescription }))
    } else if (locationDescription && !meta.description && !shortDescription) {
      // Use first 160 characters of description for SEO
      const seoDescription = locationDescription.replace(/<[^>]*>/g, '').substring(0, 160)
      setMeta(prev => ({ ...prev, description: seoDescription }))
    }
  }, [locationDescription, shortDescription, meta.description])

  // Add these state variables near the other state declarations
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  // Add these state variables for better image handling
  const [locationImagePreview, setLocationImagePreview] = useState<string | null>(null)

  // Fetch categories and user data on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await getCategories()
        
        // Transform categories to include hierarchical structure
        const transformedCategories = result.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          description: doc.description,
          source: doc.source || 'manual',
          foursquareIcon: doc.foursquareIcon,
          parent: doc.parent?.id || doc.parent,
          subcategories: [] as any[]
        }))

        // Build hierarchical structure
        const categoryMap = new Map(transformedCategories.map(cat => [cat.id, cat]))
        const rootCategories: any[] = []

        transformedCategories.forEach(category => {
          if (category.parent) {
            const parent = categoryMap.get(category.parent)
            if (parent) {
              if (!parent.subcategories) parent.subcategories = []
              parent.subcategories.push(category)
            }
          } else {
            rootCategories.push(category)
          }
        })

        setCategories(rootCategories)
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again later.",
          variant: "destructive",
        })
      }
    }

    if(!user){
      router.push("/login?callbackUrl=/add-location")
    }

    fetchCategories()
  }, [toast, router, user])

  // Calculate form progress
  useEffect(() => {
    // Calculate form completion progress
    let completedFields = 0
    let totalFields = 0

    // Basic info (5 fields)
    totalFields += 5
    if (locationName) completedFields++
    if (locationSlug) completedFields++
    if (selectedCategories.length > 0) completedFields++
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
    if (Object.values(contactInfo.socialMedia).some((val) => val)) completedFields++

    // Calculate percentage
    const progress = Math.round((completedFields / totalFields) * 100)
    setFormProgress(progress)
  }, [
    locationName,
    locationSlug,
    selectedCategories,
    shortDescription,
    locationDescription,
    locationImage,
    gallery,
    address,
    contactInfo,
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
    setSelectedCategories([])
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

    // Status (always review for verification)
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

    // Privacy settings
    setPrivacy('public')
    setPrivateAccess([])

    // Reset form state
    setFormErrors({})
    setActiveTab("basic")

    toast({
      title: "Form Reset",
      description: "The form has been reset successfully.",
    })
  }

  // Trigger file input click programmatically
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Trigger gallery file input click programmatically
  const triggerGalleryFileInput = () => {
    if (galleryFileInputRef.current) {
      galleryFileInputRef.current.click()
    }
  }

  // Image handling
  // Replace the handleImageUpload function with this:
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    console.log("File input change event triggered")
    const file = e.target.files?.[0]
    if (!file) {
      console.log("No file selected")
      return
    }

    try {
      // Import HEIC utilities
      const { isValidImageFile, processImageFile, isHEICFile } = await import('@/lib/heic-converter')

      // Enhanced file validation including HEIC
      if (!isValidImageFile(file)) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file (including HEIC).",
          variant: "destructive",
        })
        return
      }

      // 1. Size guard
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "File too large",
          description: "Image must be less than 5 MB.",
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)
      setUploadError(null)

      // Show processing message for HEIC files
      if (isHEICFile(file)) {
        toast({
          title: "Processing HEIC file",
          description: "Converting HEIC to JPEG...",
        })
      }

      // Process file (convert HEIC if needed)
      const result = await processImageFile(file, { quality: 0.9, format: 'JPEG' })
      
      if (result.wasConverted) {
        toast({
          title: "HEIC converted successfully",
          description: `File size reduced by ${result.conversionInfo?.compressionRatio.toFixed(1)}%`,
        })
      }

      const processedFile = result.file

      // 2. Instant preview
      const reader = new FileReader()
      reader.onload = () => {
        console.log("File reader loaded")
        setLocationImagePreview(reader.result as string)
      }
      reader.readAsDataURL(processedFile)

      // 3. Build FormData for Payload's /api/media
      const formData = new FormData()
      formData.append("file", processedFile)
      // Optional: set alt text or other metadata fields
      formData.append("alt", locationName || "Location image")

      console.log("Uploading to /api/media")
      // 4. Send to Payload's media endpoint
      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
        credentials: 'include', // Required for authentication
      })

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
      }

      // 5. Extract the created document
      const { doc } = await res.json()
      console.log("Upload successful, doc:", doc)
      // doc.id is the new Media document's ID
      setLocationImage(doc.id)

      toast({
        title: "Upload successful",
        description: "Image has been saved to the media library.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("Upload error:", message)
      setUploadError(message)

      toast({
        title: "Upload failed",
        description: `Could not upload image: ${message}`,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Replace the handleGalleryImageUpload function with this:
  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Gallery file input change event triggered")
    const file = e.target.files?.[0]
    if (!file) {
      console.log("No gallery file selected")
      return
    }

    try {
      // Import HEIC utilities
      const { isValidImageFile, processImageFile, isHEICFile } = await import('@/lib/heic-converter')

      // Enhanced file validation including HEIC
      if (!isValidImageFile(file)) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file (including HEIC).",
          variant: "destructive",
        })
        return
      }

      // Client-side size check (max 5 MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)
      setUploadError(null)

      // Show processing message for HEIC files
      if (isHEICFile(file)) {
        toast({
          title: "Processing HEIC file",
          description: "Converting HEIC to JPEG...",
        })
      }

      // Process file (convert HEIC if needed)
      const result = await processImageFile(file, { quality: 0.9, format: 'JPEG' })
      
      if (result.wasConverted) {
        toast({
          title: "HEIC converted successfully",
          description: `File size reduced by ${result.conversionInfo?.compressionRatio.toFixed(1)}%`,
        })
      }

      const processedFile = result.file

      // Add a temporary placeholder to the gallery with a local object URL
      const tempId = Date.now().toString()
      const localPreviewUrl = URL.createObjectURL(processedFile)
      setGallery([...gallery, { image: localPreviewUrl, caption: "", tempId }])

      // Create FormData for Payload CMS upload
      const formData = new FormData()
      formData.append("file", processedFile)
      formData.append("alt", `Gallery image for ${locationName || "location"}`)

      console.log("Uploading gallery image to /api/media")
      // Upload to Payload CMS Media collection
      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
        credentials: 'include', // Required for authentication
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      // Get the media object from Payload
      const { doc } = await response.json()
      console.log("Gallery upload successful, doc:", doc)

      // Update the gallery with the actual media ID
      setGallery((prev) => {
        return prev.map((item) => {
          if (item.tempId === tempId) {
            // For Payload, we need to store the media ID
            return {
              image: doc.id, // Store the media ID for the relationship
              caption: item.caption || "",
              tempId: undefined,
            }
          }
          return item
        })
      })

      toast({
        title: "Upload successful",
        description: "Gallery image has been uploaded to media library",
      })
    } catch (error) {
      console.error("Gallery upload failed:", error)
      setUploadError((error as Error).message || "Failed to upload gallery image")

      // Remove the temporary image from gallery if it was added
      setGallery((prev) => prev.filter((item) => !item.tempId))

      toast({
        title: "Upload Failed",
        description: `Failed to upload gallery image: ${(error as Error).message}`,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeGalleryImage = (index: number) => {
    setGallery(gallery.filter((_, i) => i !== index))
  }

  const updateGalleryCaption = (index: number, caption: string) => {
    const updatedGallery = [...gallery]
    if (updatedGallery[index]) {
      updatedGallery[index].caption = caption
      setGallery(updatedGallery)
    }
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
    if (!updatedHours[index]) return
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

  // Check for duplicate locations
  const checkForDuplicates = async (name: string, fullAddress: string): Promise<{ isDuplicate: boolean; message?: string; existingLocation?: any }> => {
    try {
      setIsCheckingDuplicate(true)
      
      // Call API to check for duplicates
      const response = await fetch('/api/locations/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          address: fullAddress.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to check for duplicates')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      return { isDuplicate: false, message: 'Unable to check for duplicates' }
    } finally {
      setIsCheckingDuplicate(false)
    }
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

  // Form submission with duplicate checking
  const prepareSubmission = async (saveAsDraft = false) => {
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

    // Check for duplicates unless saving as draft
    if (!saveAsDraft) {
      const fullAddress = [address.street, address.city, address.state, address.zip, address.country]
        .filter(Boolean)
        .join(', ')

      const duplicateCheck = await checkForDuplicates(locationName, fullAddress)
      setDuplicateCheckResult(duplicateCheck)

      if (duplicateCheck.isDuplicate) {
        toast({
          title: "Potential Duplicate Found",
          description: duplicateCheck.message,
          variant: "destructive",
        })
        setActiveTab("basic") // Show the basic tab where the duplicate warning will appear
        return
      }
    }

    setFormSubmitType(saveAsDraft ? "draft" : "publish")
    setShowConfirmDialog(true)
  }

  // Update the handleSubmit function to properly format the data for Payload CMS
  // Find the handleSubmit function and update the formData preparation:

  const handleSubmit = async (saveAsDraft = false) => {
    setIsSubmitting(true)
    setShowConfirmDialog(false)

    try {
      const formData: LocationFormData = {
        // Basic
        name: locationName,
        slug: locationSlug || generateSlug(locationName),
        description: locationDescription || "",
        shortDescription: shortDescription || undefined,

        // Media - For Payload CMS, we need to pass the media IDs
        featuredImage: locationImage || undefined, // This should now be the media ID

        // For gallery, we need to ensure we're passing the correct format for Payload
        gallery:
          gallery.length > 0
            ? gallery.map((item) => ({
                image: item.image, // This should be the media ID
                caption: item.caption || undefined,
              }))
            : undefined,

        // Categories - now supports multiple categories
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
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

        // Status - always set to review for verification
        status: saveAsDraft ? "draft" : "review",
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
        
        // Privacy settings
        privacy: privacy,
        privateAccess: privacy === 'private' && privateAccess.length > 0 ? privateAccess : undefined,
        
        createdBy: user?.id,
      }

      // Call your createLocation function with the prepared data
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
      // Error handling remains the same
      console.error("Error creating location:", error)

      if (error instanceof Error) {
        const errorMessage = error.message

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
    <div className="max-w-4xl mx-auto pb-20 md:pb-12">
      {/* Mobile-optimized Form progress indicator */}
      <div className="mb-4 md:mb-6 px-4 md:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Add New Location</h1>
          <Badge variant={formProgress >= 75 ? "default" : formProgress >= 50 ? "secondary" : "outline"} className="text-sm font-medium">
            {formProgress}% Complete
          </Badge>
        </div>
        <Progress value={formProgress} className="h-3 md:h-2 rounded-full" />
        <p className="text-sm text-gray-600 mt-2 md:hidden">Fill out the required fields to complete your location</p>
      </div>

      <Card className="shadow-lg border-0 overflow-hidden mx-4 md:mx-0">
        <CardHeader className="bg-gradient-to-r from-[#FF6B6B]/10 to-white border-b px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-3 md:mb-0">
              <CardTitle className="text-xl md:text-2xl mb-1">Location Details</CardTitle>
              <CardDescription className="text-sm md:text-base">Share a location with the community</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-500 hover:text-[#FF6B6B] self-start md:self-auto h-10 px-3"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="text-sm">Reset</span>
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
          onSubmit={async (e) => {
            e.preventDefault()
            await prepareSubmission(false)
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile-optimized sticky tab navigation */}
            <div className="sticky top-0 z-10 bg-white px-4 md:px-6 pt-4 md:pt-6 border-b overflow-x-auto">
              <TabsList className="grid grid-cols-7 md:grid-cols-7 w-full min-w-[700px] md:min-w-0 h-auto p-1 mb-4">
                <TabsTrigger value="basic" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 h-12 md:h-10 text-xs md:text-sm px-2">
                  <Building className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Basic</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 h-12 md:h-10 text-xs md:text-sm px-2">
                  <ImageIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Media</span>
                </TabsTrigger>
                <TabsTrigger value="location" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 h-12 md:h-10 text-xs md:text-sm px-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Location</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 h-12 md:h-10 text-xs md:text-sm px-2">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Contact</span>
                </TabsTrigger>
                <TabsTrigger value="details" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 h-12 md:h-10 text-xs md:text-sm px-2">
                  <Tag className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Details</span>
                </TabsTrigger>
                <TabsTrigger value="privacy" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 h-12 md:h-10 text-xs md:text-sm px-2">
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Privacy</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 h-12 md:h-10 text-xs md:text-sm px-2">
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Settings</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="p-0">
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-6">
                <div className="space-y-6 md:space-y-5">
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
                      className={`h-14 md:h-12 text-base ${formErrors.name ? "border-red-500" : ""}`}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
                    
                    {/* Duplicate check indicator */}
                    {isCheckingDuplicate && (
                      <div className="flex items-center gap-2 text-blue-600 text-sm mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking for existing locations...
                      </div>
                    )}
                    
                    {/* Duplicate warning */}
                    {duplicateCheckResult?.isDuplicate && (
                      <Alert className="mt-3 border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          <div className="space-y-2">
                            <p className="font-medium">{duplicateCheckResult.message}</p>
                            {duplicateCheckResult.existingLocation && (
                              <div className="bg-orange-100 p-3 rounded-md">
                                <p className="font-medium text-sm">Existing location:</p>
                                <p className="text-sm">{duplicateCheckResult.existingLocation.name}</p>
                                <p className="text-xs text-orange-700">
                                  {duplicateCheckResult.existingLocation.address?.street}, {duplicateCheckResult.existingLocation.address?.city}
                                </p>
                                <Link 
                                  href={`/locations/${duplicateCheckResult.existingLocation.slug}`}
                                  className="text-xs text-orange-600 hover:text-orange-800 underline inline-flex items-center gap-1 mt-1"
                                  target="_blank"
                                >
                                  View existing location <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            )}
                            <div className="flex gap-2 mt-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDuplicateCheckResult(null)}
                                className="text-orange-600 border-orange-200 hover:bg-orange-100"
                              >
                                Continue Anyway
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setLocationName("")
                                  setDuplicateCheckResult(null)
                                }}
                                className="text-gray-600"
                              >
                                Clear Name
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
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
                        className={`h-14 md:h-12 text-base pl-[5.5rem] md:pl-[5.5rem] ${formErrors.slug ? "border-red-500" : ""}`}
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
                            URL slugs must be lowercase, contain only letters, numbers, and hyphens. Spaces will be
                            converted to hyphens automatically.
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}

                    {locationSlug && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        <span>
                          Will be accessible at:{" "}
                          <span className="font-medium">yourdomain.com/locations/{locationSlug}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      Categories (Select up to 3)
                    </Label>
                    <HierarchicalCategorySelector
                      categories={categories}
                      selectedCategories={selectedCategories}
                      onSelectionChange={setSelectedCategories}
                      maxSelections={3}
                      placeholder="Choose categories that best describe your location"
                      showSearch={true}
                      showBadges={true}
                      allowSubcategorySelection={true}
                    />
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
                      className="h-14 md:h-12 text-base"
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
                        className="min-h-[120px] md:min-h-[150px] p-4 text-base"
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
                        <div
                          key={index}
                          className="flex items-center bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-full px-3 py-1.5"
                        >
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
                        className="flex-1 h-14 md:h-12 text-base"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addTag()
                          }
                        }}
                      />
                      <Button type="button" onClick={addTag} size="sm" variant="secondary" className="h-14 md:h-12 px-4 min-w-[60px]">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="p-0">
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-6">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Featured Image</Label>

                    {!locationImage ? (
                      <div
                        className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 md:p-8 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer min-h-[200px] md:min-h-auto"
                        onClick={triggerFileInput}
                      >
                        <div className="bg-[#FF6B6B]/10 rounded-full p-3 mb-3">
                          <ImageIcon className="h-8 w-8 text-[#FF6B6B]" />
                        </div>
                        <p className="text-base text-muted-foreground text-center mb-2">
                          Drag and drop an image, or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                          Recommended size: 1200 x 800 pixels (Max: 5MB) • Supports HEIC
                        </p>
                        <input
                          type="file"
                          accept="image/*,.heic,.heif"
                          className="hidden"
                          id="location-image-upload"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                        <Button
                          variant="outline"
                          size="lg"
                          className="cursor-pointer h-12 md:h-10 px-6 text-base"
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
                        {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden h-[300px] border">
                        {locationImagePreview ? (
                          <Image
                            src={locationImagePreview || "/placeholder.svg"}
                            alt="Location preview"
                            className="w-full h-full object-cover"
                            fill
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gray-100">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                            <p className="ml-2 text-gray-600">Image uploaded successfully</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white/90 hover:bg-white"
                              onClick={() => {
                                setLocationImage(null)
                                setLocationImagePreview(null)
                              }}
                              type="button"
                              disabled={isUploading}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white/90 hover:bg-white cursor-pointer"
                              type="button"
                              disabled={isUploading}
                              onClick={triggerFileInput}
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4 mr-1" />
                              )}
                              Change
                            </Button>
                            <input
                              type="file"
                              accept="image/*,.heic,.heif"
                              className="hidden"
                              id="location-image-upload"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              disabled={isUploading}
                            />
                          </div>
                        </div>
                        {isUploading && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                            <div className="h-1 bg-gray-700 mt-1">
                              <div className="h-1 bg-white animate-pulse" />
                            </div>
                          </div>
                        )}
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
                            {item.tempId ? (
                              // Local preview for newly uploaded images
                              <Image
                                src={item.image || "/placeholder.svg"}
                                alt={`Gallery image ${index + 1}`}
                                className="object-cover"
                                fill
                              />
                            ) : (
                              // For already uploaded images, we'd need to fetch the URL from Payload
                              // This is a placeholder - you might need to adjust based on your Payload setup
                              <div className="flex items-center justify-center h-full bg-gray-100">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                <p className="ml-2 text-sm text-gray-600">Image uploaded</p>
                              </div>
                            )}
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

                      {/* Update the gallery upload button to show progress */}
                      <div
                        className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center justify-center h-[220px] bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={triggerGalleryFileInput}
                      >
                        <div className="bg-[#FF6B6B]/10 rounded-full p-2 mb-3">
                          <Plus className="h-6 w-6 text-[#FF6B6B]" />
                        </div>
                        <p className="text-base text-muted-foreground text-center mb-2">Add to gallery</p>
                        <p className="text-sm text-muted-foreground text-center mb-4">Max file size: 5MB</p>
                        <input
                          type="file"
                          accept="image/*,.heic,.heif"
                          className="hidden"
                          id="gallery-image-upload"
                          ref={galleryFileInputRef}
                          onChange={handleGalleryImageUpload}
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
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Uploading... {uploadProgress.toFixed(0)}%
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Upload Image
                            </>
                          )}
                        </Button>
                        {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="p-0">
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-6">
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
                        className={`h-14 md:h-12 text-base ${formErrors.street ? "border-red-500" : ""}`}
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
                      className="h-14 md:h-12 text-base"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location-city" className="text-base font-medium flex items-center">
                        City <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="location-city"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        placeholder="City"
                        className={`h-14 md:h-12 text-base ${formErrors.city ? "border-red-500" : ""}`}
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
                        className={`h-14 md:h-12 text-base ${formErrors.state ? "border-red-500" : ""}`}
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
                        className={`h-14 md:h-12 text-base ${formErrors.zip ? "border-red-500" : ""}`}
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
                        className={`h-14 md:h-12 text-base ${formErrors.country ? "border-red-500" : ""}`}
                      />
                      {formErrors.country && <p className="text-red-500 text-sm">{formErrors.country}</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Contact & Hours Tab */}
            <TabsContent value="contact" className="p-0">
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-6">
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
                        className="h-14 md:h-12 text-base"
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
                        className="h-14 md:h-12 text-base"
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
                      className="h-14 md:h-12 text-base"
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
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center mb-2">
                    <Tag className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Visitor Information</h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium block mb-2">Best Time to Visit</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {bestTimeToVisit.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-full px-3 py-1.5"
                        >
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
                        className="flex-1 h-14 md:h-12 text-base"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addSeason()
                          }
                        }}
                      />
                      <Button type="button" onClick={addSeason} size="sm" variant="secondary" className="h-14 md:h-12 px-4">
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
                      <Label htmlFor="wheelchair-access" className="text-base">
                        Wheelchair Accessible
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="parking-available"
                        checked={accessibility.parking}
                        onCheckedChange={(checked) => setAccessibility({ ...accessibility, parking: !!checked })}
                      />
                      <Label htmlFor="parking-available" className="text-base">
                        Parking Available
                      </Label>
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

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="p-0">
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center mb-2">
                    <Globe className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Privacy Settings</h3>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Control who can see this location. Private locations are only visible to selected friends.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Location Visibility</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            id="privacy-public"
                            name="privacy"
                            value="public"
                            checked={privacy === 'public'}
                            onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                            className="h-4 w-4 text-[#FF6B6B] border-gray-300 focus:ring-[#FF6B6B]"
                          />
                          <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-green-600" />
                            <div>
                              <Label htmlFor="privacy-public" className="text-base font-medium cursor-pointer">
                                Public Location
                              </Label>
                              <p className="text-sm text-gray-600">
                                Visible to everyone on the platform
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            id="privacy-private"
                            name="privacy"
                            value="private"
                            checked={privacy === 'private'}
                            onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                            className="h-4 w-4 text-[#FF6B6B] border-gray-300 focus:ring-[#FF6B6B]"
                          />
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-blue-600" />
                            <div>
                              <Label htmlFor="privacy-private" className="text-base font-medium cursor-pointer">
                                Private Location
                              </Label>
                              <p className="text-sm text-gray-600">
                                Only visible to selected friends
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {privacy === 'private' && user && (
                      <div className="space-y-4">
                        <div className="border-t pt-4">
                          <Label className="text-base font-medium">
                            Select Friends for Access
                          </Label>
                          <p className="text-sm text-gray-600 mb-4">
                            Choose which friends can see this private location
                          </p>
                          <PrivateAccessSelector
                            currentAccess={privateAccess}
                            onAccessChange={setPrivateAccess}
                            userId={user.id}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}

                    {privacy === 'private' && !user && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          You need to be logged in to set up private access. Please log in to continue.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="p-0">
              <CardContent className="p-4 md:p-6 space-y-6 md:space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center mb-2">
                    <Settings className="h-5 w-5 text-[#FF6B6B] mr-2" />
                    <h3 className="text-lg font-medium">Status & Visibility</h3>
                  </div>

                  <Alert className="border-orange-200 bg-orange-50">
                    <Info className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      All new locations are submitted for review and verification before being published to ensure quality and accuracy.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="location-featured"
                      checked={isFeatured}
                      onCheckedChange={(checked) => setIsFeatured(!!checked)}
                    />
                    <Label htmlFor="location-featured" className="text-base">
                      Feature this location
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="location-verified"
                      checked={isVerified}
                      onCheckedChange={(checked) => setIsVerified(!!checked)}
                    />
                    <Label htmlFor="location-verified" className="text-base">
                      Mark as verified location
                    </Label>
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
                      <Label htmlFor="has-partnership" className="text-base">
                        This location has a business partnership
                      </Label>
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
                        <span className="text-sm text-gray-500 font-normal ml-2">(Auto-populated from location name)</span>
                      </Label>
                      <Input
                        id="meta-title"
                        value={meta.title}
                        onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                        placeholder="Auto-populated from location name - customize if needed"
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta-description" className="text-base font-medium">
                        Meta Description
                        <span className="text-sm text-gray-500 font-normal ml-2">(Auto-populated from description)</span>
                      </Label>
                      <Textarea
                        id="meta-description"
                        value={meta.description}
                        onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                        placeholder="Auto-populated from short description or main description - customize if needed"
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

          {/* Mobile-optimized sticky footer */}
          <CardFooter className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 flex flex-col gap-3 md:flex-row md:gap-3 shadow-lg md:shadow-none">
            <Button
              type="submit"
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 transition-all duration-300 h-14 md:h-12 text-base font-medium w-full md:w-auto order-1"
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
              className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5 h-14 md:h-12 text-base font-medium w-full md:w-auto order-2"
              onClick={async (e) => {
                e.preventDefault()
                await prepareSubmission(true)
              }}
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-5 w-5" />
              Save as Draft
            </Button>
            <div className="flex-1 flex justify-center md:justify-end order-3">
              <Button
                type="button"
                variant="ghost"
                className="h-12 md:h-12 text-base font-medium text-gray-500 px-4"
                onClick={() => setResetDialogOpen(true)}
                disabled={isSubmitting}
              >
                <Trash2 className="h-5 w-5 mr-2" />
                <span className="text-sm">Reset</span>
              </Button>
            </div>
            
            {/* Mobile tab navigation helper */}
            <div className="flex md:hidden justify-between items-center px-4 py-2 text-sm border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const tabs = ["basic", "media", "location", "contact", "details", "settings"]
                  const currentIndex = tabs.indexOf(activeTab)
                  if (currentIndex > 0) {
                    const prevTab = tabs[currentIndex - 1]
                    if (prevTab) {
                      setActiveTab(prevTab)
                    }
                  }
                }}
                disabled={activeTab === "basic"}
                className="h-10 px-3 text-[#FF6B6B]"
              >
                ← Previous
              </Button>
              <span className="text-gray-500 font-medium capitalize">{activeTab}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const tabs = ["basic", "media", "location", "contact", "details", "settings"]
                  const currentIndex = tabs.indexOf(activeTab)
                  if (currentIndex < tabs.length - 1) {
                    const nextTab = tabs[currentIndex + 1]
                    if (nextTab) {
                      setActiveTab(nextTab)
                    }
                  }
                }}
                disabled={activeTab === "settings"}
                className="h-10 px-3 text-[#FF6B6B]"
              >
                Next →
              </Button>
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
