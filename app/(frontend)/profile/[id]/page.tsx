// app/(frontend)/profile/[id]/page.tsx
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getUserbyId } from "@/app/actions"
import ProfileContent from "@/components/profile/profile-content"
import ProfileSkeleton from "@/components/profile/profile-skeleton"
import type { UserProfile } from "@/types/user"
import ResponsiveFeed from "@/components/feed/responsive-feed"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import PostsSkeleton from "@/components/feed/posts-skeleton"
import ProfileHeader from "@/components/profile/profile-header"

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
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent initialUserData={initialUserData} userId={id} />
      </Suspense>
    )
  } catch (error) {
    console.error("Error fetching user:", error)
    notFound()
  }
}