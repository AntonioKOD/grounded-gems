'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Utensils, 
  Eye, 
  Target, 
  Navigation, 
  DollarSign, 
  Star, 
  EyeOff,
  CheckCircle,
  Bot,
  Users,
  Building,
  ShieldCheck
} from 'lucide-react'

export interface StructuredTip {
  category: 'timing' | 'food' | 'secrets' | 'protips' | 'access' | 'savings' | 'recommendations' | 'hidden'
  tip: string
  priority: 'high' | 'medium' | 'low'
  isVerified: boolean
  source: 'ai_generated' | 'user_submitted' | 'business_provided' | 'staff_verified'
}

interface StructuredInsiderTipsProps {
  tips: StructuredTip[] | string // Support both new structured and legacy format
  locationName?: string
  locationId?: string
  showAddTip?: boolean
  onAddTip?: () => void
  compact?: boolean
  currentUser?: { id: string; name?: string } | null
}

const categoryConfig = {
  timing: {
    icon: Clock,
    label: 'Best Times to Visit',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    emoji: '⏰'
  },
  food: {
    icon: Utensils,
    label: 'Food & Drinks',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    emoji: '🍽️'
  },
  secrets: {
    icon: Eye,
    label: 'Local Secrets',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    emoji: '💡'
  },
  protips: {
    icon: Target,
    label: 'Pro Tips',
    color: 'bg-green-100 text-green-800 border-green-200',
    emoji: '🎯'
  },
  access: {
    icon: Navigation,
    label: 'Getting There',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    emoji: '🚗'
  },
  savings: {
    icon: DollarSign,
    label: 'Money Saving',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    emoji: '💰'
  },
  recommendations: {
    icon: Star,
    label: 'What to Order/Try',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    emoji: '📱'
  },
  hidden: {
    icon: EyeOff,
    label: 'Hidden Features',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    emoji: '🎪'
  }
}

const priorityConfig = {
  high: {
    label: 'Essential',
    color: 'border-red-400 bg-red-50',
    badge: 'bg-red-500 text-white',
    emoji: '🔥'
  },
  medium: {
    label: 'Helpful',
    color: 'border-yellow-400 bg-yellow-50',
    badge: 'bg-yellow-500 text-white',
    emoji: '⭐'
  },
  low: {
    label: 'Nice to Know',
    color: 'border-blue-400 bg-blue-50',
    badge: 'bg-blue-500 text-white',
    emoji: '💡'
  }
}

const sourceConfig = {
  ai_generated: {
    icon: Bot,
    label: 'Local Insights',
    color: 'text-gray-600'
  },
  user_submitted: {
    icon: Users,
    label: 'User Submitted',
    color: 'text-blue-600'
  },
  business_provided: {
    icon: Building,
    label: 'Business Provided',
    color: 'text-orange-600'
  },
  staff_verified: {
    icon: ShieldCheck,
    label: 'Staff Verified',
    color: 'text-green-600'
  }
}

// Convert legacy string tips to structured format for display
function legacyToStructured(legacyTips: string): StructuredTip[] {
  if (!legacyTips || legacyTips.trim().length === 0) return []
  
  const tipTexts = legacyTips.split(/[.|]+/)
    .map(tip => tip.trim())
    .filter(tip => tip.length > 10)
  
  return tipTexts.slice(0, 5).map((tip, index) => ({
    category: 'protips' as const,
    tip: tip,
    priority: index === 0 ? 'high' : 'medium',
    isVerified: false,
    source: 'ai_generated' as const
  }))
}

export default function StructuredInsiderTips({
  tips,
  locationName,
  locationId,
  showAddTip = false,
  onAddTip,
  compact = false,
  currentUser
}: StructuredInsiderTipsProps) {
  // Handle both legacy string format and new structured format
  const structuredTips: StructuredTip[] = typeof tips === 'string' 
    ? legacyToStructured(tips)
    : tips || []

  if (structuredTips.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Insider Tips
          </CardTitle>
          <CardDescription>
            Local secrets and tips from people who know {locationName || 'this place'} best
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 mb-2">No insider tips yet</p>
            <p className="text-sm text-gray-500">Be the first to share what makes this place special!</p>
            {showAddTip && onAddTip && currentUser && (
              <Button onClick={onAddTip} className="mt-4" variant="outline">
                Share a Tip
              </Button>
            )}
            {showAddTip && !currentUser && (
              <p className="text-sm text-gray-400 mt-4">Log in to share your insider tips</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort tips by priority (high → medium → low)
  const sortedTips = [...structuredTips].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Group tips by category for compact view
  const groupedTips = compact ? sortedTips.reduce((groups, tip) => {
    const category = tip.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category]!.push(tip)
    return groups
  }, {} as Record<string, StructuredTip[]>) : null

  if (compact && groupedTips) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Target className="h-4 w-4" />
          Insider Tips
        </h3>
        <div className="space-y-2">
          {Object.entries(groupedTips).map(([category, categoryTips]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig]
            return (
              <div key={category} className="flex items-start gap-2">
                <Badge variant="outline" className={`${config.color} text-xs flex-shrink-0`}>
                  {config.emoji} {config.label}
                </Badge>
                <div className="text-sm text-gray-700 space-y-1">
                  {categoryTips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-1">
                      {tip.priority === 'high' && <span className="text-red-500 text-xs">🔥</span>}
                      <span>{tip.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          Insider Tips
          <Badge variant="outline" className="ml-auto">
            {structuredTips.length} {structuredTips.length === 1 ? 'tip' : 'tips'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Local secrets and tips from people who know {locationName || 'this place'} best
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedTips.map((tip, index) => {
            const categoryConf = categoryConfig[tip.category]
            const priorityConf = priorityConfig[tip.priority]
            const sourceConf = sourceConfig[tip.source]
            const CategoryIcon = categoryConf.icon
            const SourceIcon = sourceConf.icon

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 ${priorityConf.color} transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`${categoryConf.color} text-xs`}>
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {categoryConf.label}
                      </Badge>
                      <Badge className={`${priorityConf.badge} text-xs`}>
                        {priorityConf.emoji} {priorityConf.label}
                      </Badge>
                      {tip.isVerified && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium leading-relaxed">
                      {tip.tip}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <SourceIcon className="h-3 w-3" />
                      <span className={sourceConf.color}>{sourceConf.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {showAddTip && onAddTip && currentUser && (
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
              <p className="text-gray-600 mb-3">Know a secret about this place?</p>
              <Button onClick={onAddTip} variant="outline" size="sm">
                <Target className="h-4 w-4 mr-2" />
                Share Your Insider Tip
              </Button>
            </div>
          )}
          
          {showAddTip && !currentUser && (
            <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center bg-gray-50">
              <p className="text-gray-500 mb-3">Want to share an insider tip?</p>
              <p className="text-sm text-gray-400">Please log in to contribute your local knowledge</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Export utility functions for external use
export { legacyToStructured }

// Component for inline tip display in lists/cards
export function InlineTips({ tips, maxDisplay = 2 }: { tips: StructuredTip[] | string, maxDisplay?: number }) {
  const structuredTips: StructuredTip[] = typeof tips === 'string' 
    ? legacyToStructured(tips)
    : tips || []

  if (structuredTips.length === 0) return null

  const topTips = structuredTips
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    .slice(0, maxDisplay)

  return (
    <div className="space-y-1">
      {topTips.map((tip, index) => {
        const categoryConf = categoryConfig[tip.category]
        return (
          <div key={index} className="flex items-start gap-2 text-sm">
            <span className="text-xs">{categoryConf.emoji}</span>
            <span className="text-gray-700 leading-tight">{tip.tip}</span>
            {tip.priority === 'high' && <span className="text-red-500 text-xs">🔥</span>}
          </div>
        )
      })}
      {structuredTips.length > maxDisplay && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Target className="h-3 w-3" />
          +{structuredTips.length - maxDisplay} more tips
        </div>
      )}
    </div>
  )
} 