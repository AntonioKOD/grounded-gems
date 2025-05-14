/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch current user')
        }
        
        const data = await response.json()
        setUser(data.user)
      } catch (err) {
        console.error('Error fetching current user:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  return { user, isLoading, error }
}
