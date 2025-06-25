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
  Star as StarIcon,
  Eye,
  TrendingUp,
  CheckCircle,
  Play
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
  const [activeTab, setActiveTab] = useState('overview')
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Get theme configuration
  const themeConfig = WEEKLY_THEMES.find(theme => theme.id === feature.theme) || WEEKLY_THEMES[0]

  const getWeekNumber = () => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  const ThemeIcon = () => {
    const iconMap: { [key: string]: any } = {
      sunday_serenity: Coffee,
      monday_motivation: Zap,
      tuesday_tips: Lightbulb,
      wednesday_wanderlust: MapPin,
      thursday_throwback: Camera,
      friday_fun: Music,
      weekend_warriors: Trophy
    }
    const Icon = iconMap[feature.theme] || Sparkles
    return <Icon className="h-6 w-6" />
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Navigation Header - Following HubSpot's simplicity guideline */}
      <div className="mb-6 sm:mb-8">
        <Link 
          href="/feed" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#FF6B6B] transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Feed</span>
        </Link>
        
        {/* Week Badge - Clear visual hierarchy */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-full shadow-lg">
            <ThemeIcon />
          </div>
          <div>
            <Badge variant="secondary" className="bg-[#FFE66D]/20 text-[#FF6B6B] border-[#FFE66D]/30 font-semibold">
              Week {getWeekNumber()}, {new Date(feature.createdAt).getFullYear()}
            </Badge>
            <p className="text-sm text-gray-600 mt-1 font-medium">{formatDate(feature.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Hero Section - Following HubSpot's visual hierarchy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 sm:mb-12"
      >
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div className="relative h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-[#FF6B6B] via-[#4ECDC4] to-[#FFE66D]">
            {/* Background pattern for visual interest */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-radial from-white/20 to-transparent" />
            </div>
            
            {/* Hero content with clear typography */}
            <div className="relative h-full flex items-center justify-center text-white text-center p-6 sm:p-8">
              <div className="max-w-3xl">
                <div className="text-4xl sm:text-6xl mb-4 animate-bounce">{themeConfig.emoji}</div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                  {feature.title}
                </h1>
                <p className="text-lg sm:text-xl lg:text-2xl opacity-90 leading-relaxed max-w-2xl mx-auto">
                  {feature.subtitle || feature.description}
                </p>
                
                {/* Action buttons - Following HubSpot's CTA guidelines */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                  <Button 
                    size="lg"
                    className="bg-white text-[#FF6B6B] hover:bg-gray-50 font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Exploring
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-white text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-xl"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Engagement stats - Following HubSpot's social proof principle */}
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">{feature.viewCount || 0} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{feature.participantCount || 0} participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span className="font-medium">{feature.likeCount || 0} likes</span>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsLiked(!isLiked)
                    toast.success(isLiked ? 'Removed from likes' : 'Added to likes')
                  }}
                  className={`${isLiked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSaved(!isSaved)
                    toast.success(isSaved ? 'Removed from saved' : 'Added to saved')
                  }}
                  className={`${isSaved ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-500`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.share?.({
                      title: feature.title,
                      text: feature.description,
                      url: window.location.href
                    }).catch(() => {
                      navigator.clipboard.writeText(window.location.href)
                      toast.success('Link copied to clipboard')
                    })
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Description with proper typography */}
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
                {feature.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation Tabs - Following HubSpot's simplicity guideline */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
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
                  flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-white text-[#FF6B6B] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content - Following HubSpot's content organization */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Theme Information - Clear content hierarchy */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-lg">
                      <ThemeIcon />
                    </div>
                    About This Week's Theme
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900">{themeConfig.name}</h4>
                      <p className="text-gray-600 leading-relaxed text-base">
                        {themeConfig.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {themeConfig.keywords?.slice(0, 4).map((keyword: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#FFE66D]/10 to-[#FF6B6B]/10 p-6 rounded-xl border border-[#FFE66D]/30">
                      <div className="text-4xl mb-3">{themeConfig.emoji}</div>
                      <p className="text-sm text-gray-700 font-medium">{themeConfig.motto || 'Make this week amazing!'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Highlights - Following HubSpot's visual hierarchy */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Key Highlights</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { icon: Target, title: 'Focus Area', value: feature.focusArea || 'Personal Growth', color: '#FF6B6B' },
                      { icon: Compass, title: 'Difficulty', value: feature.difficulty || 'Beginner Friendly', color: '#4ECDC4' },
                      { icon: Gift, title: 'Rewards', value: feature.rewards || 'Community Points', color: '#FFE66D' },
                      { icon: Zap, title: 'Duration', value: feature.duration || '7 Days', color: '#845EC2' }
                    ].map((item, index) => {
                      const Icon = item.icon
                      return (
                        <div key={index} className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Icon className="h-6 w-6" style={{ color: item.color }} />
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1 text-sm">{item.title}</h4>
                          <p className="text-xs text-gray-600">{item.value}</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6 sm:space-y-8">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Featured Content</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <div key={item} className="group cursor-pointer">
                        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden mb-3 shadow-md">
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
            <div className="space-y-6 sm:space-y-8">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Weekly Challenges</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((challenge) => (
                      <div key={challenge} className="p-4 bg-gradient-to-r from-[#FFE66D]/5 to-[#FF6B6B]/5 rounded-xl border border-[#FFE66D]/20">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-[#FF6B6B] rounded-lg">
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">Challenge {challenge}</h4>
                            <p className="text-sm text-gray-600 mb-3">Complete this challenge to earn points and badges.</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Difficulty: Easy</span>
                              <span>Duration: 3 days</span>
                              <span>Reward: 50 points</span>
                            </div>
                          </div>
                          <Button size="sm" className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Start
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="space-y-6 sm:space-y-8">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Community Activity</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-[#4ECDC4]/10 to-[#4ECDC4]/5 rounded-xl border border-[#4ECDC4]/20">
                      <div className="text-3xl font-bold text-[#4ECDC4] mb-2">1,247</div>
                      <div className="text-sm text-gray-600">Active Participants</div>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-[#FFE66D]/10 to-[#FFE66D]/5 rounded-xl border border-[#FFE66D]/20">
                      <div className="text-3xl font-bold text-[#FFE66D] mb-2">89</div>
                      <div className="text-sm text-gray-600">New Discoveries</div>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF6B6B]/5 rounded-xl border border-[#FF6B6B]/20">
                      <div className="text-3xl font-bold text-[#FF6B6B] mb-2">342</div>
                      <div className="text-sm text-gray-600">Completed Challenges</div>
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