"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type Status = "idle" | "loading" | "success" | "error" | "invalid-token"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")

  // Check if token exists on mount
  useEffect(() => {
    if (!token) {
      setStatus("invalid-token")
      setError("Invalid or missing reset token. Please request a new password reset.")
    }
  }, [token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === "password") {
      let strength = 0
      if (value.length >= 8) strength += 1
      if (/[A-Z]/.test(value)) strength += 1
      if (/[0-9]/.test(value)) strength += 1
      if (/[^A-Za-z0-9]/.test(value)) strength += 1
      setPasswordStrength(strength)
    }

    if (error) setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match")
      setStatus("error")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      setStatus("error")
      return
    }

    try {
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      })

      let data
      try {
        // Check if response has content and is JSON
        const text = await response.text()
        if (text) {
          data = JSON.parse(text)
        } else {
          data = {}
        }
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error("Server returned an invalid response. Please try again.")
      }

      if (!response.ok) {
        if (response.status === 400 && data.error?.includes("token")) {
          setStatus("invalid-token")
          setError("Your password reset link has expired or is invalid. Please request a new one.")
        } else {
          throw new Error(data.error || data.message || "Failed to reset password")
        }
        return
      }

      setStatus("success")
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Password reset successful!</CardTitle>
            <CardDescription>
              Your password has been updated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              You can now log in with your new password.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]">
                Continue to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (status === "invalid-token") {
    return (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invalid reset link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Password reset links expire after 1 hour for security reasons.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]">
                Request new reset link
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
          <CardDescription>
            Enter your new password below. Make sure it's strong and secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={status === "loading"}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          passwordStrength >= level
                            ? passwordStrength === 1
                              ? "bg-red-500"
                              : passwordStrength === 2
                                ? "bg-orange-500"
                                : passwordStrength === 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            : "bg-gray-200",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {passwordStrength === 0 && "Add a password"}
                    {passwordStrength === 1 && "Weak – at least 8 characters"}
                    {passwordStrength === 2 && "Fair – add numbers/symbols"}
                    {passwordStrength === 3 && "Good – add uppercase letters"}
                    {passwordStrength === 4 && "Strong password"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={status === "loading"}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]" 
              disabled={status === "loading" || !formData.password || !formData.confirmPassword}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <Link href="/login" className="text-[#FF6B6B] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
} 