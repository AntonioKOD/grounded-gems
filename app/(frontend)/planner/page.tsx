"use client"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

import React, { useState, useRef, useEffect } from "react"
import { User, Users, Heart, Users2, Loader2, Utensils, Music, GlassWater, MapPin, Film, Star, PartyPopper, Coffee, Book, ShoppingBag, Sun, Moon, Share2, Bookmark, RefreshCw, Wand2, Calendar, Clock, ArrowRight, CheckCircle2, UserPlus, Home, Copy, Check, Sparkles } from "lucide-react"
import { cn } from '@/lib/utils'
import ProtectedRoute from '@/components/auth/protected-route'
import { saveGemJourney } from '@/app/(frontend)/events/actions'
import { toast } from 'sonner'
import Head from 'next/head'

const CONTEXTS = [
  { label: "Solo", value: "solo", icon: User, gradient: "from-purple-500 to-purple-600", color: "text-purple-600" },
  { label: "Date", value: "date", icon: Heart, gradient: "from-pink-500 to-rose-500", color: "text-pink-600" },
  { label: "Group", value: "group", icon: UserPlus, gradient: "from-blue-500 to-cyan-500", color: "text-blue-600" },
  { label: "Family", value: "family", icon: Home, gradient: "from-green-500 to-emerald-500", color: "text-green-600" },
]

// Function to generate meta tags for sharing
function generateMetaTags(plan: any) {
  if (!plan) return null;
  
  const title = `${plan.title || 'Amazing Hangout Plan'} - Sacavia`;
  const description = plan.summary ? 
    `${plan.summary.slice(0, 150)}...` : 
    `Check out this awesome hangout plan with ${plan.steps?.length || 'amazing'} steps created with Sacavia AI Planner!`;
  
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`${typeof window !== 'undefined' ? window.location.origin : ''}/planner`} />
      <meta property="og:image" content={`${typeof window !== 'undefined' ? window.location.origin : ''}/icon-512.png`} />
              <meta property="og:site_name" content="Sacavia" />
      
      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${typeof window !== 'undefined' ? window.location.origin : ''}/icon-512.png`} />
      
      {/* Additional Meta Tags */}
              <meta name="author" content="Sacavia AI Planner" />
      <meta name="robots" content="index, follow" />
    </Head>
  );
}

export default function PlannerPage() {
  const [input, setInput] = useState("")
  const [context, setContext] = useState("solo")
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>("idle")
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied'>('idle')
  
  // New geolocation states
  const [coordinates, setCoordinates] = useState<{latitude: number, longitude: number} | null>(null)
  const [nearbyLocationsCount, setNearbyLocationsCount] = useState<number>(0)
  const [userLocationName, setUserLocationName] = useState<string>('')

  // Request location permission on component mount
  useEffect(() => {
    const requestLocation = async () => {
      if (!navigator.geolocation) {
        return
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
          setCoordinates(coords)
          console.log('Location granted:', coords)
        },
        (error) => {
          console.error('Geolocation error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    }

    requestLocation()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPlan(null)
    setError(null)
    try {
      const res = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          input, 
          context,
          coordinates: coordinates // Pass coordinates to AI
        })
      })
      const data = await res.json()
      
      if (!res.ok) {
        // Handle specific error cases
        if (res.status === 429) {
          throw new Error("Too many requests. Please wait a moment and try again.")
        } else if (res.status === 401) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        } else if (res.status >= 500) {
          throw new Error("AI service is temporarily unavailable. Please try again later.")
        } else {
          throw new Error(data.error || "Failed to generate plan. Please try again.")
        }
      }
      
      // Check if the plan has an error flag
      if (data.plan?.error) {
        throw new Error("AI encountered an issue generating your plan. Please try rephrasing your request.")
      }
      
      // Validate the plan structure
      if (!data.plan || !data.plan.title || !data.plan.steps || !Array.isArray(data.plan.steps)) {
        throw new Error("Received invalid plan format. Please try again.")
      }
      
      setPlan(data.plan)
      setNearbyLocationsCount(data.nearbyLocationsFound || 0)
      setUserLocationName(data.userLocation || '')
      
      // Show enhanced success message based on real locations usage
      if (data.usedRealLocations && data.nearbyLocationsFound > 0) {
        toast.success(`🎯 Plan created using ${data.nearbyLocationsFound} verified locations near ${data.userLocation}!`)
      } else if (data.nearbyLocationsFound > 0) {
        toast.success(`📍 Found ${data.nearbyLocationsFound} nearby locations - plan customized for ${data.userLocation}`)
      } else {
        toast.success("✨ Plan created! Consider adding your location for personalized recommendations.")
      }
      
    } catch (err: any) {
      console.error('Planner error:', err)
      setError(err.message || "Something went wrong. Please try again.")
      
      // Show error toast for better user feedback
      toast.error(err.message || "Failed to generate plan. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function getStepIcon(step: string) {
    const s = step.toLowerCase()
    if (s.includes('dinner') || s.includes('restaurant') || s.includes('eat') || s.includes('food')) return { Icon: Utensils, label: 'Food', color: 'text-orange-500' }
    if (s.includes('music') || s.includes('concert') || s.includes('band') || s.includes('live')) return { Icon: Music, label: 'Music', color: 'text-purple-500' }
    if (s.includes('drink') || s.includes('bar') || s.includes('cocktail') || s.includes('wine')) return { Icon: GlassWater, label: 'Drinks', color: 'text-blue-500' }
    if (s.includes('walk') || s.includes('park') || s.includes('explore')) return { Icon: MapPin, label: 'Explore', color: 'text-green-500' }
    if (s.includes('movie') || s.includes('cinema') || s.includes('film')) return { Icon: Film, label: 'Movie', color: 'text-red-500' }
    if (s.includes('dessert') || s.includes('ice cream') || s.includes('cake')) return { Icon: Star, label: 'Dessert', color: 'text-yellow-500' }
    if (s.includes('party') || s.includes('club') || s.includes('dance')) return { Icon: PartyPopper, label: 'Party', color: 'text-pink-500' }
    if (s.includes('coffee') || s.includes('cafe')) return { Icon: Coffee, label: 'Coffee', color: 'text-amber-500' }
    if (s.includes('book') || s.includes('read') || s.includes('library')) return { Icon: Book, label: 'Book', color: 'text-indigo-500' }
    if (s.includes('shop') || s.includes('mall') || s.includes('shopping')) return { Icon: ShoppingBag, label: 'Shopping', color: 'text-teal-500' }
    if (s.includes('sunrise') || s.includes('morning')) return { Icon: Sun, label: 'Morning', color: 'text-yellow-400' }
    if (s.includes('night') || s.includes('evening')) return { Icon: Moon, label: 'Night', color: 'text-indigo-400' }
    return { Icon: Sparkles, label: 'Activity', color: 'text-[#FF6B6B]' }
  }

  async function handleSavePlan() {
    if (!plan) return
    setSaveStatus('saving')
    try {
      const steps = (plan.steps || []).map((step: string) => ({ step }))
      
      // Enhanced journey data with location and AI metadata
      const journeyData = {
        title: plan.title,
        summary: plan.summary,
        steps,
        context: plan.context,
        date: new Date().toISOString().slice(0, 10),
        type: context,
        // New location data
        coordinates: coordinates ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        } : undefined,
        usedRealLocations: plan.usedRealLocations || false,
        referencedLocations: plan.locationIds || [],
        // AI metadata
        aiMetadata: {
          nearbyLocationsCount,
          userLocation: userLocationName,
          generatedAt: plan.generatedAt || new Date().toISOString(),
          model: 'gpt-4'
        }
      }
      
      const res = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journeyData)
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save plan')
      }
      
      const data = await res.json()
      const journeyId = data.journey?.id
      if (!journeyId) throw new Error('No journey ID returned')
      
      const saveResult = await saveGemJourney(journeyId)
      if (!saveResult.success) throw new Error(saveResult.error || 'Failed to save to Gem List')
      
      setSaveStatus('saved')
      
      // Show success message with location info
      if (nearbyLocationsCount > 0) {
        toast.success(`Plan saved! Used ${nearbyLocationsCount} nearby locations from ${userLocationName || 'your area'} 🎉`)
      } else {
        toast.success('Plan saved to your Gem List! 🎉')
      }
      
    } catch (err: any) {
      console.error('Save plan error:', err)
      setSaveStatus('error')
      toast.error(err.message || 'Failed to save plan')
    }
  }

  // Enhanced share function with better formatting and URL generation
  const handleSharePlan = async () => {
    if (!plan) return
    
    setShareStatus('copying')
    
    try {
      // Create a more detailed and attractive share text
      const planTitle = plan.title || 'My Perfect Hangout Plan'
      const planSteps = plan.steps ? plan.steps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n') : ''
      
      const shareText = `🎉 ${planTitle}

${plan.summary ? `✨ ${plan.summary}\n` : ''}
📋 Your Hangout Timeline:
${planSteps}

              🤖 Generated with Sacavia AI Planner
👉 Create your own plan: ${window.location.origin}/planner

#GroundedGems #HangoutPlan #AI #Fun`

      const shareData = {
        title: planTitle,
        text: shareText,
        url: `${window.location.origin}/planner`
      }
      
      // Try to use the Web Share API first (mobile)
      if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        await navigator.share(shareData)
        setShareStatus('copied')
        toast.success('Plan shared successfully! 🎉')
      } else {
        // Fallback to clipboard with better formatting
        await navigator.clipboard.writeText(shareText)
        setShareStatus('copied')
        toast.success('Plan copied to clipboard! 📋 Ready to share!')
      }
      
      // Reset status after 3 seconds
      setTimeout(() => setShareStatus('idle'), 3000)
    } catch (err) {
      console.error('Error sharing plan:', err)
      setShareStatus('idle')
      toast.error('Failed to share plan. Please try again.')
    }
  }

  return (
    <ProtectedRoute>
      {/* Dynamic Meta Tags for better sharing */}
      {plan && generateMetaTags(plan)}
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-br from-[#FFD93D]/20 to-[#FF6B6B]/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 sm:w-80 h-48 sm:h-80 bg-gradient-to-br from-[#4ECDC4]/10 to-[#FFD93D]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-white/30">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-lg sm:rounded-xl shadow-lg">
                <Wand2 className="h-4 w-4 sm:h-6 sm:w-6 text-white animate-pulse" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-800">AI Hangout Planner</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#FFD93D] bg-clip-text text-transparent leading-tight">
              Plan Your Perfect Hangout
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
              Tell us what you're in the mood for, and we'll create a personalized hangout plan just for you
            </p>
          </div>

          {/* Main Form */}
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Context Selection */}
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6 flex items-center justify-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#4ECDC4]" />
                  Who's joining you?
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto">
                  {CONTEXTS.map(opt => {
                    const Icon = opt.icon
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        className={cn(
                          "relative group overflow-hidden rounded-xl sm:rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 p-3 sm:p-4",
                          context === opt.value
                            ? "border-[#FF6B6B] bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 shadow-lg scale-105"
                            : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-[#4ECDC4]/50 hover:bg-white/80"
                        )}
                        onClick={() => setContext(opt.value)}
                      >
                        <div className="text-center">
                          <div className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 rounded-full flex items-center justify-center transition-all duration-300",
                            context === opt.value
                              ? `bg-gradient-to-br ${opt.gradient} text-white shadow-md`
                              : `bg-gray-100 ${opt.color} group-hover:bg-[#4ECDC4]/20 group-hover:text-[#4ECDC4]`
                          )}>
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <span className={cn(
                            "text-xs sm:text-sm font-semibold transition-colors",
                            context === opt.value ? "text-[#FF6B6B]" : "text-gray-700"
                          )}>
                            {opt.label}
                          </span>
                        </div>
                        {context === opt.value && (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B6B]/5 to-[#4ECDC4]/5 pointer-events-none rounded-xl sm:rounded-2xl"></div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Input Section */}
              <div className="space-y-4 relative">
                <div className="relative">
                  <label className="block text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 text-center">
                    What's your vibe today? ✨
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      className="w-full h-12 sm:h-16 px-4 sm:px-6 text-base sm:text-lg bg-white/70 backdrop-blur-sm border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:border-[#FF6B6B] focus:bg-white transition-all duration-300 placeholder-gray-400 shadow-lg group-hover:shadow-xl"
                      placeholder="e.g., I want live music and great food..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="relative w-full h-12 sm:h-16 overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-3xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none group"
                  style={{
                    background: loading || !input.trim() 
                      ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 50%, #4B5563 100%)'
                      : 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 50%, #FF6B6B 100%)'
                  }}
                >
                  {/* Animated background overlay */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.9) 0%, rgba(255, 142, 142, 0.9) 50%, rgba(255, 107, 107, 0.9) 100%)',
                      backgroundSize: '200% 200%',
                      animation: 'gradient-shift 3s ease infinite'
                    }}
                  ></div>
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  <span className="relative flex items-center justify-center gap-2 sm:gap-3 font-bold text-base sm:text-lg text-white drop-shadow-sm">
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="hidden sm:inline">Creating your perfect hangout...</span>
                        <span className="sm:hidden">Creating...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="hidden sm:inline">Generate My Hangout Plan</span>
                        <span className="sm:hidden">Generate Plan</span>
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </span>
                </button>
                
                {/* Add CSS keyframes for the gradient animation */}
                <style jsx>{`
                  @keyframes gradient-shift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                `}</style>
              </div>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl text-red-700 text-center animate-in slide-in-from-top-2 text-sm sm:text-base">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-red-500">⚠️</span>
                  {error}
                </div>
              </div>
            )}

            {/* Plan Display */}
            {plan && (
              <div className="mt-8 sm:mt-12 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-white/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 mb-8">
                {/* Plan Header */}
                <div className="bg-gradient-to-r from-[#FF6B6B]/10 via-[#4ECDC4]/10 to-[#FFD93D]/10 p-4 sm:p-6 lg:p-8 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] rounded-xl sm:rounded-2xl shadow-lg">
                      <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">{plan.title || 'Your Perfect Hangout Plan'}</h2>
                      <div className="flex items-center gap-2 mt-1 sm:mt-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                        <span className="text-sm sm:text-base text-gray-600">Created just for you</span>
                      </div>
                    </div>
                  </div>
                  {plan.summary && (
                    <p className="text-base sm:text-lg text-gray-700 leading-relaxed bg-white/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white">
                      {plan.summary}
                    </p>
                  )}
                  
                  {/* Location Metadata */}
                  {(nearbyLocationsCount > 0 || userLocationName) && (
                    <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg sm:rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-green-100 rounded">
                          <MapPin className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-green-800">Location-Enhanced Plan</span>
                      </div>
                      <div className="text-xs text-green-700 space-y-1">
                        {userLocationName && (
                          <p>📍 Planned for: {userLocationName}</p>
                        )}
                        {nearbyLocationsCount > 0 && (
                          <p>🎯 Found {nearbyLocationsCount} nearby verified locations</p>
                        )}
                        {plan.usedRealLocations && (
                          <p>✨ This plan includes real places from our database</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Plan Steps */}
                <div className="p-4 sm:p-6 lg:p-8">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#4ECDC4]" />
                    Your Hangout Timeline
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {plan.steps && plan.steps.map((step: string, i: number) => {
                      const { Icon: StepIcon, label, color } = getStepIcon(step)
                      return (
                        <div key={i} className="group relative">
                          <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-gray-50 to-white rounded-xl sm:rounded-2xl border border-gray-100 hover:border-[#4ECDC4]/30 hover:shadow-lg transition-all duration-300">
                            <div className={cn(
                              "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-white shadow-lg text-sm sm:text-base lg:text-lg",
                              "bg-gradient-to-br from-[#FF6B6B]/80 to-[#4ECDC4]/80"
                            )}>
                              <span>{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                                <StepIcon className={cn("h-5 w-5 sm:h-6 sm:w-6 mt-0.5 flex-shrink-0", color)} />
                                <div className="flex-1">
                                  <p className="text-gray-900 text-sm sm:text-base lg:text-lg leading-relaxed">{step}</p>
                                  <span className={cn("text-xs sm:text-sm font-medium", color)}>{label}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {i < plan.steps.length - 1 && (
                            <div className="flex justify-center py-1 sm:py-2">
                              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300 rotate-90" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 sm:p-6 lg:p-8 bg-gray-50/50 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
                    <button
                      onClick={handleSavePlan}
                      disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                      className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#FFD93D] to-[#FFE66D] text-gray-900 font-bold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:transform-none text-sm sm:text-base"
                    >
                      <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline">
                        {saveStatus === 'saved' ? 'Saved to Hangout Plans! ✨' : saveStatus === 'saving' ? 'Saving...' : 'Save to Hangout Plans'}
                      </span>
                      <span className="sm:hidden">
                        {saveStatus === 'saved' ? 'Saved! ✨' : saveStatus === 'saving' ? 'Saving...' : 'Save'}
                      </span>
                    </button>
                    <button 
                      onClick={handleSharePlan}
                      disabled={shareStatus === 'copying'}
                      className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#4ECDC4] to-[#26C6DA] text-white font-bold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:transform-none text-sm sm:text-base"
                    >
                      {shareStatus === 'copied' ? (
                        <>
                          <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="hidden sm:inline">Copied!</span>
                          <span className="sm:hidden">Copied!</span>
                        </>
                      ) : shareStatus === 'copying' ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          <span className="hidden sm:inline">Copying...</span>
                          <span className="sm:hidden">Copying...</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="hidden sm:inline">Share Plan</span>
                          <span className="sm:hidden">Share</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => { setPlan(null); setInput(""); setError(null); setSaveStatus('idle'); setShareStatus('idle'); }}
                      className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-gray-700 font-bold rounded-lg sm:rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                    >
                      <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline">Create New Plan</span>
                      <span className="sm:hidden">New Plan</span>
                    </button>
                  </div>
                  {saveStatus === 'error' && (
                    <div className="text-red-600 font-medium mt-3 sm:mt-4 text-center bg-red-50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-red-200 text-sm sm:text-base">
                      Failed to save. Please try again.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 