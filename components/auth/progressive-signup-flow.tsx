"use client"

import { useState } from "react"
import { ArrowRight, MapPin, User, Mail, Lock, Calendar, Camera, Coffee, Utensils, TreePine, Building2 } from "lucide-react"
import Link from "next/link"

interface ProgressiveSignupFlowProps {
  onComplete: (userData: any) => void
}

export default function ProgressiveSignupFlow({ onComplete }: ProgressiveSignupFlowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [userData, setUserData] = useState({
    // Step 1: Essential data
    email: "",
    password: "",
    
    // Step 2: Basic personalization
    name: "",
    location: "",
    
    // Step 3: Interest-based personalization
    interests: [] as string[],
    discoveryGoal: "",
    
    // Step 4: Usage patterns for Zipf's Law optimization
    primaryUseCase: "",
    frequency: "",
    
    // Step 5: Social/community preferences
    sharePreference: "",
    notificationPreference: ""
  })

  const totalSteps = 5

  // Following Zipf's Law: Most popular interests first
  const interestOptions = [
    { id: "coffee", label: "Coffee Shops", icon: Coffee, popularity: 95 },
    { id: "restaurants", label: "Restaurants", icon: Utensils, popularity: 87 },
    { id: "nature", label: "Nature & Parks", icon: TreePine, popularity: 72 },
    { id: "photography", label: "Photo Spots", icon: Camera, popularity: 68 },
    { id: "nightlife", label: "Nightlife", icon: Building2, popularity: 45 },
    { id: "shopping", label: "Shopping", icon: Building2, popularity: 38 }
  ]

  const useCaseOptions = [
    { id: "explore", label: "Discover new places", description: "Find hidden gems nearby" },
    { id: "plan", label: "Plan outings", description: "Organize trips and events" },
    { id: "share", label: "Share discoveries", description: "Recommend places to others" },
    { id: "connect", label: "Meet like-minded people", description: "Connect with local community" }
  ]

  const updateUserData = (field: string, value: any) => {
    setUserData(prev => ({ ...prev, [field]: value }))
  }

  const toggleInterest = (interestId: string) => {
    setUserData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete(userData)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return userData.email && userData.password
      case 2: return userData.name
      case 3: return userData.interests.length > 0
      case 4: return userData.primaryUseCase
      case 5: return true // Optional step
      default: return false
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Progress Bar */}
      <div className="mb-6">
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

      {/* Step 1: Essential Signup */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Grounded Gems</h2>
            <p className="text-gray-600">Let's get you started with discovering amazing places</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="email"
                  value={userData.email}
                  onChange={(e) => updateUserData("email", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="password"
                  value={userData.password}
                  onChange={(e) => updateUserData("password", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent"
                  placeholder="Create a secure password"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
          </div>

          {/* Social Signup Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium">Google</span>
              </button>
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium">Apple</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Basic Personalization */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tell us about yourself</h2>
            <p className="text-gray-600">This helps us personalize your experience</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={userData.name}
                  onChange={(e) => updateUserData("name", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent"
                  placeholder="What should we call you?"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={userData.location}
                  onChange={(e) => updateUserData("location", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent"
                  placeholder="City, State or 'Use my location'"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Helps us show relevant nearby places</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Interest-based Personalization */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">What interests you?</h2>
            <p className="text-gray-600">Select all that apply - we'll prioritize these in your feed</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {interestOptions.map((interest) => {
              const Icon = interest.icon
              const isSelected = userData.interests.includes(interest.id)
              
              return (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-[#4ECDC4] bg-[#4ECDC4]/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${
                    isSelected ? 'text-[#4ECDC4]' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    isSelected ? 'text-[#4ECDC4]' : 'text-gray-700'
                  }`}>
                    {interest.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {interest.popularity}% popular
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 4: Usage Pattern (Critical for Zipf's Law optimization) */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">How will you use Grounded Gems?</h2>
            <p className="text-gray-600">This helps us optimize your experience</p>
          </div>

          <div className="space-y-3">
            {useCaseOptions.map((useCase) => (
              <button
                key={useCase.id}
                onClick={() => updateUserData("primaryUseCase", useCase.id)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  userData.primaryUseCase === useCase.id
                    ? 'border-[#4ECDC4] bg-[#4ECDC4]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`font-medium ${
                  userData.primaryUseCase === useCase.id ? 'text-[#4ECDC4]' : 'text-gray-900'
                }`}>
                  {useCase.label}
                </p>
                <p className="text-sm text-gray-600 mt-1">{useCase.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How often do you explore new places?
            </label>
            <select
              value={userData.frequency}
              onChange={(e) => updateUserData("frequency", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent"
            >
              <option value="">Select frequency</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="occasionally">Occasionally</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 5: Social & Notification Preferences */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Almost done!</h2>
            <p className="text-gray-600">Set your preferences for the best experience</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sharing Preference
              </label>
              <div className="space-y-2">
                {[
                  { id: "public", label: "Public", desc: "Anyone can see your discoveries" },
                  { id: "friends", label: "Friends only", desc: "Only people you follow" },
                  { id: "private", label: "Private", desc: "Keep discoveries to yourself" }
                ].map((option) => (
                  <label key={option.id} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="sharePreference"
                      value={option.id}
                      checked={userData.sharePreference === option.id}
                      onChange={(e) => updateUserData("sharePreference", e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-600">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notifications
              </label>
              <div className="space-y-2">
                {[
                  { id: "all", label: "All notifications", desc: "New places, events, and social updates" },
                  { id: "important", label: "Important only", desc: "New places near you and events" },
                  { id: "minimal", label: "Minimal", desc: "Only essential updates" }
                ].map((option) => (
                  <label key={option.id} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="notificationPreference"
                      value={option.id}
                      checked={userData.notificationPreference === option.id}
                      onChange={(e) => updateUserData("notificationPreference", e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-600">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        {currentStep > 1 && (
          <button
            onClick={prevStep}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
        )}
        
        <div className="ml-auto">
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all ${
              canProceed()
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>{currentStep === totalSteps ? 'Complete Setup' : 'Continue'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Skip Option for Optional Steps */}
      {currentStep > 2 && (
        <div className="text-center mt-4">
          <button
            onClick={nextStep}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip this step
          </button>
        </div>
      )}
    </div>
  )
} 