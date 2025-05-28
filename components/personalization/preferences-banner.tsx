"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, Settings, Star, MapPin, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'

interface UserPersonalization {
  hasCompletedOnboarding: boolean
  interests: string[]
  primaryUseCase?: string
  budgetPreference?: string
  travelRadius?: string
  preferencesSummary: string[]
}

interface PreferencesBannerProps {
  userPersonalization: UserPersonalization | null
  showFullDetails?: boolean
  compact?: boolean
  className?: string
}

export default function PreferencesBanner({ 
  userPersonalization, 
  showFullDetails = false,
  compact = false,
  className = ""
}: PreferencesBannerProps) {
  if (!userPersonalization) {
    return null
  }

  const getUseCaseIcon = (useCase: string) => {
    switch (useCase) {
      case 'explore': return '🔍'
      case 'plan': return '📅'
      case 'share': return '📸'
      case 'connect': return '👥'
      default: return '✨'
    }
  }

  const getBudgetIcon = (budget: string) => {
    switch (budget) {
      case 'free': return '🆓'
      case 'budget': return '$'
      case 'moderate': return '$$'
      case 'premium': return '$$$'
      case 'luxury': return '$$$$'
      default: return '💰'
    }
  }

  const getInterestIcon = (interest: string) => {
    const iconMap: { [key: string]: string } = {
      coffee: '☕',
      restaurants: '🍽️',
      nature: '🌳',
      photography: '📸',
      nightlife: '🍻',
      shopping: '🛍️',
      arts: '🎨',
      sports: '⚽',
      markets: '🏪',
      events: '🎪'
    }
    return iconMap[interest] || '📍'
  }

  if (!userPersonalization.hasCompletedOnboarding) {
    return (
      <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
        <Sparkles className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="text-amber-800 font-medium">
              {compact ? "Complete setup for personalized recommendations" : "Complete your preferences to get personalized location recommendations!"}
            </p>
            {!compact && (
              <p className="text-amber-700 text-sm mt-1">
                Tell us your interests and preferences to discover places you'll love.
              </p>
            )}
          </div>
          <Link href="/signup/enhanced">
            <Button 
              size={compact ? "sm" : "default"} 
              variant="outline" 
              className="border-amber-300 text-amber-800 hover:bg-amber-100 ml-4"
            >
              <Settings className="h-4 w-4 mr-1" />
              {compact ? "Setup" : "Complete Setup"}
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-gradient-to-r from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-lg border ${className}`}>
        <Sparkles className="h-4 w-4 text-[#FF6B6B]" />
        <span className="text-sm font-medium text-gray-700">Personalized for you</span>
        <div className="flex gap-1">
          {userPersonalization.interests.slice(0, 3).map((interest, index) => (
            <span key={index} className="text-sm">
              {getInterestIcon(interest)}
            </span>
          ))}
          {userPersonalization.interests.length > 3 && (
            <span className="text-xs text-gray-500">+{userPersonalization.interests.length - 3}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-[#FF6B6B]/5 to-[#4ECDC4]/5 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-[#FF6B6B]" />
            <h3 className="font-semibold text-gray-900">Your Personalized Experience</h3>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Star className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>

          {showFullDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Interests */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Your Interests</h4>
                <div className="flex flex-wrap gap-1">
                  {userPersonalization.interests.map((interest, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <span className="mr-1">{getInterestIcon(interest)}</span>
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Use Case & Budget */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preferences</h4>
                <div className="space-y-2">
                  {userPersonalization.primaryUseCase && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{getUseCaseIcon(userPersonalization.primaryUseCase)}</span>
                      <span className="capitalize">{userPersonalization.primaryUseCase}</span>
                    </div>
                  )}
                  {userPersonalization.budgetPreference && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>{getBudgetIcon(userPersonalization.budgetPreference)} {userPersonalization.budgetPreference}</span>
                    </div>
                  )}
                  {userPersonalization.travelRadius && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {userPersonalization.travelRadius === 'unlimited' 
                          ? 'Any distance' 
                          : `${userPersonalization.travelRadius} mi radius`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">How We Personalize</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We use your preferences to recommend locations that match your interests, 
                  budget, and travel preferences for the best experience.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userPersonalization.preferencesSummary.slice(0, 2).map((summary, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-white">
                  {summary}
                </Badge>
              ))}
              {userPersonalization.preferencesSummary.length > 2 && (
                <Badge variant="outline" className="text-xs bg-white">
                  +{userPersonalization.preferencesSummary.length - 2} more
                </Badge>
              )}
            </div>
          )}
        </div>

        <Link href="/profile/preferences">
          <Button variant="outline" size="sm" className="ml-4">
            <Settings className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </Link>
      </div>
    </div>
  )
} 