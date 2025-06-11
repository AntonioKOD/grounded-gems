/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { createLocation } from "@/app/(frontend)/events/actions"
import { toast } from "sonner"
import { HierarchicalCategorySelector } from "@/components/ui/hierarchical-category-selector"

// Define the form schema - enhanced with categories
const locationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  categories: z.array(z.string()).min(1, "At least one category is required").max(3, "Maximum 3 categories allowed"),
  address: z.object({
    street: z.string().min(2, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(1, "State is required"),
    zip: z.string().min(1, "ZIP/Postal code is required"),
    country: z.string().min(2, "Country is required"),
  }),
  contactInfo: z
    .object({
      phone: z.string().optional(),
      email: z.string().email("Invalid email address").optional().or(z.literal("")),
      website: z.string().url("Invalid website URL").optional().or(z.literal("")),
    })
    .optional(),
  accessibility: z
    .object({
      wheelchairAccess: z.boolean().optional(),
      parking: z.boolean().optional(),
      other: z.string().optional(),
    })
    .optional(),
})

type LocationFormValues = z.infer<typeof locationFormSchema>

interface LocationFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLocationCreated: (location: any) => void
  initialSearchTerm?: string
}

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  source: 'manual' | 'foursquare' | 'imported'
  foursquareIcon?: {
    prefix: string
    suffix: string
  }
  subcategories?: Category[]
  parent?: string
}

export function LocationFormModal({
  open,
  onOpenChange,
  onLocationCreated,
  initialSearchTerm = "",
}: LocationFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // Initialize the form
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categories: [],
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "United States",
      },
      contactInfo: {
        phone: "",
        email: "",
        website: "",
      },
      accessibility: {
        wheelchairAccess: false,
        parking: false,
        other: "",
      },
    },
  })

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      if (!open) return
      
      setIsLoadingCategories(true)
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          
          // Transform categories to include hierarchical structure
          const transformedCategories = data.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            slug: doc.slug,
            description: doc.description,
            source: doc.source || 'manual',
            foursquareIcon: doc.foursquareIcon,
            parent: doc.parent?.id || doc.parent,
            subcategories: []
          }))

          // Build hierarchical structure
          const categoryMap = new Map(transformedCategories.map((cat: Category) => [cat.id, cat]))
          const rootCategories: Category[] = []

          transformedCategories.forEach((category: Category) => {
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
        } else {
          toast.error('Failed to load categories')
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast.error('Failed to load categories')
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [open])

  // Pre-fill city or name if initialSearchTerm is provided
  useEffect(() => {
    if (initialSearchTerm && open) {
      // If it looks like a city name, pre-fill the city field
      if (initialSearchTerm.length > 2 && !initialSearchTerm.includes(" ")) {
        form.setValue("address.city", initialSearchTerm)
      } else {
        // Otherwise, pre-fill the name field
        form.setValue("name", initialSearchTerm)
      }
    }
  }, [initialSearchTerm, open, form])

  // Handle form submission
  const onSubmit = async (values: LocationFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createLocation(values)

      if (result.success) {
        onLocationCreated(result.location)
        toast.success('Location created successfully!')
        form.reset()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to create location")
      }
    } catch (error) {
      console.error("Error creating location:", error)
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Enter the details of the new location. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Location name" {...field} />
                    </FormControl>
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
                      <Textarea placeholder="Brief description of the location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categories Section */}
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categories (Select 1-3) *</FormLabel>
                    <FormControl>
                      {isLoadingCategories ? (
                        <div className="flex items-center justify-center p-4 border rounded-lg">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          <span className="text-sm text-gray-600">Loading categories...</span>
                        </div>
                      ) : (
                        <HierarchicalCategorySelector
                          categories={categories}
                          selectedCategories={field.value}
                          onSelectionChange={field.onChange}
                          maxSelections={3}
                          placeholder="Choose categories that best describe your location"
                          showSearch={true}
                          showBadges={true}
                          allowSubcategorySelection={true}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address</h3>

              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province *</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP/Postal Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input placeholder="Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>

              <FormField
                control={form.control}
                name="contactInfo.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(123) 456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactInfo.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactInfo.website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Accessibility */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Accessibility</h3>

              <div className="flex flex-col space-y-2">
                <FormField
                  control={form.control}
                  name="accessibility.wheelchairAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Wheelchair Accessible</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessibility.parking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Parking Available</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="accessibility.other"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Accessibility Features</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional accessibility information" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingCategories}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Location"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
