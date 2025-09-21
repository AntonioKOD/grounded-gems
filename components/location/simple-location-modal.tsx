'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Camera,
  Lightbulb,
  Plus,
  Loader2
} from 'lucide-react'
import { EnhancedClaimModal } from '@/components/location/enhanced-claim-modal'
import { EnhancedShareButton } from '@/components/ui/enhanced-share-button'
import { PhotoSubmissionModal } from '@/components/location/photo-submission-modal'
import { UserPhotosSection } from '@/components/location/user-photos-section'
import StructuredInsiderTips from '@/components/location/structured-insider-tips'
import SubmitInsiderTipModal from '@/components/location/submit-insider-tip-modal'
import { toast } from 'sonner'
import Image from 'next/image'
import { formatAddressForDetails } from '@/lib/address-utils'
import { formatLocationName } from '@/lib/location-name-utils'
import OptimizedImage from "@/components/ui/optimized-image"

interface SimpleLocationModalProps {
  location: {
    id: string
    slug?: string
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
    insiderTips?: any[] | string
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

// Helper function to get the main image URL
const getMainImageUrl = (location: any): string => {
  try {
    // First try featured image
    if (location.featuredImage) {
      if (typeof location.featuredImage === 'string') {
        return location.featuredImage
      } else if (location.featuredImage.url) {
        return location.featuredImage.url
      }
    }
    
    // Then try first gallery image
    if (location.gallery && location.gallery.length > 0) {
      const firstGalleryItem = location.gallery[0]
      if (firstGalleryItem.image) {
        if (typeof firstGalleryItem.image === 'string') {
          return firstGalleryItem.image
        } else if (firstGalleryItem.image.url) {
          return firstGalleryItem.image.url
        }
      }
    }
    
    // Fallback to placeholder
    return '/placeholder.svg'
  } catch (error) {
    console.warn('Error getting main image URL:', error)
    return '/placeholder.svg'
  }
}

// Helper function to get all gallery images
const getAllGalleryImages = (location: any): string[] => {
  try {
    const images: string[] = []
    
    // Add featured image if it exists
    if (location.featuredImage) {
      const featuredUrl = typeof location.featuredImage === 'string' 
        ? location.featuredImage 
        : location.featuredImage.url
      if (featuredUrl) {
        images.push(featuredUrl)
      }
    }
    
    // Add gallery images
    if (location.gallery && location.gallery.length > 0) {
      location.gallery.forEach((item: any) => {
        if (item.image) {
          const imageUrl = typeof item.image === 'string' 
            ? item.image 
            : item.image.url
          if (imageUrl && !images.includes(imageUrl)) {
            images.push(imageUrl)
          }
        }
      })
    }
    
    return images.length > 0 ? images : ['/placeholder.svg']
  } catch (error) {
    console.warn('Error getting gallery images:', error)
    return ['/placeholder.svg']
  }
}

export function SimpleLocationModal({ location, isOpen, onClose }: SimpleLocationModalProps) {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [isTipModalOpen, setIsTipModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [user, setUser] = useState<any>(null)

  const isUnclaimed = location.ownership?.claimStatus === 'unclaimed' || !location.ownership
  const allImages = getAllGalleryImages(location)
  
  console.log('🔴 SimpleLocationModal:', {
    locationName: location.name,
    isOpen,
    isUnclaimed,
    ownership: location.ownership,
    address: location.address,
    claimStatus: location.ownership?.claimStatus
  })

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        })
        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }
    
    if (isOpen) {
      fetchUser()
    }
  }, [isOpen])

  const handleAddPhoto = () => {
    if (!user) {
      toast.error('Please log in to share photos')
      return
    }
    setIsPhotoModalOpen(true)
  }

  const handleAddTip = () => {
    if (!user) {
      toast.error('Please log in to share insider tips')
      return
    }
    setIsTipModalOpen(true)
  }
  const rating = location.averageRating || 0
  const reviewCount = location.reviewCount || 0
  const categories = location.categories || []

  // Helper functions
  const formatAddress = (address: any): string => {
    return formatAddressForDetails(address)
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
  const locationUrl = `https://sacavia.com/locations/${location.slug || location.id}`

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
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with main image */}
          <div className="relative h-48">
            <OptimizedImage
              src={getMainImageUrl(location)}
              alt={location.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/40" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-800 transition-colors shadow-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="absolute top-4 left-4 flex flex-wrap gap-1">
                {categories.slice(0, 2).map((category, index) => (
                  <Badge key={index} variant="secondary" className="bg-[#ff6b6b] text-white border-[#ff6b6b] text-xs font-medium">
                    {category.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title and rating */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{formatLocationName(location.name)}</h2>
              <div className="flex items-center gap-6 text-sm">
                {rating > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold text-gray-800">{rating.toFixed(1)}</span>
                    <span className="text-gray-600">({reviewCount} reviews)</span>
                  </div>
                )}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${businessStatus.isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                  <Clock className={`w-4 h-4 ${businessStatus.isOpen ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={`font-medium ${businessStatus.isOpen ? 'text-green-700' : 'text-red-700'}`}>
                    {businessStatus.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                  value="info" 
                  className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-white font-medium"
                >
                  Info
                </TabsTrigger>
                <TabsTrigger 
                  value="tips"
                  className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-white font-medium"
                >
                  Tips
                </TabsTrigger>
                <TabsTrigger 
                  value="photos"
                  className="data-[state=active]:bg-[#ff6b6b] data-[state=active]:text-white font-medium"
                >
                  Photos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4">
                <ScrollArea className="h-64">
                  <div className="space-y-4 pr-4">
                    {/* Description */}
                    {(location.shortDescription || location.description) && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {location.shortDescription || location.description}
                        </p>
                      </div>
                    )}

                    {/* Address */}
                    {location.address && formatAddress(location.address) !== 'Address not available' && (
                      <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 font-medium">{formatAddress(location.address)}</span>
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="space-y-3">
                      {location.contactInfo?.phone && (
                        <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg">
                          <Phone className="w-5 h-5 text-green-600" />
                          <a 
                            href={`tel:${location.contactInfo.phone}`}
                            className="text-sm text-green-700 hover:text-green-800 font-medium"
                          >
                            {location.contactInfo.phone}
                          </a>
                        </div>
                      )}
                      
                      {location.contactInfo?.website && (
                        <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg">
                          <Globe className="w-5 h-5 text-purple-600" />
                          <a 
                            href={location.contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-700 hover:text-purple-800 flex items-center gap-1 font-medium"
                          >
                            Visit Website
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Photos Gallery */}
                    {allImages.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <Camera className="w-5 h-5 text-gray-600" />
                          <span className="font-medium">{allImages.length} photo{allImages.length !== 1 ? 's' : ''} available</span>
                        </div>
                        
                        {/* Image Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {allImages.slice(0, 4).map((imageUrl, index) => (
                            <div key={index} className="relative h-24 rounded-lg overflow-hidden">
                              <OptimizedImage
                                src={imageUrl}
                                alt={`${location.name} photo ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 25vw"
                              />
                            </div>
                          ))}
                        </div>
                        
                        {/* Show more indicator if there are more than 4 images */}
                        {allImages.length > 4 && (
                          <div className="text-center">
                            <span className="text-sm text-gray-500">
                              +{allImages.length - 4} more photo{allImages.length - 4 !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tips" className="mt-4">
                <ScrollArea className="h-64">
                  <div className="pr-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Insider Tips</h3>
                      <Button
                        size="sm"
                        onClick={handleAddTip}
                        className="bg-[#ff6b6b] hover:bg-[#e55555] text-white font-medium"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Tip
                      </Button>
                    </div>
                    <StructuredInsiderTips 
                      tips={location.insiderTips || []}
                      locationName={location.name}
                      locationId={location.id}
                      showAddTip={false}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                <ScrollArea className="h-64">
                  <div className="pr-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Community Photos</h3>
                      <Button
                        size="sm"
                        onClick={handleAddPhoto}
                        className="bg-[#ff6b6b] hover:bg-[#e55555] text-white font-medium"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Photo
                      </Button>
                    </div>
                    <UserPhotosSection 
                      locationId={location.id}
                      locationName={location.name}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-4 border-t border-gray-200 mt-4">
              <Button
                size="sm"
                className="w-full bg-[#ff6b6b] hover:bg-[#e55555] text-white font-medium py-2"
                onClick={() => {
                  if (location.coordinates?.latitude && location.coordinates?.longitude) {
                    window.open(`https://maps.google.com/?q=${location.coordinates.latitude},${location.coordinates.longitude}`, '_blank')
                  } else if (location.address) {
                    // Fallback to address-based directions if coordinates are not available
                    const addressString = encodeURIComponent(formatAddress(location.address))
                    window.open(`https://maps.google.com/?q=${addressString}`, '_blank')
                  } else {
                    // Final fallback to location name
                    const locationName = encodeURIComponent(location.name)
                    window.open(`https://maps.google.com/?q=${locationName}`, '_blank')
                  }
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
              
              <div className="flex gap-2">
                {location.contactInfo?.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-[#4ecdc4] text-[#4ecdc4] hover:bg-[#4ecdc4] hover:text-white font-medium py-2"
                    onClick={() => window.open(`tel:${location.contactInfo.phone}`, '_self')}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-100 font-medium py-2"
                  onClick={() => window.open(`/locations/${location.slug || location.id}`, '_blank')}
                >
                  View Details
                </Button>
              </div>

              {isUnclaimed && (
                <Button
                  size="sm"
                  className="w-full bg-[#ffe66d] hover:bg-[#f5d547] text-gray-800 font-medium py-2"
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
                className="w-full border-gray-300 text-gray-600 hover:bg-gray-100 font-medium py-2"
              />
            </div>
          </div>
        </div>
      </div>

      <EnhancedClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        locationId={location.id}
        locationName={location.name}
        locationData={location}
      />

      <PhotoSubmissionModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        location={{
          id: location.id,
          name: location.name
        }}
        user={user}
      />

      <SubmitInsiderTipModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        locationId={location.id}
        locationName={location.name}
        onSuccess={() => {
          setIsTipModalOpen(false)
          toast.success('Insider tip submitted successfully!')
        }}
      />
    </>
  )
}
