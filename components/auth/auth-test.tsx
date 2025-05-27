"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"

export default function AuthTest() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [cookieExists, setCookieExists] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    authCheckTime: 0,
    redirectTime: 0,
    lastUpdate: Date.now()
  })

  useEffect(() => {
    // Check if auth cookie exists
    const cookies = document.cookie.split(';')
    const hasPayloadToken = cookies.some(cookie => cookie.trim().startsWith('payload-token='))
    setCookieExists(hasPayloadToken)
  }, [])

  // Monitor authentication performance
  useEffect(() => {
    const startTime = Date.now()
    
    if (!isLoading) {
      const authCheckTime = Date.now() - startTime
      setPerformanceMetrics(prev => ({
        ...prev,
        authCheckTime,
        lastUpdate: Date.now()
      }))
    }
  }, [isLoading])

  // Monitor redirect performance
  useEffect(() => {
    const handleBeforeUnload = () => {
      const redirectTime = Date.now() - performanceMetrics.lastUpdate
      setPerformanceMetrics(prev => ({
        ...prev,
        redirectTime
      }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [performanceMetrics.lastUpdate])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg text-xs max-w-xs z-50 font-mono">
      <h3 className="font-bold mb-2 text-[#FF6B6B]">Auth Debug</h3>
      <div className="space-y-1">
        <div>Loading: <span className={isLoading ? 'text-yellow-400' : 'text-green-400'}>{isLoading ? 'Yes' : 'No'}</span></div>
        <div>Authenticated: <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>{isAuthenticated ? 'Yes' : 'No'}</span></div>
        <div>Cookie: <span className={cookieExists ? 'text-green-400' : 'text-red-400'}>{cookieExists ? 'Yes' : 'No'}</span></div>
        <div>User ID: <span className="text-blue-400">{user?.id || 'None'}</span></div>
        <div>Email: <span className="text-blue-400">{user?.email || 'None'}</span></div>
        <hr className="border-gray-600 my-2" />
        <div className="text-yellow-400">Performance:</div>
        <div>Auth Check: <span className="text-green-400">{performanceMetrics.authCheckTime}ms</span></div>
        <div>Last Update: <span className="text-gray-400">{new Date(performanceMetrics.lastUpdate).toLocaleTimeString()}</span></div>
      </div>
    </div>
  )
} 