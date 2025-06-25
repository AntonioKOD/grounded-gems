"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Users, 
  Clock, 
  Star, 
  MapPin, 
  Award,
  Target,
  DollarSign,
  Timer,
  CheckCircle,
  PlayCircle,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'

interface Challenge {
  id: string
  title: string
  description: string
  shortDescription: string
  category: string
  difficulty: string
  reward: string
  rewardPoints: number
  requirements: Array<{ requirement: string; count: number }>
  status: string
  isWeekly: boolean
  weekNumber: number
  year: number
  startsAt: string
  expiresAt: string
  participantCount: number
  completionCount: number
  image?: any
  tags: string[]
  locationBased: boolean
  maxDistance?: number
  weatherDependent: boolean
  estimatedDuration: string
  cost: string
  socialSharing: boolean
  featured: boolean
  createdAt: string
  updatedAt: string
  isJoined: boolean
  isCompleted: boolean
  canJoin: boolean
  canComplete: boolean
}

interface ChallengeCardProps {
  challenge: Challenge
  onJoin: (challengeId: string) => void
}

export default function ChallengeCard({ challenge, onJoin }: ChallengeCardProps) {
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = async () => {
    if (isJoining) return
    
    setIsJoining(true)
    try {
      await onJoin(challenge.id)
    } catch (error) {
      console.error('Error joining challenge:', error)
    } finally {
      setIsJoining(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'hard': return 'bg-orange-100 text-orange-700'
      case 'expert': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getDurationText = (duration: string) => {
    switch (duration) {
      case 'quick': return '< 1 hour'
      case 'short': return '1-3 hours'
      case 'medium': return '3-8 hours'
      case 'long': return '1-3 days'
      case 'extended': return '1+ weeks'
      default: return duration
    }
  }

  const getCostText = (cost: string) => {
    switch (cost) {
      case 'free': return 'Free'
      case 'low': return '< $10'
      case 'medium': return '$10-$50'
      case 'high': return '$50+'
      default: return cost
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exploration': return '🗺️'
      case 'food': return '🍕'
      case 'photography': return '📸'
      case 'fitness': return '💪'
      case 'culture': return '🎭'
      case 'social': return '👥'
      case 'environmental': return '🌿'
      case 'seasonal': return '🍂'
      case 'creative': return '🎨'
      case 'adventure': return '🏔️'
      default: return '🎯'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isExpired = new Date(challenge.expiresAt) < new Date()
  const isActive = challenge.status === 'active' && !isExpired

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center text-white text-xl">
                {getCategoryIcon(challenge.category)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">{challenge.title}</h3>
                  {challenge.featured && (
                    <Badge className="bg-gradient-to-r from-[#FFE66D] to-[#FF6B6B] text-white text-xs">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Badge className={getDifficultyColor(challenge.difficulty)}>
                    {challenge.difficulty}
                  </Badge>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getDurationText(challenge.estimatedDuration)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {getCostText(challenge.cost)}
                  </span>
                </div>
              </div>
            </div>
            
            {challenge.isJoined && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Joined</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-gray-700 mb-4 leading-relaxed">
            {challenge.shortDescription || challenge.description}
          </p>

          {/* Requirements */}
          {challenge.requirements && challenge.requirements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
                <Target className="h-4 w-4" />
                Requirements
              </h4>
              <div className="space-y-1">
                {challenge.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-[#4ECDC4] rounded-full"></div>
                    <span>{req.requirement}</span>
                    {req.count > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {req.count}x
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reward */}
          <div className="mb-4 p-3 bg-gradient-to-r from-[#FFE66D]/10 to-[#FF6B6B]/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#FFE66D]" />
              <div>
                <div className="text-sm font-semibold text-gray-900">{challenge.reward}</div>
                <div className="text-xs text-gray-600">{challenge.rewardPoints} points</div>
              </div>
            </div>
          </div>

          {/* Stats and Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{challenge.participantCount} participants</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Expires {formatDate(challenge.expiresAt)}</span>
              </div>
              {challenge.locationBased && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{challenge.maxDistance}mi radius</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {challenge.isJoined ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                  disabled
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Joined
                </Button>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={!isActive || isJoining}
                  size="sm"
                  className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white hover:shadow-lg transition-all duration-300"
                >
                  {isJoining ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Join Challenge
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Tags */}
          {challenge.tags && challenge.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {challenge.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {challenge.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{challenge.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 