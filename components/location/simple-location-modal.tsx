'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Star, 
  Building2,
  Navigation,
  ExternalLink,
  X,
  Camera
} from 'lucide-react'
import { ClaimBusinessModal } from '@/components/location/claim-business-modal'
import { EnhancedShareButton } from '@/components/ui/enhanced-share-button'
import Image from 'next/image'

interface SimpleLocationModalProps {
  location: {
    id: string
    name: string
    description?: string
    shortDescription?: string
    address?: any
    featuredImage?: any
    gallery?: any[]
    businessHours?: any[]
    contactInfo?: any
    coordinates?: { latitude?: number; longitude?: number }
    categories?: Array<any>
    averageRating?: number
    reviewCount?: number
    priceRange?: string
    ownership?: {
      claimStatus?: 'unclaimed' | 'pending' | 'approved' | 'rejected'
      ownerId?: string
      claimedAt?: string
      claimEmail?: string
    }
  }
  isOpen: boolean
  onClose: () => void
}

export function SimpleLocationModal({ location, isOpen, onClose }: SimpleLocationModalProps) {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

  const isUnclaimed = location.ownership?.claimStatus === 'unclaimed'
  const rating = location.averageRating || 0
  const reviewCount = location.reviewCount || 0
  const categories = location.categories || []

  // Helper functions
  const formatAddress = (address: any): string => {
    if (typeof address === 'string') return address
    const parts = [address.street, address.city, address.state, address.zipCode]
    return parts.filter(Boolean).join(', ')
  }

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return ''
    
    const time = timeStr.toLowerCase().replace(/\s+/g, '')
    let [hours, minutes = '0'] = time.split(':')
    
    hours = hours?.replace(/[ap]m/, '')
    minutes = minutes.replace(/[ap]m/, '')
    
    const hourNum = parseInt(hours || '0')
    const minuteNum = parseInt(minutes || '0')
    
    if (isNaN(hourNum) || isNaN(minuteNum)) return timeStr
    
    const period = hourNum >= 12 ? 'PM' : 'AM'
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
    const displayMinute = minuteNum.toString().padStart(2, '0')
    
    return `${displayHour}:${displayMinute} ${period}`
  }

  const getBusinessStatus = (businessHours?: any[]) => {
    if (!businessHours?.length) return { status: 'Hours not available', isOpen: false }
    
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const todayHours = businessHours.find(h => 
      h.day.toLowerCase() === currentDay.toLowerCase()
    )
    
    if (!todayHours || !todayHours.open || !todayHours.close) {
      return { status: 'Hours not available', isOpen: false }
    }
    
    // Simple open/closed logic
    const openTime = parseInt(todayHours.open.split(':')[0]) * 60 + parseInt(todayHours.open.split(':')[1] || '0')
    const closeTime = parseInt(todayHours.close.split(':')[0]) * 60 + parseInt(todayHours.close.split(':')[1] || '0')
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime
    
    return { 
      status: isOpen ? 'Open now' : 'Closed', 
      isOpen 
    }
  }

  const businessStatus = getBusinessStatus(location.businessHours)
  const locationUrl = `https://sacavia.com/locations/${location.id}`

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with image */}
          <div className="relative h-48">
            <Image
              src={location.featuredImage?.url || '/images/placeholder-location.jpg'}
              alt={location.name}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="absolute top-4 left-4 flex flex-wrap gap-1">
                {categories.slice(0, 2).map((category, index) => (
                  <Badge key={index} variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                    {category.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Title and rating */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{location.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    <span>({reviewCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className={businessStatus.isOpen ? 'text-green-600' : 'text-red-600'}>
                    {businessStatus.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {(location.shortDescription || location.description) && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {location.shortDescription || location.description}
              </p>
            )}

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">{formatAddress(location.address)}</span>
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              {location.contactInfo?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <a 
                    href={`tel:${location.contactInfo.phone}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {location.contactInfo.phone}
                  </a>
                </div>
              )}
              
              {location.contactInfo?.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <a 
                    href={location.contactInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Visit Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Gallery count */}
            {location.gallery && location.gallery.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Camera className="w-4 h-4" />
                <span>{location.gallery.length} photos</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  if (location.coordinates) {
                    window.open(`https://maps.google.com/?q=${location.coordinates.latitude},${location.coordinates.longitude}`, '_blank')
                  }
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
              
              <div className="flex gap-2">
                {location.contactInfo?.phone && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`tel:${location.contactInfo.phone}`, '_self')}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`/locations/${location.id}`, '_blank')}
                >
                  View Details
                </Button>
              </div>

              {isUnclaimed && (
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => setIsClaimModalOpen(true)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Claim This Business
                </Button>
              )}
              
              <EnhancedShareButton 
                locationName={location.name}
                description={location.shortDescription || location.description || ''}
                locationUrl={locationUrl}
                variant="outline"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <ClaimBusinessModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        locationId={location.id}
        locationName={location.name}
      />
    </>
  )
}
