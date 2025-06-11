'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EditLocationForm from '@/app/(frontend)/locations/[id]/edit/edit-location-form'

interface Location {
  id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  featuredImage?: { url: string } | string
  gallery?: Array<{ image: string; caption?: string }>
  categories?: Array<string | { id: string; name: string }>
  tags?: Array<{ tag: string }>
  address?: string | Record<string, string>
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
    socialMedia?: {
      facebook?: string
      twitter?: string
      instagram?: string
      linkedin?: string
    }
  }
  businessHours?: Array<{
    day: string
    open?: string
    close?: string
    closed?: boolean
  }>
  priceRange?: string
  bestTimeToVisit?: Array<{ season: string }>
  insiderTips?: string
  accessibility?: {
    wheelchairAccess?: boolean
    parking?: boolean
    other?: string
  }
  status: 'draft' | 'review' | 'published' | 'archived'
  isFeatured?: boolean
  isVerified?: boolean
  hasBusinessPartnership?: boolean
  partnershipDetails?: {
    partnerName?: string
    partnerContact?: string
    details?: string
  }
  meta?: {
    title?: string
    description?: string
    keywords?: string
  }
  createdBy?: string
  stats?: {
    views: number
    photos: number
    reviews: number
    saves: number
  }
}

export default function LocationDashboardEditPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const locationId = params.locationId as string
  const [location, setLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; email?: string } | null>(null)

  useEffect(() => {
    const loadLocationAndUser = async () => {
      try {
        // Load current user first
        const userResponse = await fetch('/api/users/me')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setCurrentUser(userData.user)

          // Check if user is viewing their own dashboard
          if (userData.user.id !== userId) {
            toast.error('You can only edit your own locations')
            router.push(`/profile/${userData.user.id}/location-dashboard`)
            return
          }

          // Load location data with edit permissions check
          const locationResponse = await fetch(`/api/locations/${locationId}/edit`)
          if (!locationResponse.ok) {
            if (locationResponse.status === 403) {
              toast.error('You can only edit your own locations')
              router.push(`/profile/${userId}/location-dashboard`)
              return
            } else if (locationResponse.status === 404) {
              toast.error('Location not found')
              router.push(`/profile/${userId}/location-dashboard`)
              return
            } else {
              toast.error('Failed to load location data')
              router.push(`/profile/${userId}/location-dashboard`)
              return
            }
          }

          const locationData = await locationResponse.json()
          
          // The API already checked permissions, so we can directly set the location
          if (locationData.success && locationData.location) {
            setLocation(locationData.location)
          } else {
            toast.error(locationData.error || 'Failed to load location data')
            router.push(`/profile/${userId}/location-dashboard`)
            return
          }
        } else if (userResponse.status === 401) {
          // User not authenticated
          toast.error('Please log in to edit locations')
          router.push('/login')
          return
        } else {
          // Other error
          console.warn('Unexpected response from /api/users/me:', userResponse.status)
          toast.error('Unable to verify user access')
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Error loading location:', error)
        toast.error('Failed to load location data')
        router.push(`/profile/${userId}/location-dashboard`)
      } finally {
        setIsLoading(false)
      }
    }

    loadLocationAndUser()
  }, [locationId, userId, router])

  const handleGoBack = () => {
    router.push(`/profile/${userId}/location-dashboard`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Location Not Found</h1>
            <p className="text-gray-600 mb-6">
              You don&apos;t have permission to edit this location, or it doesn&apos;t exist.
            </p>
            <Button onClick={handleGoBack} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header with back navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Location</h1>
          <p className="text-gray-600 mt-1">
            Update your location: <span className="font-medium">{location.name}</span>
          </p>
        </div>

        {/* Location stats if available */}
        {location.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FF6B6B]">{location.stats.views}</div>
              <div className="text-sm text-gray-600">Views</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{location.stats.photos}</div>
              <div className="text-sm text-gray-600">Photos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{location.stats.reviews}</div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{location.stats.saves}</div>
              <div className="text-sm text-gray-600">Saves</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit form */}
      <EditLocationForm 
        location={location} 
        currentUser={currentUser}
        onSuccess={() => {
          toast.success('Location updated successfully!')
          router.push(`/profile/${userId}/location-dashboard`)
        }}
        onCancel={handleGoBack}
      />
    </div>
  )
} 