import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCategories, getUserbyId } from "@/app/actions"
import ProfileContent from "@/components/profile/profile-content"
import ProfileSkeleton from "@/components/profile/profile-skeleton"
import type { UserProfile } from "@/types/user"
import { Button } from "@/components/ui/button"

// 1. Async function so we can await params  
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // 2. Await params and destructure the id
  const { id } = await params

  // Validate ID format before making the request
  if (!id || id.trim() === '' || id.length < 12) {
    console.error(`Invalid user ID format: ${id}`)
    notFound()
  }

  try {
    console.log(`Attempting to fetch user profile for ID: ${id}`)
    
    // 3. Get initial user data for SSR
    const initialUserData = await getUserbyId(id) as UserProfile | null
    
    // 4. If user not found, show 404 page
    if (!initialUserData) {
      console.log(`User profile not found for ID: ${id}`)
      notFound()
    }

    console.log(`Successfully loaded profile for user: ${initialUserData.name || 'Unknown'} (ID: ${id})`)

    return (
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent initialUserData={initialUserData} userId={id} />
      </Suspense>
      
    )
  } catch (error) {
    console.error(`Error fetching user profile for ID ${id}:`, error)
    
    // Check if it's a specific error type
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.log(`User with ID ${id} not found (404 error)`)
        notFound()
      }
      if (error.message.includes('NEXT_HTTP_ERROR_FALLBACK')) {
        console.log(`Next.js HTTP error fallback triggered for user ID ${id}`)
        notFound()
      }
    }
    
    // For any other error, also show 404 to prevent error boundary
    console.log(`Showing 404 for user ID ${id} due to unexpected error`)
    notFound()
  }
}