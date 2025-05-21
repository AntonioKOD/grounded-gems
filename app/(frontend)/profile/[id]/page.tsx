// app/(frontend)/profile/[id]/page.tsx
import { Suspense } from "react"
import { getUserbyId } from "@/app/actions"
import ProfileContent from "@/components/profile/profile-content"
import ProfileSkeleton from "@/components/profile/profile-skeleton"
import type { UserProfile } from "@/types/user"

// 1. Async function so we can await params  
export default async function ProfilePage({
  params,            // 2. params is now a Promise<{ id: string }>
}: {
  params: Promise<{ id: string }>
}) {
  // 3. Await the params object before destructuring
  const { id } = await params

  // 4. Fetch your data as before
  const userData = await getUserbyId(id)
  const initialUserData: UserProfile | null = userData
    ? {
        id,
        email: userData.email ?? "unknown@example.com",
        name: userData.name,
        createdAt: userData.createdAt,
        bio: userData.bio,
        location: userData.location,
        profileImage: userData.profileImage,
        interests: userData.interests,
        isCreator: userData.isCreator,
        creatorLevel: userData.creatorLevel,
        socialLinks: userData.socialLinks,
        followerCount: userData.followerCount,
        followingCount: userData.followingCount,
        isFollowing: userData.isFollowing,
      }
    : null

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent initialUserData={initialUserData} userId={id} />
    </Suspense>
  )
}