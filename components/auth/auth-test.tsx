"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"

export default function AuthTest() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [cookieExists, setCookieExists] = useState(false)

  useEffect(() => {
    // Check if auth cookie exists
    const cookies = document.cookie.split(';')
    const hasPayloadToken = cookies.some(cookie => cookie.trim().startsWith('payload-token='))
    setCookieExists(hasPayloadToken)
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
      <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
      <div>Cookie exists: {cookieExists ? 'Yes' : 'No'}</div>
      <div>User ID: {user?.id || 'None'}</div>
      <div>User email: {user?.email || 'None'}</div>
    </div>
  )
} 