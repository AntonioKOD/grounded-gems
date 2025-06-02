'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import EditLocationForm from './edit-location-form'

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
}

export default function EditLocationPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params.id as string
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

          // Load location data
          const locationResponse = await fetch(`/api/locations/${locationId}`)
          if (!locationResponse.ok) {
            toast.error('Failed to load location data')
            router.push('/map')
            return
          }

          const locationData = await locationResponse.json()
          
          // Check if user owns this location
          if (locationData.location.createdBy !== userData.user.id) {
            toast.error('You can only edit your own locations')
            router.push(`/profile/${userData.user.id}/location-dashboard`)
            return
          }

          // Set location data for editing
          setLocation(locationData.location)
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
        router.push('/map')
      } finally {
        setIsLoading(false)
      }
    }

    loadLocationAndUser()
  }, [locationId, router])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-t-[#FF6B6B] border-r-[#FF6B6B]/30 border-b-[#FF6B6B]/10 border-l-[#FF6B6B]/60 animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Location Not Found</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to edit this location, or it doesn&apos;t exist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Location</h1>
        <p className="text-gray-600 mt-1">Update your location information</p>
      </div>
      
      <EditLocationForm location={location} currentUser={currentUser} />
    </div>
  )
} 