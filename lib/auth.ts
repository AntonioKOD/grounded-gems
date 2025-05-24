// Client-side auth utilities

// Function to check if user is authenticated on client side
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for auth cookie
  const cookies = document.cookie.split(';')
  return cookies.some(cookie => cookie.trim().startsWith('payload-token='))
}

// Function to get user data from client-side API
export async function fetchUserData(options?: { timeout?: number }) {
  const timeout = options?.timeout || 2000
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch("/api/users/me", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=30",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 401) {
        return null
      }
      throw new Error(`Failed to fetch user: ${response.status}`)
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log("User fetch timed out")
    } else {
      console.error("Error fetching user:", error)
    }
    return null
  }
}

// Function to logout user
export async function logoutUser() {
  try {
    const response = await fetch("/api/users/logout", {
      method: "POST",
      credentials: "include",
    })
    
    if (response.ok) {
      window.dispatchEvent(new Event("logout-success"))
      return true
    }
    return false
  } catch (error) {
    console.error("Logout error:", error)
    return false
  }
}
