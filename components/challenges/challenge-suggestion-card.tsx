"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Vote, 
  ArrowUp, 
  ArrowDown, 
  Users, 
  Clock, 
  Star, 
  Target,
  TrendingUp,
  Award,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'

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

interface ChallengeSuggestionCardProps {
  suggestion: ChallengeSuggestion
  onVote: (suggestionId: string, voteType: 'up' | 'down') => void
  isVoting?: boolean
  className?: string
}

export default function ChallengeSuggestionCard({
  suggestion,
  onVote,
  isVoting = false,
  className = ""
}: ChallengeSuggestionCardProps) {
  const [localVoteState, setLocalVoteState] = useState<'up' | 'down' | null>(suggestion.userVote || null)
  const [localUpvotes, setLocalUpvotes] = useState(suggestion.upvotes)
  const [localDownvotes, setLocalDownvotes] = useState(suggestion.downvotes)

  const handleVote = async (voteType: 'up' | 'down') => {
    // Prevent voting if already voting
    if (isVoting) return

    // Update local state immediately for better UX
    const previousVote = localVoteState
    let newUpvotes = localUpvotes
    let newDownvotes = localDownvotes

    if (voteType === 'up') {
      if (previousVote === 'up') {
        // Remove upvote
        setLocalVoteState(null)
        setLocalUpvotes(prev => prev - 1)
        newUpvotes = localUpvotes - 1
      } else {
        // Add upvote, remove downvote if exists
        setLocalVoteState('up')
        setLocalUpvotes(prev => prev + 1)
        if (previousVote === 'down') {
          setLocalDownvotes(prev => prev - 1)
          newDownvotes = localDownvotes - 1
        }
        newUpvotes = localUpvotes + 1
      }
    } else {
      if (previousVote === 'down') {
        // Remove downvote
        setLocalVoteState(null)
        setLocalDownvotes(prev => prev - 1)
        newDownvotes = localDownvotes - 1
      } else {
        // Add downvote, remove upvote if exists
        setLocalVoteState('down')
        setLocalDownvotes(prev => prev + 1)
        if (previousVote === 'up') {
          setLocalUpvotes(prev => prev - 1)
          newUpvotes = localUpvotes - 1
        }
        newDownvotes = localDownvotes + 1
      }
    }

    // Call the parent handler
    onVote(suggestion.id, voteType)
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
      case 'fitness': return <Award className="w-4 h-4" />
      case 'culture': return <Star className="w-4 h-4" />
      case 'social': return <Users className="w-4 h-4" />
      case 'seasonal': return <Calendar className="w-4 h-4" />
      default: return <Award className="w-4 h-4" />
    }
  }

  const getVotePercentage = () => {
    const total = localUpvotes + localDownvotes
    if (total === 0) return 0
    return Math.round((localUpvotes / total) * 100)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={`overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#4ECDC4] to-[#FFE66D] rounded-full">
              <Vote className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Voting Option</h3>
              <p className="text-sm text-gray-600">Week {suggestion.weekNumber}, {suggestion.year}</p>
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={`text-xs font-semibold ${getDifficultyColor(suggestion.difficulty)}`}
          >
            {suggestion.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Title */}
          <h4 className="font-semibold text-gray-900 text-lg leading-tight">
            {suggestion.title}
          </h4>
          
          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed">
            {suggestion.description}
          </p>
          
          {/* Category and Reward */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-[#4ECDC4]">
              {getCategoryIcon(suggestion.category)}
              <span className="font-medium capitalize">{suggestion.category}</span>
            </div>
            <div className="flex items-center gap-1 text-[#FF6B6B]">
              <Award className="w-4 h-4" />
              <span className="font-medium">{suggestion.reward}</span>
            </div>
          </div>
        </div>

        {/* Voting Section */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>Community Vote</span>
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(suggestion.createdAt)}
            </div>
          </div>
          
          {/* Vote Buttons */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVote('up')}
              disabled={isVoting}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${localVoteState === 'up'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                }
                ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isVoting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
              <span>{localUpvotes}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVote('down')}
              disabled={isVoting}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${localVoteState === 'down'
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                }
                ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isVoting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              <span>{localDownvotes}</span>
            </motion.button>
            
            {/* Vote Stats */}
            <div className="flex-1 text-right">
              <div className="text-sm font-semibold text-gray-900">
                {localUpvotes + localDownvotes} total votes
              </div>
              <div className="text-xs text-gray-500">
                {getVotePercentage()}% approval
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getVotePercentage()}%` }}
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={`
              text-xs font-semibold
              ${suggestion.featured 
                ? 'bg-[#FFE66D]/10 text-[#FFE66D] border-[#FFE66D]/30' 
                : 'bg-gray-100 text-gray-600 border-gray-300'
              }
            `}
          >
            {suggestion.featured ? 'Featured' : 'Community'}
          </Badge>
          
          <div className="text-xs text-gray-500">
            Net votes: <span className={`font-semibold ${suggestion.netVotes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {suggestion.netVotes >= 0 ? '+' : ''}{suggestion.netVotes}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 