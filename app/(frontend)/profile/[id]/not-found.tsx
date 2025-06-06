'use client'

import Link from 'next/link'
import { Home, ArrowLeft, User } from 'lucide-react'

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">User Not Found</h1>
          <p className="text-gray-600">
            This user profile doesn&apos;t exist or may have been removed.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/explorer"
            className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Explore Users
          </Link>
          
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.back()
              }
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <p className="text-sm text-gray-500">
          Try searching for other users or check if the profile URL is correct.
        </p>
      </div>
    </div>
  )
} 