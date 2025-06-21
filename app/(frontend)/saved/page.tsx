import { Suspense } from 'react'
import SavedLocationsClient from './saved-locations-client'

// Force dynamic rendering for user-specific content
export const dynamic = 'force-dynamic'

export default function SavedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent mb-2">
            Saved Locations
          </h1>
          <p className="text-gray-600">
            Your collection of favorite places to visit
          </p>
        </div>

        <Suspense 
          fallback={
            <div className="space-y-6">
              {/* Loading skeleton */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gray-200 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <SavedLocationsClient />
        </Suspense>
      </div>
    </div>
  )
} 