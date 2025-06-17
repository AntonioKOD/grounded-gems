import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

interface UsernameCheckResult {
  available: boolean | null
  error: string | null
  message: string | null
  isChecking: boolean
}

export function useUsernameAvailability(username: string, enabled: boolean = true) {
  const [result, setResult] = useState<UsernameCheckResult>({
    available: null,
    error: null,
    message: null,
    isChecking: false
  })

  // Debounce the username to avoid too many API calls
  const debouncedUsername = useDebounce(username, 500)

  const checkUsername = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3 || !enabled) {
      setResult({
        available: null,
        error: null,
        message: null,
        isChecking: false
      })
      return
    }

    setResult(prev => ({ ...prev, isChecking: true, error: null, message: null }))

    try {
      const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(usernameToCheck)}`)
      const data = await response.json()

      if (response.ok) {
        setResult({
          available: data.available,
          error: data.available ? null : (data.error || 'Username is not available'),
          message: data.available ? (data.message || 'Username is available!') : null,
          isChecking: false
        })
      } else {
        setResult({
          available: false,
          error: data.error || 'Failed to check username availability',
          message: null,
          isChecking: false
        })
      }
    } catch (error) {
      console.error('Username availability check failed:', error)
      setResult({
        available: null,
        error: 'Unable to check username availability. Please try again.',
        message: null,
        isChecking: false
      })
    }
  }, [enabled])

  useEffect(() => {
    checkUsername(debouncedUsername)
  }, [debouncedUsername, checkUsername])

  return {
    ...result,
    recheck: () => checkUsername(username)
  }
}

// Helper hook for generating username suggestions
export function useUsernameSuggestions(baseName: string) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateSuggestions = useCallback(async (name: string) => {
    if (!name || name.length < 2) {
      setSuggestions([])
      return
    }

    setIsGenerating(true)
    
    try {
      const cleanName = name.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20)

      if (!cleanName) {
        setSuggestions([])
        setIsGenerating(false)
        return
      }

      // Generate various suggestions
      const baseSuggestions = [
        cleanName,
        cleanName + Math.floor(Math.random() * 100),
        cleanName + Math.floor(Math.random() * 1000),
        cleanName + '_' + Math.floor(Math.random() * 100),
        cleanName + Math.floor(Math.random() * 10000),
        'the_' + cleanName,
        cleanName + '_official',
        cleanName + '_real'
      ]

      // Check availability for each suggestion
      const checkedSuggestions = []
      for (const suggestion of baseSuggestions) {
        if (suggestion.length >= 3 && suggestion.length <= 30) {
          try {
            const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(suggestion)}`)
            const data = await response.json()
            
            if (response.ok && data.available) {
              checkedSuggestions.push(suggestion)
              if (checkedSuggestions.length >= 5) break // Limit to 5 suggestions
            }
          } catch (error) {
            // Skip this suggestion if check fails
            continue
          }
        }
      }

      setSuggestions(checkedSuggestions)
    } catch (error) {
      console.error('Failed to generate username suggestions:', error)
      setSuggestions([])
    } finally {
      setIsGenerating(false)
    }
  }, [])

  useEffect(() => {
    generateSuggestions(baseName)
  }, [baseName, generateSuggestions])

  return {
    suggestions,
    isGenerating,
    generateSuggestions: () => generateSuggestions(baseName)
  }
} 