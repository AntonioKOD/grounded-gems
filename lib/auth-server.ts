import { cookies } from "next/headers"
import { getApiUrl } from "./utils"
import { headers } from "next/headers"
import { NextRequest } from "next/server"

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

// Mobile-specific authentication function that handles Bearer tokens
export async function getMobileUser(request: NextRequest | Request) {
  try {
    // Try to get authorization header from the request directly
    let authorization: string | null = null
    
    if ('headers' in request && typeof request.headers.get === 'function') {
      authorization = request.headers.get('authorization')
    } else {
      // Fallback to headers() function
      const headersList = await headers()
      authorization = headersList.get('authorization')
    }
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null
    }

    const token = authorization.replace('Bearer ', '')
    
    // Check cache first
    const cached = userCache.get(token)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.user
    }

    // Use the mobile-specific API endpoint
    const apiUrl = getApiUrl('/api/mobile/users/me')
    
    // Use Promise.race with timeout to prevent slow requests
    const fetchPromise = fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000)
    })

    const response = await Promise.race([fetchPromise, timeoutPromise])

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const user = data.user || null

    // Cache the result
    if (user) {
      userCache.set(token, { user, timestamp: Date.now() })
    }

    return user
  } catch (error) {
    console.error("Error fetching mobile user data:", error)
    return null
  }
}

// Unified function that tries both authentication methods
export async function getAuthenticatedUser(request: NextRequest | Request) {
  // First try mobile Bearer token authentication
  const mobileUser = await getMobileUser(request)
  
  if (mobileUser) {
    return mobileUser
  }
  
  // Fall back to cookie-based authentication
  return await getServerSideUser()
}

// Function to clear user cache (useful after logout or updates)
export function clearUserCache() {
  userCache.clear()
} 