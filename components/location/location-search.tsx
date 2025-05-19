/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useCallback, useEffect } from "react"
import { Check, ChevronsUpDown, Loader2, MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { searchLocations } from "@/app/(frontend)/events/actions"
import { LocationFormModal } from "./location-form-modal"
import { toast } from "sonner"

interface Location {
  id: string
  name: string
  address: string
  coordinates?: {
    latitude: number | null
    longitude: number | null
  }
}

interface LocationSearchProps {
  onSelect: (locationId: string, locationData?: Location) => void
  selectedLocationId?: string
  placeholder?: string
  className?: string
}

export function LocationSearch({
  onSelect,
  selectedLocationId,
  placeholder = "Search for a location...",
  className,
}: LocationSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)

  // Fetch locations based on search query
  const fetchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setLocations([])
      return
    }

    setIsSearching(true)
    try {
      const result = await searchLocations(query)
      if (result.success) {
        setLocations(result.locations.map(loc => ({
          ...loc,
          id: String(loc.id),
        })))
      } else {
        console.error("Error searching locations:", result.error)
        toast("Error searching locations", {
         
          description: result.error || "Failed to search locations",
         
        })
        setLocations([])
      }
    } catch (error) {
      console.error("Error searching locations:", error)
      setLocations([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search to avoid too many requests
  useEffect(() => {
    // Skip if query is too short
    if (searchQuery.length < 2) {
      setLocations([])
      setIsSearching(false)
      return
    }

    // Set searching state immediately
    setIsSearching(true)
    console.log("Searching for:", searchQuery) // Debug log

    const timer = setTimeout(async () => {
      try {
        const result = await searchLocations(searchQuery)
        console.log("Search results:", result) // Debug log

        if (result.success) {
          setLocations(result.locations.map(loc => ({
            ...loc,
            id: String(loc.id)
          })))
        } else {
          console.error("Error searching locations:", result.error)
          toast("Error searching locations", {
            
            description: result.error || "Failed to search locations",
            
          })
          setLocations([])
        }
      } catch (error) {
        console.error("Error searching locations:", error)
        setLocations([])
      } finally {
        setIsSearching(false)
      }
    }, 200) // Reduced to 200ms for faster response

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Find selected location when selectedLocationId changes
  useEffect(() => {
    if (selectedLocationId && locations.length > 0) {
      const location = locations.find((loc) => loc.id === selectedLocationId)
      if (location) {
        setSelectedLocation(location)
      }
    }
  }, [selectedLocationId, locations])

  // Handle location selection
  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location)
    onSelect(location.id, location)
    setOpen(false)
  }

  // Handle adding a new location
  const handleAddLocation = () => {
    setShowAddLocationModal(true)
    setOpen(false)
  }

  // Handle new location created
  const handleLocationCreated = (location: Location) => {
    setSelectedLocation(location)
    onSelect(location.id, location)
    setShowAddLocationModal(false)
    toast("Location created", {
      
      description: `${location.name} has been created successfully.`,
    })
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
          >
            {selectedLocation ? (
              <div className="flex items-center gap-2 text-left">
                <MapPin className="h-4 w-4 shrink-0 opacity-50" />
                <div className="truncate">
                  <span className="font-medium">{selectedLocation.name}</span>
                  {selectedLocation.address && (
                    <span className="ml-1 text-muted-foreground text-sm">({selectedLocation.address})</span>
                  )}
                </div>
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 md:w-[400px]">
          <Command>
            <CommandInput
              placeholder="Search locations..."
              value={searchQuery}
              onValueChange={(value) => {
                console.log("Search input changed:", value) // Debug log
                setSearchQuery(value)
                // Force the popover to stay open when typing
                if (!open && value.length > 0) {
                  setOpen(true)
                }
              }}
              autoFocus
            />
            <CommandList>
              {isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="py-6 text-center text-sm">
                      <p className="text-muted-foreground">No locations found.</p>
                    </div>
                  </CommandEmpty>
                  {locations.length > 0 && (
                    <CommandGroup heading="Locations">
                      {locations.map((location) => (
                        <CommandItem
                          key={location.id}
                          value={location.id}
                          onSelect={() => handleSelectLocation(location)}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span>{location.name}</span>
                              {location.address && (
                                <span className="text-xs text-muted-foreground">{location.address}</span>
                              )}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedLocationId === location.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  <CommandGroup>
                    <CommandItem onSelect={handleAddLocation}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Add new location</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showAddLocationModal && (
        <LocationFormModal
          open={showAddLocationModal}
          onOpenChange={setShowAddLocationModal}
          onLocationCreated={handleLocationCreated}
          initialSearchTerm={searchQuery}
        />
      )}
    </>
  )
}
