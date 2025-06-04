import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSideUser } from '@/lib/auth-server'
import BucketListClient from './BucketListClient'
import ProtectedRoute from '@/components/auth/protected-route'

export const metadata = {
  title: 'My Local Legends - Bucket Lists | Grounded Gems',
  description: 'Create and manage your personal bucket lists of local gems to explore.',
}

export default async function BucketListPage() {
  const user = await getServerSideUser()
  
  if (!user) {
    redirect('/login')
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
        <BucketListClient userId={user.id} />
      </Suspense>
    </ProtectedRoute>
  )
} 