"use client"

import type React from "react"
import { useState, useEffect } from "react"
// Remove the server action import
// import { signupUser } from "@/app/actions"
import Link from "next/link"
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import LocationPermissionEnforcer from "@/components/auth/location-permission-enforcer"

type Status = "idle" | "loading" | "success" | "error" | "resending" | "resent"

export default function SignupForm() {
  const [formData, setFormData] = useState<any>({
    name: "",
    email: "",
    password: "",
    coords: { latitude: null, longitude: null },
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string>("")
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)
  const [showLocationEnforcer, setShowLocationEnforcer] = useState(false)

  // Check location permission on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      // Check if we already have permission
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          // Already have permission, get location
          navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
              setFormData((prev: any) => ({
                ...prev,
                coords: {
                  ...prev.coords,
                  latitude,
                  longitude,
                },
              }))
              setLocationPermissionGranted(true)
            },
            (err) => {
              console.warn("Geolocation unavailable or denied", err)
              setShowLocationEnforcer(true)
            }
          )
        } else if (result.state === 'denied') {
          // Permission denied, show enforcer
          setShowLocationEnforcer(true)
        } else {
          // Permission not determined, show enforcer
          setShowLocationEnforcer(true)
        }
      }).catch(() => {
        // Permissions API not supported, try to get location directly
        navigator.geolocation.getCurrentPosition(
          ({ coords: { latitude, longitude } }) => {
            setFormData((prev: any) => ({
              ...prev,
              coords: {
                ...prev.coords,
                latitude,
                longitude,
              },
            }))
            setLocationPermissionGranted(true)
          },
          (err) => {
            console.warn("Geolocation unavailable or denied", err)
            setShowLocationEnforcer(true)
          }
        )
      })
    } else {
      // Geolocation not supported
      setShowLocationEnforcer(true)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))

    if (name === "password") {
      let strength = 0
      if (value.length >= 8) strength += 1
      if (/[A-Z]/.test(value)) strength += 1
      if (/[0-9]/.test(value)) strength += 1
      if (/[^A-Za-z0-9]/.test(value)) strength += 1
      setPasswordStrength(strength)
    }
  }

  const handleLocationGranted = (coordinates: { latitude: number; longitude: number }) => {
    setFormData((prev: any) => ({
      ...prev,
      coords: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    }))
    setLocationPermissionGranted(true)
    setShowLocationEnforcer(false)
  }

  const handleLocationDenied = () => {
    setShowLocationEnforcer(false)
    setError("Location is required for signup. Please enable location services to continue.")
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setStatus("loading")

    try {
      // Ensure we have coordinates
      if (formData.coords.latitude == null || formData.coords.longitude == null) {
        setShowLocationEnforcer(true)
        setStatus("idle")
        return
      }
      
      // Use API route instead of server action
      const response = await fetch('/api/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (result.error?.includes('already exists') || result.error?.includes('duplicate')) {
          throw new Error('An account with this email already exists. Please try logging in instead.')
        }
        if (result.error?.includes('validation')) {
          throw new Error('Please check your information and try again.')
        }
        if (result.error?.includes('Failed to find Server Action')) {
          throw new Error('There was a temporary issue with the signup process. Please refresh the page and try again.')
        }
        throw new Error(result.error || 'Signup failed. Please try again.')
      }

      setStatus("success")
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.")
      setStatus("error")
    }
  }

  async function resendVerification() {
    setStatus("resending")
    try {
      await fetch("/api/resend-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })
      setStatus("resent")
    } catch {
      setStatus("error")
      setError("Could not resend email. Try again later.")
    }
  }

  if (status === "success" || status === "resending" || status === "resent") {
    return (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Your account is created!</CardTitle>
            <CardDescription>
              {status === "success" && (
                <>
                  <CheckCircle className="inline-block h-5 w-5 text-green-600" /> We&apos;ve sent a verification link to{" "}
                  <strong>{formData.email}</strong>. Please check your inbox.
                </>
              )}
              {status === "resending" && "Resending verification email…"}
              {status === "resent" && (
                <>
                  <CheckCircle className="inline-block h-5 w-5 text-green-600" /> Verification email resent!
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            {status === "success" && (
              <Button onClick={resendVerification} variant="outline">
                Resend verification email
              </Button>
            )}
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
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
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your details to sign up</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showLocationEnforcer && (
            <div className="mb-6">
              <LocationPermissionEnforcer
                onLocationGranted={handleLocationGranted}
                onLocationDenied={handleLocationDenied}
                required={true}
                title="Location Required for Signup"
                description="We need your location to provide personalized recommendations and show you nearby places. This is required to create your account."
              />
            </div>
          )}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                disabled={status === "loading"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={status === "loading"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={status === "loading"}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
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

            {/* Location Status */}
            <div className="space-y-2">
              {locationPermissionGranted ? (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span>Location enabled - GPS coordinates captured</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>Location permission required for signup</span>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={status === "loading" || !locationPermissionGranted}>
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
