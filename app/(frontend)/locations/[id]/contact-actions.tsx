'use client'

import { Button } from '@/components/ui/button'
import { Phone, Share2, Navigation } from 'lucide-react'
import { toast } from 'sonner'

interface ContactActionsProps {
  coordinates?: { latitude: number; longitude: number }
  phone?: string
  locationUrl: string
}

export function ContactActions({ coordinates, phone, locationUrl }: ContactActionsProps) {
  const handleGetDirections = () => {
    if (coordinates) {
      window.open(`https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`, '_blank')
    } else {
      toast.error('Location coordinates not available')
    }
  }

  const handleCall = () => {
    if (phone) {
      window.open(`tel:${phone}`, '_self')
    } else {
      toast.error('Phone number not available')
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          url: locationUrl
        })
        toast.success('Location shared successfully!')
      } else {
        await navigator.clipboard.writeText(locationUrl)
        toast.success('Location URL copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing location:', error)
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(locationUrl)
        toast.success('Location URL copied to clipboard!')
      } catch (clipboardError) {
        toast.error('Failed to share location')
      }
    }
  }

  return (
    <div className="space-y-3">
      <Button 
        className="w-full" 
        onClick={handleGetDirections}
      >
        <Navigation className="w-4 h-4 mr-2" />
        Get Directions
      </Button>
      
      {phone && (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleCall}
        >
          <Phone className="w-4 h-4 mr-2" />
          Call Now
        </Button>
      )}
      
      <Button 
        variant="outline" 
        className="w-full"
        onClick={handleShare}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Location
      </Button>
    </div>
  )
} 