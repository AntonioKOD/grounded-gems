'use client'

import { Suspense, useEffect, useState } from 'react'

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import BucketListClient from './BucketListClient'
import ProtectedRoute from '@/components/auth/protected-route'
import { useAppSelector } from '@/lib/hooks'

export default function BucketListPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.user)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && !isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isMounted, isLoading, isAuthenticated, router])

  if (!isMounted || isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      }>
        <BucketListClient userId={user?.id || ''} />
      </Suspense>
    </ProtectedRoute>
  )
} 