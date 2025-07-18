"use client"

import React, { useState, useEffect } from "react"
// Remove the server action import
// import { signupUser } from "@/app/actions"
import Link from "next/link"
import { 
  Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowRight, 
  MapPin, User, Mail, Lock, Coffee, Utensils, TreePine, Camera,
  Building2, Users, Calendar, Clock, DollarSign, Bell
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { UsernameInput } from "@/components/ui/username-input"
import { cn } from "@/lib/utils"
import { safeNavigate, getSafeRedirectPath, clearAuthRedirectHistory } from '@/lib/redirect-loop-prevention'
import LocationPermissionEnforcer from "./location-permission-enforcer"

type Status = "idle" | "loading" | "success" | "error" | "resending" | "resent"

interface UserData {
  // Step 1: Account creation
  email: string
  password: string
  name: string
  username: string
  usernameValid?: boolean
  location?: {
    city?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  receiveUpdates: boolean
  
  // Step 2: Interests
  interests: string[]
  
  // Step 3: Essential preferences
  primaryUseCase?: string
  travelRadius?: string
  budgetPreference?: string
}

interface ImprovedSignupFormProps {
  categories: any[]
}

export default function ImprovedSignupForm({ categories }: ImprovedSignupFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)
  const [showLocationEnforcer, setShowLocationEnforcer] = useState(false)
  const [userData, setUserData] = useState<UserData>({
    email: "",
    password: "",
    name: "",
    username: "",
    interests: [],
    receiveUpdates: true // Default to true for better user experience
  })

  const totalSteps = 3

  // Create interest options from Payload categories
  const interestOptions = categories
    .filter(cat => cat.type === 'location' && cat.isActive)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(cat => ({
      id: cat.slug,
      label: cat.name,
      icon: getIconForCategory(cat.slug),
      description: cat.description
    }))

  // Function to get appropriate icon for category
  function getIconForCategory(slug: string) {
    const iconMap: { [key: string]: any } = {
      'coffee': Coffee,
      'restaurants': Utensils,
      'nature': TreePine,
      'photography': Camera,
      'nightlife': Building2,
      'shopping': Building2,
      'arts': Camera,
      'sports': Users,
      'markets': Building2,
      'events': Calendar
    }
    return iconMap[slug] || Building2
  }

  // Primary use cases (most common first)
  const useCaseOptions = [
    { id: "explore", label: "Discover new places", description: "Find hidden gems nearby", emoji: "🔍" },
    { id: "plan", label: "Plan outings", description: "Organize trips and events", emoji: "📅" },
    { id: "share", label: "Share discoveries", description: "Recommend places to others", emoji: "📸" },
    { id: "connect", label: "Meet like-minded people", description: "Connect with local community", emoji: "👥" }
  ]

  // Check location permission on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      // Check if we already have permission
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          // Already have permission, get location
          navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
              setUserData(prev => ({
                ...prev,
                location: {
                  ...prev.location,
                  coordinates: { latitude, longitude }
                }
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
            setUserData(prev => ({
              ...prev,
              location: {
                ...prev.location,
                coordinates: { latitude, longitude }
              }
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

  const updateUserData = (field: keyof UserData | string, value: any) => {
    setUserData(prev => ({ ...prev, [field]: value }))
  }

  const handleLocationGranted = (coordinates: { latitude: number; longitude: number }) => {
    setUserData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates
      }
    }))
    setLocationPermissionGranted(true)
    setShowLocationEnforcer(false)
  }

  const handleLocationDenied = () => {
    setShowLocationEnforcer(false)
    // Location is optional, so we just close the enforcer without showing an error
  }

  const toggleInterest = (interestId: string) => {
    setUserData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }))
  }

  const generateUsername = (name: string) => {
    // Clean the name: remove spaces, convert to lowercase, keep only letters and numbers
    const cleanName = name.toLowerCase()
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
      .substring(0, 20) // Limit base length
    
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    // Create username
    let username = cleanName + suffix
    
    // Ensure minimum length
    if (username.length < 3) {
      username = 'user' + suffix
    }
    
    // Ensure maximum length
    if (username.length > 30) {
      username = cleanName.substring(0, 26) + suffix
    }
    
    // Final validation - ensure it only contains allowed characters
    username = username.replace(/[^a-z0-9_-]/g, '')
    
    // If somehow it becomes empty or too short, provide fallback
    if (username.length < 3) {
      username = 'user' + Date.now().toString().slice(-6)
    }
    
    console.log('Generated username:', username, 'Length:', username.length)
    return username
  }

  // Username cleaning is now handled by the UsernameInput component

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    updateUserData("password", value)

    // Calculate password strength
    let strength = 0
    if (value.length >= 8) strength += 1
    if (/[A-Z]/.test(value)) strength += 1
    if (/[0-9]/.test(value)) strength += 1
    if (/[^A-Za-z0-9]/.test(value)) strength += 1
    setPasswordStrength(strength)
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSignup()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return userData.email && userData.password && passwordStrength >= 2 && userData.name && userData.username && userData.usernameValid
      case 2: return userData.interests.length > 0
      case 3: return userData.primaryUseCase && userData.travelRadius && userData.budgetPreference
      default: return false
    }
  }

  async function handleSignup() {
    setError("")
    setStatus("loading")

    try {
      // Validate username before sending
      if (!userData.username || userData.username.length < 3) {
        throw new Error("Username must be at least 3 characters long.")
      }

      if (userData.username.length > 30) {
        throw new Error("Username must be less than 30 characters long.")
      }

      // Validate username format
      const usernameRegex = /^[a-z0-9_-]+$/
      if (!usernameRegex.test(userData.username)) {
        console.error('Invalid username format:', userData.username)
        throw new Error("Username can only contain lowercase letters, numbers, hyphens, and underscores.")
      }

      console.log('Username validation passed:', userData.username)

      // Transform data for signup
      const signupData = {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        coords: userData.location?.coordinates ? {
          latitude: userData.location.coordinates.latitude,
          longitude: userData.location.coordinates.longitude,
        } : undefined,
        // Additional data will be saved via a separate API call after user creation
        additionalData: {
          username: userData.username,
          interests: userData.interests,
          receiveUpdates: userData.receiveUpdates,
          onboardingData: {
            primaryUseCase: userData.primaryUseCase,
            travelRadius: userData.travelRadius || '5',
            budgetPreference: userData.budgetPreference,
            onboardingCompleted: true,
            signupStep: 3
          }
        }
      }

      console.log('Signup data:', {
        email: signupData.email,
        name: signupData.name,
        username: signupData.additionalData.username,
        hasCoords: !!signupData.coords?.latitude
      })

      // Use API route instead of server action
      const response = await fetch('/api/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
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

      // Clear auth redirect history to prevent future loops
      clearAuthRedirectHistory()
      
      setStatus("success")
    } catch (err: any) {
      console.error('Signup error:', err)
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
        body: JSON.stringify({ email: userData.email }),
      })
      setStatus("resent")
    } catch {
      setStatus("error")
      setError("Could not resend email. Try again later.")
    }
  }

  // Success state
  if (status === "success" || status === "resending" || status === "resent") {
    return (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Welcome to Sacavia!</CardTitle>
            <CardDescription>
              Join our community of explorers and discover authentic experiences guided by local wisdom.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            {status === "success" && (
              <Button onClick={resendVerification} variant="outline" className="w-full">
                Resend verification email
              </Button>
            )}
            <Button 
              onClick={() => {
                // Clear auth history and use safe navigation
                clearAuthRedirectHistory()
                const safeLoginPath = getSafeRedirectPath('/login', '/login')
                const router = { push: (path: string) => window.location.href = path }
                safeNavigate(safeLoginPath, router)
              }}
              className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90"
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {currentStep === 1 && "Create your account"}
            {currentStep === 2 && "What interests you?"}
            {currentStep === 3 && "Your preferences"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter your details to get started"}
            {currentStep === 2 && "Select your interests for personalized recommendations"}
            {currentStep === 3 && "Tell us about your exploration style"}
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

          {showLocationEnforcer && (
            <div className="mb-6">
              <LocationPermissionEnforcer
                onLocationGranted={handleLocationGranted}
                onLocationDenied={handleLocationDenied}
                required={false}
                title="Enable Location (Optional)"
                description="Sharing your location helps us provide personalized recommendations and show you nearby places. You can skip this and add it later."
              />
            </div>
          )}

          {/* Step 1: Account Creation & Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={userData.email}
                    onChange={(e) => updateUserData("email", e.target.value)}
                    disabled={status === "loading"}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    value={userData.password}
                    onChange={handlePasswordChange}
                    disabled={status === "loading"}
                    required
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {userData.password && (
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
                <Label htmlFor="name">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="name"
                    placeholder="What should we call you?"
                    value={userData.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      updateUserData("name", newName)
                      // Auto-generate username suggestion if username is empty
                      if (!userData.username && newName.length > 2) {
                        const suggestion = generateUsername(newName)
                        updateUserData("username", suggestion)
                      }
                    }}
                    disabled={status === "loading"}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <UsernameInput
                  value={userData.username}
                  onChange={(value) => updateUserData("username", value)}
                  onValidationChange={(isValid) => {
                    // Store validation state for form submission
                    setUserData(prev => ({ ...prev, usernameValid: isValid }))
                  }}
                  label="Username"
                  placeholder="your_username"
                  required
                  disabled={status === "loading"}
                  autoGenerate={false} // Let user choose their own
                  userFullName={userData.name}
                  showSuggestions={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="location"
                    placeholder="City, State"
                    value={userData.location?.city || ""}
                    onChange={(e) => updateUserData("location", { 
                      ...userData.location, 
                      city: e.target.value 
                    })}
                    disabled={status === "loading"}
                    className="pl-10"
                  />
                </div>
                {locationPermissionGranted ? (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Location enabled - GPS coordinates captured</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Location is optional but helps personalize your experience</p>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="receiveUpdates"
                    checked={userData.receiveUpdates}
                    onCheckedChange={(value) => updateUserData("receiveUpdates", value)}
                    disabled={status === "loading"}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="receiveUpdates" className="text-sm font-medium cursor-pointer">
                      Receive updates from Sacavia
                    </Label>
                    <p className="text-xs text-gray-500">
                      Get notified about new features, local events, and community highlights. You can unsubscribe anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Interest Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Select your main interests (choose at least one)
                </p>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {userData.interests.length} selected
                </div>
              </div>
              
              {/* Scrollable grid container */}
              <div 
                className="max-h-96 overflow-y-auto pr-2"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db #f3f4f6'
                }}
              >
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {interestOptions.map((interest) => {
                    const Icon = interest.icon
                    const isSelected = userData.interests.includes(interest.id)
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleInterest(interest.id)}
                        className={cn(
                          "p-4 border rounded-xl text-center transition-all hover:border-[#4ECDC4] hover:shadow-md relative min-h-[120px] flex flex-col items-center justify-center",
                          isSelected 
                            ? "border-[#4ECDC4] bg-[#4ECDC4]/10 ring-2 ring-[#4ECDC4]/20 shadow-md" 
                            : "border-gray-200 hover:bg-[#4ECDC4]/5"
                        )}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-[#4ECDC4] rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        <Icon className="h-8 w-8 mb-3 text-[#FF6B6B]" />
                        <p className="font-medium text-sm text-center leading-tight">{interest.label}</p>
                        {interest.description && (
                          <p className="text-xs text-gray-500 text-center mt-1 line-clamp-2 px-1">{interest.description}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Show hint if many categories */}
              {interestOptions.length > 8 && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  💡 Scroll to see more categories
                </p>
              )}
            </div>
          )}

          {/* Step 3: Essential Preferences */}
          {currentStep === 3 && (
            <div 
              className="max-h-[32rem] overflow-y-auto pr-2"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}
            >
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    How will you primarily explore with Sacavia?
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {useCaseOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateUserData("primaryUseCase", option.id)}
                        className={cn(
                          "p-6 border border-gray-200 rounded-xl hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/5 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-3 relative min-h-[140px]",
                          userData.primaryUseCase === option.id && "border-[#4ECDC4] bg-[#4ECDC4]/10 ring-2 ring-[#4ECDC4]/20 shadow-md"
                        )}
                      >
                        {userData.primaryUseCase === option.id && (
                          <div className="absolute top-4 right-4 w-6 h-6 bg-[#4ECDC4] rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <span className="text-3xl">{option.emoji}</span>
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">{option.label}</p>
                          <p className="text-sm text-gray-500">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Travel radius
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { id: "0.5", label: "Walking distance", desc: "0.5 mi", emoji: "🚶" },
                      { id: "2", label: "Nearby", desc: "2 mi", emoji: "🚲" },
                      { id: "5", label: "Local area", desc: "5 mi", emoji: "🚗" },
                      { id: "15", label: "Extended area", desc: "15 mi", emoji: "🛣️" },
                      { id: "unlimited", label: "Anywhere", desc: "No limit", emoji: "✈️" }
                    ].map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateUserData("travelRadius", option.id)}
                        className={cn(
                          "p-4 border rounded-xl text-center transition-all relative hover:border-[#4ECDC4] hover:shadow-md min-h-[100px] flex flex-col items-center justify-center",
                          userData.travelRadius === option.id
                            ? "border-[#4ECDC4] bg-[#4ECDC4]/10 ring-2 ring-[#4ECDC4]/20 shadow-md"
                            : "border-gray-200 hover:bg-[#4ECDC4]/5",
                          index >= 3 && "md:col-span-1"
                        )}
                      >
                        {userData.travelRadius === option.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[#4ECDC4] rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <span className="text-2xl mb-2">{option.emoji}</span>
                        <div className="text-center">
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Budget preference
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { id: "free", label: "Free activities", emoji: "🆓", desc: "$0" },
                      { id: "budget", label: "Budget-friendly", emoji: "💰", desc: "$" },
                      { id: "moderate", label: "Moderate", emoji: "💳", desc: "$$" },
                      { id: "premium", label: "Premium", emoji: "💎", desc: "$$$" },
                      { id: "luxury", label: "Luxury", emoji: "👑", desc: "$$$$" }
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateUserData("budgetPreference", option.id)}
                        className={cn(
                          "p-4 border rounded-xl text-center transition-all hover:border-[#4ECDC4] hover:shadow-md relative min-h-[100px] flex flex-col items-center justify-center",
                          userData.budgetPreference === option.id
                            ? "border-[#4ECDC4] bg-[#4ECDC4]/10 ring-2 ring-[#4ECDC4]/20 shadow-md"
                            : "border-gray-200 hover:bg-[#4ECDC4]/5"
                        )}
                      >
                        {userData.budgetPreference === option.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[#4ECDC4] rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <span className="text-2xl mb-2">{option.emoji}</span>
                        <div className="text-center">
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-gray-500 font-semibold">{option.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {currentStep > 1 && (
            <Button
              onClick={prevStep}
              variant="outline"
              disabled={status === "loading"}
            >
              Back
            </Button>
          )}
          
          <div className="ml-auto">
            <Button
              onClick={nextStep}
              disabled={!canProceed() || status === "loading"}
              className={cn(
                "flex items-center space-x-2",
                canProceed()
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>{currentStep === totalSteps ? 'Complete Setup' : 'Continue'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>

        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-[#FF6B6B] font-medium hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
} 