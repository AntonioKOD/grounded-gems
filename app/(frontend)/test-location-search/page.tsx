'use client'

import { useState } from 'react'
import { LocationSearch } from '@/components/ui/location-search'

interface LocationOption {
  id: string
  name: string
  fullName: string
  address: any
  neighborhood?: string
  coordinates?: { latitude: number; longitude: number }
  averageRating: number
  reviewCount: number
  categories: any[]
  imageUrl?: string
  isVerified: boolean
}

export default function TestLocationSearchPage() {
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Location Search Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Location Search Component</h2>
          
          <LocationSearch
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
            placeholder="Search for a location..."
            className="w-full"
          />
          
          {selectedLocation && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800">Selected Location:</h3>
              <pre className="mt-2 text-sm text-green-700">
                {JSON.stringify(selectedLocation, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 