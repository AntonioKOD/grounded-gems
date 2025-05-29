"use client"

import React, { useEffect, useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'

interface Plan {
  id: number
  userId: string
  title: string
  summary: string
  steps: string[]
  date: string
  context?: string
}

export default function SavedPlansTab() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sharePlanId, setSharePlanId] = useState<number | null>(null)
  const [inviteTo, setInviteTo] = useState('')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedInvitees, setSelectedInvitees] = useState<any[]>([])
  const { user } = useAuth()

  useEffect(() => {
    async function fetchPlans() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/journeys")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to fetch journeys")
        setPlans(data.journeys.filter((plan: any) => String(plan.owner) === String(user?.id)))
      } catch (err: any) {
        setError(err.message || "Failed to fetch journeys")
      } finally {
        setLoading(false)
      }
    }
    if (user?.id) fetchPlans()
  }, [user?.id])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=users&limit=5`)
        const data = await res.json()
        setSearchResults(data.users || [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  async function handleInvite(planId: number, inviteeId: string) {
    setInviteStatus('sending')
    setInviteError(null)
    try {
      const res = await fetch(`/api/journeys/${planId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeId })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invite')
      }
      setInviteStatus('sent')
    } catch (err: any) {
      setInviteStatus('error')
      setInviteError(err.message || 'Failed to send invite')
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin h-5 w-5" /> Loading...</div>
  if (error) return <div className="text-red-600 font-medium">{error}</div>
  if (plans.length === 0) return <div className="text-gray-500">No saved Hangout Plans yet.</div>

  return (
    <div className="space-y-4 mt-4">
      {plans.map(plan => (
        <div key={plan.id} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-[#FF6B6B]" />
            <Link href={`./journey/${plan.id}`} className="font-semibold text-lg hover:underline text-[#FF6B6B]">
              {plan.title}
            </Link>
            <button className="ml-auto px-2 py-1 text-xs rounded bg-[#4ECDC4] text-white hover:bg-[#26C6DA] transition" onClick={() => { setSharePlanId(plan.id); setInviteTo(''); setInviteStatus('idle'); setInviteError(null); }}>Share</button>
          </div>
          <div className="text-gray-700 text-sm mb-1">{plan.summary}</div>
          {plan.context && <div className="text-xs text-gray-500 mb-1">Context: {plan.context}</div>}
          <div className="text-xs text-gray-400">Saved on {plan.date}</div>
          {/* Share/Invite Modal */}
          {sharePlanId === plan.id && (
            <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
              <label className="block text-xs font-medium mb-1">Invite user by email or username:</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setInviteStatus('idle'); setInviteError(null); }}
                disabled={inviteStatus === 'sending' || inviteStatus === 'sent'}
              />
              {searchLoading && <div className="text-xs text-gray-400 mb-1">Searching...</div>}
              {searchResults.length > 0 && (
                <ul className="mb-2 border rounded bg-white max-h-40 overflow-y-auto">
                  {searchResults.map(user => (
                    <li key={user.id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center justify-between" onClick={() => {
                      if (!selectedInvitees.some(u => u.id === user.id)) setSelectedInvitees([...selectedInvitees, user]);
                      setSearchQuery(''); setSearchResults([]);
                    }}>
                      <span>{user.name} {user.username && <span className="text-xs text-gray-500">@{user.username}</span>}</span>
                      <span className="text-xs text-gray-400">{user.email}</span>
                    </li>
                  ))}
                </ul>
              )}
              {selectedInvitees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedInvitees.map(user => (
                    <span key={user.id} className="bg-[#FFD93D] text-gray-900 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      {user.name} {user.username && <span className="text-xs text-gray-500">@{user.username}</span>}
                      <button className="ml-1 text-gray-500 hover:text-red-500" onClick={e => { e.stopPropagation(); setSelectedInvitees(selectedInvitees.filter(u => u.id !== user.id)); }}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded bg-[#FFD93D] text-gray-900 font-semibold text-xs hover:bg-[#FFE66D] transition disabled:opacity-60"
                  onClick={async () => {
                    setInviteStatus('sending'); setInviteError(null);
                    try {
                      for (const user of selectedInvitees) {
                        const res = await fetch(`/api/journeys/${plan.id}/invite`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ inviteeId: user.id })
                        })
                        if (!res.ok) {
                          const data = await res.json()
                          throw new Error(data.error || 'Failed to send invite')
                        }
                      }
                      setInviteStatus('sent')
                    } catch (err: any) {
                      setInviteStatus('error')
                      setInviteError(err.message || 'Failed to send invite')
                    }
                  }}
                  disabled={selectedInvitees.length === 0 || inviteStatus === 'sending' || inviteStatus === 'sent'}
                >
                  {inviteStatus === 'sending' ? 'Sending...' : inviteStatus === 'sent' ? 'Sent!' : 'Send Invite'}
                </button>
                <button className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setSharePlanId(null)}>Cancel</button>
              </div>
              {inviteStatus === 'error' && <div className="text-red-600 text-xs mt-1">{inviteError}</div>}
              {inviteStatus === 'sent' && <div className="text-green-600 text-xs mt-1">Invite sent!</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 