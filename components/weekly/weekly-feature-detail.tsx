"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  Star, 
  Users, 
  MapPin, 
  Heart, 
  Share2, 
  Bookmark,
  ArrowLeft,
  Sparkles,
  Trophy,
  Lightbulb,
  Camera,
  Music,
  Coffee,
  Plane,
  Car,
  Train,
  Bus,
  Bike,
  Walking,
  Compass,
  Target,
  Zap,
  Gift,
  Award,
  Crown,
  Gem,
  Diamond,
  Star as StarIcon
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { WEEKLY_THEMES } from '@/types/feed'
import { getImageUrl } from '@/lib/image-utils'

interface WeeklyFeatureDetailProps {
  feature: any
}

export default function WeeklyFeatureDetail({ feature }: WeeklyFeatureDetailProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Get theme configuration
  const themeConfig = WEEKLY_THEMES.find(theme => theme.id === feature.theme) || WEEKLY_THEMES[0]

  const handleLike = () => {
    setIsLiked(!isLiked)
    toast.success(isLiked ? 'Removed from likes' : 'Added to likes!')
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    toast.success(isSaved ? 'Removed from saved' : 'Saved to collection!')
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: feature.title,
          text: feature.description,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      toast.error('Failed to share')
    }
  }

  const getThemeIcon = (theme: string) => {
    const iconMap: Record<string, any> = {
      'sunday_serenity': Coffee,
      'monday_motivation': Zap,
      'tuesday_tips': Lightbulb,
      'wednesday_wanderlust': Plane,
      'thursday_throwback': Camera,
      'friday_fun': Music,
      'weekend_warriors': Trophy
    }
    return iconMap[theme] || Sparkles
  }

  const ThemeIcon = getThemeIcon(feature.theme)

  const getWeekNumber = () => {
    const date = new Date(feature.createdAt)
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/feed" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#FF6B6B] transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Link>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full">
            <ThemeIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <Badge variant="secondary" className="bg-[#FFE66D]/20 text-[#FF6B6B] border-[#FFE66D]/30">
              Week {getWeekNumber()}, {new Date(feature.createdAt).getFullYear()}
            </Badge>
            <p className="text-sm text-gray-600 mt-1">{formatDate(feature.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8"
      >
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-[#FF6B6B] via-[#4ECDC4] to-[#FFE66D]">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-radial from-white/20 to-transparent" />
            </div>
            
            <div className="relative h-full flex items-center justify-center text-white text-center p-8">
              <div className="max-w-2xl">
                <div className="text-6xl mb-4">{themeConfig.emoji}</div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{feature.title}</h1>
                <p className="text-xl opacity-90 leading-relaxed">{feature.subtitle}</p>
              </div>
            </div>
          </div>
          
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{Math.floor(Math.random() * 1000 + 500)} participating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span>4.{Math.floor(Math.random() * 3 + 6)} rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{feature.estimatedReadTime || 5} min read</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLike}
                  className={`rounded-full ${isLiked ? 'bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/30' : ''}`}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                  {isLiked ? 'Liked' : 'Like'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className={`rounded-full ${isSaved ? 'bg-[#FFE66D]/10 text-[#FF6B6B] border-[#FFE66D]/30' : ''}`}
                >
                  <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="rounded-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            
            <p className="text-gray-700 leading-relaxed text-lg">
              {feature.description}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'overview', label: 'Overview', icon: Sparkles },
            { id: 'content', label: 'Content', icon: Gem },
            { id: 'challenges', label: 'Challenges', icon: Trophy },
            { id: 'community', label: 'Community', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-white text-[#FF6B6B] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Theme Information */}
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">About This Week's Theme</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{themeConfig.name}</h4>
                      <p className="text-gray-600 leading-relaxed">{themeConfig.description}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#FFE66D]/10 to-[#FF6B6B]/10 p-4 rounded-xl border border-[#FFE66D]/30">
                      <div className="text-3xl mb-2">{themeConfig.emoji}</div>
                      <p className="text-sm text-gray-700">{themeConfig.motto}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Highlights */}
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">Key Highlights</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { icon: Target, title: 'Focus Area', value: feature.focusArea || 'Personal Growth' },
                      { icon: Compass, title: 'Difficulty', value: feature.difficulty || 'Beginner Friendly' },
                      { icon: Gift, title: 'Rewards', value: feature.rewards || 'Community Points' }
                    ].map((item, index) => {
                      const Icon = item.icon
                      return (
                        <div key={index} className="text-center p-4 bg-gray-50 rounded-xl">
                          <Icon className="h-8 w-8 mx-auto mb-2 text-[#4ECDC4]" />
                          <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.value}</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">Featured Content</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="group cursor-pointer">
                        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden mb-3">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-4xl opacity-50">{themeConfig.emoji}</div>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-3 left-3 right-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <h4 className="font-semibold text-sm mb-1">Featured Content {item}</h4>
                            <p className="text-xs opacity-90">Click to explore</p>
                          </div>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">Content Title {item}</h4>
                        <p className="text-sm text-gray-600">Brief description of this amazing content piece.</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'challenges' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">Weekly Challenges</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { title: 'Daily Discovery', description: 'Explore one new place each day', reward: '50 points', icon: MapPin },
                      { title: 'Photo Challenge', description: 'Share 3 photos of your adventures', reward: '100 points', icon: Camera },
                      { title: 'Community Engagement', description: 'Comment on 5 posts this week', reward: '75 points', icon: Users }
                    ].map((challenge, index) => {
                      const Icon = challenge.icon
                      return (
                        <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#FFE66D]/10 to-[#FF6B6B]/10 rounded-xl border border-[#FFE66D]/30">
                          <div className="p-3 bg-white rounded-full shadow-sm">
                            <Icon className="h-6 w-6 text-[#4ECDC4]" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{challenge.title}</h4>
                            <p className="text-sm text-gray-600">{challenge.description}</p>
                          </div>
                          <Badge variant="secondary" className="bg-[#4ECDC4]/10 text-[#4ECDC4] border-[#4ECDC4]/20">
                            {challenge.reward}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">Community Activity</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-xl border border-[#FF6B6B]/20">
                      <Users className="h-12 w-12 mx-auto mb-3 text-[#FF6B6B]" />
                      <h4 className="font-semibold text-gray-900 mb-1">Active Participants</h4>
                      <p className="text-2xl font-bold text-[#FF6B6B]">{Math.floor(Math.random() * 500 + 200)}</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gradient-to-br from-[#4ECDC4]/10 to-[#FFE66D]/10 rounded-xl border border-[#4ECDC4]/20">
                      <Trophy className="h-12 w-12 mx-auto mb-3 text-[#4ECDC4]" />
                      <h4 className="font-semibold text-gray-900 mb-1">Challenges Completed</h4>
                      <p className="text-2xl font-bold text-[#4ECDC4]">{Math.floor(Math.random() * 100 + 50)}</p>
                    </div>
                    
                    <div className="text-center p-6 bg-gradient-to-br from-[#FFE66D]/10 to-[#FF6B6B]/10 rounded-xl border border-[#FFE66D]/20">
                      <Star className="h-12 w-12 mx-auto mb-3 text-[#FFE66D]" />
                      <h4 className="font-semibold text-gray-900 mb-1">Average Rating</h4>
                      <p className="text-2xl font-bold text-[#FFE66D]">4.{Math.floor(Math.random() * 3 + 6)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
} 