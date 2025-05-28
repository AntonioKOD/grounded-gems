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

// Unified logout utility
export async function logoutUserUnified(router?: any, dispatch?: any) {
  try {
    // Call backend logout API to clear session/cookie
    await fetch("/api/users/logout", { method: "POST", credentials: "include" });
    // Dispatch logout event for other components
    window.dispatchEvent(new Event("logout-success"));
    // Optionally clear Redux/context state if dispatch is provided
    if (dispatch) {
      dispatch({ type: 'user/logout' });
      // Add any other state clearing actions here
    }
    // Redirect to login page if router is provided
    if (router) {
      router.push("/login");
    } else {
      window.location.href = "/login";
    }
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}

// For backward compatibility, keep the old logoutUser as a wrapper
export async function logoutUser() {
  return logoutUserUnified();
}
