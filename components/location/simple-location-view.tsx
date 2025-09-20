'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Star, 
  DollarSign,
  Lightbulb,
  Building2,
  Navigation,
  ExternalLink,
  CheckCircle,
  Users,
  Camera
} from 'lucide-react'
import { ClaimBusinessModal } from '@/components/location/claim-business-modal'
import { EnhancedShareButton } from '@/components/ui/enhanced-share-button'
import Image from 'next/image'

interface SimpleLocationViewProps {
  location: {
    id: string
    name: string
    description?: string
    shortDescription?: string
    address: any
    featuredImage?: any
    gallery?: any[]
    businessHours?: any[]
    contactInfo?: any
    coordinates?: { latitude: number; longitude: number }
    categories?: Array<{ name: string; id: string }>
    averageRating?: number
    reviewCount?: number
    priceRange?: string
    insiderTips?: any[]
    ownership?: {
      claimStatus?: 'unclaimed' | 'pending' | 'approved'
    }
  }
}

export function SimpleLocationView({ location }: SimpleLocationViewProps) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative">
        <div className="h-96 lg:h-[500px] relative overflow-hidden">
          <Image
            src={location.featuredImage?.url || '/images/placeholder-location.jpg'}
            alt={location.name}
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
              <div className="max-w-3xl">
                {/* Categories */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {categories.slice(0, 2).map((category, index) => (
                      <Badge key={index} variant="secondary" className="bg-white/20 text-white border-white/30">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Location Name & Rating */}
                <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  {location.name}
                </h1>
                
                <div className="flex items-center gap-4 mb-6 text-white/90">
                  {rating > 0 && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{rating.toFixed(1)}</span>
                      <span className="text-sm">({reviewCount} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span className="text-sm">{formatAddress(location.address)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span className={`text-sm font-medium ${businessStatus.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                      {businessStatus.status}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-lg"
                    onClick={() => {
                      if (location.coordinates) {
                        window.open(`https://maps.google.com/?q=${location.coordinates.latitude},${location.coordinates.longitude}`, '_blank')
                      }
                    }}
                  >
                    <Navigation className="h-5 w-5 mr-2" />
                    Get Directions
                  </Button>
                  
                  {location.contactInfo?.phone && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-green-400/70 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 backdrop-blur-xl font-semibold shadow-lg transition-all duration-200"
                      onClick={() => window.open(`tel:${location.contactInfo.phone}`, '_self')}
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      Call
                    </Button>
                  )}
                  
                  {isUnclaimed && (
                    <Button
                      size="lg"
                      className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg"
                      onClick={() => setIsClaimModalOpen(true)}
                    >
                      <Building2 className="h-5 w-5 mr-2" />
                      Claim This Business
                    </Button>
                  )}
                  
                  <EnhancedShareButton 
                    locationName={location.name}
                    description={location.shortDescription || location.description || ''}
                    locationUrl={locationUrl}
                    variant="outline"
                    size="lg"
                    className="border-blue-400/70 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 backdrop-blur-xl font-semibold shadow-lg transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-primary">About {location.name}</h2>
                {(location.shortDescription || location.description) && (
                  <div className="prose prose-gray max-w-none mb-6">
                    <p className="text-lg leading-relaxed text-muted-foreground">
                      {location.shortDescription || location.description}
                    </p>
                  </div>
                )}
                
                {location.insiderTips && location.insiderTips.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-1">Insider Tip</h4>
                        <p className="text-amber-700 text-sm">{location.insiderTips[0]?.tip}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gallery Section */}
            {location.gallery && location.gallery.length > 0 && (
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-primary">Photos</h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm">{location.gallery.length} photos</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {location.gallery.slice(0, 6).map((item, index) => (
                      <div key={index} className="relative aspect-square group cursor-pointer">
                        <Image
                          src={item.url || item.image?.url}
                          alt={`${location.name} - Image ${index + 1}`}
                          fill
                          className="object-cover rounded-lg transition-transform group-hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="bg-white/95 backdrop-blur-md border-2 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-primary">Contact Information</h3>
                <div className="space-y-4">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground text-sm">{formatAddress(location.address)}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  {location.contactInfo?.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <a 
                          href={`tel:${location.contactInfo.phone}`}
                          className="text-muted-foreground text-sm hover:text-primary transition-colors"
                        >
                          {location.contactInfo.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {location.contactInfo?.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a 
                          href={location.contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground text-sm hover:text-primary transition-colors flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Price Range */}
                  {location.priceRange && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Price Range</p>
                        <p className="text-muted-foreground text-sm">{location.priceRange}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            {location.businessHours && location.businessHours.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Hours of Operation</h3>
                  <div className="space-y-3">
                    {location.businessHours.map((hours, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="font-medium capitalize">{hours.day}</span>
                        <span className="text-muted-foreground">
                          {hours.open && hours.close ? (
                            `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                          ) : (
                            'Closed'
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category, index) => (
                      <Badge key={index} variant="outline">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Claim Business CTA */}
            {isUnclaimed && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6 text-center">
                  <Building2 className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-orange-800 mb-2">Own This Business?</h3>
                  <p className="text-orange-700 text-sm mb-4">
                    Claim your business listing to manage information, respond to reviews, and connect with customers.
                  </p>
                  <Button
                    onClick={() => setIsClaimModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Claim This Business
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ClaimBusinessModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        locationId={location.id}
        locationName={location.name}
      />
    </div>
  )
}
