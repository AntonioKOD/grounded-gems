"use client"

import { useState, useEffect } from "react"
import { X, MapPin, Camera, Star, Users, Calendar } from "lucide-react"

interface PostSignupOnboardingProps {
  user: any
  onComplete: () => void
}

export default function PostSignupOnboarding({ user, onComplete }: PostSignupOnboardingProps) {
  const [currentPrompt, setCurrentPrompt] = useState(0)
  const [userPreferences, setUserPreferences] = useState({
    favoriteTimeToExplore: "",
    travelRadius: "",
    groupSize: "",
    budgetRange: "",
    photoSharing: false,
    reviewWriting: false,
    eventHosting: false
  })

  // Contextual prompts that appear during natural app usage
  const onboardingPrompts = [
    {
      id: "location-permission",
      title: "Enable Location Services",
      description: "Get personalized recommendations based on where you are",
      component: "LocationPermission",
      trigger: "immediate",
      value: "location_enabled"
    },
    {
      id: "time-preference",
      title: "When do you usually explore?",
      description: "We'll show you places that are open during your preferred times",
      component: "TimePreference",
      trigger: "after_first_search",
      value: "time_preference"
    },
    {
      id: "travel-radius",
      title: "How far are you willing to travel?",
      description: "Help us show you places within your comfort zone",
      component: "TravelRadius",
      trigger: "after_map_view",
      value: "travel_radius"
    },
    {
      id: "social-preferences",
      title: "How do you like to explore?",
      description: "Solo adventures or group outings?",
      component: "SocialPreferences",
      trigger: "after_first_save",
      value: "social_preferences"
    },
    {
      id: "contribution-style",
      title: "How would you like to contribute?",
      description: "Help others discover amazing places",
      component: "ContributionStyle",
      trigger: "after_first_week",
      value: "contribution_style"
    }
  ]

  const updatePreference = (key: string, value: any) => {
    setUserPreferences(prev => ({ ...prev, [key]: value }))
  }

  const nextPrompt = () => {
    if (currentPrompt < onboardingPrompts.length - 1) {
      setCurrentPrompt(prev => prev + 1)
    } else {
      // Save all collected data and complete onboarding
      saveUserPreferences()
      onComplete()
    }
  }

  const skipPrompt = () => {
    nextPrompt()
  }

  const saveUserPreferences = async () => {
    // Save to backend
    try {
      await fetch('/api/users/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          preferences: userPreferences,
          onboardingCompleted: true
        })
      })
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  const renderLocationPermission = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-[#4ECDC4]/10 rounded-full flex items-center justify-center mx-auto">
        <MapPin className="h-8 w-8 text-[#4ECDC4]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Enable Location Services
        </h3>
        <p className="text-gray-600 text-sm">
          Get personalized recommendations and discover amazing places near you
        </p>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => {
            // Request location permission
            navigator.geolocation.getCurrentPosition(
              () => {
                updatePreference("locationEnabled", true)
                nextPrompt()
              },
              () => {
                updatePreference("locationEnabled", false)
                nextPrompt()
              }
            )
          }}
          className="w-full bg-[#4ECDC4] text-white py-3 rounded-lg font-medium hover:bg-[#3DBDB5] transition-colors"
        >
          Enable Location
        </button>
        <button
          onClick={() => {
            updatePreference("locationEnabled", false)
            nextPrompt()
          }}
          className="w-full text-gray-600 py-2 text-sm hover:text-gray-800 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )

  const renderTimePreference = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          When do you usually explore?
        </h3>
        <p className="text-gray-600 text-sm">
          We'll prioritize places that are open during your preferred times
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "morning", label: "Morning", time: "6AM - 12PM", icon: "🌅" },
          { id: "afternoon", label: "Afternoon", time: "12PM - 6PM", icon: "☀️" },
          { id: "evening", label: "Evening", time: "6PM - 10PM", icon: "🌆" },
          { id: "night", label: "Night", time: "10PM - 2AM", icon: "🌙" }
        ].map((time) => (
          <button
            key={time.id}
            onClick={() => {
              updatePreference("favoriteTimeToExplore", time.id)
              nextPrompt()
            }}
            className="p-4 border border-gray-200 rounded-lg hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/5 transition-all text-center"
          >
            <div className="text-2xl mb-2">{time.icon}</div>
            <p className="font-medium text-gray-900">{time.label}</p>
            <p className="text-xs text-gray-500">{time.time}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const renderTravelRadius = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          How far are you willing to travel?
        </h3>
        <p className="text-gray-600 text-sm">
          We'll focus on places within your preferred distance
        </p>
      </div>
      <div className="space-y-3">
        {[
          { id: "walking", label: "Walking distance", distance: "0.5 miles", icon: "🚶" },
          { id: "biking", label: "Biking distance", distance: "2-5 miles", icon: "🚴" },
          { id: "driving", label: "Short drive", distance: "5-15 miles", icon: "🚗" },
          { id: "anywhere", label: "Anywhere in the city", distance: "15+ miles", icon: "🌆" }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              updatePreference("travelRadius", option.id)
              nextPrompt()
            }}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/5 transition-all text-left flex items-center space-x-4"
          >
            <span className="text-2xl">{option.icon}</span>
            <div>
              <p className="font-medium text-gray-900">{option.label}</p>
              <p className="text-sm text-gray-500">{option.distance}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderSocialPreferences = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          How do you like to explore?
        </h3>
        <p className="text-gray-600 text-sm">
          This helps us recommend the right atmosphere and group activities
        </p>
      </div>
      <div className="space-y-3">
        {[
          { id: "solo", label: "Solo adventures", desc: "Quiet spots, personal discovery", icon: "🧘" },
          { id: "couple", label: "With a partner", desc: "Romantic spots, intimate settings", icon: "💑" },
          { id: "small_group", label: "Small group (3-5)", desc: "Cozy places, good for conversation", icon: "👥" },
          { id: "large_group", label: "Large group (6+)", desc: "Spacious venues, group activities", icon: "👨‍👩‍👧‍👦" }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              updatePreference("groupSize", option.id)
              nextPrompt()
            }}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/5 transition-all text-left flex items-center space-x-4"
          >
            <span className="text-2xl">{option.icon}</span>
            <div>
              <p className="font-medium text-gray-900">{option.label}</p>
              <p className="text-sm text-gray-500">{option.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderContributionStyle = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          How would you like to contribute?
        </h3>
        <p className="text-gray-600 text-sm">
          Help others discover amazing places in your own way
        </p>
      </div>
      <div className="space-y-3">
        {[
          { 
            id: "photos", 
            label: "Share photos", 
            desc: "Capture the beauty of places you visit",
            icon: Camera,
            key: "photoSharing"
          },
          { 
            id: "reviews", 
            label: "Write reviews", 
            desc: "Share detailed experiences and tips",
            icon: Star,
            key: "reviewWriting"
          },
          { 
            id: "events", 
            label: "Host events", 
            desc: "Organize meetups and group activities",
            icon: Calendar,
            key: "eventHosting"
          }
        ].map((option) => {
          const Icon = option.icon
          const isSelected = userPreferences[option.key as keyof typeof userPreferences]
          
          return (
            <button
              key={option.id}
              onClick={() => updatePreference(option.key, !isSelected)}
              className={`w-full p-4 border-2 rounded-lg transition-all text-left flex items-center space-x-4 ${
                isSelected 
                  ? 'border-[#4ECDC4] bg-[#4ECDC4]/10' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`h-6 w-6 ${isSelected ? 'text-[#4ECDC4]' : 'text-gray-400'}`} />
              <div>
                <p className={`font-medium ${isSelected ? 'text-[#4ECDC4]' : 'text-gray-900'}`}>
                  {option.label}
                </p>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
      <div className="pt-4">
        <button
          onClick={nextPrompt}
          className="w-full bg-[#4ECDC4] text-white py-3 rounded-lg font-medium hover:bg-[#3DBDB5] transition-colors"
        >
          Complete Setup
        </button>
      </div>
    </div>
  )

  const renderCurrentPrompt = () => {
    const prompt = onboardingPrompts[currentPrompt]
    
    switch (prompt.component) {
      case "LocationPermission": return renderLocationPermission()
      case "TimePreference": return renderTimePreference()
      case "TravelRadius": return renderTravelRadius()
      case "SocialPreferences": return renderSocialPreferences()
      case "ContributionStyle": return renderContributionStyle()
      default: return null
    }
  }

  if (currentPrompt >= onboardingPrompts.length) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Step {currentPrompt + 1} of {onboardingPrompts.length}</span>
            <span>Quick setup</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentPrompt + 1) / onboardingPrompts.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current prompt content */}
        {renderCurrentPrompt()}

        {/* Skip option */}
        {currentPrompt > 0 && (
          <div className="text-center mt-4">
            <button
              onClick={skipPrompt}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip this step
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 