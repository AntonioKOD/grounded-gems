"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect, memo, useRef } from "react"
import { 
  Star, 
  MapPin, 
  Bookmark, 
  Bell, 
  X,
  Filter,
  Calendar,
  Heart,
  Search
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Image from "next/image"
import type { Location } from "./map-data"
import { getCategoryColor } from "./category-utils"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { toggleSaveLocationAction, toggleSubscribeLocationAction, getSavedLocationsAction, getUserLocationDataAction } from "@/app/actions"
import { motion } from "framer-motion"


interface LocationListProps {
  locations: Location[]
  selectedLocation: Location | null
  onLocationSelect: (location: Location) => void
  isLoading?: boolean
  onViewDetail?: (location: Location) => void
  currentUser?: { id: string; name?: string; email?: string }
}

interface SavedLocationItem {
  id: string
  location: Location
  createdAt: string
}

// Helper to get image URL
const getLocationImageUrl = (location: Location): string => {
  if (typeof location.featuredImage === "string") {
    return location.featuredImage
  }

  if (location.featuredImage?.url) {
    return location.featuredImage.url
  }

  if (location.imageUrl) {
    return location.imageUrl
  }

  return "/placeholder.svg"
}

export default function LocationList({
  locations,
  selectedLocation,
  onLocationSelect,
  isLoading = false,
  onViewDetail,
  currentUser,
}: LocationListProps) {
  const [savedLocations, setSavedLocations] = useState<Set<string>>(new Set())
  const [subscribedLocations, setSubscribedLocations] = useState<Set<string>>(new Set())
  const [savedLocationsList, setSavedLocationsList] = useState<SavedLocationItem[]>([])
  const [showSavedLocations, setShowSavedLocations] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"relevance" | "distance" | "rating">("relevance")
  const [userLocationData, setUserLocationData] = useState<{ isLiked: boolean; isSaved: boolean }>({
    isLiked: false,
    isSaved: false,
  })
  const [interactionCounts, setInteractionCounts] = useState<{
    likes: number
    saves: number
    views: number
  }>({
    likes: 0,
    saves: 0,
    views: 0,
  })
  const [isLiking, setIsLiking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load user location data on mount
  useEffect(() => {
    const loadUserLocationData = async () => {
      try {
        const userData = await getUserLocationDataAction()
        setSavedLocations(new Set(userData.savedLocations))
        setSubscribedLocations(new Set(userData.subscribedLocations))
        
        // Also load saved locations with full data for the modal
        const savedWithData = await getSavedLocationsAction()
        setSavedLocationsList(savedWithData)
        console.log('Loaded saved locations IDs:', userData.savedLocations)
        console.log('Loading status changed, forcing refresh with refreshTrigger')
      } catch (error) {
        console.error('Error loading user location data:', error)
      }
    }

    loadUserLocationData()
  }, [])

  // Listen for location save events to refresh UI
      useEffect(() => {
      const handleLocationSaved = () => {
        // State updates will automatically trigger rerenders
      }

      const handleLocationInteractionUpdated = (event: CustomEvent) => {
        const { locationId, type, isActive } = event.detail
        
        // Update local state based on interaction changes from location detail
        if (type === 'save') {
          setSavedLocations(prev => {
            const newSet = new Set(prev)
            if (isActive) {
              newSet.add(locationId)
            } else {
              newSet.delete(locationId)
            }
            return newSet
          })
        }
      }

    document.addEventListener('locationSaved', handleLocationSaved)
    document.addEventListener('locationInteractionUpdated', handleLocationInteractionUpdated as EventListener)
    
    return () => {
      document.removeEventListener('locationSaved', handleLocationSaved)
      document.removeEventListener('locationInteractionUpdated', handleLocationInteractionUpdated as EventListener)
    }
  }, [])

  // Extract all unique categories from locations
  const allCategories = useMemo(() => {
    return locations.reduce((acc, location) => {
      if (location.categories && Array.isArray(location.categories)) {
        location.categories.forEach((category) => {
          const categoryName = typeof category === "string" ? category : category.name
          if (categoryName && !acc.includes(categoryName)) {
            acc.push(categoryName)
          }
        })
      }
      return acc
    }, [] as string[])
  }, [locations])

  // Filter locations based on selected categories
  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 ||
        (location.categories &&
          location.categories.some((category) => {
            const categoryName = typeof category === "string" ? category : category.name
            return categoryName && selectedCategories.includes(categoryName)
          }))

      return matchesCategory
    })
  }, [locations, selectedCategories])

  // Sort locations
  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      if (sortBy === "rating") {
        const ratingA = a.averageRating || 0
        const ratingB = b.averageRating || 0
        return ratingB - ratingA
      }

      // For relevance, keep the original order or use a more sophisticated algorithm
      return 0
    })
  }, [filteredLocations, sortBy])

  // Handle category selection
  const handleCategoryChange = useCallback((category: string, checked: boolean) => {
    setSelectedCategories((prev) => (checked ? [...prev, category] : prev.filter((c) => c !== category)))
  }, [])

  // Handle sort selection
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as "relevance" | "distance" | "rating")
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedCategories([])
    setSortBy("relevance")
  }, [])

  // This function is no longer needed as we use onViewDetail directly

  // Using a function to check if location is saved/subscribed to avoid re-renders
  const isLocationSaved = useCallback((locationId: string) => {
    return savedLocations.has(locationId)
  }, [savedLocations])
  
  const isLocationSubscribed = useCallback((locationId: string) => {
    return subscribedLocations.has(locationId)
  }, [subscribedLocations])
  
  // Handle saving/liking locations
  const handleSaveLocation = useCallback(async (e: React.MouseEvent, location: Location) => {
    e.stopPropagation()
    if (!currentUser || isSaving) return

    setIsSaving(true)
    try {
      // Call server action
      const result = await toggleSaveLocationAction(location.id)
      
      if (result.success) {
        // Update local state
        setSavedLocations(prev => {
          const newSet = new Set(prev)
          if (result.isSaved) {
            newSet.add(location.id)
          } else {
            newSet.delete(location.id)
          }
          return newSet
        })
        
        // Refresh saved locations list
        const saved = await getSavedLocationsAction()
        setSavedLocationsList(saved)
        
        // Send browser notification for save action (if enabled in preferences)
        if (result.isSaved && typeof window !== 'undefined') {
          try {
            const { showNotificationWithPreferences, formatNotificationMessage } = await import('@/lib/notifications')
            const message = formatNotificationMessage('location_saved', {
              locationName: location.name
            })
            await showNotificationWithPreferences('SPECIAL_OFFER', message, {
              locationId: location.id,
              type: 'location',
              action: 'saved'
            })
          } catch (notificationError) {
            console.error('Error showing save notification:', notificationError)
          }
        }
        
        toast.success(result.message, {
          description: result.isSaved 
            ? "You can find this location in your saved places"
            : "You will no longer see this in your saved locations",
          action: {
            label: "Undo",
            onClick: async () => {
              // Toggle back
              await toggleSaveLocationAction(location.id)
              setSavedLocations(prev => {
                const newSet = new Set(prev)
                if (result.isSaved) {
                  newSet.delete(location.id)
                } else {
                  newSet.add(location.id)
                }
                return newSet
              })
              // Refresh saved locations list again
              const saved = await getSavedLocationsAction()
              setSavedLocationsList(saved)
              document.dispatchEvent(new CustomEvent('locationSaved', { detail: { locationId: location.id } }))
            }
          }
        })
        
        // Notify other components
        document.dispatchEvent(new CustomEvent('locationSaved', { detail: { locationId: location.id } }))
        
        // Emit event to notify location detail about interaction changes
        document.dispatchEvent(new CustomEvent('locationInteractionUpdated', {
          detail: {
            locationId: location.id,
            type: 'save',
            isActive: result.isSaved,
            interactionType: 'save'
          }
        }))
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error saving/unsaving location:', error)
      toast.error("Something went wrong", {
        description: "Please try again later"
      })
    } finally {
      setIsSaving(false)
    }
  }, [setSavedLocationsList, currentUser, isSaving])
  
  // Handle subscribing to locations
  const handleSubscribeLocation = useCallback(async (e: React.MouseEvent, location: Location) => {
    e.stopPropagation()
    try {
      // Call server action
      const result = await toggleSubscribeLocationAction(location.id, 'all')
      
      if (result.success) {
        // Update local state
        setSubscribedLocations(prev => {
          const newSet = new Set(prev)
          if (result.isSubscribed) {
            newSet.add(location.id)
          } else {
            newSet.delete(location.id)
          }
          return newSet
        })
        
        toast.success(result.message, {
          description: result.isSubscribed
            ? "You'll receive updates when events happen at this location"
            : "You'll no longer receive updates about this location",
          action: {
            label: "Undo",
            onClick: async () => {
              // Toggle back
              await toggleSubscribeLocationAction(location.id, 'all')
              setSubscribedLocations(prev => {
                const newSet = new Set(prev)
                if (result.isSubscribed) {
                  newSet.delete(location.id)
                } else {
                  newSet.add(location.id)
                }
                return newSet
              })
            }
          }
        })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error subscribing/unsubscribing to location:', error)
      toast.error("Something went wrong", {
        description: "Please try again later"
      })
    }
  }, [])

  // LocationCard component for consistent rendering with memo
  const LocationCard = memo(function LocationCard({ location }: { location: Location }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const isSelected = selectedLocation?.id === location.id;

    const handleCardClick = () => {
      console.log("📄 LocationList: LocationCard clicked:", location?.name);
      onLocationSelect(location);
    };

    const categoryInfo = {
      color: getCategoryColor(location.categories?.[0]),
      name: location.categories?.[0] ? (typeof location.categories[0] === 'string' ? location.categories[0] : location.categories[0].name) : 'Uncategorized'
    }

    // Simplified getImageUrl from context
    const getImageUrl = (loc: Location): string => {
      if (typeof loc.featuredImage === "string") {
        return loc.featuredImage;
      } else if (loc.featuredImage?.url) {
        return loc.featuredImage.url;
      } else if (loc.imageUrl) {
        return loc.imageUrl;
      }
      return "/placeholder.svg";
    };

    const handleSaveLocation = (e: React.MouseEvent, loc: Location) => {
      e.stopPropagation();
      // Simplified: directly call action, actual implementation might be more complex
      toggleSaveLocationAction(loc.id, currentUser?.id || '').then(() => {
        setSavedLocations(prev => {
          const newSet = new Set(prev);
          if (newSet.has(loc.id)) newSet.delete(loc.id);
          else newSet.add(loc.id);
          return newSet;
        });
      }).catch(err => console.error("Error saving location", err));
    };
    
    const handleSubscribeLocation = (e: React.MouseEvent, loc: Location) => {
        e.stopPropagation();
        // Simplified: directly call action
        toggleSubscribeLocationAction(loc.id, currentUser?.id || '').then(() => {
            setSubscribedLocations(prev => {
                const newSet = new Set(prev);
                if (newSet.has(loc.id)) newSet.delete(loc.id);
                else newSet.add(loc.id);
                return newSet;
            });
        }).catch(err => console.error("Error subscribing to location", err));
    };

    const isLocationSaved = (locationId: string) => savedLocations.has(locationId);
    const isLocationSubscribed = (locationId: string) => subscribedLocations.has(locationId);

    return (
      <div // Using plain div
        ref={cardRef}
        className={cn(
          "location-card bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out cursor-pointer border border-transparent",
          isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-primary/30" : "hover:border-primary/30"
        )}
        onClick={handleCardClick}
      >
        <Card
          className={cn(
            "transition-all duration-300 hover:shadow-xl relative group overflow-hidden",
            "bg-white hover:bg-gray-50/50",
            "border border-gray-200 hover:border-[#4ECDC4]/30",
            selectedLocation?.id === location.id
              ? "shadow-xl ring-2 ring-[#FF6B6B] bg-white border-[#FF6B6B]/50"
              : "shadow-md hover:shadow-xl"
          )}
        >
          <CardContent className="p-0">
            {/* Action buttons in top-right corner */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10 opacity-90 group-hover:opacity-100 transition-all duration-300">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full shadow-lg border transition-all duration-200",
                        "backdrop-blur-sm hover:scale-110 active:scale-95",
                        isLocationSaved(location.id)
                          ? "bg-[#FF6B6B] border-[#FF6B6B] text-white shadow-lg hover:bg-[#FF6B6B]/90" 
                          : "bg-white border-gray-200 text-[#666666] hover:bg-white hover:border-[#FF6B6B] hover:text-[#FF6B6B]"
                      )}
                      onClick={(e) => handleSaveLocation(e, location)}
                      // disabled={isSaving} // Assuming isSaving was a state variable
                    >
                      <Bookmark 
                        className={cn(
                          "h-4 w-4 transition-all duration-200",
                          isLocationSaved(location.id) ? "fill-white" : "hover:scale-110"
                        )} 
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-[#333333] text-white border-[#333333]">
                    {isLocationSaved(location.id) ? "Remove from saved" : "Save location"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full shadow-lg border transition-all duration-200",
                        "backdrop-blur-sm hover:scale-110 active:scale-95 bg-white border-gray-200 text-[#666666] hover:bg-white hover:border-[#4ECDC4] hover:text-[#4ECDC4]"
                      )}
                      onClick={(e) => handleSubscribeLocation(e, location)}
                    >
                      <Bell className="h-4 w-4 transition-all duration-200 hover:scale-110" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-[#333333] text-white border-[#333333]">
                    {isLocationSubscribed(location.id) ? "Unsubscribe" : "Get notifications"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Location Image */}
            <div className="relative h-40 w-full overflow-hidden cursor-pointer" onClick={() => onLocationSelect(location)}>
              <div className="absolute inset-0">
                <Image
                  src={getImageUrl(location)}
                  alt={location.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.src.includes('placeholder.svg')) {
                      target.src = "/placeholder.svg";
                      target.onerror = null;
                    }
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
            
            {/* Content section */}
            <div className="p-4 bg-white">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-bold text-lg text-[#333333] leading-tight flex-1">
                  {location.name}
                </h3>
                {categoryInfo.name && categoryInfo.name !== 'Uncategorized' && (
                  <Badge 
                    className="text-xs font-medium border-0 shadow-sm flex-shrink-0"
                    style={{
                      backgroundColor: `${categoryInfo.color}20`,
                      color: categoryInfo.color,
                      borderColor: categoryInfo.color
                    }}
                  >
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                {location.averageRating && (
                  <div className="flex items-center">
                    <div className="flex items-center bg-[#FFE66D] text-[#333333] px-2 py-1 rounded-full text-xs font-medium">
                      <Star className="h-3 w-3 text-[#333333] fill-[#333333] mr-1" />
                      <span>{location.averageRating.toFixed(1)}</span>
                      {location.reviewCount && (
                        <span className="ml-1 opacity-80">({location.reviewCount})</span>
                      )}
                    </div>
                  </div>
                )}
                {location.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-[#4ECDC4]" />
                    <span className="text-sm text-[#666666] truncate">
                      {typeof location.address === 'string' 
                        ? location.address 
                        : location.address?.city || 'Address not available'}
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                className="w-full border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B] font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewDetail) {
                    onViewDetail(location);
                  } else {
                    onLocationSelect(location); // Fallback if onViewDetail is not provided
                  }
                }}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header with location count and bookmark button */}
      <div className="p-3 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredLocations.length} {filteredLocations.length === 1 ? "location" : "locations"}
          </p>

          <div className="flex gap-2">
            {/* Bookmark button that opens saved locations modal */}
            <Dialog open={showSavedLocations} onOpenChange={setShowSavedLocations}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 h-8"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Saved Locations</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  {savedLocationsList.length === 0 ? (
                    <div className="text-center py-8">
                      <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No saved locations yet</p>
                      <p className="text-sm text-gray-400">
                        Start exploring and bookmark your favorite places
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedLocationsList.map((savedItem) => {
                        const location = savedItem.location
                        if (!location) return null
                        
                        return (
                          <div key={savedItem.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex gap-3">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <Image
                                  src={getLocationImageUrl(location) || "/placeholder.svg"}
                                  alt={location.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {location.name}
                                </h4>
                                {(typeof location.address === 'string' && location.address) && (
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {location.address}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  Saved {new Date(savedItem.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => {
                                onLocationSelect(location)
                                setShowSavedLocations(false)
                              }}
                            >
                              View on Map
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant={selectedCategories.length > 0 ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8",
                    selectedCategories.length > 0 && "bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]",
                  )}
                >
                  <Filter className="h-3.5 w-3.5 mr-2" />
                  Filter & Sort
                  {selectedCategories.length > 0 && (
                    <Badge className="ml-2 bg-[#FF6B6B] text-white rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <SheetHeader>
                  <SheetTitle>Filter & Sort</SheetTitle>
                </SheetHeader>

                <div className="py-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">Sort By</h3>
                    <RadioGroup value={sortBy} onValueChange={handleSortChange}>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="relevance" id="relevance" />
                        <Label htmlFor="relevance">Relevance</Label>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="distance" id="distance" />
                        <Label htmlFor="distance">Distance</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rating" id="rating" />
                        <Label htmlFor="rating">Rating</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h3 className="text-sm font-medium mb-3">Categories</h3>
                    <div className="space-y-2">
                      {allCategories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                          />
                          <Label htmlFor={`category-${category}`} className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: getCategoryColor(category) }}
                            />
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <SheetFooter className="flex-row justify-between sm:justify-between border-t pt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <SheetClose asChild>
                    <Button>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Active filters */}
      {selectedCategories.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-b bg-gray-50/80">
          {selectedCategories.map((category) => {
            const color = getCategoryColor(category)
            return (
              <Badge
                key={category}
                variant="outline"
                className="px-2 py-0.5 h-6 text-xs font-medium"
                style={{
                  backgroundColor: `${color}10`,
                  color: color,
                  borderColor: `${color}30`,
                }}
              >
                {category}
                <button
                  onClick={() => handleCategoryChange(category, false)}
                  className="ml-1 rounded-full hover:bg-gray-200/50 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button variant="link" size="sm" onClick={clearFilters} className="text-xs text-[#FF6B6B] h-6 px-2 pb-0.5">
            Clear all
          </Button>
        </div>
      )}

      {/* Location list with improved visual design */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-3">
        {filteredLocations.length > 0 ? (
          <div className="space-y-4">
            {sortedLocations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No locations found</h3>
            <p className="text-gray-500 max-w-xs">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSelectedCategories([])
              }}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full border-4 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin mb-4"></div>
            <p className="text-gray-700">Loading locations...</p>
          </div>
        </div>
      )}
    </div>
  )
}
