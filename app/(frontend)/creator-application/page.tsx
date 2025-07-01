import { getServerSideUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import CreatorApplicationForm from '@/components/creator/creator-application-form'

export default async function CreatorApplicationPage() {
  const user = await getServerSideUser()

  if (!user) {
    redirect('/login?redirect=/creator-application')
  }

  // Check if user is already a creator
  if (user.role === 'creator' || user.isCreator) {
    redirect('/profile/' + user.id + '/creator-dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CreatorApplicationForm 
        userId={user.id}
      />
    </div>
  )
} 