'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MapPin, 
  Star, 
  Navigation, 
  Heart, 
  Bookmark,
  Search,
  Filter,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { useFoursquare, useGeolocation } from '@/hooks/use-foursquare'
import { toast } from 'sonner'

interface FoursquareDiscoveryProps {
  userInterests?: string[]
  initialLocation?: { latitude: number; longitude: number }
  onSavePlace?: (place: any) => void
}

export default function FoursquareDiscovery({ 
  userInterests = [], 
  initialLocation,
  onSavePlace 
}: FoursquareDiscoveryProps) {
  const { 
    isLoading, 
    error, 
    discoveryResults, 
    discoverNearby, 
    discoverByInterests,
    clearResults 
  } = useFoursquare()
  
  const { 
    coordinates, 
    isLoading: locationLoading, 
    getCurrentLocation 
  } = useGeolocation()

  const [searchRadius, setSearchRadius] = useState('1000')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [excludeChains, setExcludeChains] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set())

  // Use initial location or get user's current location
  const currentLocation = initialLocation || coordinates

  useEffect(() => {
    if (userInterests.length > 0 && currentLocation) {
      handleDiscoverByInterests()
    }
  }, [currentLocation, userInterests])

  const handleDiscoverNearby = async () => {
    if (!currentLocation) {
      toast.error('Location not available. Please enable location access.')
      return
    }

    try {
      await discoverNearby({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: parseInt(searchRadius),
        limit: 50,
        categories: selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : undefined,
        excludeChains
      })
      toast.success('Discovered nearby places!')
    } catch (error) {
      toast.error('Failed to discover places')
    }
  }

  const handleDiscoverByInterests = async () => {
    if (!currentLocation) {
      toast.error('Location not available. Please enable location access.')
      return
    }

    if (userInterests.length === 0) {
      toast.error('No interests available for discovery')
      return
    }

    try {
      await discoverByInterests({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        interests: userInterests,
        radius: parseInt(searchRadius),
        limit: 50
      })
      toast.success(`Discovered places based on your interests!`)
    } catch (error) {
      toast.error('Failed to discover places based on interests')
    }
  }

  const handleSavePlace = async (place: any) => {
    try {
      if (onSavePlace) {
        await onSavePlace(place)
        setSavedPlaces(prev => new Set([...prev, place.foursquareId]))
        toast.success(`Saved ${place.preview.name} to your collection!`)
      } else {
        // Default behavior - save to local storage or show info
        const saved = localStorage.getItem('sacavia-saved-places') || '[]'
        const savedList = JSON.parse(saved)
        savedList.push(place)
        localStorage.setItem('sacavia-saved-places', JSON.stringify(savedList))
        setSavedPlaces(prev => new Set([...prev, place.foursquareId]))
        toast.success(`Saved ${place.preview.name} locally!`)
      }
    } catch (error) {
      toast.error('Failed to save place')
    }
  }

  const handleGetDirections = (place: any) => {
    const { latitude, longitude } = place.preview.coordinates
    window.open(`https://maps.google.com/?daddr=${latitude},${longitude}`, '_blank')
  }

  const PlaceCard = ({ place }: { place: any }) => {
    const isSaved = savedPlaces.has(place.foursquareId)
    
    return (
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{place.preview.name}</CardTitle>
              <div className="flex flex-wrap gap-2 mb-2">
                {place.categories.slice(0, 2).map((category: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                ))}
                {place.verified && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Verified
                  </Badge>
                )}
              </div>
              {place.rating && (
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">{place.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">Foursquare rating</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSavePlace(place)}
                disabled={isSaved}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGetDirections(place)}
              >
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p>{place.preview.address.street}</p>
                <p>{place.preview.address.city}, {place.preview.address.state}</p>
                {place.distance && (
                  <p className="text-blue-600 font-medium mt-1">{place.distanceText} away</p>
                )}
              </div>
            </div>
            
            {place.preview.description && (
              <p className="text-gray-700 text-sm line-clamp-2">
                {place.preview.description}
              </p>
            )}
            
            {place.preview.insiderTips && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                <p className="text-xs text-amber-800 font-medium">Insider Tip:</p>
                <p className="text-xs text-amber-700">{place.preview.insiderTips}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-4 text-xs text-gray-500">
                {place.photos > 0 && (
                  <span>{place.photos} photos</span>
                )}
                {place.tips > 0 && (
                  <span>{place.tips} tips</span>
                )}
              </div>
              {place.preview.contactInfo?.website && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-xs"
                  onClick={() => window.open(place.preview.contactInfo.website, '_blank')}
                >
                  Website <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Discover Places Near You</h2>
        <p className="text-gray-600">
          Find amazing places from Foursquare's global database
        </p>
      </div>

      {/* Location Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="text-sm">
                {currentLocation 
                  ? `Using location: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                  : 'No location available'
                }
              </span>
            </div>
            {!currentLocation && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Enable Location'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discovery Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Discovery Options</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleDiscoverNearby}
              disabled={!currentLocation || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Discover Nearby Places
            </Button>
            
            {userInterests.length > 0 && (
              <Button
                onClick={handleDiscoverByInterests}
                disabled={!currentLocation || isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Heart className="w-4 h-4 mr-2" />
                )}
                Discover by Interests
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="radius">Search Radius</Label>
                <Select value={searchRadius} onValueChange={setSearchRadius}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500m (walking)</SelectItem>
                    <SelectItem value="1000">1km (nearby)</SelectItem>
                    <SelectItem value="2000">2km (biking)</SelectItem>
                    <SelectItem value="5000">5km (driving)</SelectItem>
                    <SelectItem value="10000">10km (extended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category Filter</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="13065">Restaurants</SelectItem>
                    <SelectItem value="13032">Cafes</SelectItem>
                    <SelectItem value="13003">Bars</SelectItem>
                    <SelectItem value="12026">Museums</SelectItem>
                    <SelectItem value="16032">Parks</SelectItem>
                    <SelectItem value="17069">Shopping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {discoveryResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Discovered Places ({discoveryResults.length})</CardTitle>
                <CardDescription>
                  Places found near your location
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              {discoveryResults.map((place) => (
                <PlaceCard key={place.foursquareId} place={place} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && discoveryResults.length === 0 && currentLocation && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No places discovered yet
            </h3>
            <p className="text-gray-600 mb-4">
              Click "Discover Nearby Places" to find amazing locations around you
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 