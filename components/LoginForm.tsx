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
    // Enhanced error handling with specific error types from API
    if (data.errorType) {
      switch (data.errorType) {
        case 'user_not_found':
          throw new Error(JSON.stringify({
            message: data.error,
            type: 'user_not_found',
            suggestSignup: data.suggestSignup
          }))
        case 'incorrect_password':
        case 'incorrect_credentials':
          throw new Error(JSON.stringify({
            message: data.error,
            type: 'incorrect_credentials',
            hint: data.hint
          }))
        case 'unverified_email':
          throw new Error(JSON.stringify({
            message: data.error,
            type: 'unverified_email',
            userEmail: data.userEmail
          }))
        case 'account_locked':
          throw new Error(JSON.stringify({
            message: data.error,
            type: 'account_locked'
          }))
        default:
          throw new Error(JSON.stringify({
            message: data.error,
            type: 'general'
          }))
      }
    }
    
    // Legacy error handling for backward compatibility
    switch (res.status) {
      case 400:
        throw new Error(JSON.stringify({
          message: data.error || "Invalid email or password format",
          type: 'validation'
        }))
      case 401:
        if (data.error?.includes("verification") || data.error?.includes("verify")) {
          throw new Error(JSON.stringify({
            message: "Please verify your email address before logging in. Check your inbox for a verification link.",
            type: 'verification'
          }))
        }
        throw new Error(JSON.stringify({
          message: "Invalid email or password. Please check your credentials and try again.",
          type: 'general'
        }))
      case 404:
        throw new Error(JSON.stringify({
          message: "No account found with this email address. Please check your email or sign up for a new account.",
          type: 'user_not_found',
          suggestSignup: true
        }))
      case 422:
        throw new Error(JSON.stringify({
          message: "Please check your email format and ensure your password meets the requirements.",
          type: 'validation'
        }))
      default:
        throw new Error(JSON.stringify({
          message: "An unexpected error occurred. Please try again.",
          type: 'server'
        }))
    }
  }
  
  return data
}

const LoginForm = memo(function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/feed"
  const isVerified = searchParams.get("verified") === "true"
  const { isAuthenticated, isLoading, preloadUser } = useAuth()

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
  const [errorType, setErrorType] = useState<'general' | 'verification' | 'locked' | 'rate-limit' | 'server' | 'user_not_found' | 'incorrect_password' | 'incorrect_credentials' | 'unverified_email' | 'account_locked' | 'validation'>('general')
  const [errorData, setErrorData] = useState<{
    suggestSignup?: boolean
    hint?: string
    userEmail?: string
  }>({})
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
      setErrorData({})
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
      // Show loading state
      setError("Sending verification email...")
      
      const response = await fetch("/api/resend-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (response.ok) {
        setError("✅ Verification email sent! Please check your inbox and spam folder.")
        setErrorType('general')
        setShowResendVerification(false)
        
        // Clear the success message after 5 seconds
        setTimeout(() => {
          setError("")
        }, 5000)
      } else {
        if (response.status === 429) {
          setError(data.error || "Please wait a moment before requesting another verification email.")
        } else if (data.code === 'TOKEN_GENERATION_FAILED') {
          setError(data.error || "Unable to generate verification token. Please try again in a few minutes.")
        } else if (data.code === 'NO_TOKEN_AVAILABLE') {
          setError(data.error || "Unable to generate verification token. Please contact support.")
        } else {
          setError(data.error || "Failed to resend verification email. Please try again.")
        }
        setShowResendVerification(true) // Keep the button visible for retry
      }
    } catch (error) {
      console.error("Resend verification error:", error)
      setError("Network error. Please check your connection and try again.")
      setShowResendVerification(true) // Keep the button visible for retry
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isSubmitting || hasRedirected) return
    
    setIsSubmitting(true)
    setError("")
    setErrorData({})

    try {
      console.log("Starting login process...")
      
      const loginResponse = await loginUser(formData)
      console.log("Login API response received:", loginResponse.success)
      

      
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
      
      // Parse error data if it's a JSON string
      let errorInfo = { message: "Login failed. Please check your credentials and try again.", type: 'general' }
      
      try {
        const parsedError = JSON.parse(err.message)
        errorInfo = parsedError
      } catch {
        // If parsing fails, use the raw error message
        errorInfo.message = err.message || errorInfo.message
      }
      
      setError(errorInfo.message)
      setErrorType(errorInfo.type as any)
      setErrorData({
        suggestSignup: false,
        hint: '',
        userEmail: ''
      })
      
      // Set verification resend option for email verification errors
      if (errorInfo.type === 'unverified_email' || errorInfo.type === 'verification') {
        setShowResendVerification(true)
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
            <Alert variant={errorType === 'unverified_email' || errorType === 'verification' ? "default" : "destructive"} className={`mb-6 ${
              errorType === 'unverified_email' || errorType === 'verification' ? 'border-blue-200 bg-blue-50' : 
              errorType === 'user_not_found' ? 'border-orange-200 bg-orange-50' : ''
            }`}>
              <AlertCircle className={`h-4 w-4 ${
                errorType === 'unverified_email' || errorType === 'verification' ? 'text-blue-600' : 
                errorType === 'user_not_found' ? 'text-orange-600' : ''
              }`} />
              <AlertTitle className={`${
                errorType === 'unverified_email' || errorType === 'verification' ? 'text-blue-800' : 
                errorType === 'user_not_found' ? 'text-orange-800' : ''
              }`}>
                                 {errorType === 'unverified_email' || errorType === 'verification' ? 'Email Verification Required' : 
                  errorType === 'user_not_found' ? 'Account Not Found' :
                  errorType === 'incorrect_password' || errorType === 'incorrect_credentials' ? 'Incorrect Credentials' :
                  errorType === 'account_locked' || errorType === 'locked' ? 'Account Locked' :
                  errorType === 'rate-limit' ? 'Too Many Attempts' :
                  errorType === 'server' ? 'Server Issue' :
                  errorType === 'validation' ? 'Invalid Input' :
                  'Login Failed'}
              </AlertTitle>
              <AlertDescription className={`${
                errorType === 'unverified_email' || errorType === 'verification' ? 'text-blue-700' : 
                errorType === 'user_not_found' ? 'text-orange-700' : ''
              }`}>
                {error}
                
                {/* User not found - show signup option */}
                {errorType === 'user_not_found' && errorData.suggestSignup && (
                  <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-800 font-medium mb-2">
                      Don't have an account yet?
                    </p>
                    <Link href="/signup" prefetch={false}>
                      <Button
                        type="button"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="sm"
                      >
                        Create Account
                      </Button>
                    </Link>
                  </div>
                )}
                
                                 {/* Incorrect credentials - show helpful tips */}
                 {(errorType === 'incorrect_password' || errorType === 'incorrect_credentials') && (
                   <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                     <p className="text-sm text-red-800 font-medium mb-2">
                       Login Tips:
                     </p>
                     <ul className="text-sm text-red-700 space-y-1">
                       <li>• Double-check your email address</li>
                       <li>• Check if Caps Lock is on</li>
                       <li>• Passwords are case-sensitive</li>
                       <li>• Make sure you're using the correct credentials</li>
                     </ul>
                     <Link href="/forgot-password" prefetch={false}>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         className="w-full mt-2 text-red-700 border-red-300 hover:bg-red-100"
                       >
                         Reset Password
                       </Button>
                     </Link>
                   </div>
                 )}
                
                {/* Verification error - show resend option */}
                {(errorType === 'unverified_email' || errorType === 'verification') && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="space-y-2">
                      <p className="text-sm text-blue-700 font-medium">
                        📧 Need a new verification email?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100 w-full"
                        disabled={error === "Sending verification email..."}
                      >
                        {error === "Sending verification email..." ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Resend Verification Email"
                        )}
                      </Button>
                      <p className="text-xs text-blue-600">
                        Check your spam/junk folder if you don't see the email
                      </p>
                    </div>
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