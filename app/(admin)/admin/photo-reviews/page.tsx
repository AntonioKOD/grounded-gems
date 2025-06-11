import PhotoReviewPanel from '@/components/admin/photo-review-panel'

export const dynamic = 'force-dynamic'

export default function PhotoReviewsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PhotoReviewPanel />
      </div>
    </div>
  )
} 