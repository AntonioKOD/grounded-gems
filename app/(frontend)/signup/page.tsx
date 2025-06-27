"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { safeNavigate } from '@/lib/redirect-loop-prevention'

export default function SignupPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Use safe navigation instead of automatic redirect to prevent loops
    safeNavigate('/signup/enhanced', router)
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Taking you to signup...</p>
      </div>
    </div>
  )
}