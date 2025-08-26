"use client"

import React, { useState, useEffect, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, MapIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { LocationEncouragementCard } from '@/components/ui/location-encouragement-card'
import { useRouter } from "next/navigation"

const NearbyLocations = memo(function NearbyLocations() {
  const router = useRouter()
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown')

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    setLoading(true)
    try {
      // Check location permission
      if ('geolocation' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        setLocationStatus(permission.state === 'granted' ? 'granted' : 'denied')
      }

      // Fetch nearby locations
      const response = await fetch('/api/locations/nearby')
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Error loading nearby locations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Nearby Locations</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#4ECDC4]" />
        </div>
      </section>
    )
  }

  // No locations
  if (locations.length === 0) {
    return (
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {locationStatus === "granted" ? "Nearby Locations" : "Popular Locations"}
          </h2>
          <Button
            variant="outline"
            onClick={() => router.push("/map")}
            className="border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10"
          >
            View Map
            <MapIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Location Encouragement Card */}
          <LocationEncouragementCard 
            variant="default"
            className="mb-6"
            showBusinessMessage={true}
          />
          
          {/* Original Empty State */}
          <Card className="border-dashed bg-gray-50">
            <CardContent className="py-16 text-center">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No locations found</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {locationStatus === "denied" 
                  ? "Enable location access to find places near you, or explore our popular locations."
                  : "We couldn't find any locations near you. Try adding your own location."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="bg-[#4ECDC4] hover:bg-[#4ECDC4]/90">
                  <Link href="/add-location">Add a Location</Link>
                </Button>
                {locationStatus === "denied" && (
                  <Button variant="outline" onClick={() => loadLocations()}>
                    Show Popular Locations
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {locationStatus === "granted" ? "Nearby Locations" : "Popular Locations"}
        </h2>
        <Button
          variant="outline"
          onClick={() => router.push("/map")}
          className="border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10"
        >
          View Map
          <MapIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <Card key={location.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              {location.image && (
                <div className="aspect-video bg-gray-200">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{location.name}</h3>
                {location.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {location.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-1" />
                    {location.address || location.city}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/locations/${location.id}`)}
                    className="border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Compact encouragement at the bottom */}
      <div className="mt-8">
        <LocationEncouragementCard 
          variant="default"
          className="mb-4"
          showBusinessMessage={false}
        />
      </div>
    </section>
  )
})

export default NearbyLocations
