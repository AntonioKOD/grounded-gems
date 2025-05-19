/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Check, MapPin, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { createLocation } from "@/app/(frontend)/events/actions"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

const newLocSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  address: z.object({
    street: z.string().min(3, { message: "Street address is required" }),
    city: z.string().min(2, { message: "City is required" }),
    state: z.string().min(2, { message: "State is required" }),
    zip: z.string().min(2, { message: "ZIP code is required" }),
    country: z.string().min(2, { message: "Country is required" }),
  }),
})
type NewLoc = z.infer<typeof newLocSchema>

interface Loc {
  id: string
  name: string
  address: string
}

interface Props {
  value: string
  onChange: (id: string) => void
  onLocationSelect: (loc: Loc) => void
}

export function LocationSearch({ value, onChange, onLocationSelect }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locations, setLocations] = useState<Loc[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Loc | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debug counter
  const renderCount = useRef(0)
  useEffect(() => {
    renderCount.current += 1
    console.log(`[LocationSearch] Render #${renderCount.current}`, {
      value,
      selected,
      locations,
      searchQuery,
      loading,
      error,
      hasSearched,
    })
  })

  // Sync incoming value → selected
  useEffect(() => {
    if (!value) {
      setSelected(null)
      return
    }

    // If in current locations list
    const found = locations.find((l) => l.id === value)
    if (found) {
      setSelected(found)
      return
    }

    // Otherwise fetch it by ID
    console.log(`[LocationSearch] Fetching location by ID: ${value}`)
    fetch(`/api/locations/${value}`)
      .then((r) => r.json())
      .then((json) => {
        console.log(`[LocationSearch] Location by ID response:`, json)
        if (json.success && json.locations?.[0]) {
          const loc = json.locations[0]
          setSelected({ id: loc.id, name: loc.name, address: loc.address })
        }
      })
      .catch((err) => {
        console.error(`[LocationSearch] Error fetching location by ID:`, err)
      })
  }, [value, locations])

  // Handle search submission
  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      toast.error("Please enter at least 2 characters to search")
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      console.log(`[LocationSearch] Searching for: "${searchQuery}"`)
      const res = await fetch("/api/locations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })

      if (!res.ok) throw new Error(res.statusText)

      const json = await res.json()
      console.log(`[LocationSearch] Search response:`, json)

      if (json.success) {
        setLocations(json.locations)
      } else {
        throw new Error(json.error || "Unexpected response format")
      }
    } catch (e: any) {
      console.error(`[LocationSearch] Search error:`, e)
      setError(e.message)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  // Handle key press in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  // select handler
  const handleSelect = (loc: Loc) => {
    console.log(`[LocationSearch] Selected location:`, loc)
    setSelected(loc)
    onChange(loc.id)
    onLocationSelect(loc)
    // Keep the search results visible
  }

  // new-location form
  const form = useForm<NewLoc>({
    resolver: zodResolver(newLocSchema),
    defaultValues: {
      name: "",
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "United States",
      },
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    console.log(`[LocationSearch] Submitting new location:`, data)
    setIsSubmitting(true)
    try {
      const res = await createLocation(data)
      console.log(`[LocationSearch] Create location result:`, res)
      if (res.success && res.location) {
        const loc: Loc = {
          id: res.location.id as string,
          name: res.location.name,
          address: `${data.address.street}, ${data.address.city}`,
        }
        handleSelect(loc)
        toast.success("Location created successfully!")
        setDialogOpen(false)
        form.reset()
      } else throw new Error(res.error || "Failed to create location")
    } catch (e: any) {
      console.error(`[LocationSearch] Create location error:`, e)
      toast.error(e.message || "Failed to create location")
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="space-y-4">
      {/* Search Bar with Submit Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="pr-10"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <Button onClick={handleSearch} disabled={loading || searchQuery.length < 2}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Selected Location Display */}
      {selected && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-lg">{selected.name}</div>
                <div className="text-sm text-muted-foreground flex items-center mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {selected.address}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(null)
                  onChange("")
                }}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && !loading && (
        <Card>
          <CardContent className="p-0">
            {/* Error State */}
            {error && (
              <div className="p-4 text-center">
                <p className="text-sm text-destructive mb-2">Error: {error}</p>
                <Button variant="outline" size="sm" onClick={handleSearch}>
                  Try Again
                </Button>
              </div>
            )}

            {/* No Results */}
            {!error && locations.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No locations found for &quot;{searchQuery}&quot;</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(true)
                    form.setValue("name", searchQuery)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Location
                </Button>
              </div>
            )}

            {/* Results List */}
            {!error && locations.length > 0 && (
              <div>
                <div className="px-4 py-2 border-b">
                  <p className="text-sm text-muted-foreground">
                    {locations.length} location{locations.length !== 1 ? "s" : ""} found
                  </p>
                </div>
                <ul className="divide-y">
                  {locations.map((loc) => (
                    <li
                      key={loc.id}
                      className={cn(
                        "p-3 hover:bg-muted/50 cursor-pointer flex items-start",
                        selected?.id === loc.id ? "bg-muted" : "",
                      )}
                      onClick={() => handleSelect(loc)}
                    >
                      <div className="mr-3 mt-1">
                        <Check
                          className={cn("h-4 w-4", selected?.id === loc.id ? "text-primary" : "text-transparent")}
                        />
                      </div>
                      <div>
                        <div className="font-medium">{loc.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {loc.address}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="p-3 border-t">
                  <Button
                    variant="link"
                    className="w-full justify-center"
                    onClick={() => {
                      setDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Location
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add New Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Enter the details for the new location. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
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

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Address</h3>

                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street *</FormLabel>
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
                        <FormLabel>State *</FormLabel>
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
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP code" {...field} />
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>Create</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
