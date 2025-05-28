import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getUserbyId } from "@/app/actions"
import ProfileContent from "@/components/profile/profile-content"
import ProfileSkeleton from "@/components/profile/profile-skeleton"
import ProtectedRoute from '@/components/auth/protected-route'
import type { UserProfile } from "@/types/user"

// 1. Async function so we can await params  
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // 2. Await params and destructure the id
  const { id } = await params

  try {
    // 3. Get initial user data for SSR
    const initialUserData = await getUserbyId(id) as UserProfile | null
    
    // 4. If user not found, show 404 page
    if (!initialUserData) {
      notFound()
    }

    return (
      <ProtectedRoute>
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileContent initialUserData={initialUserData} userId={id} />
        </Suspense>
      </ProtectedRoute>
    )
  } catch (error) {
    console.error("Error fetching user:", error)
    notFound()
  }
}