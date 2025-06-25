"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Trophy, 
  Users, 
  Clock, 
  Star, 
  ChevronRight, 
  Plus,
  Vote,
  TrendingUp,
  Target,
  Award,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ChallengeCard from './challenge-card'
import ChallengeSuggestionCard from './challenge-suggestion-card'

interface Challenge {
  id: string
  title: string
  description: string
  shortDescription?: string
  category: string
  difficulty: string
  reward: string
  rewardPoints?: number
  requirements?: Array<{ requirement: string; count: number }>
  status: string
  isWeekly: boolean
  weekNumber: number
  year: number
  startsAt?: string
  expiresAt?: string
  participantCount: number
  completionCount: number
  image?: any
  tags: string[]
  locationBased?: boolean
  maxDistance?: number
  weatherDependent?: boolean
  estimatedDuration?: string
  cost?: string
  socialSharing?: boolean
  featured?: boolean
  createdAt: string
  updatedAt: string
  isJoined?: boolean
  isCompleted?: boolean
  canJoin?: boolean
  canComplete?: boolean
}

interface ChallengeSuggestion {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  reward: string
  upvotes: number
  downvotes: number
  netVotes: number
  totalVotes: number
  weekNumber: number
  year: number
  status: string
  featured: boolean
  createdAt: string
  updatedAt: string
  userVote?: 'up' | 'down' | null
}

interface WeeklyChallengesData {
  currentWeek: {
    weekNumber: number
    year: number
    challenges: Challenge[]
  }
  nextWeek: {
    weekNumber: number
    year: number
    votingOptions: ChallengeSuggestion[]
  }
  meta: {
    currentWeek: number
    currentYear: number
    nextWeek: number
    hasCurrentChallenges: boolean
    hasVotingOptions: boolean
    userId: string | null
  }
}

export default function ChallengesPage() {
  const [weeklyData, setWeeklyData] = useState<WeeklyChallengesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'weekly' | 'suggestions'>('weekly')
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({})

  // Load weekly challenges data
  useEffect(() => {
    loadWeeklyChallenges()
  }, [])

  const loadWeeklyChallenges = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/challenges/weekly')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWeeklyData(data.data)
        } else {
          throw new Error(data.error || 'Failed to load weekly challenges')
        }
      } else {
        throw new Error('Failed to load weekly challenges')
      }
    } catch (error) {
      console.error('Error loading weekly challenges:', error)
      toast.error('Failed to load weekly challenges')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChallengeJoin = async (challengeId: string) => {
    try {
      const response = await fetch('/api/challenges/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId })
      })

      if (response.ok) {
        toast.success('Joined challenge successfully!')
        // Refresh data to update states
        loadWeeklyChallenges()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to join challenge')
      }
    } catch (error) {
      console.error('Error joining challenge:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to join challenge')
    }
  }

  const handleVote = async (suggestionId: string, voteType: 'up' | 'down') => {
    try {
      setVotingStates(prev => ({ ...prev, [suggestionId]: true }))
      
      const response = await fetch('/api/challenges/suggestions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suggestionId, 
          voteType 
        })
      })

      if (response.ok) {
        toast.success(`Vote ${voteType === 'up' ? 'upvoted' : 'downvoted'} successfully!`)
        // Refresh data to update vote counts
        loadWeeklyChallenges()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to vote')
    } finally {
      setVotingStates(prev => ({ ...prev, [suggestionId]: false }))
    }
  }

  const getCurrentWeekText = () => {
    if (!weeklyData) return 'This Week'
    return `Week ${weeklyData.currentWeek.weekNumber}, ${weeklyData.currentWeek.year}`
  }

  const getNextWeekText = () => {
    if (!weeklyData) return 'Next Week'
    return `Week ${weeklyData.nextWeek.weekNumber}, ${weeklyData.nextWeek.year}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'hard': return 'bg-red-100 text-red-700 border-red-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'exploration': return <Target className="w-4 h-4" />
      case 'fitness': return <Trophy className="w-4 h-4" />
      case 'culture': return <Star className="w-4 h-4" />
      case 'social': return <Users className="w-4 h-4" />
      case 'seasonal': return <Calendar className="w-4 h-4" />
      default: return <Award className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            {/* Header skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
            </div>
            
            {/* Tab skeleton */}
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
              <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-gray-200 rounded"></div>
                      <div className="h-6 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Weekly Challenges</h1>
              <p className="text-gray-600">Complete challenges and vote for next week's adventures</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gradient-to-r from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-xl">
              <div className="text-2xl font-bold text-[#FF6B6B]">
                {weeklyData?.currentWeek.challenges.length || 0}
              </div>
              <div className="text-sm text-gray-600">Active Challenges</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-[#4ECDC4]/10 to-[#FFE66D]/10 rounded-xl">
              <div className="text-2xl font-bold text-[#4ECDC4]">
                {weeklyData?.nextWeek.votingOptions.length || 0}
              </div>
              <div className="text-sm text-gray-600">Voting Options</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-[#FFE66D]/10 to-[#FF6B6B]/10 rounded-xl">
              <div className="text-2xl font-bold text-[#FFE66D]">
                {weeklyData?.currentWeek.challenges.reduce((sum, c) => sum + c.participantCount, 0) || 0}
              </div>
              <div className="text-sm text-gray-600">Total Participants</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-r from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-xl">
              <div className="text-2xl font-bold text-[#FF6B6B]">
                {weeklyData?.currentWeek.challenges.reduce((sum, c) => sum + c.completionCount, 0) || 0}
              </div>
              <div className="text-sm text-gray-600">Completions</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'weekly' ? 'default' : 'outline'}
            onClick={() => setActiveTab('weekly')}
            className={`
              rounded-full transition-all duration-300 font-medium
              ${activeTab === 'weekly' 
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white shadow-lg' 
                : 'bg-white/80 border border-gray-200 hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5'
              }
            `}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Current Week
          </Button>
          <Button
            variant={activeTab === 'suggestions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('suggestions')}
            className={`
              rounded-full transition-all duration-300 font-medium
              ${activeTab === 'suggestions' 
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white shadow-lg' 
                : 'bg-white/80 border border-gray-200 hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5'
              }
            `}
          >
            <Vote className="h-4 w-4 mr-2" />
            Vote for Next Week
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'weekly' ? (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Current Week Info */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{getCurrentWeekText()}</h2>
                    <p className="text-gray-600">Complete these challenges to earn rewards and badges</p>
                  </div>
                </div>
                
                {weeklyData?.currentWeek.challenges.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FFE66D]/20 to-[#FF6B6B]/20 rounded-full flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-[#FF6B6B]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Active Challenges</h3>
                    <p className="text-gray-600 mb-4">
                      Check back later for new weekly challenges or vote for next week's options below.
                    </p>
                    <Button 
                      onClick={() => setActiveTab('suggestions')}
                      className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white rounded-full"
                    >
                      <Vote className="w-4 h-4 mr-2" />
                      Vote for Next Week
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {weeklyData?.currentWeek.challenges.map((challenge, index) => (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ChallengeCard
                          challenge={challenge}
                          onJoin={handleChallengeJoin}
                          className="h-full"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Next Week Voting */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#4ECDC4] to-[#FFE66D] rounded-full flex items-center justify-center">
                    <Vote className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{getNextWeekText()} Voting</h2>
                    <p className="text-gray-600">Vote for your favorite challenge ideas for next week</p>
                  </div>
                </div>
                
                {weeklyData?.nextWeek.votingOptions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#4ECDC4]/20 to-[#FFE66D]/20 rounded-full flex items-center justify-center">
                      <Vote className="w-8 h-8 text-[#4ECDC4]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Voting Options Available</h3>
                    <p className="text-gray-600 mb-4">
                      No challenge suggestions are available for voting yet. Check back later!
                    </p>
                    <Button 
                      onClick={() => setActiveTab('weekly')}
                      className="bg-gradient-to-r from-[#4ECDC4] to-[#FFE66D] text-white rounded-full"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      View Current Challenges
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {weeklyData?.nextWeek.votingOptions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ChallengeSuggestionCard
                          suggestion={suggestion}
                          onVote={handleVote}
                          isVoting={votingStates[suggestion.id] || false}
                          className="h-full"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 