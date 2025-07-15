export const dynamic = "force-dynamic";

import { Suspense } from 'react'
import PhotoReviewPanel from '@/components/admin/photo-review-panel'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Photo Reviews | Admin',
  description: 'Review and moderate user-submitted photos'
}

export default function PhotoReviewsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Photo Reviews</h1>
        <p className="text-gray-600 mt-2">Review and moderate user-submitted photos</p>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <PhotoReviewPanel />
      </Suspense>
    </div>
  )
} 