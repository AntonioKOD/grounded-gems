import { cookies } from "next/headers"
import { getApiUrl } from "./utils"

// Cache for user data to avoid redundant fetches
const userCache = new Map<string, { user: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

export async function getServerSideUser() {
  try {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get("payload-token")?.value

    if (!payloadToken) {
      console.log("No auth cookie found")
      return null
    }

    // Check cache first
    const cached = userCache.get(payloadToken)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("Returning cached user data")
      return cached.user
    }

    // Use the utility function to get the correct API URL
    const apiUrl = getApiUrl('/api/users/me')
    console.log(`Making request to: ${apiUrl}`)
    
    // Use Promise.race with timeout to prevent slow requests
    const fetchPromise = fetch(apiUrl, {
      headers: {
        Cookie: `payload-token=${payloadToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000) // Increased to 5 seconds for production
    })

    const response = await Promise.race([fetchPromise, timeoutPromise])

    if (!response.ok) {
      console.log(`Failed to fetch user: ${response.status}`)
      return null
    }

    const data = await response.json()
    const user = data.user || null

    // Cache the result
    if (user) {
      userCache.set(payloadToken, { user, timestamp: Date.now() })
    }

    return user
  } catch (error) {
    console.error("Error fetching user data:", error)
    return null
  }
}

// Function to clear user cache (useful after logout or updates)
export function clearUserCache() {
  userCache.clear()
}

// Server action for logout that clears cache
export async function logoutUserAction() {
  'use server'
  
  try {
    // Clear the server-side cache
    clearUserCache()
    
    // You can add additional logout logic here if needed
    // For example, invalidating sessions, etc.
    
    return { success: true }
  } catch (error) {
    console.error('Error during logout:', error)
    return { success: false }
  }
} 