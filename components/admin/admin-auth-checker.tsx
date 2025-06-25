"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import AdminAccessDenied from './admin-access-denied'

interface AdminAuthCheckerProps {
  children: React.ReactNode
}

export default function AdminAuthChecker({ children }: AdminAuthCheckerProps) {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'denied' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        // Check if we have authentication headers from middleware
        const response = await fetch(window.location.href, {
          method: 'HEAD',
          credentials: 'include'
        })

        const authRequired = response.headers.get('x-admin-auth-required')
        const authVerified = response.headers.get('x-admin-auth-verified')
        const noToken = response.headers.get('x-admin-no-token')
        const invalidToken = response.headers.get('x-admin-invalid-token')
        const tokenExpired = response.headers.get('x-admin-token-expired')
        const authError = response.headers.get('x-admin-auth-error')

        if (authVerified === 'true') {
          setAuthStatus('authenticated')
          return
        }

        if (authRequired === 'true') {
          if (noToken === 'true') {
            // No token found, redirect to login
            router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
            return
          }

          if (invalidToken === 'true') {
            setErrorMessage('Invalid authentication token. Please log in again.')
            setTimeout(() => {
              router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
            }, 2000)
            return
          }

          if (tokenExpired === 'true') {
            setErrorMessage('Your session has expired. Redirecting to login...')
            setTimeout(() => {
              router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
            }, 2000)
            return
          }

          if (authError === 'true') {
            setErrorMessage('Authentication error occurred. Please try again.')
            setTimeout(() => {
              router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
            }, 2000)
            return
          }

          // Generic auth required
          setAuthStatus('denied')
          return
        }

        // Fallback: make API call to verify auth
        const authResponse = await fetch('/api/auth-check', {
          credentials: 'include'
        })

        if (!authResponse.ok) {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
          return
        }

        const authData = await authResponse.json()
        
        if (authData.authenticated && authData.isAdmin) {
          setAuthStatus('authenticated')
        } else if (authData.authenticated && !authData.isAdmin) {
          setAuthStatus('denied')
        } else {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
        }

      } catch (error) {
        console.error('Error checking admin authentication:', error)
        setAuthStatus('error')
        setErrorMessage('Error checking authentication. Please try again.')
        setTimeout(() => {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
        }, 3000)
      }
    }

    checkAdminAuth()
  }, [router])

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Verifying Admin Access</h2>
          <p className="text-gray-600">Please wait while we verify your credentials...</p>
        </div>
      </div>
    )
  }

  if (authStatus === 'denied') {
    return <AdminAccessDenied />
  }

  if (authStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <p className="text-sm text-gray-500">You will be redirected to login shortly...</p>
        </div>
      </div>
    )
  }

  // authStatus === 'authenticated'
  return <>{children}</>
} 