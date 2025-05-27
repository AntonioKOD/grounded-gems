/* eslint-disable @typescript-eslint/no-explicit-any */
// components/login/login-form.tsx
"use client"

import { useState, useEffect, memo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { Checkbox } from "@/components/ui/checkbox"

// Login API call with improved response handling
async function loginUser({ email, password, rememberMe }: { email: string; password: string; rememberMe: boolean }) {
  const res = await fetch("/api/users/login", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    },
    credentials: "include",
    body: JSON.stringify({ email, password, rememberMe }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || "Authentication failed")
  return data
}

const LoginForm = memo(function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/feed"
  const { isAuthenticated, isLoading } = useAuth()
  const { preloadUser } = useAuth()

  const [formData, setFormData] = useState({ 
    email: "", 
    password: "",
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [hasRedirected, setHasRedirected] = useState(false)

  // Immediate redirect for authenticated users (no delay)
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRedirected) {
      console.log("LoginForm: User already authenticated, redirecting immediately to:", redirectPath)
      setHasRedirected(true)
      // Use replace instead of push to avoid back button issues
      router.replace(redirectPath)
    }
  }, [isAuthenticated, isLoading, router, redirectPath, hasRedirected])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError("")
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, rememberMe: checked }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isSubmitting || hasRedirected) return
    
    setIsSubmitting(true)
    setError("")

    try {
      console.log("Starting login process...")
      
      const loginResponse = await loginUser(formData)
      console.log("Login API response received:", loginResponse.success)
      
      // If the login response includes user data, preload it immediately
      if (loginResponse.user) {
        console.log("Login successful, preloading user data:", loginResponse.user)
        preloadUser(loginResponse.user)
        
        // Dispatch events immediately for instant UI updates
        window.dispatchEvent(new CustomEvent("user-login", { detail: loginResponse.user }))
        window.dispatchEvent(new CustomEvent("user-updated", { detail: loginResponse.user }))
        window.dispatchEvent(new Event("login-success"))
      } else {
        // Fallback: dispatch generic login success event
        window.dispatchEvent(new Event("login-success"))
      }
      
      // Save email for future logins if remember me is checked
      if (formData.rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('savedEmail', formData.email)
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('savedEmail')
      }
      
      // Mark as redirected to prevent multiple redirects
      setHasRedirected(true)
      
      // Use window.location for more reliable navigation in production
      // This prevents the Next.js Link caching issues mentioned in the GitHub discussion
      console.log("Redirecting to:", redirectPath)
      window.location.href = redirectPath
      
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Login failed. Please check your credentials and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load saved email if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('savedEmail')
      if (savedEmail) {
        setFormData(prev => ({ ...prev, email: savedEmail, rememberMe: true }))
      }
    }
  }, [])

  // Optimized loading state - show minimal loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF6B6B]"></div>
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // If already authenticated and redirecting, show minimal loading
  if (isAuthenticated && hasRedirected) {
    return (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF6B6B]"></div>
          <p className="text-xs text-gray-500">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Log in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-[#FF6B6B] hover:underline" prefetch={false}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="rememberMe" 
                checked={formData.rememberMe} 
                onCheckedChange={handleCheckboxChange} 
              />
              <label
                htmlFor="rememberMe"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </label>
            </div>
            <Button type="submit" className="w-full mt-6 bg-[#FF6B6B]" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Log in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#FF6B6B] font-medium" prefetch={false}>
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
})

export default LoginForm