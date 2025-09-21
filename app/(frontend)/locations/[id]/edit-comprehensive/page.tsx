'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ClaimLocationForm from '@/app/(frontend)/add-location/add-location-form'

export default function EditComprehensiveLocationPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params.id as string
  const [isLoading, setIsLoading] = useState(true)
  const [location, setLocation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch location data for comprehensive editing
  useEffect(() => {
    const fetchLocationData = async () => {
      if (!locationId) return
      
      setIsLoading(true)
      try {
        const response = await fetch(`/api/locations/${locationId}/edit-comprehensive`)
        if (!response.ok) {
          if (response.status === 403) {
            toast.error("Access Denied: You can only edit locations you own or have permission to edit.")
            router.push('/map')
            return
          } else if (response.status === 404) {
            toast.error("Location Not Found: The location you're trying to edit doesn't exist.")
            router.push('/map')
            return
          }
          throw new Error('Failed to fetch location data')
        }
        
        const data = await response.json()
        setLocation(data.location)
        
        toast.success("Location Loaded: You can now edit all aspects of this location.")
        
      } catch (error) {
        console.error('Error fetching location data for edit:', error)
        setError('Failed to load location data. Please try again.')
        toast.error("Error: Failed to load location data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchLocationData()
  }, [locationId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading location data...</p>
        </div>
      </div>
    )
  }

  if (error || !location) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Location</h1>
          <p className="text-gray-600 mb-6">{error || "The location you're trying to edit couldn't be loaded."}</p>
          <button 
            onClick={() => router.push('/map')} 
            className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white px-6 py-2 rounded-lg"
          >
            Back to Map
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Location - Comprehensive</h1>
          <p className="text-gray-600 mt-1">Update all aspects of your location information</p>
        </div>
        
        <ClaimLocationForm 
          initialLocation={location}
          isComprehensiveEditMode={true}
          editLocationId={locationId}
        />
      </div>
    </div>
  )
}
