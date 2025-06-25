"use client"

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ProfileJourneyRedirectPage() {
  const params = useParams() as { id: string; planId: string }
  const router = useRouter()

  useEffect(() => {
    // Redirect to the correct journey page
    // The invite emails point to /profile/[id]/journey/[planId] but the actual page is at /events/journey/[planId]
    router.replace(`/events/journey/${params.planId}`)
  }, [params.planId, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#FF6B6B] mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to your journey...</p>
      </div>
    </div>
  )
} 