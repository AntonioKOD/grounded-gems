"use client"

import React, { useState } from "react"
import { Sparkles, User, Users, Heart, Users2, Loader2, Utensils, Music, GlassWater, MapPin, Film, Star, PartyPopper, Coffee, Book, ShoppingBag, Sun, Moon, Share2, Bookmark, RefreshCw } from "lucide-react"
import { cn } from '@/lib/utils'
import ProtectedRoute from '@/components/auth/protected-route'
import { saveGemJourney } from '@/app/(frontend)/events/actions'

const CONTEXTS = [
  { label: "Solo", value: "solo", icon: User },
  { label: "Date", value: "date", icon: Heart },
  { label: "Group", value: "group", icon: Users },
  { label: "Family", value: "family", icon: Users2 },
]

export default function PlannerPage() {
  const [input, setInput] = useState("")
  const [context, setContext] = useState("solo")
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPlan(null)
    setError(null)
    try {
      const res = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, context })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unknown error")
      setPlan(data.plan)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Helper to pick an icon for a step, and a label for tooltip
  function getStepIcon(step: string) {
    const s = step.toLowerCase()
    if (s.includes('dinner') || s.includes('restaurant') || s.includes('eat') || s.includes('food')) return { Icon: Utensils, label: 'Food' }
    if (s.includes('music') || s.includes('concert') || s.includes('band') || s.includes('live')) return { Icon: Music, label: 'Music' }
    if (s.includes('drink') || s.includes('bar') || s.includes('cocktail') || s.includes('wine')) return { Icon: GlassWater, label: 'Drinks' }
    if (s.includes('walk') || s.includes('park') || s.includes('explore')) return { Icon: MapPin, label: 'Explore' }
    if (s.includes('movie') || s.includes('cinema') || s.includes('film')) return { Icon: Film, label: 'Movie' }
    if (s.includes('dessert') || s.includes('ice cream') || s.includes('cake')) return { Icon: Star, label: 'Dessert' }
    if (s.includes('party') || s.includes('club') || s.includes('dance')) return { Icon: PartyPopper, label: 'Party' }
    if (s.includes('coffee') || s.includes('cafe')) return { Icon: Coffee, label: 'Coffee' }
    if (s.includes('book') || s.includes('read') || s.includes('library')) return { Icon: Book, label: 'Book' }
    if (s.includes('shop') || s.includes('mall') || s.includes('shopping')) return { Icon: ShoppingBag, label: 'Shopping' }
    if (s.includes('sunrise') || s.includes('morning')) return { Icon: Sun, label: 'Morning' }
    if (s.includes('night') || s.includes('evening')) return { Icon: Moon, label: 'Night' }
    return { Icon: Sparkles, label: 'Activity' }
  }

  async function handleSavePlan() {
    if (!plan) return
    setSaveStatus('saving')
    try {
      // First, create the journey in the journeys collection
      const steps = (plan.steps || []).map((step: string) => ({ step }))
      const res = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: plan.title,
          summary: plan.summary,
          steps,
          context: plan.context,
          date: new Date().toISOString().slice(0, 10),
          type: context,
        })
      })
      if (!res.ok) throw new Error('Failed to save plan')
      const data = await res.json()
      // Now, save the journey to the user's savedGemJourneys
      const journeyId = data.journey?.id
      if (!journeyId) throw new Error('No journey ID returned')
      const saveResult = await saveGemJourney(journeyId)
      if (!saveResult.success) throw new Error(saveResult.error || 'Failed to save to Gem List')
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="h-8 w-8 text-[#FF6B6B]" />
          <h1 className="text-2xl font-bold">Gem Journey</h1>
        </div>
        <p className="mb-4 text-gray-600">Describe your ideal night out and let our AI craft a personalized plan just for you.</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block font-medium mb-1">What do you want to do tonight?</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
            placeholder="e.g. I want live music and great food"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            {CONTEXTS.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  type="button"
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg border transition-all",
                    context === opt.value
                      ? "bg-[#FF6B6B] text-white border-[#FF6B6B] shadow"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  )}
                  onClick={() => setContext(opt.value)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              )
            })}
          </div>
          <button
            type="submit"
            className="w-full mt-4 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-semibold py-3 rounded-lg shadow hover:from-[#FF6B6B]/90 hover:to-[#4ECDC4]/90 transition-all text-lg disabled:opacity-60"
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Planning...</span>
            ) : (
              "Start My Gem Journey"
            )}
          </button>
        </form>
        {error && <div className="mt-6 text-red-600 font-medium">{error}</div>}
        {plan && (
          <div className="mt-8 p-0 bg-white rounded-xl shadow border border-gray-100 animate-fade-in overflow-hidden">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 px-6 pt-6"><Sparkles className="h-5 w-5 text-[#FF6B6B]" /> {plan.title || 'Your Gem Journey'}</h2>
            {plan.summary && <div className="text-gray-700 mb-4 px-6">{plan.summary}</div>}
            <ol className="space-y-4 px-2 pb-6">
              {plan.steps && plan.steps.map((step: string, i: number) => {
                const { Icon: StepIcon, label } = getStepIcon(step)
                return (
                  <li key={i} className="bg-gradient-to-r from-[#FFF7E6] to-[#F5F5F5] rounded-lg p-4 flex items-start gap-3 shadow-sm border border-[#FFE66D]/40">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center font-bold text-[#FF6B6B] text-lg border border-[#FF6B6B]/20" title={label} aria-label={label}>
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <div className="text-gray-900 text-base leading-relaxed">{step}</div>
                  </li>
                )
              })}
            </ol>
            <div className="flex gap-3 px-6 pb-6 mt-2">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFD93D] text-gray-900 font-semibold shadow hover:bg-[#FFE66D] transition disabled:opacity-60"
                onClick={handleSavePlan}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              >
                <Bookmark className="h-5 w-5" />
                {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'saving' ? 'Saving...' : 'Save to Gem List'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4ECDC4] text-white font-semibold shadow hover:bg-[#26C6DA] transition"><Share2 className="h-5 w-5" /> Share</button>
              <button onClick={() => { setPlan(null); setInput(""); setError(null); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold shadow hover:bg-gray-300 transition ml-auto"><RefreshCw className="h-5 w-5" /> Try Again</button>
            </div>
            {saveStatus === 'error' && <div className="text-red-600 font-medium mt-2">Failed to save. Try again.</div>}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
} 