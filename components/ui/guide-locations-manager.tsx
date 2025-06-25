import * as React from "react"
import { useState } from "react"
import { MapPin, Plus, X, ChevronUp, ChevronDown, Clock, Edit3, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LocationSearch } from "@/components/ui/location-search"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"

interface LocationOption {
  id: string
  name: string
  fullName: string
  address: any
  neighborhood?: string
  coordinates?: { latitude: number; longitude: number }
  averageRating: number
  reviewCount: number
  categories: any[]
  imageUrl?: string
  isVerified: boolean
}

interface GuideLocation {
  id: string
  location: LocationOption
  order: number
  description?: string
  estimatedTime?: number // in minutes
  tips?: string[]
  isRequired: boolean
}

interface GuideLocationsManagerProps {
  locations: GuideLocation[]
  onAddLocation: (location: LocationOption) => void
  onRemoveLocation: (locationId: string) => void
  onUpdateLocation: (locationId: string, updates: Partial<Omit<GuideLocation, 'id' | 'location'>>) => void
  onReorderLocation: (locationId: string, direction: 'up' | 'down') => void
  className?: string
}

export function GuideLocationsManager({
  locations,
  onAddLocation,
  onRemoveLocation,
  onUpdateLocation,
  onReorderLocation,
  className
}: GuideLocationsManagerProps) {
  const [editingLocation, setEditingLocation] = useState<string | null>(null)
  const [showAddLocation, setShowAddLocation] = useState(false)

  const handleLocationSelect = (location: LocationOption | null) => {
    if (location) {
      onAddLocation(location)
      setShowAddLocation(false)
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getTotalTime = () => {
    return locations.reduce((total, loc) => total + (loc.estimatedTime || 0), 0)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with total time */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Guide Locations</h3>
          <p className="text-sm text-gray-600">
            {locations.length} location{locations.length !== 1 ? 's' : ''} 
            {locations.length > 0 && (
              <span className="ml-2 text-[#4ECDC4]">
                • Total time: {formatTime(getTotalTime())}
              </span>
            )}
          </p>
        </div>
        
        <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="border-2 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4] hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Location to Guide</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <LocationSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Search for a location to add to your guide..."
                className="w-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {locations.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No locations added yet</h4>
            <p className="text-gray-600 text-center mb-4">
              Start building your guide by adding locations that travelers should visit
            </p>
            <Button 
              onClick={() => setShowAddLocation(true)}
              className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Location
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Locations list */}
      {locations.length > 0 && (
        <div className="space-y-3">
          {locations.map((guideLocation, index) => (
            <Card key={guideLocation.id} className="border-2 border-gray-200 hover:border-[#4ECDC4]/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Order badge */}
                    <div className="w-8 h-8 bg-[#4ECDC4] text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {guideLocation.order}
                    </div>
                    
                    {/* Location info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{guideLocation.location.name}</h4>
                        {guideLocation.isRequired && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        {guideLocation.location.isVerified && (
                          <Badge variant="outline" className="text-xs">✓ Verified</Badge>
                        )}
                      </div>
                      
                      {guideLocation.location.address && (
                        <p className="text-sm text-gray-600 mb-2">
                          {[
                            guideLocation.location.address.city,
                            guideLocation.location.address.state,
                            guideLocation.location.address.country
                          ].filter(Boolean).join(', ')}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(guideLocation.estimatedTime || 60)}
                        </div>
                        {guideLocation.location.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {guideLocation.location.averageRating.toFixed(1)} ({guideLocation.location.reviewCount})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {/* Reorder buttons */}
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReorderLocation(guideLocation.id, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReorderLocation(guideLocation.id, 'down')}
                        disabled={index === locations.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingLocation(editingLocation === guideLocation.id ? null : guideLocation.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveLocation(guideLocation.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded details */}
              {editingLocation === guideLocation.id && (
                <CardContent className="pt-0 border-t border-gray-200">
                  <div className="space-y-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Description for this stop</Label>
                      <Textarea
                        placeholder="What should travelers know about this location? What makes it special?"
                        value={guideLocation.description || ''}
                        onChange={(e) => onUpdateLocation(guideLocation.id, { description: e.target.value })}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    {/* Estimated time */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Estimated time to spend here</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="15"
                          max="480"
                          step="15"
                          value={guideLocation.estimatedTime || 60}
                          onChange={(e) => onUpdateLocation(guideLocation.id, { 
                            estimatedTime: parseInt(e.target.value) || 60 
                          })}
                          className="w-24 text-sm"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    </div>

                    {/* Quick tips */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quick tips (optional)</Label>
                      <Textarea
                        placeholder="Any specific tips for this location? Best times to visit, what to order, etc."
                        value={guideLocation.tips?.join('\n') || ''}
                        onChange={(e) => onUpdateLocation(guideLocation.id, { 
                          tips: e.target.value.split('\n').filter(tip => tip.trim()) 
                        })}
                        rows={2}
                        className="text-sm"
                      />
                      <p className="text-xs text-gray-500">Enter each tip on a new line</p>
                    </div>
                  </div>
                </CardContent>
              )}

              {/* Show description if not editing */}
              {editingLocation !== guideLocation.id && guideLocation.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-700">{guideLocation.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 