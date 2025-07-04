/* eslint-disable @typescript-eslint/no-explicit-any */
// components/login/login-form.tsx
"use client"

import { useState, useEffect, memo, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { Checkbox } from "@/components/ui/checkbox"
import { MobileAuthService } from "@/lib/mobile-auth"
import { Capacitor } from '@capacitor/core'
import { safeNavigate, getSafeRedirectPath, clearAuthRedirectHistory } from "@/lib/redirect-loop-prevention"

// Enhanced login API call with detailed error handling
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
  
  if (!res.ok) {
    // Enhanced error handling with specific status codes
    switch (res.status) {
      case 400:
        throw new Error(data.error || "Invalid email or password format")
      case 401:
        if (data.error?.includes("verification") || data.error?.includes("verify")) {
          throw new Error("Please verify your email address before logging in. Check your inbox for a verification link.")
        }
        if (data.error?.includes("locked") || data.error?.includes("disabled")) {
          throw new Error("Your account has been temporarily locked. Please contact support or try again later.")
        }
        throw new Error("Invalid email or password. Please check your credentials and try again.")
      case 403:
        throw new Error("Your account access has been restricted. Please contact support for assistance.")
      case 422:
        throw new Error("Please check your email format and ensure your password meets the requirements.")
      case 429:
        throw new Error("Too many login attempts. Please wait a few minutes before trying again.")
      case 500:
        throw new Error("Our servers are experiencing issues. Please try again in a few moments.")
      case 503:
        throw new Error("Service temporarily unavailable. Please try again later.")
      default:
        throw new Error(data.error || data.message || `Authentication failed (${res.status})`)
    }
  }
  
  return data
}

const LoginForm = memo(function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/feed"
  const isVerified = searchParams.get("verified") === "true"
  const { isAuthenticated, isLoading } = useAuth()
  const { preloadUser } = useAuth()

  // Prevent redirect loops by checking if redirect path is current path
  const safeRedirectPath = useMemo(() => {
    // Always redirect to feed after login, regardless of the redirect parameter
    // This prevents redirect loops and provides a consistent login experience
    return '/feed'
  }, [])

  const [formData, setFormData] = useState({ 
    email: "", 
    password: "",
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [errorType, setErrorType] = useState<'general' | 'verification' | 'locked' | 'rate-limit' | 'server'>('general')
  const [hasRedirected, setHasRedirected] = useState(false)
  const [verificationShown, setVerificationShown] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)

  // Show verification success message
  useEffect(() => {
    if (isVerified && !verificationShown) {
      setVerificationShown(true)
      // Clear the verified parameter from URL to prevent refresh issues
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('verified')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [isVerified, verificationShown])

  // Immediate redirect for authenticated users (no delay)
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRedirected) {
      console.log("LoginForm: User already authenticated, redirecting immediately to:", safeRedirectPath)
      setHasRedirected(true)
      
      // Use safe navigation to prevent redirect loops
      if (typeof window !== 'undefined') {
        safeNavigate(safeRedirectPath, router)
      }
    }
  }, [isAuthenticated, isLoading, safeRedirectPath, hasRedirected, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) {
      setError("")
      setErrorType('general')
      setShowResendVerification(false)
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, rememberMe: checked }))
  }

  // Resend verification email
  const handleResendVerification = async () => {
    if (!formData.email) {
      setError("Please enter your email address first")
      return
    }

    try {
      const response = await fetch("/api/resend-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })

      if (response.ok) {
        setError("Verification email sent! Please check your inbox and spam folder.")
        setErrorType('general')
        setShowResendVerification(false)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to resend verification email. Please try again.")
      }
    } catch (error) {
      console.error("Resend verification error:", error)
      setError("Network error. Please check your connection and try again.")
    }
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
      
      // Save auth data to mobile storage if on native platform
      if (Capacitor.isNativePlatform() && loginResponse.token) {
        try {
          await MobileAuthService.saveAuthToken(loginResponse.token)
          if (loginResponse.user) {
            await MobileAuthService.saveUserData(loginResponse.user)
          }
          await MobileAuthService.saveRememberMe(formData.rememberMe)
          console.log("Auth data saved to mobile storage")
        } catch (error) {
          console.error("Failed to save auth data to mobile storage:", error)
        }
      }
      
      // If the login response includes user data, preload it immediately
      if (loginResponse.user) {
        console.log("Login successful, preloading user data:", {
          userId: loginResponse.user.id,
          userIdType: typeof loginResponse.user.id,
          userIdLength: loginResponse.user.id?.length,
          userName: loginResponse.user.name
        })
        await preloadUser(loginResponse.user)
        
        // Dispatch events immediately for instant UI updates
        window.dispatchEvent(new CustomEvent("user-login", { detail: loginResponse.user }))
        window.dispatchEvent(new CustomEvent("user-updated", { detail: loginResponse.user }))
        window.dispatchEvent(new Event("login-success"))
      } else {
        // Fallback: dispatch generic login success event
        window.dispatchEvent(new Event("login-success"))
      }
      
      // Enhanced remember me handling
      if (formData.rememberMe && typeof window !== 'undefined') {
        // Save email and user preference for future logins
        localStorage.setItem('savedEmail', formData.email)
        localStorage.setItem('rememberMePreference', 'true')
        console.log('Remember me enabled: Email saved for future logins')
      } else if (typeof window !== 'undefined') {
        // Clear saved data if remember me is not checked
        localStorage.removeItem('savedEmail')
        localStorage.removeItem('rememberMePreference')
        console.log('Remember me disabled: Cleared saved email')
      }
      
      // Mark as redirected to prevent multiple redirects
      setHasRedirected(true)
      
      // Clear auth redirect history to prevent future loops
      clearAuthRedirectHistory()
      
      // Use safe navigation to prevent redirect loops
      console.log("Redirecting to:", safeRedirectPath)
      safeNavigate(safeRedirectPath, router)
      
    } catch (err: any) {
      console.error("Login error:", err)
      
      // Enhanced error categorization and user guidance
      const errorMessage = err.message || "Login failed. Please check your credentials and try again."
      setError(errorMessage)
      
      // Categorize error types for better UX
      if (errorMessage.includes("verify") || errorMessage.includes("verification")) {
        setErrorType('verification')
        setShowResendVerification(true)
      } else if (errorMessage.includes("locked") || errorMessage.includes("disabled")) {
        setErrorType('locked')
      } else if (errorMessage.includes("Too many") || errorMessage.includes("rate")) {
        setErrorType('rate-limit')
      } else if (errorMessage.includes("server") || errorMessage.includes("Service")) {
        setErrorType('server')
      } else {
        setErrorType('general')
      }
      
      // Haptic feedback for errors
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load saved email and remember me state if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('savedEmail')
      const rememberMeFromCookie = document.cookie.includes('remember-me=true')
      
      if (savedEmail) {
        setFormData(prev => ({ 
          ...prev, 
          email: savedEmail, 
          rememberMe: rememberMeFromCookie || true 
        }))
      }
      
      // Also check if user has an active remember me session
      if (rememberMeFromCookie) {
        console.log('User has active remember me session')
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
          {isVerified && verificationShown && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Email Verified!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your email has been successfully verified. You can now log in to your account.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant={errorType === 'verification' ? "default" : "destructive"} className={`mb-6 ${
              errorType === 'verification' ? 'border-blue-200 bg-blue-50' : ''
            }`}>
              <AlertCircle className={`h-4 w-4 ${
                errorType === 'verification' ? 'text-blue-600' : ''
              }`} />
              <AlertTitle className={errorType === 'verification' ? 'text-blue-800' : ''}>
                {errorType === 'verification' ? 'Email Verification Required' : 
                 errorType === 'locked' ? 'Account Locked' :
                 errorType === 'rate-limit' ? 'Too Many Attempts' :
                 errorType === 'server' ? 'Server Issue' :
                 'Authentication Failed'}
              </AlertTitle>
              <AlertDescription className={errorType === 'verification' ? 'text-blue-700' : ''}>
                {error}
                
                {/* Verification error - show resend option */}
                {showResendVerification && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Resend Verification Email
                    </Button>
                  </div>
                )}
                
                {/* Rate limit error - show waiting guidance */}
                {errorType === 'rate-limit' && (
                  <div className="mt-2 text-sm">
                    <p>Try these steps:</p>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>Wait 5-10 minutes before trying again</li>
                      <li>Check your internet connection</li>
                      <li>Clear your browser cache if the issue persists</li>
                    </ul>
                  </div>
                )}
                
                {/* Server error - show retry guidance */}
                {errorType === 'server' && (
                  <div className="mt-2 text-sm">
                    <p>This is usually temporary. You can:</p>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>Refresh the page and try again</li>
                      <li>Check our status page for updates</li>
                      <li>Contact support if the issue continues</li>
                    </ul>
                  </div>
                )}
                
                {/* Account locked - show support guidance */}
                {errorType === 'locked' && (
                  <div className="mt-2 text-sm">
                    <p>Your account needs attention:</p>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>Wait 30 minutes and try again</li>
                      <li>Use "Forgot password" to reset your password</li>
                      <li>Contact support if you need immediate access</li>
                    </ul>
                  </div>
                )}
                
                {/* General error - show basic guidance */}
                {errorType === 'general' && !error.includes("sent") && (
                  <div className="mt-2 text-sm">
                    <p>Double-check your:</p>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>Email address spelling</li>
                      <li>Password (remember it's case-sensitive)</li>
                      <li>Internet connection</li>
                    </ul>
                  </div>
                )}
              </AlertDescription>
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
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rememberMe" 
                  checked={formData.rememberMe} 
                  onCheckedChange={handleCheckboxChange} 
                />
                <div className="flex-1">
                  <label
                    htmlFor="rememberMe"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Remember me for 30 days
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.rememberMe 
                      ? "Your session will be extended and login details saved" 
                      : "Standard 24-hour session"}
                  </p>
                </div>
              </div>
              {formData.email && typeof window !== 'undefined' && localStorage.getItem('savedEmail') === formData.email && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md">
                  <CheckCircle className="h-3 w-3" />
                  <span>Welcome back! We remembered your email.</span>
                </div>
              )}
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