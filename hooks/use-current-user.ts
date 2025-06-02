/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else if (response.status === 401) {
          // 401 is expected for unauthenticated users - not an error
          setUser(null)
        } else {
          // Other errors - log but don't show as error to user
          console.warn(`Unexpected response from /api/users/me: ${response.status}`)
          setUser(null)
        }
      } catch (err) {
        // Network errors - log but don't show as error to user for auth endpoints
        console.warn('Error fetching current user (may be expected for unauthenticated users):', err)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  return { user, isLoading, error }
}
