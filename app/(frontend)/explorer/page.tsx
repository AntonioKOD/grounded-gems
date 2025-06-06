"use client"

import React, { useState, useEffect } from 'react'

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

import { getPersonalizedLocations, getFilteredLocationsAction, getUserPersonalizationData } from '@/app/actions'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  MapPin, 
  Filter, 
  Star, 
  Clock, 
  DollarSign, 
  Heart,
  Bookmark,
  Navigation,
  RefreshCw,
  User,
  Settings,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { PersonalizedLocation } from '@/lib/features/locations/personalization-service'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface FilterState {
  category: string
  priceRange: string
  radius: number
  isOpen: boolean
  rating: number
  sortBy: 'personalized' | 'distance' | 'rating' | 'popular'
}

interface UserPersonalization {
  hasCompletedOnboarding: boolean
  interests: string[]
  primaryUseCase?: string
  budgetPreference?: string
  travelRadius?: string
  preferencesSummary: string[]
}

export default function ExplorerPage() {
  const { user: currentUser, isLoading: userLoading } = useAuth()
  const [locations, setLocations] = useState<PersonalizedLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [userPersonalization, setUserPersonalization] = useState<UserPersonalization | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    priceRange: 'all',
    radius: 10,
    isOpen: false,
    rating: 0,
    sortBy: 'personalized'
  })

  // Load user personalization data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (currentUser?.id) {
          // Load user personalization data
          const personalizationData = await getUserPersonalizationData(currentUser.id)
          setUserPersonalization(personalizationData)

          // Set initial filters based on user preferences
          if (personalizationData.budgetPreference) {
            setFilters(prev => ({
              ...prev,
              priceRange: personalizationData.budgetPreference!
            }))
          }

          if (personalizationData.travelRadius) {
            const radiusMap: { [key: string]: number } = {
              '0.5': 1,
              '2': 3,
              '5': 8,
              '15': 25,
              'unlimited': 50
            }
            setFilters(prev => ({
              ...prev,
              radius: radiusMap[personalizationData.travelRadius!] || 10
            }))
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }

    loadUserData()
  }, [currentUser])

  // Load locations based on filters and personalization
  useEffect(() => {
    const loadLocations = async () => {
      if (!currentUser?.id) return

      setLoading(true)
      try {
        let results: PersonalizedLocation[] = []

        if (filters.sortBy === 'personalized' && userPersonalization?.hasCompletedOnboarding) {
          // Use personalized recommendations
          results = await getPersonalizedLocations(currentUser.id, 20, 0)
        } else {
          // Use filtered search
          const filterParams = {
            category: filters.category !== 'all' ? filters.category : undefined,
            priceRange: filters.priceRange !== 'all' ? filters.priceRange : undefined,
            radius: filters.radius,
            isOpen: filters.isOpen || undefined,
            rating: filters.rating > 0 ? filters.rating : undefined,
          }
          results = await getFilteredLocationsAction(currentUser.id, filterParams, 20, 0)
        }

        // Apply search filter if present
        if (searchQuery.trim()) {
          results = results.filter(location =>
            location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            location.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            location.categories.some(cat => 
              cat.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
        }

        // Apply sorting for non-personalized results
        if (filters.sortBy !== 'personalized') {
          results.sort((a, b) => {
            switch (filters.sortBy) {
              case 'distance':
                return (a.distance || 0) - (b.distance || 0)
              case 'rating':
                return (b.rating || 0) - (a.rating || 0)
              case 'popular':
                return b.personalizedScore - a.personalizedScore
              default:
                return 0
            }
          })
        }

        setLocations(results)
      } catch (error) {
        console.error('Error loading locations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocations()
  }, [currentUser, filters, searchQuery, userPersonalization])

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      category: 'all',
      priceRange: userPersonalization?.budgetPreference || 'all',
      radius: 10,
      isOpen: false,
      rating: 0,
      sortBy: 'personalized'
    })
    setSearchQuery('')
  }

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'cafe', label: 'Cafes & Coffee' },
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'park', label: 'Parks & Nature' },
    { value: 'bar', label: 'Bars & Nightlife' },
    { value: 'shop', label: 'Shopping' },
    { value: 'museum', label: 'Arts & Culture' },
    { value: 'sports', label: 'Sports & Recreation' },
  ]

  const priceRangeOptions = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free' },
    { value: 'budget', label: 'Budget ($)' },
    { value: 'moderate', label: 'Moderate ($$)' },
    { value: 'premium', label: 'Premium ($$$)' },
    { value: 'luxury', label: 'Luxury ($$$$)' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with personalization info */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Navigation className="h-8 w-8 text-[#FF6B6B]" />
                Explore
              </h1>
              {userPersonalization?.hasCompletedOnboarding ? (
                <div className="mt-2">
                  <p className="text-gray-600 mb-2">
                    Personalized recommendations based on your preferences
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {userPersonalization.preferencesSummary.slice(0, 2).map((summary, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {summary}
                      </Badge>
                    ))}
                    {userPersonalization.preferencesSummary.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{userPersonalization.preferencesSummary.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm mb-2">
                    Complete your preferences to get personalized recommendations!
                  </p>
                  <Link href="/signup/enhanced">
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-800">
                      <Settings className="h-4 w-4 mr-1" />
                      Set Preferences
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Search and filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Input 
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <Button 
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {Object.values(filters).filter(v => v !== 'all' && v !== 0 && v !== false).length > 0 && (
                  <Badge variant="secondary">
                    {Object.values(filters).filter(v => v !== 'all' && v !== 0 && v !== false).length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Filter Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) => handleFilterChange('sortBy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personalized">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Personalized
                          </div>
                        </SelectItem>
                        <SelectItem value="distance">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Distance
                          </div>
                        </SelectItem>
                        <SelectItem value="rating">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Rating
                          </div>
                        </SelectItem>
                        <SelectItem value="popular">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Popular
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) => handleFilterChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <Select
                      value={filters.priceRange}
                      onValueChange={(value) => handleFilterChange('priceRange', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priceRangeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Radius */}
                  <div className="space-y-2">
                    <Label>Radius: {filters.radius} km</Label>
                    <Slider
                      value={[filters.radius]}
                      onValueChange={([value]) => handleFilterChange('radius', value)}
                      max={50}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    {/* Open Now Toggle */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="open-now"
                        checked={filters.isOpen}
                        onCheckedChange={(checked) => handleFilterChange('isOpen', checked)}
                      />
                      <Label htmlFor="open-now" className="text-sm">Open now</Label>
                    </div>

                    {/* Minimum Rating */}
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Min rating:</Label>
                      <Select
                        value={filters.rating.toString()}
                        onValueChange={(value) => handleFilterChange('rating', parseInt(value))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button variant="outline" onClick={resetFilters} size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-48 bg-gray-300 rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-300 rounded mb-2" />
                  <div className="h-3 bg-gray-300 rounded w-3/4 mb-4" />
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-300 rounded w-16" />
                    <div className="h-6 bg-gray-300 rounded w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No locations found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search terms to find more results.
            </p>
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Found {locations.length} location{locations.length !== 1 ? 's' : ''}
                {filters.sortBy === 'personalized' && userPersonalization?.hasCompletedOnboarding && (
                  <span className="text-[#FF6B6B] font-medium"> personalized for you</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <LocationCard 
                  key={location.id} 
                  location={location}
                  showPersonalization={filters.sortBy === 'personalized'}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Location Card Component
function LocationCard({ 
  location, 
  showPersonalization = false 
}: { 
  location: PersonalizedLocation
  showPersonalization?: boolean 
}) {
  const priceSymbols = {
    free: 'Free',
    budget: '$',
    moderate: '$$',
    premium: '$$$',
    luxury: '$$$$'
  }

  return (
    <Link href={`/locations/${location.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {location.featuredImage ? (
            <img
              src={location.featuredImage}
              alt={location.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-gray-400" />
            </div>
          )}
          
          {/* Status badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {location.isOpen && (
              <Badge className="bg-green-500 hover:bg-green-600">
                <Clock className="h-3 w-3 mr-1" />
                Open
              </Badge>
            )}
            {showPersonalization && location.personalizedScore > 80 && (
              <Badge className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
                <Sparkles className="h-3 w-3 mr-1" />
                Perfect Match
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
              <Heart className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
              <Bookmark className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="mb-2">
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-[#FF6B6B] transition-colors">
              {location.name}
            </h3>
            {location.description && (
              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                {location.description}
              </p>
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 mb-3">
            {location.categories.slice(0, 2).map((category, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
            {location.categories.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{location.categories.length - 2}
              </Badge>
            )}
          </div>

          {/* Meta information */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-3">
              {location.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{location.rating.toFixed(1)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>{priceSymbols[location.priceRange as keyof typeof priceSymbols] || location.priceRange}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>
                {location.distance 
                  ? `${location.distance.toFixed(1)} km`
                  : 'Distance unknown'
                }
              </span>
            </div>
          </div>

          {/* Personalization reasons */}
          {showPersonalization && location.matchReasons.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-[#FF6B6B] font-medium mb-1">Why this matches you:</p>
              <p className="text-xs text-gray-600 line-clamp-2">
                {location.matchReasons.join(' • ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
} 