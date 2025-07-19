import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getCategories, getUserProfile } from "@/app/actions"
import ProfileContainer from "@/components/profile/profile-container"
import ProfileSkeleton from "@/components/profile/profile-skeleton"
import type { UserProfile } from "@/types/user"
import { Button } from "@/components/ui/button"
import { getServerSideUser } from "@/lib/auth-server"

// Force dynamic rendering to ensure fresh data after redirects
export const dynamic = 'force-dynamic'

// 1. Async function so we can await params  
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // 2. Await params and destructure the id
  const { id } = await params

  // Validate ID format before making the request
  if (!id || id.trim() === '') {
    console.error(`Invalid user ID: empty or null`)
    notFound()
  }

  const cleanId = id.trim()
  // MongoDB ObjectIds are 24 characters, but let's be more lenient for edge cases
  if (cleanId.length < 8) {
    console.error(`Invalid user ID format: too short (${cleanId})`)
    notFound()
  }

  try {
    console.log(`Attempting to fetch user profile for ID: ${cleanId}`)
    console.log(`ID length: ${cleanId.length}, ID type: ${typeof cleanId}`)
    
    // Get current user for better data fetching
    let currentUser = null
    try {
      currentUser = await getServerSideUser()
    } catch (authError) {
      console.log("No authenticated user found, continuing as guest")
    }
    
    // 3. Get initial user data for SSR with better error handling
    console.log(`Calling getUserProfile with cleanId: ${cleanId}`)
    const initialUserData = await getUserProfile(cleanId, currentUser?.id) as UserProfile | null
    
    // 4. If user not found, show 404 page
    if (!initialUserData) {
      console.log(`User profile not found for ID: ${cleanId}`)
      console.log(`getUserProfile returned null for ID: ${cleanId}`)
      notFound()
    }

    console.log(`Successfully loaded profile for user: ${initialUserData.name || 'Unknown'} (ID: ${cleanId})`)

    return (
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContainer 
          userId={cleanId}
          key={cleanId} // Force re-render if ID changes
        />
      </Suspense>
      
    )
  } catch (error) {
    console.error(`Error fetching user profile for ID ${cleanId}:`, error)
    
    // Check if it's a specific error type
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        console.log(`User with ID ${cleanId} not found (404 error)`)
        notFound()
      }
      if (error.message.includes('NEXT_HTTP_ERROR_FALLBACK')) {
        console.log(`Next.js HTTP error fallback triggered for user ID ${cleanId}`)
        notFound()
      }
      if (error.message.includes('Invalid ID') || error.message.includes('validation')) {
        console.log(`Invalid user ID format: ${cleanId}`)
        notFound()
      }
    }
    
    // For any other error, also show 404 to prevent error boundary
    console.log(`Showing 404 for user ID ${cleanId} due to unexpected error:`, error)
    notFound()
  }
}