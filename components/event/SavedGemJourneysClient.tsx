"use client"

import React from "react"
import { Bookmark, Sparkles, MapPin } from "lucide-react"
import Link from "next/link"
import { unsaveGemJourney } from '@/app/(frontend)/events/actions'
import { toast } from 'sonner'
import { useRouter } from "next/navigation"

export default function SavedGemJourneysClient({ plans }: { plans: any[] }) {
  const [localPlans, setLocalPlans] = React.useState(plans)
  const router = useRouter();
  async function handleUnsave(journeyId: string) {
    const res = await unsaveGemJourney(journeyId)
    if (res.success) {
      setLocalPlans(prev => prev.filter(plan => plan.id !== journeyId))
      toast.success('Journey unsaved')
    } else {
      toast.error(res.error || 'Failed to unsave journey')
    }
  }

  if (!localPlans || localPlans.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-gray-50 shadow-sm">
        <span className="text-gray-500">No saved Hangout Plans yet.</span>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-gray-100">
      {localPlans.map(plan => {
        let ownerId = plan.owner;
        if (ownerId && typeof ownerId === 'object') {
          ownerId = ownerId.id || ownerId._id;
        }
        ownerId = ownerId || plan.userId;
        
        // Extract location metadata
        const hasCoordinates = plan.coordinates?.latitude && plan.coordinates?.longitude
        const nearbyLocationsCount = plan.aiMetadata?.nearbyLocationsCount || 0
        const userLocation = plan.aiMetadata?.userLocation
        const usedRealLocations = plan.usedRealLocations
        
        return (
          <div
            key={plan.id}
            className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
            onClick={e => {
              if ((e.target as HTMLElement).closest("button")) return;
              router.push(`/events/journey/${plan.id}`);
            }}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FFD93D]/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300"></div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-xl shadow-md">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#FF6B6B] transition-colors line-clamp-1">
                      {plan.title}
                    </h3>
                    {plan.type && (
                      <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#FFD93D]/20 to-[#FFE66D]/20 text-[#B8860B] border border-[#FFD93D]/30">
                        {plan.type === 'date' ? '💕 Date' : plan.type === 'group' ? '👥 Group' : plan.type === 'friend_group' ? '🎉 Friend Group' : plan.type}
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleUnsave(plan.id);
                  }}
                  className="p-2 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100"
                  title="Remove from saved"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-2">
                {plan.summary}
              </p>
              
              {/* Location Enhancement Badge */}
              {(hasCoordinates || nearbyLocationsCount > 0 || usedRealLocations) && (
                <div className="mb-3 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-green-100 rounded">
                      <MapPin className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="text-xs text-green-700 space-y-0.5">
                      {userLocation && (
                        <p className="font-medium">📍 {userLocation}</p>
                      )}
                      {nearbyLocationsCount > 0 && (
                        <p>🎯 {nearbyLocationsCount} nearby locations found</p>
                      )}
                      {usedRealLocations && (
                        <p>✨ Uses real verified places</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>Saved on {plan.date}</span>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-[#4ECDC4] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View Details</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B6B]/5 to-[#4ECDC4]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
          </div>
        )
      })}
    </div>
  )
} 