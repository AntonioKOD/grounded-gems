import { Suspense } from 'react'
import AdminAuthChecker from '@/components/admin/admin-auth-checker'
import ReviewManagementPanel from '@/components/admin/review-management-panel'

export default function AdminReviewsPage() {
  return (
    <AdminAuthChecker>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }>
            <ReviewManagementPanel />
          </Suspense>
        </div>
      </div>
    </AdminAuthChecker>
  )
} 