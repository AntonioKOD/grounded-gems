'use client'

import { Button } from '@/components/ui/button'
import { 
  Navigation,
  Phone,
  ArrowRight
} from 'lucide-react'
import { EnhancedShareButton } from '@/components/ui/enhanced-share-button'

interface LocationInteractionsProps {
  locationName: string
  description: string
  coordinates?: { latitude: number; longitude: number }
  contactInfo?: {
    phone?: string
    website?: string
  }
  locationUrl?: string
}

export function LocationHeroButtons({ locationName, description, coordinates, contactInfo, locationUrl }: LocationInteractionsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <Button
        size="lg"
        className="bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-lg"
        onClick={() => {
          if (coordinates) {
            window.open(`https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`, '_blank')
          }
        }}
      >
        <Navigation className="h-5 w-5 mr-2" />
        Get Directions
      </Button>
      
      {contactInfo?.phone && (
        <Button
          size="lg"
          variant="outline"
          className="border-green-400/70 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 backdrop-blur-xl font-semibold shadow-lg transition-all duration-200"
          onClick={() => window.open(`tel:${contactInfo.phone}`, '_self')}
        >
          <Phone className="h-5 w-5 mr-2" />
          Call
        </Button>
      )}
      
      <EnhancedShareButton 
        locationName={locationName}
        description={description}
        locationUrl={locationUrl || (typeof window !== 'undefined' ? window.location.href : '')}
        variant="outline"
        size="lg"
        className="border-blue-400/70 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 backdrop-blur-xl font-semibold shadow-lg transition-all duration-200"
      />
    </div>
  )
}

export function ContactDirectionsButton({ coordinates }: { coordinates?: { latitude: number; longitude: number } }) {
  return (
    <Button 
      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg"
      onClick={() => {
        if (coordinates) {
          window.open(`https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`, '_blank')
        }
      }}
    >
      <Navigation className="h-4 w-4 mr-2" />
      Get Directions
    </Button>
  )
}

export function SharePlaceButton({ locationName, description, locationUrl }: { locationName: string; description: string; locationUrl?: string }) {
  return (
    <EnhancedShareButton 
      locationName={locationName}
      description={description}
      locationUrl={locationUrl || (typeof window !== 'undefined' ? window.location.href : '')}
      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg"
    />
  )
}

export function ExploreMoreButton() {
  return (
    <Button
      size="lg" 
      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-xl transform hover:scale-105 transition-all duration-300"
      onClick={() => window.open('/map', '_self')}
    >
      Explore More Locations
      <ArrowRight className="h-5 w-5 ml-2" />
    </Button>
  )
} 